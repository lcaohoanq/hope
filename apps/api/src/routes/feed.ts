import { listFeedWorkouts } from "@hope/core";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { onboardingRequired, unauthorized } from "../lib/responses";
import { resolveOwner } from "../middleware/auth";

export const feedRoutes = new Hono<AppEnv>().get("/feed", async (c) => {
  const owner = await resolveOwner(c);
  if (owner.status === "signed-out") return unauthorized(c);
  if (owner.status === "onboarding") return onboardingRequired(c);

  const cursor = c.req.query("cursor") ?? undefined;
  const result = await listFeedWorkouts(owner.profile.id, cursor);
  return c.json({ success: true as const, ...result });
});
