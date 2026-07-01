"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { StatsCards } from "@/components/StatsCards";
import { WorkoutForm } from "@/components/WorkoutForm";
import { getTodayInTimezone } from "@/lib/date-utils";
import {
  clearStoredProfile,
  getAvatarUrl,
  readStoredProfile,
  storeProfile,
  subscribeToProfileChanges,
} from "@/lib/profile-utils";
import type { UserProfile, Workout, WorkoutData, WorkoutInput } from "@/lib/workout-types";

type ApiErrorResponse = {
  success: false;
  error: string;
};

type CreateWorkoutResponse =
  | {
      success: true;
      workout: Workout;
    }
  | ApiErrorResponse;

export function FitnessDashboard() {
  const todayDateKey = getTodayInTimezone();
  const currentYear = Number(todayDateKey.slice(0, 4));
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [workoutLoadError, setWorkoutLoadError] = useState("");
  const profile = useSyncExternalStore(
    subscribeToProfileChanges,
    readStoredProfile,
    () => null,
  );

  const loadWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setWorkoutLoadError("");

    try {
      const response = await fetch("/api/workouts", {
        cache: "no-store",
      });
      const payload = (await response.json()) as WorkoutData | ApiErrorResponse;

      if (!response.ok || "success" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to load workouts.",
        );
      }

      setWorkouts(payload.workouts);
    } catch (error) {
      setWorkoutLoadError(
        error instanceof Error ? error.message : "Unable to load workouts.",
      );
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkouts]);

  function handleProfileComplete(nextProfile: UserProfile) {
    storeProfile(nextProfile);
  }

  function handleProfileReset() {
    clearStoredProfile();
  }

  async function handleSubmitWorkout(input: WorkoutInput) {
    setIsSubmittingWorkout(true);

    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as CreateWorkoutResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to save workout.",
        );
      }

      setWorkouts((current) =>
        [...current, payload.workout].sort((a, b) => {
          const dateSort = a.date.localeCompare(b.date);

          if (dateSort !== 0) {
            return dateSort;
          }

          return a.startTime.localeCompare(b.startTime);
        }),
      );
      await loadWorkouts();
    } finally {
      setIsSubmittingWorkout(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-paper px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
      {!profile ? (
        <OnboardingOverlay
          currentYear={currentYear}
          onComplete={handleProfileComplete}
        />
      ) : null}
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="grid gap-6 rounded-lg border border-stone-200 bg-white p-5 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {profile ? (
                <div className="h-14 w-14 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`${profile.displayName}'s DiceBear avatar`}
                    className="h-full w-full object-cover"
                    src={getAvatarUrl(profile.avatarSeed)}
                  />
                </div>
              ) : null}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Fitness Tracker
                </p>
                {profile ? (
                  <p className="mt-1 text-sm font-medium text-stone-600">
                    Welcome back, {profile.displayName}
                  </p>
                ) : null}
              </div>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-stone-950 sm:text-5xl lg:text-6xl">
              {profile
                ? "Your lifetime map is awake."
                : "Keep the chain visible."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
              Log any workout from 2026 onward. Earlier years stay quiet,
              framing the story without counting as missed days.
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500">
              {profile ? "Profile" : "Today"}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {profile ? profile.birthYear : todayDateKey}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {profile
                ? "Heatmap begins at birth year; workout tracking begins at 2026."
                : "Dates default to Asia/Ho_Chi_Minh for the final submit flow."}
            </p>
            {profile ? (
              <button
                className="mt-4 h-9 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-stone-100 active:scale-[0.98]"
                onClick={handleProfileReset}
                type="button"
              >
                Reset profile
              </button>
            ) : null}
          </div>
        </header>

        {workoutLoadError ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{workoutLoadError}</p>
              <button
                className="h-9 rounded-md border border-red-200 bg-white px-3 font-semibold text-red-800 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-red-100 active:scale-[0.98]"
                onClick={() => void loadWorkouts()}
                type="button"
              >
                Retry
              </button>
            </div>
          </section>
        ) : null}

        {isLoadingWorkouts ? (
          <WorkoutLoadingState />
        ) : (
          <StatsCards workouts={workouts} todayDateKey={todayDateKey} />
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {isLoadingWorkouts ? (
            <section className="min-h-[480px] rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
              <div className="h-5 w-40 animate-pulse rounded bg-stone-100" />
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 10 }, (_, index) => (
                  <div className="flex gap-3" key={index}>
                    <div className="h-3 w-10 rounded bg-stone-100" />
                    <div className="grid flex-1 grid-cols-12 gap-1">
                      {Array.from({ length: 48 }, (_, cellIndex) => (
                        <div
                          className="h-2.5 rounded-[2px] bg-stone-100"
                          key={cellIndex}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <ContributionHeatmap
              birthYear={profile?.birthYear ?? currentYear}
              workouts={workouts}
              todayDateKey={todayDateKey}
            />
          )}
          <WorkoutForm
            defaultDate={todayDateKey}
            isSubmitting={isSubmittingWorkout}
            onSubmitWorkout={handleSubmitWorkout}
          />
        </div>
      </div>
    </main>
  );
}

function WorkoutLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="rounded-lg border border-stone-200 bg-white p-5"
          key={index}
        >
          <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
          <div className="mt-5 h-8 w-16 animate-pulse rounded bg-stone-100" />
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-stone-100" />
        </div>
      ))}
    </section>
  );
}
