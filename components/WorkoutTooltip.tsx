import type { Workout } from "@/lib/workout-types";
import { formatDisplayDate } from "@/lib/date-utils";

type WorkoutTooltipProps = {
  date: string;
  workouts: Workout[];
  isTrackable?: boolean;
};

export function WorkoutTooltip({
  date,
  workouts,
  isTrackable = true,
}: WorkoutTooltipProps) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left text-xs text-stone-700 shadow-[0_18px_48px_rgba(17,17,17,0.10)] group-hover:block group-focus-visible:block">
      <p className="font-medium text-stone-950">{formatDisplayDate(date)}</p>
      {!isTrackable ? (
        <p className="mt-1 text-stone-500">No tracking yet</p>
      ) : workouts.length === 0 ? (
        <p className="mt-1 text-stone-500">No workout</p>
      ) : (
        <div className="mt-2 space-y-2">
          {workouts.length > 1 ? (
            <p className="font-medium text-moss">{workouts.length} workouts</p>
          ) : null}
          {workouts.map((workout) => (
            <div key={workout.id} className="space-y-0.5">
              <p className="font-medium text-stone-950">{workout.type}</p>
              <p>
                {workout.startTime} - {workout.endTime}, {" "}
                {workout.durationMinutes} minutes
              </p>
              {workout.note ? (
                <p className="text-stone-500">{workout.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
