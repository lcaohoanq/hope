import { NextResponse } from "next/server";
import {
  commitWorkoutDataAndFilesToGitHub,
  commitWorkoutDataToGitHub,
  GitHubJsonConflictError,
  isUsingGitHubDataSource,
  readWorkoutData,
  readWorkoutGitHubFile,
  writeWorkoutDataLocally,
} from "@/lib/github-json";
import type { OptimizedWorkoutImage } from "@/lib/workout-images";
import type {
  CreateWorkoutRequest,
  Workout,
  WorkoutImage,
} from "@/lib/workout-types";
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
  let payload: {
    body: CreateWorkoutRequest;
    imageFiles: File[];
  };

  try {
    payload = await parseCreateWorkoutPayload(request);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be valid JSON or multipart form data.",
      },
      { status: 400 },
    );
  }

  const validation = validateCreateWorkoutRequest(payload.body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 400 },
    );
  }

  let optimizedImages: OptimizedWorkoutImage[];

  try {
    optimizedImages = await prepareWorkoutImages(
      payload.imageFiles,
      validation.workoutInput.date,
    );
  } catch (error) {
    if (isWorkoutImageValidationError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process workout images.",
      },
      { status: 500 },
    );
  }

  let imageMetadata: WorkoutImage[] = [];

  if (optimizedImages.length > 0) {
    const { getWorkoutImageMetadata } = await import("@/lib/workout-images");
    imageMetadata = optimizedImages.map(getWorkoutImageMetadata);
  }

  const workout = createWorkoutRecord({
    ...validation.workoutInput,
    images: imageMetadata,
  });

  try {
    if (!isUsingGitHubDataSource()) {
      const data = await readWorkoutData();
      const nextData = appendWorkout(data, workout);

      try {
        if (optimizedImages.length > 0) {
          const { writeOptimizedWorkoutImagesLocally } = await import(
            "@/lib/workout-images"
          );

          await writeOptimizedWorkoutImagesLocally(optimizedImages);
        }

        await writeWorkoutDataLocally(nextData);
      } catch (error) {
        if (optimizedImages.length > 0) {
          const { cleanupOptimizedWorkoutImagesLocally } = await import(
            "@/lib/workout-images"
          );

          await cleanupOptimizedWorkoutImagesLocally(optimizedImages);
        }

        throw error;
      }

      return NextResponse.json({
        success: true,
        workout,
      });
    }

    await appendAndCommitWorkout(workout, optimizedImages);

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

async function parseCreateWorkoutPayload(request: Request): Promise<{
  body: CreateWorkoutRequest;
  imageFiles: File[];
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return {
      body: (await request.json()) as CreateWorkoutRequest,
      imageFiles: [],
    };
  }

  const formData = await request.formData();
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  return {
    body: {
      date: formData.get("date"),
      type: formData.get("type"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      note: formData.get("note"),
    },
    imageFiles,
  };
}

async function prepareWorkoutImages(
  imageFiles: File[],
  workoutDate: string,
): Promise<OptimizedWorkoutImage[]> {
  if (imageFiles.length === 0) {
    return [];
  }

  const {
    MAX_WORKOUT_IMAGES,
    optimizeWorkoutImage,
    validateWorkoutImageUpload,
    WorkoutImageValidationError,
  } = await import("@/lib/workout-images");

  if (imageFiles.length > MAX_WORKOUT_IMAGES) {
    throw new WorkoutImageValidationError(
      `Please upload no more than ${MAX_WORKOUT_IMAGES} images per workout.`,
    );
  }

  for (const imageFile of imageFiles) {
    validateWorkoutImageUpload(imageFile);
  }

  const optimizedImages: OptimizedWorkoutImage[] = [];

  for (const imageFile of imageFiles) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());

    optimizedImages.push(
      await optimizeWorkoutImage({
        buffer,
        workoutDate,
        originalMimeType: imageFile.type,
      }),
    );
  }

  return optimizedImages;
}

function isWorkoutImageValidationError(error: unknown): error is Error {
  return (
    error instanceof Error && error.name === "WorkoutImageValidationError"
  );
}

async function appendAndCommitWorkout(
  workout: Workout,
  optimizedImages: OptimizedWorkoutImage[],
) {
  const firstRead = await readWorkoutGitHubFile();

  try {
    await commitWorkoutToGitHub({
      data: appendWorkout(firstRead.data, workout),
      sha: firstRead.sha,
      workout,
      optimizedImages,
    });
  } catch (error) {
    if (!(error instanceof GitHubJsonConflictError)) {
      throw error;
    }

    const retryRead = await readWorkoutGitHubFile();

    await commitWorkoutToGitHub({
      data: appendWorkout(retryRead.data, workout),
      sha: retryRead.sha,
      workout,
      optimizedImages,
    });
  }
}

async function commitWorkoutToGitHub({
  data,
  sha,
  workout,
  optimizedImages,
}: {
  data: ReturnType<typeof appendWorkout>;
  sha: string;
  workout: Workout;
  optimizedImages: OptimizedWorkoutImage[];
}) {
  if (optimizedImages.length === 0) {
    await commitWorkoutDataToGitHub({
      data,
      sha,
      message: `Add workout for ${workout.date}`,
    });

    return;
  }

  await commitWorkoutDataAndFilesToGitHub({
    data,
    expectedDataSha: sha,
    files: optimizedImages.map((image) => ({
      path: image.repositoryPath,
      content: image.buffer,
    })),
    message: `Add workout for ${workout.date}`,
  });
}
