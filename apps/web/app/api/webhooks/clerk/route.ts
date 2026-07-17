import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { syncHopePlanFromClerkBillingEvent } from "@hope/core";
import type { NextRequest } from "next/server";

/**
 * Clerk Billing webhooks (skill-recommended Next.js handler).
 *
 * Use when Clerk can reach the Next app directly (e.g. `next dev` on :3000).
 * Self-host via Traefik should prefer the API endpoint instead:
 * `POST /api/webhooks/clerk` → Hono `apps/api` (path prefix stripped).
 *
 * Requires `CLERK_WEBHOOK_SIGNING_SECRET` and `DATABASE_URL` on the web process.
 */
export async function POST(req: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return new Response("Verification failed", { status: 400 });
  }

  try {
    await syncHopePlanFromClerkBillingEvent(event);
  } catch (error) {
    console.error("Clerk billing plan sync failed", error);
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
