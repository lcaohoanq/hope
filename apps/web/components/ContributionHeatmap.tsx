"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
  onViewChange: (view: HeatmapView) => void;
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
  const selectedViewValue = view.mode === "lifetime" ? "lifetime" : String(view.year);
  const viewTitle =
    view.mode === "lifetime" ? copy.heatmap.lifetime : copy.heatmap.yearTitle(view.year);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [isViewPickerOpen, setIsViewPickerOpen] = useState(false);
  const viewPickerRef = useRef<HTMLDivElement | null>(null);
  const viewOptions = [
    { label: copy.heatmap.lifetime, value: "lifetime" },
    ...availableYears.map((year) => ({
      label: String(year),
      value: String(year),
    })),
  ];
  const selectedViewLabel =
    viewOptions.find((option) => option.value === selectedViewValue)?.label ?? selectedViewValue;

  useEffect(() => {
    if (!isViewPickerOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (viewPickerRef.current && !viewPickerRef.current.contains(event.target as Node)) {
        setIsViewPickerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsViewPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewPickerOpen]);

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

  function handleViewChange(value: string) {
    onViewChange(
      value === "lifetime" ? { mode: "lifetime" } : { mode: "year", year: Number(value) },
    );
    setIsViewPickerOpen(false);
  }

  return (
    <section className="rounded-lg border border-border p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-text">{viewTitle}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="relative flex items-center gap-2 text-xs font-medium text-muted"
            ref={viewPickerRef}
          >
            <span>{copy.heatmap.view}</span>
            <button
              aria-expanded={isViewPickerOpen}
              aria-haspopup="listbox"
              className="group inline-flex h-9 min-w-[116px] items-center justify-between gap-3 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-text shadow-[0_1px_0_rgba(17,17,17,0.04)] outline-none transition hover:border-border hover:bg-panel-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 active:scale-[0.99]"
              onClick={() => setIsViewPickerOpen((current) => !current)}
              type="button"
            >
              <span>{selectedViewLabel}</span>
              <span
                aria-hidden="true"
                className={`h-2 w-2 border-b-2 border-r-2 border-muted transition group-hover:border-text ${
                  isViewPickerOpen ? "-rotate-[135deg]" : "rotate-45"
                }`}
              />
            </button>
            {isViewPickerOpen ? (
              <div className="absolute right-0 top-11 z-50 w-[148px] overflow-hidden rounded-lg border border-border bg-panel shadow-[0_18px_45px_rgba(17,17,17,0.14)]">
                <div
                  aria-label={copy.heatmap.view}
                  className="max-h-72 overflow-y-auto p-1.5 [scrollbar-color:oklch(var(--color-muted))_transparent] [scrollbar-width:thin]"
                  role="listbox"
                >
                  {viewOptions.map((option) => {
                    const isSelected = option.value === selectedViewValue;

                    return (
                      <button
                        aria-selected={isSelected}
                        className={`flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-sm transition ${
                          isSelected
                            ? "bg-text font-semibold text-white"
                            : "font-medium text-muted hover:bg-panel-muted hover:text-text"
                        }`}
                        key={option.value}
                        onClick={() => handleViewChange(option.value)}
                        role="option"
                        type="button"
                      >
                        <span>{option.label}</span>
                        {isSelected ? (
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-3 rotate-[-45deg] border-b-2 border-l-2 border-white"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div className="group relative flex flex-wrap items-center gap-2 text-xs text-muted">
            <span
              className="cursor-help underline decoration-dotted decoration-muted/70 underline-offset-2"
              title={copy.heatmap.intensityScaleHint}
            >
              {copy.heatmap.less}
            </span>
            <span
              className="h-3 w-3 rounded-[3px] bg-[#151B23]"
              title={copy.heatmap.intensityEmpty}
            />
            {[1, 2, 3, 4].map((workoutCount) => (
              <span
                className={`h-3 w-3 rounded-[3px] ${heatmapIntensityClasses[workoutCount]}`}
                key={workoutCount}
                title={copy.heatmap.intensityLevel(workoutCount)}
              />
            ))}
            <button
              className="cursor-help rounded-sm underline decoration-dotted decoration-muted/70 underline-offset-2 outline-none transition focus-visible:ring-2 focus-visible:ring-accent"
              title={copy.heatmap.intensityScaleHint}
              type="button"
            >
              {copy.heatmap.more}
            </button>
            <div
              className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-56 rounded-md border border-border bg-panel p-3 text-left opacity-0 shadow-[0_12px_28px_rgba(28,25,23,0.18)] transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              role="tooltip"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {copy.heatmap.intensityLegend}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-text">
                {copy.heatmap.intensityScaleHint}
              </p>
              <ul className="mt-2.5 grid gap-1.5">
                <li className="flex items-center gap-2 text-xs text-text">
                  <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-[#151B23]" />
                  {copy.heatmap.intensityEmpty}
                </li>
                {[1, 2, 3, 4].map((workoutCount) => (
                  <li className="flex items-center gap-2 text-xs text-text" key={workoutCount}>
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-[3px] ${heatmapIntensityClasses[workoutCount]}`}
                    />
                    {copy.heatmap.intensityLevel(workoutCount)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 mt-6 max-h-[620px] overflow-auto pr-1">
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
                            hasWorkout
                              ? intensityClass
                              : isTrackable
                                ? "bg-[#151B23] hover:bg-[#196C2E]"
                                : "border border-border bg-panel-muted"
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
