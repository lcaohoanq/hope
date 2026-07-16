import {
  cleanupUnattachedWorkoutImageAssets,
  createWorkoutComment,
  getOwnedWorkout,
  getProfileById,
  getStorageAdapter,
  getVerifiedWorkoutImageAssets,
  getWorkoutPost,
  insertWorkout,
  likeWorkout,
  listWorkoutActivityByProfile,
  listWorkoutComments,
  listWorkoutsByProfile,
  resolveProfileAccess,
  type StoredWorkout,
  type StoredWorkoutImage,
  type UploadedAsset,
  unlikeWorkout,
  updateWorkout,
} from "@hope/core";
import {
  type CreateWorkoutRequest,
  canUserEditWorkoutDate,
  createWorkoutRecord,
  getTodayInTimezone,
  MAX_WORKOUT_IMAGES,
  normalizeUserId,
  type UpdateWorkoutRequest,
  validateCommentBody,
  validateCreateWorkoutRequest,
  validateUpdateWorkoutRequest,
  type Workout,
} from "@hope/shared";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import type { AppEnv } from "../env";
import {
  invalidJson,
  jsonError,
  onboardingRequired,
  readJson,
  unauthorized,
} from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";

const TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_ACTIVITY_LIMIT = 6;
const MAX_ACTIVITY_LIMIT = 12;

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

function imageErrorStatus(error: unknown): { message: string; status: ContentfulStatusCode } {
  const message = error instanceof Error ? error.message : "Unable to process workout images.";
  const status: ContentfulStatusCode =
    error instanceof Error &&
    (error.name === "WorkoutImageValidationError" || message.startsWith("Please upload"))
      ? 400
      : 500;
  if (status === 500) console.error("Unable to process workout images.", error);
  return { message, status };
}

function parseLimit(value: string | undefined) {
  const limit = value ? Number(value) : DEFAULT_ACTIVITY_LIMIT;
  if (!Number.isInteger(limit)) return DEFAULT_ACTIVITY_LIMIT;
  return Math.min(Math.max(limit, 1), MAX_ACTIVITY_LIMIT);
}

function parseYear(value: string | undefined) {
  if (!value) return undefined;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : undefined;
}

function accessError(c: Parameters<typeof jsonError>[0], status: "not-found" | "forbidden") {
  return status === "not-found"
    ? jsonError(c, "Workout was not found.", 404)
    : jsonError(c, "You cannot view this workout.", 403);
}

export const workoutRoutes = new Hono<AppEnv>()
  .get("/workouts", async (c) => {
    const userId = normalizeUserId(c.req.query("userId"));
    if (!userId) return jsonError(c, "A valid user is required.", 400);

    try {
      const profile = await getProfileById(userId);
      if (!profile) return jsonError(c, "User was not found.", 404);

      const owner = await resolveOwner(c);
      const viewer = owner.status === "ready" ? owner.profile : undefined;
      const access = await resolveProfileAccess(profile, viewer);
      if (!access.canViewWorkouts) {
        return jsonError(c, "This profile is private.", 403, {
          reason: "private-profile",
          relationshipStatus: access.relationshipStatus,
        });
      }

      const data = await listWorkoutsByProfile(
        profile.id,
        viewer?.id === profile.id ? "all" : "public",
      );
      return c.json({ workouts: data.map(publicWorkout), settings: { timezone: TIMEZONE } });
    } catch (error) {
      console.error("Unable to load workout data.", error);
      return jsonError(c, "Unable to load workout data.", 500);
    }
  })
  .post("/workouts", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") {
      return onboardingRequired(c, "Complete onboarding before changing workouts.");
    }

    const parsed = await readJson<CreateWorkoutRequest>(c);
    if (!parsed.ok) return invalidJson(c);
    const body = parsed.body;

    const imagePublicIds = parseImagePublicIds(body.imagePublicIds);
    if (!imagePublicIds.success) return jsonError(c, imagePublicIds.error, 400);

    const validation = validateCreateWorkoutRequest(body);
    if (!validation.success) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      return jsonError(c, validation.error, 400);
    }

    let assets: UploadedAsset[];
    try {
      assets = await prepareWorkoutImageAssets(owner.profile.id, imagePublicIds.publicIds);
    } catch (error) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      const { message, status } = imageErrorStatus(error);
      return jsonError(c, message, status);
    }

    const workout = createWorkoutRecord({ ...validation.workoutInput, userId: owner.profile.id });
    try {
      const saved = await insertWorkout({ workout, assets });
      return c.json({ success: true as const, workout: publicWorkout(saved) });
    } catch (error) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      console.error("Unable to save workout.", error);
      return jsonError(c, "Unable to save workout.", 500);
    }
  })
  .patch("/workouts", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") {
      return onboardingRequired(c, "Complete onboarding before changing workouts.");
    }

    const parsed = await readJson<UpdateWorkoutRequest>(c);
    if (!parsed.ok) return invalidJson(c);
    const body = parsed.body;

    const imagePublicIds = parseImagePublicIds(body.imagePublicIds);
    if (!imagePublicIds.success) return jsonError(c, imagePublicIds.error, 400);

    const validation = validateUpdateWorkoutRequest(body);
    if (!validation.success) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      return jsonError(c, validation.error, 400);
    }

    const existing = await getOwnedWorkout(validation.workoutId, owner.profile.id);
    if (!existing) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      return jsonError(c, "Workout was not found.", 404);
    }

    const today = getTodayInTimezone();
    if (
      !canUserEditWorkoutDate(owner.profile, existing.date, today) ||
      !canUserEditWorkoutDate(owner.profile, validation.workoutInput.date, today)
    ) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      return jsonError(c, "Editing past workouts is not enabled for this user.", 403);
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
      const { message, status } = imageErrorStatus(error);
      return jsonError(c, message, status);
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
      const storage = getStorageAdapter();
      void Promise.allSettled(removedIds.map((id) => storage.delete(id))).then((results) => {
        if (results.some((result) => result.status === "rejected")) {
          console.error("Some removed workout images could not be deleted from storage.");
        }
      });
      return c.json({ success: true as const, workout: publicWorkout(saved) });
    } catch (error) {
      await safeCleanupNewAssets(owner.profile.id, imagePublicIds.publicIds);
      console.error("Unable to update workout.", error);
      return jsonError(c, "Unable to update workout.", 500);
    }
  })
  .get("/workouts/activity", async (c) => {
    const userId = normalizeUserId(c.req.query("userId"));
    if (!userId) return jsonError(c, "A valid user is required.", 400);

    try {
      const profile = await getProfileById(userId);
      if (!profile) return jsonError(c, "User was not found.", 404);

      const owner = await resolveOwner(c);
      const viewer = owner.status === "ready" ? owner.profile : undefined;
      const access = await resolveProfileAccess(profile, viewer);
      if (!access.canViewWorkouts) {
        return jsonError(c, "This profile is private.", 403, {
          reason: "private-profile",
          relationshipStatus: access.relationshipStatus,
        });
      }

      const data = await listWorkoutActivityByProfile({
        profileId: profile.id,
        visibility: viewer?.id === profile.id ? "all" : "public",
        cursor: c.req.query("cursor") ?? undefined,
        limit: parseLimit(c.req.query("limit")),
        year: parseYear(c.req.query("year")),
      });
      return c.json({ workouts: data.workouts.map(publicWorkout), nextCursor: data.nextCursor });
    } catch (error) {
      console.error("Unable to load workout activity.", error);
      return jsonError(c, "Unable to load workout activity.", 500);
    }
  })
  .get("/workouts/:workoutId", async (c) => {
    const owner = await resolveOwner(c);
    const viewerProfileId = owner.status === "ready" ? owner.profile.id : undefined;
    const post = await getWorkoutPost(c.req.param("workoutId"), viewerProfileId);
    if (post.status !== "ready") return accessError(c, post.status);
    return c.json({ success: true as const, ...post });
  })
  .get(
    "/workouts/:workoutId/comments",
    validated("query", z.object({ cursor: z.string().optional() })),
    async (c) => {
      const owner = await resolveOwner(c);
      const viewerProfileId = owner.status === "ready" ? owner.profile.id : undefined;
      const { cursor } = c.req.valid("query");
      const result = await listWorkoutComments(c.req.param("workoutId"), viewerProfileId, cursor);
      if (result.status !== "ready") return accessError(c, result.status);
      return c.json({ success: true as const, ...result });
    },
  )
  .post(
    "/workouts/:workoutId/comments",
    validated("json", z.object({ body: z.string() })),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const { body } = c.req.valid("json");
      const validated = validateCommentBody(body);
      if (!validated.success) return jsonError(c, validated.error, 400);

      const result = await createWorkoutComment(
        c.req.param("workoutId"),
        owner.profile.id,
        validated.body,
      );
      if (result.status !== "ready") return accessError(c, result.status);
      return c.json({ success: true as const, comment: result.comment }, 201);
    },
  )
  .post("/workouts/:workoutId/like", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const result = await likeWorkout(c.req.param("workoutId"), owner.profile.id);
    if (result.status !== "ready") return accessError(c, result.status);
    return c.json({ success: true as const, ...result });
  })
  .delete("/workouts/:workoutId/like", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const result = await unlikeWorkout(c.req.param("workoutId"), owner.profile.id);
    if (result.status !== "ready") return accessError(c, result.status);
    return c.json({ success: true as const, ...result });
  });
