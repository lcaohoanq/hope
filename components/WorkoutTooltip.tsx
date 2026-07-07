import type { Workout } from "@/lib/workout-types";
import { formatDisplayDate } from "@/lib/date-utils";
import { WorkoutImageThumbnail } from "@/components/WorkoutImageThumbnail";

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
    <div className="w-64 rounded-lg border border-stone-200 bg-white p-3 text-left text-xs text-stone-700 shadow-[0_18px_48px_rgba(17,17,17,0.10)]">
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
              {workout.images && workout.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {workout.images.map((image) => (
                    <div
                      className="aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                      key={image.src}
                    >
                      <WorkoutImageThumbnail
                        image={image}
                        workoutDate={workout.date}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
