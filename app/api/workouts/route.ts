import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { deleteImage, getVerifiedWorkoutImageAssets, type UploadedAsset } from "@/lib/cloudinary";
import { getTodayInTimezone } from "@/lib/date-utils";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getProfileById } from "@/lib/repositories/profiles";
import {
  getOwnedWorkout,
  insertWorkout,
  listWorkoutsByProfile,
  type StoredWorkout,
  type StoredWorkoutImage,
  updateWorkout,
} from "@/lib/repositories/workouts";
import { canUserEditWorkoutDate, normalizeUserId } from "@/lib/users";
import { cleanupUnattachedWorkoutImageAssets } from "@/lib/workout-image-assets";
import { MAX_WORKOUT_IMAGES } from "@/lib/workout-images";
import type { CreateWorkoutRequest, UpdateWorkoutRequest, Workout } from "@/lib/workout-types";
import {
  createWorkoutRecord,
  validateCreateWorkoutRequest,
  validateUpdateWorkoutRequest,
} from "@/lib/workout-utils";

export const runtime = "nodejs";
const TIMEZONE = "Asia/Ho_Chi_Minh";

function publicWorkout(workout: StoredWorkout): Workout {
  return {
    id: workout.id,
    userId: workout.userId,
    date: workout.date,
    type: workout.type,
    startTime: workout.startTime,
    endTime: workout.endTime,
    durationMinutes: workout.durationMinutes,
    note: workout.note,
    images: workout.images,
    createdAt: workout.createdAt,
    isPublic: workout.isPublic,
  };
}

export async function GET(request: Request) {
  const userId = normalizeUserId(new URL(request.url).searchParams.get("userId"));
  if (!userId)
    return NextResponse.json(
      { success: false, error: "A valid user is required." },
      { status: 400 },
    );
  try {
    const profile = await getProfileById(userId);
    if (!profile)
      return NextResponse.json({ success: false, error: "User was not found." }, { status: 404 });
    const owner = await resolveOwner();
    const viewer = owner.status === "ready" ? owner.profile : undefined;
    const access = await resolveProfileAccess(profile, viewer);
    if (!access.canViewWorkouts) {
      return NextResponse.json(
        {
          success: false,
          error: "This profile is private.",
          reason: "private-profile",
          relationshipStatus: access.relationshipStatus,
        },
        { status: 403 },
      );
    }
    const data = await listWorkoutsByProfile(
      profile.id,
      viewer?.id === profile.id ? "all" : "public",
    );
    return NextResponse.json({
      workouts: data.map(publicWorkout),
      settings: { timezone: TIMEZONE },
    });
  } catch (error) {
    console.error("Unable to load workout data.", error);
    return NextResponse.json(
      { success: false, error: "Unable to load workout data." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();

  let body: CreateWorkoutRequest;
  try {
    body = (await request.json()) as CreateWorkoutRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const imagePublicIds = parseImagePublicIds(body.imagePublicIds);
  if (!imagePublicIds.success) {
    return NextResponse.json({ success: false, error: imagePublicIds.error }, { status: 400 });
  }

  const validation = validateCreateWorkoutRequest(body);
  if (!validation.success) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  let assets: UploadedAsset[];
  try {
    assets = await prepareWorkoutImageAssets(owner.profile.id, imagePublicIds.publicIds);
  } catch (error) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    return imageError(error);
  }

  const workout = createWorkoutRecord({ ...validation.workoutInput, userId: owner.profile.id });
  try {
    const saved = await insertWorkout({ workout, assets });
    return NextResponse.json({ success: true, workout: publicWorkout(saved) });
  } catch (error) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    console.error("Unable to save workout.", error);
    return NextResponse.json({ success: false, error: "Unable to save workout." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();

  let body: UpdateWorkoutRequest;
  try {
    body = (await request.json()) as UpdateWorkoutRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const imagePublicIds = parseImagePublicIds(body.imagePublicIds);
  if (!imagePublicIds.success) {
    return NextResponse.json({ success: false, error: imagePublicIds.error }, { status: 400 });
  }

  const validation = validateUpdateWorkoutRequest(body);
  if (!validation.success) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const existing = await getOwnedWorkout(validation.workoutId, owner.profile.id);
  if (!existing) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    return NextResponse.json({ success: false, error: "Workout was not found." }, { status: 404 });
  }

  const today = getTodayInTimezone();
  if (
    !canUserEditWorkoutDate(owner.profile, existing.date, today) ||
    !canUserEditWorkoutDate(owner.profile, validation.workoutInput.date, today)
  ) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    return NextResponse.json(
      { success: false, error: "Editing past workouts is not enabled for this user." },
      { status: 403 },
    );
  }

  const retained = getRetainedImages(existing, validation.imageSrcs);
  let newAssets: UploadedAsset[];
  try {
    newAssets = await prepareWorkoutImageAssets(
      owner.profile.id,
      imagePublicIds.publicIds,
      retained.length,
    );
  } catch (error) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    return imageError(error);
  }

  const nextWorkout: Workout = {
    ...existing,
    ...validation.workoutInput,
    userId: owner.profile.id,
  };
  try {
    const saved = await updateWorkout({
      existing,
      workout: nextWorkout,
      retainedImages: retained,
      newAssets,
    });
    const retainedIds = new Set(retained.map((image) => image.publicId));
    const removedIds = existing.storedImages
      .filter((image) => !retainedIds.has(image.publicId))
      .map((image) => image.publicId);
    void Promise.allSettled(removedIds.map(deleteImage)).then((results) => {
      if (results.some((result) => result.status === "rejected"))
        console.error("Some removed workout images could not be deleted from Cloudinary.");
    });
    return NextResponse.json({ success: true, workout: publicWorkout(saved) });
  } catch (error) {
    await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
    console.error("Unable to update workout.", error);
    return NextResponse.json(
      { success: false, error: "Unable to update workout." },
      { status: 500 },
    );
  }
}

function parseImagePublicIds(value: unknown) {
  if (typeof value === "undefined") {
    return { success: true as const, publicIds: [] as string[] };
  }

  if (
    !Array.isArray(value) ||
    value.length > MAX_WORKOUT_IMAGES ||
    !value.every((publicId) => typeof publicId === "string" && publicId.length > 0)
  ) {
    return {
      success: false as const,
      error: `Please upload no more than ${MAX_WORKOUT_IMAGES} valid images per workout.`,
    };
  }

  const publicIds = value as string[];

  if (new Set(publicIds).size !== publicIds.length) {
    return { success: false as const, error: "Workout image uploads must be unique." };
  }

  return { success: true as const, publicIds };
}

async function prepareWorkoutImageAssets(
  profileId: string,
  publicIds: string[],
  existingCount = 0,
) {
  if (existingCount + publicIds.length > MAX_WORKOUT_IMAGES) {
    throw new Error(`Please upload no more than ${MAX_WORKOUT_IMAGES} images per workout.`);
  }

  return getVerifiedWorkoutImageAssets(profileId, publicIds);
}

async function safeCleanupNewAssets(profileId: string, publicIds: string[]) {
  if (publicIds.length === 0) return;

  try {
    await cleanupUnattachedWorkoutImageAssets(profileId, publicIds);
  } catch (error) {
    console.error("Unable to clean up new workout images.", error);
  }
}

function getRetainedImages(workout: StoredWorkout, retainedSrcs?: string[]): StoredWorkoutImage[] {
  if (!retainedSrcs) return workout.storedImages;
  const srcs = new Set(retainedSrcs);
  return workout.storedImages.filter((image) => srcs.has(image.src));
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Authentication is required." },
    { status: 401 },
  );
}

function onboardingRequired() {
  return NextResponse.json(
    { success: false, error: "Complete onboarding before changing workouts." },
    { status: 403 },
  );
}

function imageError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to process workout images.";
  const status =
    error instanceof Error &&
    (error.name === "WorkoutImageValidationError" || message.startsWith("Please upload"))
      ? 400
      : 500;
  if (status === 500) console.error("Unable to process workout images.", error);
  return NextResponse.json({ success: false, error: message }, { status });
}
