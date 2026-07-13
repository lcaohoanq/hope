import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import {
  cleanupUploadedAssets,
  deleteImage,
  getWorkoutImagePublicId,
  uploadImageBuffer,
  type UploadedAsset,
} from "@/lib/cloudinary";
import { getTodayInTimezone } from "@/lib/date-utils";
import { getProfileById } from "@/lib/repositories/profiles";
import {
  getOwnedWorkout,
  insertWorkout,
  listWorkoutsByProfile,
  updateWorkout,
  type StoredWorkout,
  type StoredWorkoutImage,
} from "@/lib/repositories/workouts";
import {
  MAX_WORKOUT_IMAGES,
  optimizeWorkoutImage,
  validateWorkoutImageUpload,
  type OptimizedWorkoutImage,
} from "@/lib/workout-images";
import type { CreateWorkoutRequest, UpdateWorkoutRequest, Workout } from "@/lib/workout-types";
import { createWorkoutRecord, validateCreateWorkoutRequest, validateUpdateWorkoutRequest } from "@/lib/workout-utils";
import { canUserEditWorkoutDate, normalizeUserId } from "@/lib/users";

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
  };
}

export async function GET(request: Request) {
  const userId = normalizeUserId(new URL(request.url).searchParams.get("userId"));
  if (!userId) return NextResponse.json({ success: false, error: "A valid user is required." }, { status: 400 });
  try {
    const profile = await getProfileById(userId);
    if (!profile) return NextResponse.json({ success: false, error: "User was not found." }, { status: 404 });
    const data = await listWorkoutsByProfile(profile.id);
    return NextResponse.json({ workouts: data.map(publicWorkout), settings: { timezone: TIMEZONE } });
  } catch (error) {
    console.error("Unable to load workout data.", error);
    return NextResponse.json({ success: false, error: "Unable to load workout data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();

  let payload: Awaited<ReturnType<typeof parseCreateWorkoutPayload>>;
  try {
    payload = await parseCreateWorkoutPayload(request);
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON or multipart form data." }, { status: 400 });
  }
  const validation = validateCreateWorkoutRequest(payload.body);
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });

  let optimizedImages: OptimizedWorkoutImage[];
  try {
    optimizedImages = await prepareWorkoutImages(payload.imageFiles, validation.workoutInput.date);
  } catch (error) {
    return imageError(error);
  }

  const workout = createWorkoutRecord({ ...validation.workoutInput, userId: owner.profile.id });
  let assets: UploadedAsset[] = [];
  try {
    assets = await uploadWorkoutImages(optimizedImages, owner.profile.id, workout.id, 0);
    const saved = await insertWorkout({ workout, assets });
    return NextResponse.json({ success: true, workout: publicWorkout(saved) });
  } catch (error) {
    await cleanupUploadedAssets(assets.map((asset) => asset.publicId));
    console.error("Unable to save workout.", error);
    return NextResponse.json({ success: false, error: "Unable to save workout." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out") return unauthorized();
  if (owner.status === "onboarding") return onboardingRequired();

  let payload: Awaited<ReturnType<typeof parseUpdateWorkoutPayload>>;
  try {
    payload = await parseUpdateWorkoutPayload(request);
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON or multipart form data." }, { status: 400 });
  }
  const validation = validateUpdateWorkoutRequest(payload.body);
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });

  const existing = await getOwnedWorkout(validation.workoutId, owner.profile.id);
  if (!existing) return NextResponse.json({ success: false, error: "Workout was not found." }, { status: 404 });

  const today = getTodayInTimezone();
  if (!canUserEditWorkoutDate(owner.profile, existing.date, today) || !canUserEditWorkoutDate(owner.profile, validation.workoutInput.date, today)) {
    return NextResponse.json({ success: false, error: "Editing past workouts is not enabled for this user." }, { status: 403 });
  }

  const retained = getRetainedImages(existing, validation.imageSrcs);
  let optimizedImages: OptimizedWorkoutImage[];
  try {
    optimizedImages = await prepareWorkoutImages(payload.imageFiles, validation.workoutInput.date, retained.length);
  } catch (error) {
    return imageError(error);
  }

  const nextWorkout: Workout = { ...existing, ...validation.workoutInput, userId: owner.profile.id };
  let newAssets: UploadedAsset[] = [];
  try {
    newAssets = await uploadWorkoutImages(optimizedImages, owner.profile.id, existing.id, retained.length);
    const saved = await updateWorkout({ existing, workout: nextWorkout, retainedImages: retained, newAssets });
    const retainedIds = new Set(retained.map((image) => image.publicId));
    const removedIds = existing.storedImages.filter((image) => !retainedIds.has(image.publicId)).map((image) => image.publicId);
    void Promise.allSettled(removedIds.map(deleteImage)).then((results) => {
      if (results.some((result) => result.status === "rejected")) console.error("Some removed workout images could not be deleted from Cloudinary.");
    });
    return NextResponse.json({ success: true, workout: publicWorkout(saved) });
  } catch (error) {
    await cleanupUploadedAssets(newAssets.map((asset) => asset.publicId));
    console.error("Unable to update workout.", error);
    return NextResponse.json({ success: false, error: "Unable to update workout." }, { status: 500 });
  }
}

async function parseCreateWorkoutPayload(request: Request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data")) {
    return { body: (await request.json()) as CreateWorkoutRequest, imageFiles: [] as File[] };
  }
  const formData = await request.formData();
  return {
    body: formDataToWorkoutBody(formData),
    imageFiles: getImageFiles(formData),
  };
}

async function parseUpdateWorkoutPayload(request: Request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data")) {
    return { body: (await request.json()) as UpdateWorkoutRequest, imageFiles: [] as File[] };
  }
  const formData = await request.formData();
  return {
    body: { ...formDataToWorkoutBody(formData), id: formData.get("id"), imageSrcs: formData.getAll("imageSrcs") },
    imageFiles: getImageFiles(formData),
  };
}

function formDataToWorkoutBody(formData: FormData): CreateWorkoutRequest {
  return {
    date: formData.get("date"),
    type: formData.get("type"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    note: formData.get("note"),
  };
}

function getImageFiles(formData: FormData) {
  return formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
}

async function prepareWorkoutImages(imageFiles: File[], workoutDate: string, existingCount = 0) {
  if (existingCount + imageFiles.length > MAX_WORKOUT_IMAGES) throw new Error(`Please upload no more than ${MAX_WORKOUT_IMAGES} images per workout.`);
  const images: OptimizedWorkoutImage[] = [];
  for (const file of imageFiles) {
    validateWorkoutImageUpload(file);
    images.push(await optimizeWorkoutImage({ buffer: Buffer.from(await file.arrayBuffer()), workoutDate, originalMimeType: file.type }));
  }
  return images;
}

async function uploadWorkoutImages(images: OptimizedWorkoutImage[], profileId: string, workoutId: string, offset: number) {
  const assets: UploadedAsset[] = [];
  try {
    for (const [index, image] of images.entries()) {
      const publicId = `${getWorkoutImagePublicId(profileId, workoutId, offset + index)}-${randomUUID()}`;
      assets.push(await uploadImageBuffer(image.buffer, publicId));
    }
    return assets;
  } catch (error) {
    await cleanupUploadedAssets(assets.map((asset) => asset.publicId));
    throw error;
  }
}

function getRetainedImages(workout: StoredWorkout, retainedSrcs?: string[]): StoredWorkoutImage[] {
  if (!retainedSrcs) return workout.storedImages;
  const srcs = new Set(retainedSrcs);
  return workout.storedImages.filter((image) => srcs.has(image.src));
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
}

function onboardingRequired() {
  return NextResponse.json({ success: false, error: "Complete onboarding before changing workouts." }, { status: 403 });
}

function imageError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to process workout images.";
  const status = error instanceof Error && (error.name === "WorkoutImageValidationError" || message.startsWith("Please upload")) ? 400 : 500;
  if (status === 500) console.error("Unable to process workout images.", error);
  return NextResponse.json({ success: false, error: message }, { status });
}
