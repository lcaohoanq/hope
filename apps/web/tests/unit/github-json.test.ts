import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { type AxiosAdapter, AxiosHeaders } from "axios";
import {
  commitWorkoutDataToGitHub,
  GitHubJsonConflictError,
  readWorkoutGitHubFile,
} from "@/lib/github-json";
import { externalHttpClient } from "@/lib/http";
import type { WorkoutData } from "@/lib/workout-types";

const originalAdapter = externalHttpClient.defaults.adapter;
const workoutData: WorkoutData = {
  settings: { timezone: "Asia/Ho_Chi_Minh" },
  workouts: [],
};

beforeEach(() => {
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_OWNER = "test-owner";
  process.env.GITHUB_REPO = "test-repo";
});

afterEach(() => {
  externalHttpClient.defaults.adapter = originalAdapter;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
});

function useResponses(responses: Array<{ data?: unknown; status: number }>) {
  let requestCount = 0;
  const adapter: AxiosAdapter = async (config) => {
    const response = responses[Math.min(requestCount, responses.length - 1)];
    requestCount += 1;

    return {
      config,
      data: response.data,
      headers: new AxiosHeaders(),
      status: response.status,
      statusText: String(response.status),
    };
  };

  externalHttpClient.defaults.adapter = adapter;
  return () => requestCount;
}

test("retries transient GitHub reads and returns validated data", async () => {
  const getRequestCount = useResponses([
    { status: 500 },
    {
      data: {
        content: Buffer.from(JSON.stringify(workoutData), "utf8").toString("base64"),
        sha: "data-sha",
      },
      status: 200,
    },
  ]);

  const result = await readWorkoutGitHubFile();

  assert.deepEqual(result, { data: workoutData, sha: "data-sha" });
  assert.equal(getRequestCount(), 2);
});

test("does not retry non-retryable GitHub read responses", async () => {
  const getRequestCount = useResponses([{ status: 404 }]);

  await assert.rejects(readWorkoutGitHubFile(), /GitHub read failed with status 404/);
  assert.equal(getRequestCount(), 1);
});

test("maps GitHub update conflicts to the domain error", async () => {
  useResponses([{ status: 409 }]);

  await assert.rejects(
    commitWorkoutDataToGitHub({ data: workoutData, message: "test", sha: "old-sha" }),
    GitHubJsonConflictError,
  );
});

test("rejects malformed successful GitHub payloads", async () => {
  useResponses([{ data: {}, status: 200 }]);

  await assert.rejects(readWorkoutGitHubFile(), /Unexpected GitHub file response/);
});
