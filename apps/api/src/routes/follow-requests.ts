import { respondToFollowRequest } from "@hope/core";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { jsonError, onboardingRequired, unauthorized } from "../lib/responses";
import { validated } from "../lib/validate";
import { resolveOwner } from "../middleware/auth";

export const followRequestRoutes = new Hono<AppEnv>().patch(
  "/follow-requests/:profileId",
  validated("json", z.object({ action: z.enum(["accept", "decline"]) })),
  async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const { action } = c.req.valid("json");
    const updated = await respondToFollowRequest(
      owner.profile.id,
      c.req.param("profileId"),
      action,
    );
    return updated
      ? c.json({ success: true as const })
      : jsonError(c, "Follow request was not found.", 404);
  },
);
