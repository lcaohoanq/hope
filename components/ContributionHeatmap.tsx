"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { HeatmapDay, Workout, WorkoutUpdateInput } from "@/lib/workout-types";
import {
  createHeatmapYears,
  createLifetimeHeatmapYears,
} from "@/lib/workout-utils";
import type { HeatmapView } from "@/lib/users";
import type { AppCopy, Language } from "@/lib/i18n";
import { WorkoutDayDetailModal } from "@/components/WorkoutDayDetailModal";
import { WorkoutTooltip } from "@/components/WorkoutTooltip";

type ContributionHeatmapProps = {
  copy: AppCopy;
  language: Language;
  workouts: Workout[];
  todayDateKey: string;
  birthYear: number;
  view: HeatmapView;
  onViewChange: (view: HeatmapView) => void;
  onUpdateWorkout: (input: WorkoutUpdateInput) => Promise<Workout>;
};

const TOOLTIP_WIDTH = 256;
const TOOLTIP_MARGIN = 16;

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
  copy,
  language,
  workouts,
  todayDateKey,
  birthYear,
  view,
  onViewChange,
  onUpdateWorkout,
}: ContributionHeatmapProps) {
  const currentYear = Number(todayDateKey.slice(0, 4));
  const availableYears = Array.from(
    { length: currentYear - birthYear + 1 },
    (_, index) => currentYear - index,
  );
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
  const selectedViewValue =
    view.mode === "lifetime" ? "lifetime" : String(view.year);
  const viewTitle =
    view.mode === "lifetime" ? copy.heatmap.lifetime : copy.heatmap.yearTitle(view.year);
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
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, minLeft),
      maxLeft,
    );
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
        .map((workout) =>
          workout.id === updatedWorkout.id ? updatedWorkout : workout,
        )
        .filter((workout) => workout.date === updatedWorkout.date)
        .sort((a, b) => {
          const dateSort = a.date.localeCompare(b.date);

          if (dateSort !== 0) {
            return dateSort;
          }

          return a.startTime.localeCompare(b.startTime);
        });

      return {
        ...current,
        date: updatedWorkout.date,
        workouts: nextWorkouts.length > 0 ? nextWorkouts : [updatedWorkout],
      };
    });

    return updatedWorkout;
  }

  function handleViewChange(value: string) {
    onViewChange(
      value === "lifetime"
        ? { mode: "lifetime" }
        : { mode: "year", year: Number(value) },
    );
  }

  return (
    <section className="rounded-lg border border-stone-300 p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-stone-950">
            {viewTitle}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-stone-500">
            {copy.heatmap.view}
            <select
              className="h-9 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
              onChange={(event) => handleViewChange(event.target.value)}
              value={selectedViewValue}
            >
              <option value="lifetime">{copy.heatmap.lifetime}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span>{copy.heatmap.noData}</span>
            <span className="h-3 w-3 rounded-[3px] border border-stone-300 bg-stone-100" />
            <span>{copy.heatmap.noWorkout}</span>
            <span className="h-3 w-3 rounded-[3px] bg-stone-950" />
            <span className="h-3 w-3 rounded-[3px] bg-moss" />
            <span>{copy.heatmap.workout}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 max-h-[620px] overflow-auto pr-1">
        <div className="grid min-w-[900px] gap-5">
          {descendingHeatmapYears.map(({ year, weeks }) => (
            <div
              className="grid grid-cols-[44px_32px_1fr] items-start gap-x-3"
              key={year}
            >
              <div className="mt-5 grid grid-rows-7 gap-1 text-[9px] text-stone-950">
                {copy.heatmap.weekdays.map((label, labelIndex) => (
                  <span key={label} className="flex h-2.5 items-center">
                    {labelIndex === 1 || labelIndex === 3 || labelIndex === 5
                      ? label
                      : ""}
                  </span>
                ))}
              </div>
              <div>
                <div
                  aria-hidden="true"
                  className="mb-2 grid h-3 auto-cols-[10px] grid-flow-col gap-1 text-[9px] leading-none text-stone-950"
                >
                  {getMonthMarkers(weeks, copy).map((label, index) => (
                    <span className="w-2.5" key={`${year}-${index}-${label}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <div
                  aria-label={`${year} workout heatmap`}
                  className="relative isolate grid auto-cols-[10px] grid-flow-col grid-rows-7 gap-1"
                >
                  {weeks.map((week, weekIndex) =>
                    week.map((day, dayIndex) => {
                      if (!day) {
                        return (
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5"
                            key={`empty-${year}-${weekIndex}-${dayIndex}`}
                          />
                        );
                      }

                      const hasWorkout = day.status === "workout";
                      const isTrackable = day.status !== "no-data";
                      const label = !isTrackable
                        ? copy.heatmap.noTrackingYet
                        : hasWorkout
                          ? copy.heatmap.workoutCount(day.workouts.length)
                          : copy.heatmap.noWorkout;

                      return (
                        <button
                          aria-label={`${day.date}: ${label}`}
                          className={`relative z-0 h-2.5 w-2.5 rounded-[2px] outline-none ring-offset-2 ring-offset-white transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:scale-150 focus:z-10 focus-visible:ring-2 focus-visible:ring-moss ${
                            hasWorkout
                              ? "bg-moss"
                              : isTrackable
                                ? "bg-stone-950 hover:bg-stone-800"
                                : "border border-stone-300 bg-stone-100"
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
                            const rect =
                              event.currentTarget.getBoundingClientRect();

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
                          key={day.date}
                          type="button"
                        />
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {activeTooltip ? (
        <div
          className={`pointer-events-none fixed z-[9999] ${
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
            copy={copy}
            date={selectedDay.date}
            isTrackable={selectedDay.isTrackable}
            language={language}
            onClose={() => setSelectedDay(null)}
            onUpdateWorkout={handleSelectedDayWorkoutUpdate}
            origin={selectedDay.origin}
            workouts={selectedDay.workouts}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function getMonthMarkers(weeks: Array<Array<HeatmapDay | null>>, copy: AppCopy) {
  return weeks.map((week) => {
    const firstOfMonth = week.find((day) => day?.date.endsWith("-01"));

    if (!firstOfMonth) {
      return "";
    }

    return copy.heatmap.months[Number(firstOfMonth.date.slice(5, 7)) - 1];
  });
}
