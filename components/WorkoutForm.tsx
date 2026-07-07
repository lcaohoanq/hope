"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkoutInput } from "@/lib/workout-types";
import { calculateDurationMinutes } from "@/lib/workout-utils";

type WorkoutFormProps = {
  defaultDate: string;
  isSubmitting: boolean;
  onSubmitWorkout: (input: WorkoutInput) => Promise<void>;
};

const initialForm = (defaultDate: string): WorkoutInput => ({
  date: defaultDate,
  type: "",
  startTime: "",
  endTime: "",
  note: "",
});

const MAX_SELECTED_IMAGES = 3;

export function WorkoutForm({
  defaultDate,
  isSubmitting,
  onSubmitWorkout,
}: WorkoutFormProps) {
  const [form, setForm] = useState<WorkoutInput>(() => initialForm(defaultDate));
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const durationPreview = useMemo(() => {
    if (!form.startTime || !form.endTime) {
      return null;
    }

    return calculateDurationMinutes(form.startTime, form.endTime);
  }, [form.startTime, form.endTime]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateField(field: keyof WorkoutInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  function updateImages(files: FileList | null) {
    const nextImages = files ? Array.from(files) : [];

    if (nextImages.length > MAX_SELECTED_IMAGES) {
      setImageSelection(nextImages.slice(0, MAX_SELECTED_IMAGES));
      setError(`Choose up to ${MAX_SELECTED_IMAGES} images.`);
      setSuccess("");
      return;
    }

    setImageSelection(nextImages);
    setError("");
    setSuccess("");
  }

  function setImageSelection(images: File[]) {
    const nextPreviewUrls = images.map((image) => URL.createObjectURL(image));
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = nextPreviewUrls;
    setSelectedImages(images);
    setPreviewUrls(nextPreviewUrls);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const type = form.type.trim();
    const note = form.note.trim();
    const durationMinutes = calculateDurationMinutes(
      form.startTime,
      form.endTime,
    );

    if (!type) {
      setError("Workout type is required.");
      return;
    }

    if (!form.startTime || !form.endTime) {
      setError("Start time and end time are required.");
      return;
    }

    if (durationMinutes <= 0) {
      setError("Start time must be earlier than end time.");
      return;
    }

    try {
      await onSubmitWorkout({
        date: form.date,
        type,
        startTime: form.startTime,
        endTime: form.endTime,
        note,
        images: selectedImages,
      });

      setForm(initialForm(defaultDate));
      setImageSelection([]);
      setImageInputKey((current) => current + 1);
      setSuccess("Workout saved and heatmap refreshed.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save workout.",
      );
    }
  }

  return (
    <form
      className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="border-b border-stone-100 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Today&apos;s entry
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-stone-950">
          Log a workout
        </h2>
      </div>

      <fieldset className="mt-6 grid gap-4" disabled={isSubmitting}>
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Workout type
          <input
            className="h-11 rounded-md border border-stone-200 bg-stone-50 px-3 text-base font-normal text-stone-950 outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-stone-400 focus:border-moss focus:bg-white focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => updateField("type", event.target.value)}
            placeholder="Walking, gym, running"
            type="text"
            value={form.type}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Date
          <input
            className="h-11 rounded-md border border-stone-200 bg-stone-50 px-3 text-base font-normal text-stone-950 outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-moss focus:bg-white focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => updateField("date", event.target.value)}
            type="date"
            value={form.date}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Start time
            <input
              className="h-11 rounded-md border border-stone-200 bg-stone-50 px-3 text-base font-normal text-stone-950 outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-moss focus:bg-white focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(event) => updateField("startTime", event.target.value)}
              type="time"
              value={form.startTime}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-800">
            End time
            <input
              className="h-11 rounded-md border border-stone-200 bg-stone-50 px-3 text-base font-normal text-stone-950 outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-moss focus:bg-white focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(event) => updateField("endTime", event.target.value)}
              type="time"
              value={form.endTime}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Note
          <textarea
            className="min-h-24 resize-y rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-base font-normal text-stone-950 outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-stone-400 focus:border-moss focus:bg-white focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Short context for future you"
            value={form.note}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Images
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="block w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-normal text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-moss focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60"
            key={imageInputKey}
            multiple
            onChange={(event) => updateImages(event.target.files)}
            type="file"
          />
        </label>

        {previewUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <div
                className="aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                key={url}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Selected workout preview ${index + 1}`}
                  className="h-full w-full object-cover"
                  src={url}
                />
              </div>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="mt-5 min-h-6">
        {durationPreview !== null && durationPreview > 0 ? (
          <p className="text-sm text-stone-500">
            Duration preview:{" "}
            <span className="font-medium text-stone-950">
              {durationPreview} minutes
            </span>
          </p>
        ) : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {success ? (
          <p className="text-sm font-medium text-moss">{success}</p>
        ) : null}
      </div>

      <button
        className="mt-5 h-11 w-full rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-400 disabled:active:scale-100"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Log workout"}
      </button>
    </form>
  );
}
