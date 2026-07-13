"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { appendCaptionPill, hasCaptionPill } from "@/lib/caption-utils";
import type { AppCopy } from "@/lib/i18n";
import {
  createImagePreviewUrls,
  revokeImagePreviewUrls,
} from "@/lib/image-previews";
import type { WorkoutInput } from "@/lib/workout-types";
import { calculateDurationMinutes } from "@/lib/workout-utils";
import { ActivityTypeSelector } from "@/components/ActivityTypeSelector";

type WorkoutFormProps = {
  copy: AppCopy;
  defaultDate: string;
  isSubmitting: boolean;
  onSubmitWorkout: (input: WorkoutInput) => Promise<void>;
};

type RequiredWorkoutField = "type" | "date" | "startTime" | "endTime";

const REQUIRED_WORKOUT_FIELDS = new Set<RequiredWorkoutField>([
  "type",
  "date",
  "startTime",
  "endTime",
]);

const initialForm = (defaultDate: string): WorkoutInput => ({
  date: defaultDate,
  type: "",
  startTime: getCurrentTimeInputValue(),
  endTime: "",
  note: "",
});

const MAX_SELECTED_IMAGES = 3;

function getCurrentTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function isRequiredWorkoutField(field: keyof WorkoutInput) {
  return REQUIRED_WORKOUT_FIELDS.has(field as RequiredWorkoutField);
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{children}</span>
      {required ? (
        <span aria-hidden="true" className="font-semibold text-danger">
          *
        </span>
      ) : null}
    </span>
  );
}

export function WorkoutForm({
  copy,
  defaultDate,
  isSubmitting,
  onSubmitWorkout,
}: WorkoutFormProps) {
  const [form, setForm] = useState<WorkoutInput>(() => initialForm(defaultDate));
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);
  const imageSelectionIdRef = useRef(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const durationPreview = useMemo(() => {
    if (!form.startTime || !form.endTime) {
      return null;
    }

    return calculateDurationMinutes(form.startTime, form.endTime);
  }, [form.startTime, form.endTime]);
  const canSubmit =
    Boolean(form.type.trim()) &&
    Boolean(form.date) &&
    Boolean(form.startTime) &&
    Boolean(form.endTime) &&
    durationPreview !== null &&
    durationPreview > 0;

  useEffect(() => {
    return () => {
      revokeImagePreviewUrls(previewUrlsRef.current);
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
      setError(copy.errors.imageLimit(MAX_SELECTED_IMAGES));
      setSuccess("");
      return;
    }

    setImageSelection(nextImages);
    setError("");
    setSuccess("");
  }

  async function setImageSelection(images: File[]) {
    const selectionId = imageSelectionIdRef.current + 1;
    imageSelectionIdRef.current = selectionId;
    revokeImagePreviewUrls(previewUrlsRef.current);
    previewUrlsRef.current = [];
    setSelectedImages(images);
    setPreviewUrls([]);

    try {
      const nextPreviewUrls = await createImagePreviewUrls(images);

      if (selectionId !== imageSelectionIdRef.current) {
        revokeImagePreviewUrls(nextPreviewUrls);
        return;
      }

      previewUrlsRef.current = nextPreviewUrls;
      setPreviewUrls(nextPreviewUrls);
    } catch {
      if (selectionId !== imageSelectionIdRef.current) {
        return;
      }

      setError(copy.errors.imagePreviewFailed);
    }
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
      setError(copy.errors.typeRequired);
      return;
    }

    if (!form.startTime || !form.endTime) {
      setError(copy.errors.timeRequired);
      return;
    }

    if (durationMinutes <= 0) {
      setError(copy.errors.startBeforeEnd);
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
      setSuccess(copy.form.success);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : copy.errors.saveWorkout,
      );
    }
  }

  return (
    <form
      className="rounded-lg border border-border bg-panel p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="border-b border-border pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          {copy.form.todayEntry}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-text">
          {copy.form.logWorkout}
        </h2>
      </div>

      <fieldset className="mt-6 grid gap-4" disabled={isSubmitting}>
        <ActivityTypeSelector
          copy={copy}
          disabled={isSubmitting}
          label={
            <FieldLabel required={isRequiredWorkoutField("type")}>
              {copy.form.workoutType}
            </FieldLabel>
          }
          onChange={(value) => updateField("type", value)}
          value={form.type}
        />

        <label className="grid gap-2 text-sm font-medium text-text">
          <FieldLabel required={isRequiredWorkoutField("date")}>
            {copy.form.date}
          </FieldLabel>
          <input
            className="h-11 rounded-md border border-border bg-panel-muted px-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => updateField("date", event.target.value)}
            type="date"
            value={form.date}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-text">
            <FieldLabel required={isRequiredWorkoutField("startTime")}>
              {copy.form.startTime}
            </FieldLabel>
            <input
              className="h-11 rounded-md border border-border bg-panel-muted px-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(event) => updateField("startTime", event.target.value)}
              type="time"
              value={form.startTime}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-text">
            <FieldLabel required={isRequiredWorkoutField("endTime")}>
              {copy.form.endTime}
            </FieldLabel>
            <input
              className="h-11 rounded-md border border-border bg-panel-muted px-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(event) => updateField("endTime", event.target.value)}
              type="time"
              value={form.endTime}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-text">
          {copy.form.note}
          <textarea
            className="min-h-24 resize-y rounded-md border border-border bg-panel-muted px-3 py-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-muted focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => updateField("note", event.target.value)}
            placeholder={copy.form.notePlaceholder}
            value={form.note}
          />
        </label>
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.form.captionPills}
          </p>
          <div className="flex flex-wrap gap-2">
            {copy.form.captionPillOptions.map((pill) => {
              const isSelected = hasCaptionPill(form.note, pill);

              return (
                <button
                  aria-pressed={isSelected}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                    isSelected
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border bg-panel-muted text-muted hover:border-accent/50 hover:text-text"
                  }`}
                  key={pill}
                  onClick={() =>
                    updateField("note", appendCaptionPill(form.note, pill))
                  }
                  type="button"
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </div>

        <label className="grid gap-2 text-sm font-medium text-text">
          {copy.form.images}
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="block w-full rounded-md border border-border bg-panel-muted px-3 py-2 text-sm font-normal text-muted file:mr-3 file:rounded-md file:border-0 file:bg-text file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-accent focus:bg-panel focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="aspect-square overflow-hidden rounded-md border border-border bg-panel-muted"
                key={url}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={copy.form.selectedPreviewAlt(index + 1)}
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
          <p className="text-sm text-muted">
            {copy.form.durationPreview}:{" "}
            <span className="font-medium text-text">
              {durationPreview} {copy.common.minutes}
            </span>
          </p>
        ) : null}
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        {success ? (
          <p className="text-sm font-medium text-accent">{success}</p>
        ) : null}
      </div>

      <button
        className="mt-5 h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:active:scale-100"
        disabled={isSubmitting || !canSubmit}
        type="submit"
      >
        {isSubmitting ? copy.common.saving : copy.form.submit}
      </button>
    </form>
  );
}
