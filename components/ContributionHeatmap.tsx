import type { Workout } from "@/lib/workout-types";
import {
  createLifetimeHeatmapYears,
  TRACKING_START_DATE,
} from "@/lib/workout-utils";
import { WorkoutTooltip } from "@/components/WorkoutTooltip";

type ContributionHeatmapProps = {
  workouts: Workout[];
  todayDateKey: string;
  birthYear: number;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ContributionHeatmap({
  workouts,
  todayDateKey,
  birthYear,
}: ContributionHeatmapProps) {
  const heatmapYears = createLifetimeHeatmapYears({
    birthYear,
    endDateKey: todayDateKey,
    workouts,
  });
  const descendingHeatmapYears = [...heatmapYears].reverse();
  const trackingStartYear = Number(TRACKING_START_DATE.slice(0, 4));

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 border-b border-stone-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
            {todayDateKey.slice(0, 4)} - {birthYear}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-stone-950">
            Lifetime heatmap
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span>No data</span>
          <span className="h-3 w-3 rounded-[3px] border border-stone-200 bg-stone-100" />
          <span>No workout</span>
          <span className="h-3 w-3 rounded-[3px] bg-stone-950" />
          <span className="h-3 w-3 rounded-[3px] bg-moss" />
          <span>Workout</span>
        </div>
      </div>

      <div className="mt-6 max-h-[620px] overflow-auto pr-1">
        <div className="grid min-w-[880px] gap-3">
          {descendingHeatmapYears.map(({ year, weeks }) => (
            <div
              className="grid grid-cols-[44px_32px_1fr] items-start gap-3"
              key={year}
            >
              <div className="pt-0.5 font-mono text-[11px] text-stone-500">
                {year}
              </div>
              <div className="grid grid-rows-7 gap-1 text-[9px] text-stone-400">
                {weekdayLabels.map((label) => (
                  <span key={label} className="flex h-2.5 items-center">
                    {label === "Mon" || label === "Wed" || label === "Fri"
                      ? label
                      : ""}
                  </span>
                ))}
              </div>
              <div
                aria-label={`${year} workout heatmap`}
                className="grid auto-cols-[10px] grid-flow-col grid-rows-7 gap-1"
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
                      ? "No tracking yet"
                      : hasWorkout
                        ? `${day.workouts.length} workout${
                            day.workouts.length > 1 ? "s" : ""
                          }`
                        : "No workout";

                    return (
                      <button
                        aria-label={`${day.date}: ${label}`}
                        className={`group relative h-2.5 w-2.5 rounded-[2px] outline-none ring-offset-2 ring-offset-white transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-50 hover:scale-150 focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-moss ${
                          hasWorkout
                            ? "bg-moss"
                            : isTrackable
                              ? "bg-stone-950 hover:bg-stone-800"
                              : "border border-stone-200 bg-stone-100"
                        }`}
                        key={day.date}
                        type="button"
                      >
                        <WorkoutTooltip
                          date={day.date}
                          isTrackable={isTrackable}
                          workouts={day.workouts}
                        />
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          ))}
          <div className="border-t border-stone-100 pt-3 text-xs text-stone-500">
            Workout tracking starts in {trackingStartYear}; older cells are
            shown only to frame the timeline.
          </div>
        </div>
      </div>
    </section>
  );
}
