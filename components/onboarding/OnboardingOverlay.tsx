"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { createAvatarSeed, getAvatarUrl } from "@/lib/profile-utils";
import type { UserProfile } from "@/lib/workout-types";

type OnboardingOverlayProps = {
  currentYear: number;
  onComplete: (profile: UserProfile) => void;
};

const onboardingSteps = ["Name", "Birth year"] as const;
const initialAvatarSeed = "profile-preview";
const stepContentTransition = {
  duration: 0.46,
  ease: [0.16, 1, 0.3, 1],
} as const;

export function OnboardingOverlay({
  currentYear,
  onComplete,
}: OnboardingOverlayProps) {
  const [step, setStep] = useState<"name" | "birthYear">("name");
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(initialAvatarSeed);
  const [error, setError] = useState("");
  const avatarUrl = useMemo(() => getAvatarUrl(avatarSeed), [avatarSeed]);
  const currentStepIndex = step === "name" ? 0 : 1;

  function handleNameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = displayName.trim();

    if (trimmedName.length < 2) {
      setError("Please enter at least 2 characters.");
      return;
    }

    setDisplayName(trimmedName);
    setAvatarSeed((current) =>
      current.startsWith("profile-") ? createAvatarSeed(trimmedName) : current,
    );
    setError("");
    setStep("birthYear");
  }

  function handleBirthYearSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const year = Number(birthYear);

    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
      setError(`Birth year must be between 1900 and ${currentYear}.`);
      return;
    }

    onComplete({
      displayName: displayName.trim(),
      birthYear: year,
      avatarSeed,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex min-h-[100dvh] items-center justify-center overflow-hidden bg-app px-4 py-8 text-text">
      <div className="onboarding-orbit absolute h-[34rem] w-[34rem] rounded-[48%] border border-border/80 bg-panel/40" />
      <div className="onboarding-orbit onboarding-orbit-delay absolute h-[24rem] w-[24rem] rounded-[44%] border border-border/70" />
      <div className="absolute inset-x-0 top-10 mx-auto h-px max-w-4xl bg-panel-muted" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-panel shadow-[0_30px_120px_rgba(17,17,17,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden min-h-[580px] border-r border-border bg-panel-muted p-8 lg:block">
          <div className="grid h-full content-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                First run
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-[-0.06em]">
                Start with a clean timeline.
              </h1>
            </div>
            <div className="grid gap-3">
              {["Name", "Birth year", "Lifetime map"].map((label, index) => (
                <div
                  className="flex items-center gap-3 border-t border-border pt-3"
                  key={label}
                >
                  <span className="font-mono text-xs text-muted">
                    0{index + 1}
                  </span>
                  <span className="text-sm font-medium text-muted">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative p-5 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {step === "name" ? "Step 1 of 2" : "Step 2 of 2"}
              </p>
              <p className="mt-2 text-sm text-muted">
                Your profile stays in this browser for now.
              </p>
            </div>
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-panel-muted"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              key={avatarSeed}
              transition={stepContentTransition}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Random DiceBear Notionists avatar preview"
                className="h-full w-full object-cover"
                src={avatarUrl}
              />
            </motion.div>
          </div>

          <div className="mt-8">
            <StepDots currentStepIndex={currentStepIndex} />

            <AnimatePresence initial={false} mode="wait">
              {step === "name" ? (
                <motion.form
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  className="mt-8 grid gap-6"
                  exit={{ opacity: 0, x: -18, filter: "blur(4px)" }}
                  initial={{ opacity: 0, x: 18, filter: "blur(4px)" }}
                  key="name-step"
                  onSubmit={handleNameSubmit}
                  transition={stepContentTransition}
                >
                <div>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    What should I call you?
                  </h2>
                  <p className="mt-3 max-w-lg text-base leading-7 text-muted">
                    This name will make the dashboard feel less like a tool and
                    more like your own small record.
                  </p>
                </div>

                <label className="grid gap-2 text-sm font-medium text-text">
                  Display name
                  <input
                    autoFocus
                    className="h-12 rounded-md border border-border bg-panel-muted px-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-muted focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15"
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setError("");
                    }}
                    placeholder="Your name"
                    value={displayName}
                  />
                </label>

                <AvatarControls
                  avatarSeed={avatarSeed}
                  onReroll={() => {
                    setAvatarSeed(createAvatarSeed(displayName));
                    setError("");
                  }}
                />

                <FormFooter error={error} label="Continue" />
                </motion.form>
              ) : (
                <motion.form
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  className="mt-8 grid gap-6"
                  exit={{ opacity: 0, x: 18, filter: "blur(4px)" }}
                  initial={{ opacity: 0, x: -18, filter: "blur(4px)" }}
                  key="birth-year-step"
                  onSubmit={handleBirthYearSubmit}
                  transition={stepContentTransition}
                >
                <div>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    Which year did your timeline begin?
                  </h2>
                  <p className="mt-3 max-w-lg text-base leading-7 text-muted">
                    The heatmap will start from your birth year. Workout data
                    still begins at 2026, so earlier years stay empty.
                  </p>
                </div>

                <label className="grid gap-2 text-sm font-medium text-text">
                  Birth year
                  <input
                    autoFocus
                    className="h-12 rounded-md border border-border bg-panel-muted px-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-muted focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15"
                    inputMode="numeric"
                    max={currentYear}
                    min={1900}
                    onChange={(event) => {
                      setBirthYear(event.target.value);
                      setError("");
                    }}
                    placeholder="1998"
                    type="number"
                    value={birthYear}
                  />
                </label>

                <AvatarControls
                  avatarSeed={avatarSeed}
                  onReroll={() => {
                    setAvatarSeed(createAvatarSeed(displayName));
                    setError("");
                  }}
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="h-11 rounded-md border border-border px-4 text-sm font-semibold text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-panel-muted active:scale-[0.98]"
                    onClick={() => {
                      setStep("name");
                      setError("");
                    }}
                    type="button"
                  >
                    Back
                  </button>
                  <div className="flex-1">
                    <FormFooter error={error} label="Open dashboard" />
                  </div>
                </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}

function StepDots({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <div aria-label="Onboarding progress" className="flex items-center gap-3">
      {onboardingSteps.map((label, index) => {
        const isComplete = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;

        return (
          <div className="flex items-center gap-2" key={label}>
            <motion.span
              animate={{
                backgroundColor: isComplete
                  ? "oklch(var(--color-accent))"
                  : isCurrent
                    ? "oklch(var(--color-text))"
                    : "oklch(var(--color-panel-muted))",
                opacity: isComplete ? 0.72 : 1,
                scale: isCurrent ? 1.16 : 1,
                width: isCurrent ? 26 : 10,
              }}
              aria-current={isCurrent ? "step" : undefined}
              className="block h-2.5 rounded-[3px]"
              initial={false}
              transition={stepContentTransition}
            />
            <motion.span
              animate={{
                opacity: isCurrent ? 1 : isComplete ? 0.72 : 0.45,
                y: isCurrent ? 0 : 1,
              }}
              className="text-xs font-medium text-muted"
              transition={stepContentTransition}
            >
              {label}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}

function AvatarControls({
  avatarSeed,
  onReroll,
}: {
  avatarSeed: string;
  onReroll: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            DiceBear notionists
          </p>
          <p className="mt-1 break-all text-xs text-muted">
            Seed: {avatarSeed}
          </p>
        </div>
        <button
          className="h-10 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-text transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-panel-muted active:scale-[0.98]"
          onClick={onReroll}
          type="button"
        >
          Reroll avatar
        </button>
      </div>
    </div>
  );
}

function FormFooter({ error, label }: { error: string; label: string }) {
  return (
    <div>
      <div className="min-h-6">
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      </div>
      <button
        className="mt-3 h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 active:scale-[0.98]"
        type="submit"
      >
        {label}
      </button>
    </div>
  );
}
