import { listNotifications, markNotificationsRead } from "@hope/core";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { invalidJson, onboardingRequired, readJson, unauthorized } from "../lib/responses";
import { resolveOwner } from "../middleware/auth";

export const notificationRoutes = new Hono<AppEnv>()
  .get("/notifications", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const cursor = c.req.query("cursor") ?? undefined;
    return c.json({
      success: true as const,
      ...(await listNotifications(owner.profile.id, cursor)),
    });
  })
  .patch("/notifications", async (c) => {
    const owner = await resolveOwner(c);
    if (owner.status === "signed-out") return unauthorized(c);
    if (owner.status === "onboarding") return onboardingRequired(c);

    const parsed = await readJson<{ notificationId?: unknown }>(c);
    if (!parsed.ok) return invalidJson(c);

    const notificationId =
      typeof parsed.body?.notificationId === "string" ? parsed.body.notificationId : undefined;
    await markNotificationsRead(owner.profile.id, notificationId);
    return c.json({ success: true as const });
  });
