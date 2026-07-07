"use client";

import { useCallback, useEffect, useState } from "react";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { StatsCards } from "@/components/StatsCards";
import { WorkoutForm } from "@/components/WorkoutForm";
import { getTodayInTimezone } from "@/lib/date-utils";
import { getAvatarUrl } from "@/lib/profile-utils";
import type { AppUser } from "@/lib/users";
import type {
  Workout,
  WorkoutData,
  WorkoutInput,
  WorkoutUpdateInput,
} from "@/lib/workout-types";

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

type UpdateWorkoutResponse =
  | {
      success: true;
      workout: Workout;
    }
  | ApiErrorResponse;

type FitnessDashboardProps = {
  user: AppUser;
};

export function FitnessDashboard({ user }: FitnessDashboardProps) {
  const todayDateKey = getTodayInTimezone();
  const currentYear = Number(todayDateKey.slice(0, 4));
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [workoutLoadError, setWorkoutLoadError] = useState("");

  const loadWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setWorkoutLoadError("");

    try {
      const response = await fetch(`/api/workouts?userId=${user.id}`, {
        cache: "no-store",
      });
      const payload = await readApiJson<WorkoutData | ApiErrorResponse>(
        response,
        "Unable to load workouts.",
      );

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
  }, [user.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkouts]);

  async function handleSubmitWorkout(input: WorkoutInput) {
    setIsSubmittingWorkout(true);

    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        ...createWorkoutRequestInit(input, user.id),
      });
      const payload = await readApiJson<CreateWorkoutResponse>(
        response,
        "Unable to save workout.",
      );

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

  async function handleUpdateWorkout(input: WorkoutUpdateInput) {
    const response = await fetch("/api/workouts", {
      method: "PATCH",
      ...createWorkoutRequestInit(input, user.id),
    });
    const payload = await readApiJson<UpdateWorkoutResponse>(
      response,
      "Unable to update workout.",
    );

    if (!response.ok || !payload.success) {
      throw new Error(
        "error" in payload ? payload.error : "Unable to update workout.",
      );
    }

    setWorkouts((current) =>
      current
        .map((workout) =>
          workout.id === payload.workout.id ? payload.workout : workout,
        )
        .sort((a, b) => {
          const dateSort = a.date.localeCompare(b.date);

          if (dateSort !== 0) {
            return dateSort;
          }

          return a.startTime.localeCompare(b.startTime);
        }),
    );
    await loadWorkouts();

    return payload.workout;
  }

  return (
    <main className="min-h-[100dvh] bg-paper px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="grid gap-6 rounded-lg border border-stone-200 bg-white p-5 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${user.displayName}'s DiceBear avatar`}
                  className="h-full w-full object-cover"
                  src={getAvatarUrl(user.avatarSeed)}
                />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Fitness Tracker
                </p>
                <p className="mt-1 text-sm font-medium text-stone-600">
                  Welcome back, {user.displayName}
                </p>
              </div>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-stone-950 sm:text-5xl lg:text-6xl">
              Your lifetime map is awake.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
              Log any workout from 2026 onward. Earlier years stay quiet,
              framing the story without counting as missed days.
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500">
              Profile
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {user.birthYear}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Heatmap begins at birth year; workout tracking begins at 2026.
            </p>
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
              birthYear={user.birthYear ?? currentYear}
              onUpdateWorkout={handleUpdateWorkout}
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

function createWorkoutRequestInit(
  input: WorkoutInput | WorkoutUpdateInput,
  userId: string,
) {
  const hasImages = input.images && input.images.length > 0;

  if (!hasImages) {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        userId,
      }),
    };
  }

  const body = new FormData();

  if ("id" in input) {
    body.set("id", input.id);
  }

  body.set("userId", userId);
  body.set("date", input.date);
  body.set("type", input.type);
  body.set("startTime", input.startTime);
  body.set("endTime", input.endTime);
  body.set("note", input.note);

  input.images?.forEach((image) => {
    body.append("images", image);
  });

  return {
    body,
  };
}

async function readApiJson<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(`${fallbackMessage} The server returned a non-JSON response.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage} The server returned invalid JSON.`);
  }
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
