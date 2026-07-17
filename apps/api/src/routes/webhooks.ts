import { verifyWebhook } from "@clerk/backend/webhooks";
import { syncHopePlanFromClerkBillingEvent } from "@hope/core";
import { Hono } from "hono";
import type { AppEnv } from "../env";

/**
 * Clerk Billing webhooks (B2C).
 * Prefer this URL in Docker/Traefik: `POST /api/webhooks/clerk` → API `/webhooks/clerk`.
 *
 * @see clerk-billing skill → references/billing-webhooks.md
 */
export const webhookRoutes = new Hono<AppEnv>().post("/webhooks/clerk", async (c) => {
  const signingSecret = c.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is not configured");
    return c.json({ success: false as const, error: "Webhook not configured." }, 500);
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(c.req.raw, { signingSecret });
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return c.json({ success: false as const, error: "Verification failed." }, 400);
  }

  await syncHopePlanFromClerkBillingEvent(event);
  return c.json({ success: true as const });
});
