import type { Workout } from "@/lib/workout-types";
import { formatDisplayDate } from "@/lib/date-utils";
import type { AppCopy, Language } from "@/lib/i18n";
import { WorkoutImageThumbnail } from "@/components/WorkoutImageThumbnail";

type WorkoutTooltipProps = {
  copy: AppCopy;
  date: string;
  language: Language;
  workouts: Workout[];
  isTrackable?: boolean;
};

export function WorkoutTooltip({
  copy,
  date,
  language,
  workouts,
  isTrackable = true,
}: WorkoutTooltipProps) {
  return (
    <div className="w-64 rounded-lg border border-border bg-panel p-3 text-left text-xs text-muted shadow-[0_18px_48px_rgba(17,17,17,0.10)]">
      <p className="font-medium text-text">
        {formatDisplayDate(date, language)}
      </p>
      {!isTrackable ? (
        <p className="mt-1 text-muted">{copy.heatmap.noTrackingYet}</p>
      ) : workouts.length === 0 ? (
        <p className="mt-1 text-muted">{copy.heatmap.noWorkout}</p>
      ) : (
        <div className="mt-2 space-y-2">
          {workouts.length > 1 ? (
            <p className="font-medium text-accent">
              {copy.heatmap.workoutCount(workouts.length)}
            </p>
          ) : null}
          {workouts.map((workout) => (
            <div key={workout.id} className="space-y-0.5">
              <p className="font-medium text-text">{workout.type}</p>
              <p>
                {workout.startTime} - {workout.endTime}, {" "}
                {workout.durationMinutes} {copy.common.minutes}
              </p>
              {workout.note ? (
                <p className="text-muted">{workout.note}</p>
              ) : null}
              {workout.images && workout.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {workout.images.map((image) => (
                    <div
                      className="aspect-square overflow-hidden rounded-md border border-border bg-panel-muted"
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
