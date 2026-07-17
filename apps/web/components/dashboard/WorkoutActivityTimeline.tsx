"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCheck, FaLock } from "react-icons/fa";
import {
  formatActivityMonth,
  formatActivityTimestamp,
  getActivityMonthKey,
} from "@/lib/date-utils";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import type { AppCopy, Language } from "@/lib/i18n";
import type { HeatmapView } from "@/lib/users";
import type { Workout } from "@/lib/workout-types";

type WorkoutActivityTimelineProps = {
  copy: AppCopy;
  emptyMessage?: string;
  language: Language;
  limit?: number;
  refreshKey: number;
  title?: string;
  userId: string;
  view: HeatmapView;
};

type WorkoutActivityGroup = {
  id: string;
  label: string;
  workouts: Workout[];
};

export function WorkoutActivityTimeline({
  copy,
  emptyMessage,
  language,
  limit = 6,
  refreshKey,
  title,
  userId,
  view,
}: WorkoutActivityTimelineProps) {
  const { getToken } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<{ id: number } | null>(null);
  const groups = useMemo(() => groupWorkoutsByMonth(workouts, language), [language, workouts]);
  const year = view.mode === "year" ? view.year : undefined;
  const sectionTitle = title ?? copy.activityTimeline.title;
  const emptyText = emptyMessage ?? copy.activityTimeline.empty;

  const loadActivity = useCallback(
    async ({ cursor, append = false }: { cursor?: string; append?: boolean } = {}) => {
      const requestId = (requestRef.current?.id ?? 0) + 1;
      requestRef.current = { id: requestId };

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const token = await getToken();
        const client = getClientApiClient(token);
        const res = await client.workouts.activity.$get({
          query: {
            cursor,
            limit: String(limit),
            userId,
            year: year != null ? String(year) : undefined,
          },
        });

        if (requestRef.current?.id !== requestId) return;
        const payload = await res.json();
        if (!res.ok)
          throw new Error(("error" in payload && payload.error) || copy.activityTimeline.loadError);
        setWorkouts((current) =>
          append
            ? [...current, ...("workouts" in payload ? (payload.workouts ?? []) : [])]
            : "workouts" in payload
              ? (payload.workouts ?? [])
              : [],
        );
        setNextCursor("nextCursor" in payload ? (payload.nextCursor ?? null) : null);
      } catch (caught) {
        if (requestRef.current?.id !== requestId) return;
        setError(getApiErrorMessage(caught, copy.activityTimeline.loadError));
      } finally {
        if (requestRef.current?.id === requestId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [copy.activityTimeline.loadError, getToken, limit, userId, year],
  );

  useEffect(() => {
    void refreshKey;
    const timer = window.setTimeout(() => {
      void loadActivity();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadActivity, refreshKey]);

  return (
    <section className="rounded-lg p-5 shadow-[var(--shadow-panel)] sm:p-6">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-text">{sectionTitle}</h2>

      {isLoading ? (
        <WorkoutActivitySkeleton />
      ) : groups.length === 0 ? (
        <div className="mt-5 rounded-lg bg-panel-muted/50 p-6 text-sm text-muted">{emptyText}</div>
      ) : (
        <div className="mt-6 grid gap-8">
          {groups.map((group) => (
            <div className="grid gap-4" key={group.id}>
              <div className="grid grid-cols-[minmax(0,112px)_1fr] items-center gap-3">
                <h3 className="whitespace-nowrap text-sm font-semibold text-text">{group.label}</h3>
                <div className="h-px bg-border/70" />
              </div>

              <div className="relative grid gap-1 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-border/70 sm:before:left-[127px]">
                {group.workouts.map((workout) => (
                  <WorkoutActivityItem
                    copy={copy}
                    key={workout.id}
                    language={language}
                    workout={workout}
                  />
                ))}
              </div>
            </div>
          ))}
          {error ? (
            <p aria-live="polite" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          {nextCursor ? (
            <button
              className="h-10 justify-self-start rounded-md bg-text px-4 text-sm font-semibold text-white transition hover:bg-text/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingMore}
              onClick={() => void loadActivity({ append: true, cursor: nextCursor })}
              type="button"
            >
              {isLoadingMore ? copy.activityTimeline.loading : copy.activityTimeline.loadMore}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function WorkoutActivityItem({
  copy,
  language,
  workout,
}: {
  copy: AppCopy;
  language: Language;
  workout: Workout;
}) {
  const imageCount = workout.images?.length ?? 0;
  const postedTimestamp = formatActivityTimestamp(workout.createdAt, language);
  const postedAt = copy.activityTimeline.postedAt(postedTimestamp);
  const body = (
    <>
      <div className="relative z-[1] mt-2 grid h-6 w-6 place-items-center rounded-full bg-panel-muted text-muted">
        <FaCheck aria-hidden="true" className="h-2.5 w-2.5" />
      </div>
      <div className="min-w-0 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_max-content] sm:items-start sm:gap-x-6">
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-3 text-sm">
            <h4
              className={`truncate font-semibold text-text ${workout.note ? "max-w-[42%] shrink-0" : "min-w-0"}`}
            >
              {workout.type}
            </h4>
            {workout.note ? (
              <p className="min-w-0 flex-1 truncate text-text">{workout.note}</p>
            ) : null}
          </div>
          <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
            {workout.durationMinutes > 0 ? (
              <span>{copy.activityTimeline.duration(workout.durationMinutes)}</span>
            ) : null}
            {imageCount > 0 ? <span>{copy.activityTimeline.imageCount(imageCount)}</span> : null}
            {!workout.isPublic ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <FaLock aria-hidden="true" className="h-3 w-3" />
                {copy.activityTimeline.private}
              </span>
            ) : null}
            <time className="whitespace-nowrap sm:hidden" dateTime={workout.createdAt}>
              {postedAt}
            </time>
          </div>
        </div>
        <time
          className="hidden whitespace-nowrap text-right text-xs font-medium leading-5 text-muted sm:block"
          dateTime={workout.createdAt}
        >
          {postedAt}
        </time>
      </div>
    </>
  );
  const itemClassName =
    "relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 rounded-md py-1 pr-2 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:ml-[115px] sm:pr-3";

  return (
    <Link
      aria-label={copy.activityTimeline.openWorkout(workout.type, postedTimestamp)}
      className={`${itemClassName} hover:bg-panel-muted/60`}
      href={`/workouts/${workout.id}`}
    >
      {body}
    </Link>
  );
}

function groupWorkoutsByMonth(workouts: Workout[], language: Language): WorkoutActivityGroup[] {
  const sortedWorkouts = [...workouts].sort((first, second) => {
    const createdAtSort = second.createdAt.localeCompare(first.createdAt);

    if (createdAtSort !== 0) {
      return createdAtSort;
    }

    return second.id.localeCompare(first.id);
  });
  const groups = new Map<string, WorkoutActivityGroup>();

  for (const workout of sortedWorkouts) {
    const id = getActivityMonthKey(workout.createdAt);
    const existing = groups.get(id);

    if (existing) {
      existing.workouts.push(workout);
      continue;
    }

    groups.set(id, {
      id,
      label: formatActivityMonth(workout.createdAt, language),
      workouts: [workout],
    });
  }

  return [...groups.values()];
}

function WorkoutActivitySkeleton() {
  return (
    <div aria-label="Loading workout activity" className="mt-6 grid gap-4" role="status">
      {[0, 1, 2].map((item) => (
        <div className="grid gap-2 rounded-md px-3 py-3" key={item}>
          <div className="h-4 w-44 animate-pulse rounded bg-panel-muted motion-reduce:animate-none" />
          <div className="h-3 w-64 max-w-full animate-pulse rounded bg-panel-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
