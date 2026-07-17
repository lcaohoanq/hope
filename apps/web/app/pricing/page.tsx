import { PricingTable, SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing - Hope",
  description: "Upgrade to Hope Pro to edit past workouts and unlock more tracking tools.",
};

export default async function PricingPage() {
  const { userId, has } = await auth();
  const isPro = has({ plan: "pro" });
  const canEditPast = has({ feature: "past_workout_edits" });

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-app px-4 py-10 text-text sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(var(--color-accent)/0.14),_transparent_55%),linear-gradient(180deg,_oklch(var(--color-panel-muted)/0.65),_transparent_40%)]"
      />
      <div className="relative mx-auto w-full max-w-4xl">
        <nav className="mb-10 flex items-center justify-between gap-4">
          <Link
            className="font-mono text-sm font-semibold tracking-[0.14em] text-accent transition hover:opacity-80"
            href="/"
          >
            HOPE
          </Link>
          <Link
            className="text-sm font-medium text-muted transition hover:text-text"
            href="/settings/profile"
          >
            Settings
          </Link>
        </nav>

        <header className="mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Billing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {isPro ? "Manage your plan" : "Choose your plan"}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            {isPro
              ? canEditPast
                ? "You are on Pro — past workout edits and other Pro features are unlocked."
                : "You are on Pro. Manage billing below or switch plans anytime."
              : "Standard covers daily logging and your heatmap. Pro unlocks editing past workouts and more tools as they ship."}
          </p>
          {!userId ? (
            <p className="mt-4 text-sm text-muted">
              <SignInButton mode="modal">
                <button
                  className="font-semibold text-accent underline-offset-4 transition hover:underline"
                  type="button"
                >
                  Sign in
                </button>
              </SignInButton>{" "}
              to subscribe — checkout requires an account.
            </p>
          ) : null}
        </header>

        <ul className="mx-auto mb-10 grid max-w-2xl gap-3 text-left text-sm text-muted sm:grid-cols-2">
          <li className="rounded-md border border-border/80 bg-panel/60 px-4 py-3">
            <span className="font-semibold text-text">Standard</span>
            <p className="mt-1 leading-6">Log workouts, heatmap, social feed, edit today only.</p>
          </li>
          <li className="rounded-md border border-accent/25 bg-accent/5 px-4 py-3">
            <span className="font-semibold text-text">Pro</span>
            <p className="mt-1 leading-6">
              Edit any past day, PRO badge, and upcoming Pro-only features.
            </p>
          </li>
        </ul>

        <div className="mx-auto max-w-3xl">
          <PricingTable
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
              },
            }}
            for="user"
            newSubscriptionRedirectUrl="/pricing/success"
          />
        </div>
      </div>
    </main>
  );
}
