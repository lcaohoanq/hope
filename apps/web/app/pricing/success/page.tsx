import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Subscription updated - Hope",
};

export const dynamic = "force-dynamic";

/**
 * Post-checkout landing (Clerk Billing B2C).
 * Session entitlements update before the DB webhook finishes — prefer `has()`.
 */
export default async function PricingSuccessPage() {
  const { userId, has } = await auth();
  if (!userId) {
    redirect(`/login?next=${encodeURIComponent("/pricing/success")}`);
  }

  const isPro = has({ plan: "pro" });
  const canEditPast = has({ feature: "past_workout_edits" });

  if (!isPro) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-app px-4 text-text">
        <div className="max-w-md text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Billing</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Activating Pro…</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Payment succeeded. Waiting for your session to refresh with the Pro plan. If this stays,
            open Pricing and confirm your subscription, or reload in a moment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast"
              href="/pricing"
            >
              Back to pricing
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-muted"
              href="/"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-app px-4 text-text">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Pro</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">You are on Hope Pro</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          {canEditPast
            ? "Past workout edits are unlocked. Head back to your heatmap to update older days."
            : "Your Pro plan is active. Feature entitlements will appear as soon as the session finishes syncing."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast"
            href="/"
          >
            Go to dashboard
          </Link>
          <Link
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-muted"
            href="/pricing"
          >
            Manage plan
          </Link>
        </div>
      </div>
    </main>
  );
}
