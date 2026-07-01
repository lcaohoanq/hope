import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkoutData } from "@/lib/workout-types";
import { validateWorkoutData } from "@/lib/workout-utils";

type GitHubFile = {
  data: WorkoutData;
  sha: string;
};

type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  dataPath: string;
};

type CommitJsonOptions = {
  data: WorkoutData;
  sha: string;
  message: string;
};

export class GitHubJsonConflictError extends Error {
  constructor() {
    super("GitHub file update conflict.");
    this.name = "GitHubJsonConflictError";
  }
}

function getDataPath() {
  return process.env.WORKOUT_DATA_PATH || "data/workouts.json";
}

function getLocalDataPath() {
  return path.join(process.cwd(), "data", "workouts.json");
}

function getGitHubConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return null;
  }

  return {
    token,
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    dataPath: getDataPath(),
  };
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf8");
}

function assertGitHubObject(
  value: unknown,
): asserts value is { content: string; sha: string } {
  if (
    !value ||
    typeof value !== "object" ||
    !("content" in value) ||
    !("sha" in value) ||
    typeof value.content !== "string" ||
    typeof value.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub file response.");
  }
}

function createGitHubHeaders(config: GitHubConfig) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function getGitHubContentsUrl(config: GitHubConfig) {
  const encodedPath = config.dataPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `https://api.github.com/repos/${encodeURIComponent(
    config.owner,
  )}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
}

export function isUsingGitHubDataSource() {
  return getGitHubConfig() !== null;
}

export async function readWorkoutData(): Promise<WorkoutData> {
  const config = getGitHubConfig();

  if (!config) {
    const localJson = await fs.readFile(getLocalDataPath(), "utf8");
    return validateWorkoutData(JSON.parse(localJson));
  }

  return readWorkoutDataFromGitHub(config).then((file) => file.data);
}

export async function readWorkoutGitHubFile(): Promise<GitHubFile> {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  return readWorkoutDataFromGitHub(config);
}

export async function writeWorkoutDataLocally(data: WorkoutData) {
  await fs.writeFile(
    getLocalDataPath(),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

export async function commitWorkoutDataToGitHub({
  data,
  sha,
  message,
}: CommitJsonOptions) {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  const response = await fetch(getGitHubContentsUrl(config), {
    method: "PUT",
    headers: createGitHubHeaders(config),
    body: JSON.stringify({
      branch: config.branch,
      message,
      content: encodeBase64(`${JSON.stringify(data, null, 2)}\n`),
      sha,
    }),
  });

  if (response.status === 409) {
    throw new GitHubJsonConflictError();
  }

  if (!response.ok) {
    throw new Error(`GitHub update failed with status ${response.status}.`);
  }
}

async function readWorkoutDataFromGitHub(
  config: GitHubConfig,
): Promise<GitHubFile> {
  const response = await fetch(
    `${getGitHubContentsUrl(config)}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: createGitHubHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub read failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  assertGitHubObject(payload);

  return {
    data: validateWorkoutData(JSON.parse(decodeBase64(payload.content))),
    sha: payload.sha,
  };
}
