import { deleteWorkoutComment, updateWorkoutComment } from "@hope/core";
import { validateCommentBody } from "@hope/shared";
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
  commentBodySchema,
  jsonResponse,
  successTrueSchema,
  workoutCommentSchema,
} from "../openapi";

function resultError(c: Parameters<typeof jsonError>[0], status: "not-found" | "forbidden") {
  return status === "not-found"
    ? jsonError(c, "Comment was not found.", 404)
    : jsonError(c, "You cannot change this comment.", 403);
}

const updateCommentResponseSchema = z.object({
  success: z.literal(true),
  comment: workoutCommentSchema,
});

const deleteCommentResponseSchema = successTrueSchema.extend({
  workoutId: z.string(),
});

export const commentRoutes = new Hono<AppEnv>()
  .patch(
    "/comments/:commentId",
    describeRoute({
      tags: ["Comments"],
      summary: "Update a workout comment",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(updateCommentResponseSchema, "Updated comment"),
        ...authErrorResponses,
      },
    }),
    validated("json", commentBodySchema),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const { body } = c.req.valid("json");
      const parsed = validateCommentBody({ body });
      if (!parsed.success) return jsonError(c, parsed.error, 400);

      const commentId = c.req.param("commentId")!;
      const result = await updateWorkoutComment(commentId, owner.profile.id, parsed.body);
      if (result.status !== "ready") return resultError(c, result.status);
      return c.json({ success: true as const, comment: result.comment });
    },
  )
  .delete(
    "/comments/:commentId",
    describeRoute({
      tags: ["Comments"],
      summary: "Delete a workout comment",
      security: [...bearerSecurity],
      responses: {
        200: jsonResponse(deleteCommentResponseSchema, "Deleted comment"),
        ...authErrorResponses,
      },
    }),
    async (c) => {
      const owner = await resolveOwner(c);
      if (owner.status === "signed-out") return unauthorized(c);
      if (owner.status === "onboarding") return onboardingRequired(c);

      const result = await deleteWorkoutComment(c.req.param("commentId")!, owner.profile.id);
      if (result.status !== "ready") return resultError(c, result.status);
      return c.json({ success: true as const, workoutId: result.workoutId });
    },
  );
