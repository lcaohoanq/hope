import { NextResponse } from "next/server";
import {
  commitWorkoutDataToGitHub,
  GitHubJsonConflictError,
  isUsingGitHubDataSource,
  readWorkoutData,
  readWorkoutGitHubFile,
  writeWorkoutDataLocally,
} from "@/lib/github-json";
import type { CreateWorkoutRequest } from "@/lib/workout-types";
import {
  appendWorkout,
  createWorkoutRecord,
  validateCreateWorkoutRequest,
} from "@/lib/workout-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await readWorkoutData();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load workout data.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: CreateWorkoutRequest;

  try {
    body = (await request.json()) as CreateWorkoutRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const validation = validateCreateWorkoutRequest(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 400 },
    );
  }

  const workout = createWorkoutRecord(validation.workoutInput);

  try {
    if (!isUsingGitHubDataSource()) {
      const data = await readWorkoutData();
      const nextData = appendWorkout(data, workout);
      await writeWorkoutDataLocally(nextData);

      return NextResponse.json({
        success: true,
        workout,
      });
    }

    await appendAndCommitWorkout(workout);

    return NextResponse.json({
      success: true,
      workout,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to save workout.",
      },
      { status: 500 },
    );
  }
}

async function appendAndCommitWorkout(workout: ReturnType<typeof createWorkoutRecord>) {
  const firstRead = await readWorkoutGitHubFile();

  try {
    await commitWorkoutDataToGitHub({
      data: appendWorkout(firstRead.data, workout),
      sha: firstRead.sha,
      message: `Add workout for ${workout.date}`,
    });
  } catch (error) {
    if (!(error instanceof GitHubJsonConflictError)) {
      throw error;
    }

    const retryRead = await readWorkoutGitHubFile();

    await commitWorkoutDataToGitHub({
      data: appendWorkout(retryRead.data, workout),
      sha: retryRead.sha,
      message: `Add workout for ${workout.date}`,
    });
  }
}
