"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { WorkoutDayDetailModal } from "@/components/WorkoutDayDetailModal";
import { WorkoutTooltip } from "@/components/WorkoutTooltip";
import { resolveWorkoutIntensity } from "@/lib/heatmap-intensity";
import type { AppCopy, Language } from "@/lib/i18n";
import type { HeatmapView, PublicAppUser } from "@/lib/users";
import type { HeatmapDay, Workout, WorkoutUpdateInput } from "@/lib/workout-types";
import { createHeatmapYears, createLifetimeHeatmapYears } from "@/lib/workout-utils";

type ContributionHeatmapProps = {
  allowPastWorkoutEdits: boolean;
  canEditWorkouts: boolean;
  copy: AppCopy;
  language: Language;
  profile: Pick<PublicAppUser, "displayName" | "username">;
  workouts: Workout[];
  todayDateKey: string;
  birthYear: number;
  view: HeatmapView;
  onUpdateWorkout: (input: WorkoutUpdateInput) => Promise<Workout>;
};

const TOOLTIP_WIDTH = 256;
const TOOLTIP_MARGIN = 16;
const heatmapIntensityClasses = [
  "",
  "bg-[#033A16]",
  "bg-[#196C2E]",
  "bg-[#2EA043]",
  "bg-[#56D364]",
] as const;

type ActiveTooltip = {
  date: string;
  workouts: Workout[];
  isTrackable: boolean;
  left: number;
  top: number;
  placement: "above" | "below";
};

type SelectedDay = {
  date: string;
  workouts: Workout[];
  isTrackable: boolean;
  origin: {
    x: number;
    y: number;
  };
};

export function ContributionHeatmap({
  allowPastWorkoutEdits,
  canEditWorkouts,
  copy,
  language,
  profile,
  workouts,
  todayDateKey,
  birthYear,
  view,
  onUpdateWorkout,
}: ContributionHeatmapProps) {
  const heatmapYears =
    view.mode === "lifetime"
      ? createLifetimeHeatmapYears({
          birthYear,
          endDateKey: todayDateKey,
          workouts,
        })
      : createHeatmapYears({
          startYear: view.year,
          endYear: view.year,
          endDateKey: todayDateKey,
          workouts,
        });
  const descendingHeatmapYears = [...heatmapYears].reverse();
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  function showTooltip({
    element,
    date,
    workouts,
    isTrackable,
  }: {
    element: HTMLElement;
    date: string;
    workouts: Workout[];
    isTrackable: boolean;
  }) {
    const rect = element.getBoundingClientRect();
    const minLeft = TOOLTIP_MARGIN + TOOLTIP_WIDTH / 2;
    const maxLeft = window.innerWidth - TOOLTIP_MARGIN - TOOLTIP_WIDTH / 2;
    const left = Math.min(Math.max(rect.left + rect.width / 2, minLeft), maxLeft);
    const placement = rect.top < 180 ? "below" : "above";

    setActiveTooltip({
      date,
      workouts,
      isTrackable,
      left,
      top: placement === "above" ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  }

  async function handleSelectedDayWorkoutUpdate(input: WorkoutUpdateInput) {
    const updatedWorkout = await onUpdateWorkout(input);

    setSelectedDay((current) => {
      if (!current) {
        return current;
      }

      const nextWorkouts = current.workouts
        .map((workout) => (workout.id === updatedWorkout.id ? updatedWorkout : workout))
        .filter((workout) => workout.date === updatedWorkout.date)
        .sort((a, b) => {
          const dateSort = a.date.localeCompare(b.date);

          if (dateSort !== 0) {
            return dateSort;
          }

          return a.createdAt.localeCompare(b.createdAt);
        });

      return {
        ...current,
        date: updatedWorkout.date,
        workouts: nextWorkouts.length > 0 ? nextWorkouts : [updatedWorkout],
      };
    });

    return updatedWorkout;
  }

  return (
    <section className="rounded-lg border border-border p-5 sm:p-6">
      <div className="relative z-0 mb-0 max-h-[620px] overflow-auto pr-1">
        <div className="grid min-w-[900px] gap-5">
          {descendingHeatmapYears.map(({ year, weeks }) => (
            <div className="grid grid-cols-[44px_32px_1fr] items-start gap-x-3" key={year}>
              <div className="mt-5 grid grid-rows-7 gap-1 text-[9px] text-text">
                {copy.heatmap.weekdays.map((label, labelIndex) => (
                  <span key={label} className="flex h-2.5 items-center">
                    {labelIndex === 1 || labelIndex === 3 || labelIndex === 5 ? label : ""}
                  </span>
                ))}
              </div>
              <div>
                <div
                  aria-hidden="true"
                  className="mb-2 grid h-3 auto-cols-[10px] grid-flow-col gap-1 text-[9px] leading-none text-text"
                >
                  {getMonthMarkers(weeks, copy).map((marker) => (
                    <span className="w-2.5" key={`${year}-${marker.id}`}>
                      {marker.label}
                    </span>
                  ))}
                </div>
                <section
                  aria-label={`${year} workout heatmap`}
                  className="relative isolate grid auto-cols-[10px] grid-flow-col grid-rows-7 gap-1"
                >
                  {createKeyedHeatmapWeeks(year, weeks).map((week) =>
                    week.map(({ day, key }) => {
                      if (!day) {
                        return <span aria-hidden="true" className="h-2.5 w-2.5" key={key} />;
                      }

                      const hasWorkout = day.status === "workout";
                      const isTrackable = day.status !== "no-data";
                      const intensityClass =
                        heatmapIntensityClasses[resolveWorkoutIntensity(day.workouts.length)];
                      const label = !isTrackable
                        ? copy.heatmap.noTrackingYet
                        : hasWorkout
                          ? copy.heatmap.workoutCount(day.workouts.length)
                          : copy.heatmap.noWorkout;

                      return (
                        <button
                          aria-label={`${day.date}: ${label}`}
                          className={`relative h-2.5 w-2.5 rounded-[2px] outline-none ring-offset-2 ring-offset-panel transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:ring-2 hover:ring-text/20 focus-visible:ring-2 focus-visible:ring-accent ${
                            hasWorkout ? intensityClass : "bg-[#151B23]"
                          }`}
                          onBlur={() => setActiveTooltip(null)}
                          onFocus={(event) =>
                            showTooltip({
                              element: event.currentTarget,
                              date: day.date,
                              workouts: day.workouts,
                              isTrackable,
                            })
                          }
                          onMouseEnter={(event) =>
                            showTooltip({
                              element: event.currentTarget,
                              date: day.date,
                              workouts: day.workouts,
                              isTrackable,
                            })
                          }
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();

                            setActiveTooltip(null);
                            setSelectedDay({
                              date: day.date,
                              workouts: day.workouts,
                              isTrackable,
                              origin: {
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2,
                              },
                            });
                          }}
                          key={key}
                          type="button"
                        />
                      );
                    }),
                  )}
                </section>
              </div>
            </div>
          ))}
        </div>
      </div>
      {activeTooltip ? (
        <div
          className={`pointer-events-none fixed z-[100000] ${
            activeTooltip.placement === "above"
              ? "-translate-x-1/2 -translate-y-full"
              : "-translate-x-1/2"
          }`}
          style={{
            left: activeTooltip.left,
            top: activeTooltip.top,
          }}
        >
          <WorkoutTooltip
            copy={copy}
            date={activeTooltip.date}
            isTrackable={activeTooltip.isTrackable}
            language={language}
            workouts={activeTooltip.workouts}
          />
        </div>
      ) : null}
      <AnimatePresence>
        {selectedDay ? (
          <WorkoutDayDetailModal
            allowPastWorkoutEdits={allowPastWorkoutEdits}
            canEditWorkouts={canEditWorkouts}
            copy={copy}
            date={selectedDay.date}
            isTrackable={selectedDay.isTrackable}
            language={language}
            onClose={() => setSelectedDay(null)}
            onUpdateWorkout={handleSelectedDayWorkoutUpdate}
            origin={selectedDay.origin}
            profile={profile}
            todayDateKey={todayDateKey}
            workouts={selectedDay.workouts}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function getMonthMarkers(weeks: Array<Array<HeatmapDay | null>>, copy: AppCopy) {
  return weeks.map((week, index) => {
    const firstDay = week.find((day) => day !== null);
    const firstOfMonth = week.find((day) => day?.date.endsWith("-01"));

    return {
      id: firstDay?.date ?? `empty-week-${index}`,
      label: firstOfMonth ? copy.heatmap.months[Number(firstOfMonth.date.slice(5, 7)) - 1] : "",
    };
  });
}

function createKeyedHeatmapWeeks(year: number, weeks: Array<Array<HeatmapDay | null>>) {
  return weeks.map((week, weekIndex) =>
    week.map((day, dayIndex) => ({
      day,
      key: day?.date ?? `empty-${year}-${weekIndex}-${dayIndex}`,
    })),
  );
}
