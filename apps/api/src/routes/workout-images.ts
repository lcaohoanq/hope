import type { StoredFile } from "@hope/core";
import {
  cleanupUnattachedWorkoutImageAssets,
  createWorkoutImageUploadTickets,
  getStorageAdapter,
  isOwnedWorkoutImagePublicId,
} from "@hope/core";
import {
  ALLOWED_WORKOUT_IMAGE_MIME_TYPES,
  MAX_WORKOUT_IMAGE_BYTES,
  MAX_WORKOUT_IMAGES,
} from "@hope/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import {
  authErrorResponses,
  bearerSecurity,
  jsonResponse,
  workoutImagesCreateBodySchema,
  workoutImagesDeleteBodySchema,
} from "../openapi";

function parsePublicIds(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_WORKOUT_IMAGES) return null;
  if (!value.every((publicId) => typeof publicId === "string" && publicId.length > 0)) return null;
  const publicIds = value as string[];
  return new Set(publicIds).size === publicIds.length ? publicIds : null;
}

const ticketsResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .passthrough();

const cleanupResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .passthrough();

const uploadResponseSchema = z.object({
  success: z.literal(true),
  assets: z.array(
    z.object({
      key: z.string(),
      url: z.string(),
      contentType: z.string().optional(),
    }),
  ),
});

export const workoutImageRoutes = new Hono<AppEnv>()
  .post(
    "/workout-images",
    describeRoute({
      tags: ["Workouts"],
      summary: "Create workout image upload tickets (Cloudinary)",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(ticketsResponseSchema, "Upload tickets"),
        ...authErrorResponses,
      },
    }),
    validated("json", workoutImagesCreateBodySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before uploading workout images.");
      }

      const { count } = c.req.valid("json");
      if (
        typeof count !== "number" ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > MAX_WORKOUT_IMAGES
      ) {
        return jsonError(c, `Upload count must be between 1 and ${MAX_WORKOUT_IMAGES}.`, 400);
      }

      try {
        return c.json({
          success: true as const,
          ...(await createWorkoutImageUploadTickets(owner.profile.id, count)),
        });
      } catch (error) {
        console.error("Unable to create workout image upload tickets.", error);
        return jsonError(c, "Unable to prepare workout image uploads.", 500);
      }
    },
  )
  .delete(
    "/workout-images",
    describeRoute({
      tags: ["Workouts"],
      summary: "Clean up unattached workout image uploads",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(cleanupResponseSchema, "Cleanup result"),
        ...authErrorResponses,
      },
    }),
    validated("json", workoutImagesDeleteBodySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before uploading workout images.");
      }

      const { publicIds: rawIds } = c.req.valid("json");
      const publicIds = parsePublicIds(rawIds);
      if (!publicIds) {
        return jsonError(c, `Provide between 1 and ${MAX_WORKOUT_IMAGES} unique image ids.`, 400);
      }
      if (!publicIds.every((publicId) => isOwnedWorkoutImagePublicId(owner.profile.id, publicId))) {
        return jsonError(c, "One or more workout image ids are invalid.", 400);
      }

      try {
        const cleanup = await cleanupUnattachedWorkoutImageAssets(owner.profile.id, publicIds);
        return c.json({ success: true as const, ...cleanup });
      } catch (error) {
        console.error("Unable to clean up workout image uploads.", error);
        return jsonError(c, "Unable to clean up workout image uploads.", 500);
      }
    },
  )
  .post(
    "/workout-images/upload",
    describeRoute({
      tags: ["Workouts"],
      summary: "Upload workout images (multipart, MinIO)",
      security: [...bearerSecurity],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                files: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse(uploadResponseSchema, "Uploaded assets"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") {
        return onboardingRequired(c, "Complete onboarding before uploading workout images.");
      }

      let formData: FormData;
      try {
        formData = await c.req.formData();
      } catch {
        return jsonError(c, "Request body must be multipart form data.", 400);
      }

      const files: File[] = [];
      for (const [, value] of formData.entries()) {
        if (value instanceof File) files.push(value);
      }

      if (files.length === 0 || files.length > MAX_WORKOUT_IMAGES) {
        return jsonError(c, `Provide between 1 and ${MAX_WORKOUT_IMAGES} images.`, 400);
      }

      for (const file of files) {
        if (!ALLOWED_WORKOUT_IMAGE_MIME_TYPES.has(file.type)) {
          return jsonError(c, "Please upload JPG, PNG, WebP, HEIC, or HEIF images only.", 400);
        }
        if (file.size > MAX_WORKOUT_IMAGE_BYTES) {
          return jsonError(c, "Each workout image must be 10MB or smaller.", 400);
        }
      }

      const adapter = getStorageAdapter();
      const assets: StoredFile[] = [];

      try {
        for (const file of files) {
          const data = new Uint8Array(await file.arrayBuffer());
          const key = `workouts/${owner.profile.id}/${crypto.randomUUID()}`;
          const stored = await adapter.upload({ key, data, contentType: file.type });
          assets.push(stored);
        }
      } catch (error) {
        await Promise.allSettled(assets.map((asset) => adapter.delete(asset.key)));
        console.error("Unable to upload workout images.", error);
        return jsonError(c, "Unable to upload workout images.", 500);
      }

      return c.json({ success: true as const, assets });
    },
  );
