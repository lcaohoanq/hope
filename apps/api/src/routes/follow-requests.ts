import { respondToFollowRequest } from "@hope/core";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";
import {
  authErrorResponses,
  bearerSecurity,
  followRequestBodySchema,
  jsonResponse,
  successTrueSchema,
} from "../openapi";

export const followRequestRoutes = new Hono<AppEnv>().patch(
  "/follow-requests/:profileId",
  describeRoute({
    tags: ["Profiles"],
    summary: "Accept or decline a follow request",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(successTrueSchema, "Request handled"),
      ...authErrorResponses,
    },
  }),
  validated("json", followRequestBodySchema),
  async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const { action } = c.req.valid("json");
    const updated = await respondToFollowRequest(
      owner.profile.id,
      c.req.param("profileId")!,
      action,
    );
    return updated
      ? c.json({ success: true as const })
      : jsonError(c, "Follow request was not found.", 404);
  },
);
