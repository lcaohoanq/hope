import {
  createActivityType,
  deactivateActivityType,
  listActivityTypes,
  recomputeAllWorkoutPoints,
  updateActivityType,
} from "@hope/core";
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
  jsonRequestBody,
  jsonResponse,
  publicSecurity,
} from "../openapi";

const localizedTextSchema = z.object({
  en: z.string().min(1),
  vi: z.string().min(1),
});

const activityTypeSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    label: localizedTextSchema,
    weight: z.number().int(),
    sortOrder: z.number().int(),
    isActive: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough()
  .meta({ ref: "ActivityType" });

const listResponseSchema = z.object({
  success: z.literal(true),
  activityTypes: z.array(activityTypeSchema),
});

const mutationResponseSchema = z.object({
  success: z.literal(true),
  activityType: activityTypeSchema,
});

const createBodySchema = z.object({
  slug: z.string().min(1),
  label: localizedTextSchema,
  weight: z.number().int().positive(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z.object({
  slug: z.string().min(1).optional(),
  label: localizedTextSchema.optional(),
  weight: z.number().int().positive().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const listQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional(),
});

async function requireAdmin(c: Parameters<typeof resolveOwner>[0]) {
  const owner = await resolveOwner(c);
  if (owner.status === "signed-out") return { error: unauthorized(c) as Response };
  if (owner.status === "onboarding") return { error: onboardingRequired(c) as Response };
  if (owner.profile.role !== "admin") {
    return { error: jsonError(c, "Admin access required.", 403) as Response };
  }
  return { owner };
}

export const activityTypeRoutes = new Hono<AppEnv>()
  .get(
    "/activity-types",
    describeRoute({
      tags: ["ActivityTypes"],
      summary: "List activity types (active by default; admin can include inactive)",
      security: [...publicSecurity],
      responses: {
        200: jsonResponse(listResponseSchema, "Activity types"),
      },
    }),
    validated("query", listQuerySchema),
    async (c) => {
      const includeInactive = c.req.valid("query").includeInactive === "true";
      let activeOnly = true;
      if (includeInactive) {
        const admin = await requireAdmin(c);
        if ("error" in admin && admin.error) return admin.error;
        activeOnly = false;
      }

      const types = await listActivityTypes({ activeOnly });
      return c.json({ success: true as const, activityTypes: types });
    },
  )
  .post(
    "/activity-types",
    describeRoute({
      tags: ["ActivityTypes"],
      summary: "Create an activity type (admin)",
      security: [...bearerSecurity],
      requestBody: jsonRequestBody(createBodySchema),
      responses: {
        200: jsonResponse(mutationResponseSchema, "Created activity type"),
        ...authErrorResponses,
      },
    }),
    validated("json", createBodySchema),
    async (c) => {
      const admin = await requireAdmin(c);
      if ("error" in admin && admin.error) return admin.error;

      const result = await createActivityType(c.req.valid("json"));
      if (!result.success) return jsonError(c, result.error, 400);
      return c.json({ success: true as const, activityType: result.activityType });
    },
  )
  .post(
    "/activity-types/recompute-points",
    describeRoute({
      tags: ["ActivityTypes"],
      summary: "Recompute all workout points from current type weights (admin)",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(
          z.object({ success: z.literal(true), updated: z.number() }),
          "Recompute result",
        ),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const admin = await requireAdmin(c);
      if ("error" in admin && admin.error) return admin.error;

      const result = await recomputeAllWorkoutPoints();
      return c.json(result);
    },
  )
  .patch(
    "/activity-types/:id",
    describeRoute({
      tags: ["ActivityTypes"],
      summary: "Update an activity type (admin)",
      security: [...bearerSecurity],
      requestBody: jsonRequestBody(updateBodySchema),
      responses: {
        200: jsonResponse(mutationResponseSchema, "Updated activity type"),
        ...authErrorResponses,
      },
    }),
    validated("param", idParamSchema),
    validated("json", updateBodySchema),
    async (c) => {
      const admin = await requireAdmin(c);
      if ("error" in admin && admin.error) return admin.error;

      const result = await updateActivityType(c.req.valid("param").id, c.req.valid("json"));
      if (!result.success) {
        const status = result.error.includes("not found") ? 404 : 400;
        return jsonError(c, result.error, status);
      }
      return c.json({ success: true as const, activityType: result.activityType });
    },
  )
  .delete(
    "/activity-types/:id",
    describeRoute({
      tags: ["ActivityTypes"],
      summary: "Soft-delete (deactivate) an activity type (admin)",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(mutationResponseSchema, "Deactivated activity type"),
        ...authErrorResponses,
      },
    }),
    validated("param", idParamSchema),
    async (c) => {
      const admin = await requireAdmin(c);
      if ("error" in admin && admin.error) return admin.error;

      const result = await deactivateActivityType(c.req.valid("param").id);
      if (!result.success) {
        const status = result.error.includes("not found") ? 404 : 400;
        return jsonError(c, result.error, status);
      }
      return c.json({ success: true as const, activityType: result.activityType });
    },
  );
