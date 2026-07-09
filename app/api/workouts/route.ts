import { NextResponse } from "next/server";
import {
  isUserAuthorized,
} from "@/lib/auth";
import { getTodayInTimezone } from "@/lib/date-utils";
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
  UpdateWorkoutRequest,
  Workout,
  WorkoutImage,
} from "@/lib/workout-types";
import {
  appendWorkout,
  createWorkoutRecord,
  replaceWorkout,
  validateCreateWorkoutRequest,
  validateUpdateWorkoutRequest,
} from "@/lib/workout-utils";
import {
  canUserEditWorkoutDate,
  isWorkoutVisibleForUser,
  normalizeUserId,
} from "@/lib/users";

export const runtime = "nodejs";

class WorkoutNotFoundError extends Error {
  constructor() {
    super("Workout was not found.");
    this.name = "WorkoutNotFoundError";
  }
}

class PastWorkoutEditForbiddenError extends Error {
  constructor() {
    super("Editing past workouts is not enabled for this user.");
    this.name = "PastWorkoutEditForbiddenError";
  }
}

export async function GET(request: Request) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid user is required.",
      },
      { status: 400 },
    );
  }

  if (!isUserAuthorized(request.headers.get("cookie"), userId)) {
    return createUnauthorizedResponse();
  }

  try {
    const data = await readWorkoutData();

    return NextResponse.json({
      ...data,
      workouts: data.workouts.filter((workout) =>
        isWorkoutVisibleForUser(workout, userId),
      ),
    });
  } catch (error) {
    console.error("Unable to load workout data.", error);

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
  const userId = normalizeUserId(payload.body.userId);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 400 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid user is required.",
      },
      { status: 400 },
    );
  }

  if (!isUserAuthorized(request.headers.get("cookie"), userId)) {
    return createUnauthorizedResponse();
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

    console.error("Unable to process workout images.", error);

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
    userId,
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

export async function PATCH(request: Request) {
  let payload: {
    body: UpdateWorkoutRequest;
    imageFiles: File[];
  };

  try {
    payload = await parseUpdateWorkoutPayload(request);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be valid JSON or multipart form data.",
      },
      { status: 400 },
    );
  }

  const validation = validateUpdateWorkoutRequest(payload.body);
  const userId = normalizeUserId(payload.body.userId);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 400 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid user is required.",
      },
      { status: 400 },
    );
  }

  if (!isUserAuthorized(request.headers.get("cookie"), userId)) {
    return createUnauthorizedResponse();
  }

  try {
    if (!isUsingGitHubDataSource()) {
      const data = await readWorkoutData();
      const existingWorkout = data.workouts.find(
        (workout) =>
          workout.id === validation.workoutId &&
          isWorkoutVisibleForUser(workout, userId),
      );

      if (!existingWorkout) {
        return NextResponse.json(
          {
            success: false,
            error: "Workout was not found.",
          },
          { status: 404 },
        );
      }

      const todayDateKey = getTodayInTimezone();

      if (
        !canUserEditWorkoutDate(userId, existingWorkout.date, todayDateKey) ||
        !canUserEditWorkoutDate(
          userId,
          validation.workoutInput.date,
          todayDateKey,
        )
      ) {
        return createPastWorkoutEditForbiddenResponse();
      }

      const optimizedImages = await prepareWorkoutImages(
        payload.imageFiles,
        validation.workoutInput.date,
        existingWorkout.images?.length ?? 0,
      );
      const workout = await createUpdatedWorkout(
        existingWorkout,
        validation.workoutInput,
        optimizedImages,
        userId,
      );
      const nextData = replaceWorkout(data, workout);

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

    const workout = await updateAndCommitWorkout(
      validation.workoutId,
      userId,
      validation.workoutInput,
      payload.imageFiles,
    );

    return NextResponse.json({
      success: true,
      workout,
    });
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

    if (error instanceof WorkoutNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    if (error instanceof PastWorkoutEditForbiddenError) {
      return createPastWorkoutEditForbiddenResponse();
    }

    console.error("Unable to update workout.", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update workout.",
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
      userId: formData.get("userId"),
      date: formData.get("date"),
      type: formData.get("type"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      note: formData.get("note"),
    },
    imageFiles,
  };
}

async function parseUpdateWorkoutPayload(request: Request): Promise<{
  body: UpdateWorkoutRequest;
  imageFiles: File[];
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return {
      body: (await request.json()) as UpdateWorkoutRequest,
      imageFiles: [],
    };
  }

  const formData = await request.formData();
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  return {
    body: {
      id: formData.get("id"),
      userId: formData.get("userId"),
      date: formData.get("date"),
      type: formData.get("type"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      note: formData.get("note"),
    },
    imageFiles,
  };
}

function getRequestUserId(request: Request) {
  const url = new URL(request.url);

  return normalizeUserId(url.searchParams.get("userId"));
}

function createUnauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Authentication is required.",
    },
    { status: 401 },
  );
}

function createPastWorkoutEditForbiddenResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Editing past workouts is not enabled for this user.",
    },
    { status: 403 },
  );
}

async function prepareWorkoutImages(
  imageFiles: File[],
  workoutDate: string,
  existingImageCount = 0,
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

  if (existingImageCount + imageFiles.length > MAX_WORKOUT_IMAGES) {
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

async function createUpdatedWorkout(
  existingWorkout: Workout,
  input: {
    date: string;
    type: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    note: string;
  },
  optimizedImages: OptimizedWorkoutImage[],
  userId: string,
): Promise<Workout> {
  let newImageMetadata: WorkoutImage[] = [];

  if (optimizedImages.length > 0) {
    const { getWorkoutImageMetadata } = await import("@/lib/workout-images");
    newImageMetadata = optimizedImages.map(getWorkoutImageMetadata);
  }

  const images = [...(existingWorkout.images ?? []), ...newImageMetadata];

  return {
    ...existingWorkout,
    userId,
    date: input.date,
    type: input.type,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    note: input.note,
    ...(images.length > 0 ? { images } : { images: undefined }),
  };
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

async function updateAndCommitWorkout(
  workoutId: string,
  userId: string,
  input: Parameters<typeof createUpdatedWorkout>[1],
  imageFiles: File[],
) {
  const firstRead = await readWorkoutGitHubFile();

  try {
    return await updateWorkoutInGitHubFile({
      fileData: firstRead.data,
      sha: firstRead.sha,
      workoutId,
      userId,
      input,
      imageFiles,
    });
  } catch (error) {
    if (!(error instanceof GitHubJsonConflictError)) {
      throw error;
    }

    const retryRead = await readWorkoutGitHubFile();

    return updateWorkoutInGitHubFile({
      fileData: retryRead.data,
      sha: retryRead.sha,
      workoutId,
      userId,
      input,
      imageFiles,
    });
  }
}

async function updateWorkoutInGitHubFile({
  fileData,
  sha,
  workoutId,
  userId,
  input,
  imageFiles,
}: {
  fileData: Awaited<ReturnType<typeof readWorkoutGitHubFile>>["data"];
  sha: string;
  workoutId: string;
  userId: string;
  input: Parameters<typeof createUpdatedWorkout>[1];
  imageFiles: File[];
}) {
  const existingWorkout = fileData.workouts.find(
    (workout) =>
      workout.id === workoutId && isWorkoutVisibleForUser(workout, userId),
  );

  if (!existingWorkout) {
    throw new WorkoutNotFoundError();
  }

  const todayDateKey = getTodayInTimezone();

  if (
    !canUserEditWorkoutDate(userId, existingWorkout.date, todayDateKey) ||
    !canUserEditWorkoutDate(userId, input.date, todayDateKey)
  ) {
    throw new PastWorkoutEditForbiddenError();
  }

  const optimizedImages = await prepareWorkoutImages(
    imageFiles,
    input.date,
    existingWorkout.images?.length ?? 0,
  );

  const workout = await createUpdatedWorkout(
    existingWorkout,
    input,
    optimizedImages,
    userId,
  );
  const nextData = replaceWorkout(fileData, workout);

  if (optimizedImages.length === 0) {
    await commitWorkoutDataToGitHub({
      data: nextData,
      sha,
      message: `Update workout for ${workout.date}`,
    });

    return workout;
  }

  await commitWorkoutDataAndFilesToGitHub({
    data: nextData,
    expectedDataSha: sha,
    files: optimizedImages.map((image) => ({
      path: image.repositoryPath,
      content: image.buffer,
    })),
    message: `Update workout for ${workout.date}`,
  });

  return workout;
}
