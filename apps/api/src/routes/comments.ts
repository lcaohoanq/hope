import { deleteWorkoutComment, updateWorkoutComment } from "@hope/core";
import { validateCommentBody } from "@hope/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";

function resultError(c: Parameters<typeof jsonError>[0], status: "not-found" | "forbidden") {
  return status === "not-found"
    ? jsonError(c, "Comment was not found.", 404)
    : jsonError(c, "You cannot change this comment.", 403);
}

export const commentRoutes = new Hono<AppEnv>()
  .patch("/comments/:commentId", validated("json", z.object({ body: z.string() })), async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const { body } = c.req.valid("json");
    const validated = validateCommentBody(body);
    if (!validated.success) return jsonError(c, validated.error, 400);

    const result = await updateWorkoutComment(
      c.req.param("commentId"),
      owner.profile.id,
      validated.body,
    );
    if (result.status !== "ready") return resultError(c, result.status);
    return c.json({ success: true as const, comment: result.comment });
  })
  .delete("/comments/:commentId", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const result = await deleteWorkoutComment(c.req.param("commentId"), owner.profile.id);
    if (result.status !== "ready") return resultError(c, result.status);
    return c.json({ success: true as const, workoutId: result.workoutId });
  });
