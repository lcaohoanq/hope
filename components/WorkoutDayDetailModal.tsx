"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDisplayDate } from "@/lib/date-utils";
import type { Workout } from "@/lib/workout-types";
import { WorkoutImageThumbnail } from "@/components/WorkoutImageThumbnail";

type WorkoutDayDetailModalProps = {
  date: string;
  workouts: Workout[];
  isTrackable: boolean;
  onClose: () => void;
};

export function WorkoutDayDetailModal({
  date,
  workouts,
  isTrackable,
  onClose,
}: WorkoutDayDetailModalProps) {
  const galleryImages = useMemo(
    () =>
      workouts.flatMap((workout) =>
        (workout.images ?? []).map((image) => ({
          image,
          workout,
        })),
      ),
    [workouts],
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = galleryImages[selectedImageIndex];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-950/35 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[88dvh] w-full max-w-3xl overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-4 sm:p-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
              Day detail
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
              {formatDisplayDate(date)}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {!isTrackable
                ? "No tracking yet"
                : workouts.length > 0
                  ? `${workouts.length} workout${
                      workouts.length > 1 ? "s" : ""
                    } logged`
                  : "No workout logged"}
            </p>
          </div>
          <button
            aria-label="Close workout detail"
            className="h-9 w-9 rounded-md border border-stone-200 bg-white text-xl leading-none text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <div className="max-h-[calc(88dvh-88px)] overflow-y-auto p-4 sm:p-5">
          {selectedImage ? (
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-950">
              <div className="aspect-[16/10]">
                <WorkoutImageThumbnail
                  image={selectedImage.image}
                  imageClassName="h-full w-full object-contain"
                  workoutDate={date}
                />
              </div>
              <div className="border-t border-white/10 px-3 py-2 text-xs text-stone-200">
                {selectedImage.workout.type} - {selectedImage.workout.startTime} -{" "}
                {selectedImage.workout.endTime}
              </div>
            </div>
          ) : null}

          {galleryImages.length > 0 ? (
            <div className="mt-4">
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {galleryImages.map(({ image, workout }, index) => (
                  <button
                    aria-label={`Show workout image ${index + 1}`}
                    className={`h-28 w-40 shrink-0 snap-start overflow-hidden rounded-md border bg-stone-100 transition ${
                      index === selectedImageIndex
                        ? "border-moss ring-2 ring-moss/20"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                    key={`${workout.id}-${image.src}`}
                    onClick={() => setSelectedImageIndex(index)}
                    type="button"
                  >
                    <WorkoutImageThumbnail image={image} workoutDate={date} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            {workouts.length === 0 ? (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                {!isTrackable ? "No tracking yet." : "No workout logged."}
              </div>
            ) : (
              workouts.map((workout) => (
                <article
                  className="rounded-lg border border-stone-200 bg-stone-50 p-4"
                  key={workout.id}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-base font-semibold text-stone-950">
                      {workout.type}
                    </h4>
                    <p className="text-sm text-stone-500">
                      {workout.startTime} - {workout.endTime}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {workout.durationMinutes} minutes
                  </p>
                  {workout.note ? (
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      {workout.note}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
