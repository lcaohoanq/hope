"use client";

import { type DragEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { FaCamera, FaImages, FaTimes } from "react-icons/fa";
import { ActivityTypeSelector } from "@/components/ActivityTypeSelector";
import { WebcamCaptureDialog } from "@/components/WebcamCaptureDialog";
import { appendCaptionPill, hasCaptionPill } from "@/lib/caption-utils";
import type { AppCopy } from "@/lib/i18n";
import { createImagePreviewUrls, revokeImagePreviewUrls } from "@/lib/image-previews";
import type { WorkoutInput } from "@/lib/workout-types";

type WorkoutFormProps = {
  copy: AppCopy;
  defaultDate: string;
  isSubmitting: boolean;
  onSubmitWorkout: (input: WorkoutInput) => Promise<void>;
};

type RequiredWorkoutField = "type" | "date";

const REQUIRED_WORKOUT_FIELDS = new Set<RequiredWorkoutField>(["type", "date"]);

const initialForm = (defaultDate: string): WorkoutInput => ({
  date: defaultDate,
  type: "",
  note: "",
  isPublic: true,
});

const MAX_SELECTED_IMAGES = 3;

function getImageFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function isRequiredWorkoutField(field: keyof WorkoutInput) {
  return REQUIRED_WORKOUT_FIELDS.has(field as RequiredWorkoutField);
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
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
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const imageSelectionIdRef = useRef(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = Boolean(form.type.trim()) && Boolean(form.date);

  useEffect(() => {
    return () => {
      imageSelectionIdRef.current += 1;
      revokeImagePreviewUrls(previewUrlsRef.current);
    };
  }, []);

  function updateField(field: keyof WorkoutInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  function addImages(files: FileList | File[]) {
    const selectedKeys = new Set(selectedImages.map(getImageFileKey));
    const incomingImages = Array.from(files).filter((file) => {
      const fileKey = getImageFileKey(file);

      if (selectedKeys.has(fileKey)) {
        return false;
      }

      selectedKeys.add(fileKey);
      return true;
    });
    const remainingSlots = MAX_SELECTED_IMAGES - selectedImages.length;
    const nextImages = [...selectedImages, ...incomingImages.slice(0, Math.max(remainingSlots, 0))];

    setError(
      incomingImages.length > remainingSlots ? copy.errors.imageLimit(MAX_SELECTED_IMAGES) : "",
    );
    setSuccess("");
    setImageInputKey((current) => current + 1);

    if (nextImages.length !== selectedImages.length) {
      void setImageSelection(nextImages);
    }
  }

  async function setImageSelection(images: File[]) {
    const selectionId = imageSelectionIdRef.current + 1;
    imageSelectionIdRef.current = selectionId;
    revokeImagePreviewUrls(previewUrlsRef.current);
    previewUrlsRef.current = [];
    setSelectedImages(images);
    setPreviewUrls([]);

    if (images.length === 0) {
      setIsPreparingImages(false);
      return;
    }

    setIsPreparingImages(true);

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
    } finally {
      if (selectionId === imageSelectionIdRef.current) {
        setIsPreparingImages(false);
      }
    }
  }

  function removeImage(index: number) {
    void setImageSelection(selectedImages.filter((_, imageIndex) => imageIndex !== index));
    setImageInputKey((current) => current + 1);
    setError("");
    setSuccess("");
  }

  function handleImageDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (isSubmitting || selectedImages.length >= MAX_SELECTED_IMAGES) {
      event.dataTransfer.dropEffect = "none";
      return;
    }

    event.dataTransfer.dropEffect = "copy";
    setIsDraggingImages(true);
  }

  function handleImageDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDraggingImages(false);
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingImages(false);

    if (isSubmitting || selectedImages.length >= MAX_SELECTED_IMAGES) {
      return;
    }

    addImages(event.dataTransfer.files);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const type = form.type.trim();
    const note = form.note.trim();

    if (!type) {
      setError(copy.errors.typeRequired);
      return;
    }

    try {
      await onSubmitWorkout({
        date: form.date,
        type,
        note,
        isPublic: form.isPublic,
        images: selectedImages,
      });

      setForm(initialForm(defaultDate));
      void setImageSelection([]);
      setImageInputKey((current) => current + 1);
      setSuccess(copy.form.success);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.errors.saveWorkout);
    }
  }

  return (
    <form className="rounded-lg border border-border bg-panel p-5 sm:p-6" onSubmit={handleSubmit}>
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
          <FieldLabel required={isRequiredWorkoutField("date")}>{copy.form.date}</FieldLabel>
          <input
            className="h-11 rounded-md border border-border bg-panel-muted px-3 text-base font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => updateField("date", event.target.value)}
            type="date"
            value={form.date}
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-md border border-border bg-panel-muted p-3 text-sm">
          <span>
            <span className="block font-semibold text-text">{copy.form.publicWorkout}</span>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              {copy.form.publicWorkoutHelp}
            </span>
          </span>
          <input
            checked={form.isPublic}
            className="h-5 w-5 accent-[var(--color-accent)]"
            onChange={(event) =>
              setForm((current) => ({ ...current, isPublic: event.target.checked }))
            }
            type="checkbox"
          />
        </label>

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
                  onClick={() => updateField("note", appendCaptionPill(form.note, pill))}
                  type="button"
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium text-text">{copy.form.images}</p>
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            aria-label={copy.form.addImages}
            className="sr-only"
            disabled={isSubmitting || selectedImages.length >= MAX_SELECTED_IMAGES}
            key={imageInputKey}
            multiple
            onChange={(event) => {
              if (event.target.files) {
                addImages(event.target.files);
              }
            }}
            ref={imageInputRef}
            type="file"
          />
          <section
            aria-label={copy.form.images}
            className={`flex h-20 min-w-0 items-center gap-2 overflow-x-auto rounded-md border px-2 transition ${
              isDraggingImages
                ? "border-accent bg-accent/10 ring-2 ring-accent/15"
                : "border-border bg-panel-muted"
            }`}
            data-testid="workout-image-strip"
            onDragEnter={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDragOver={handleImageDragOver}
            onDrop={handleImageDrop}
          >
            <button
              className="flex h-16 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-panel px-2 text-center text-xs font-semibold text-text transition hover:bg-border/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-panel"
              disabled={isSubmitting || selectedImages.length >= MAX_SELECTED_IMAGES}
              onClick={() => imageInputRef.current?.click()}
              title={
                selectedImages.length >= MAX_SELECTED_IMAGES
                  ? copy.form.imageLimitReached(MAX_SELECTED_IMAGES)
                  : copy.form.addImages
              }
              type="button"
            >
              <FaImages aria-hidden="true" className="h-4 w-4" />
              <span className="whitespace-nowrap">
                {selectedImages.length >= MAX_SELECTED_IMAGES
                  ? copy.form.imageLimitReached(MAX_SELECTED_IMAGES)
                  : copy.form.addImages}
              </span>
              <span className="font-normal text-muted">
                {selectedImages.length}/{MAX_SELECTED_IMAGES}
              </span>
            </button>

            <button
              className="flex h-16 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-panel px-2 text-center text-xs font-semibold text-text transition hover:bg-border/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-panel"
              disabled={isSubmitting || selectedImages.length >= MAX_SELECTED_IMAGES}
              onClick={() => setIsCameraOpen(true)}
              title={
                selectedImages.length >= MAX_SELECTED_IMAGES
                  ? copy.form.imageLimitReached(MAX_SELECTED_IMAGES)
                  : copy.form.takePhoto
              }
              type="button"
            >
              <FaCamera aria-hidden="true" className="h-4 w-4" />
              <span className="whitespace-nowrap">{copy.form.takePhoto}</span>
              <span className="font-normal text-muted">{copy.form.webcam}</span>
            </button>

            {isPreparingImages
              ? selectedImages.map((file) => (
                  <div
                    aria-label={copy.form.preparingImages}
                    className="h-16 w-16 shrink-0 animate-pulse rounded-md bg-border/70"
                    key={getImageFileKey(file)}
                    role="status"
                  />
                ))
              : previewUrls.map((url, index) => (
                  <div
                    className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-panel"
                    data-testid="workout-image-preview"
                    key={url}
                  >
                    {/* biome-ignore lint/performance/noImgElement: Local object URL previews cannot use next/image. */}
                    <img
                      alt={copy.form.selectedPreviewAlt(index + 1)}
                      className="h-full w-full object-cover"
                      src={url}
                    />
                    <button
                      aria-label={copy.form.removeImage(index + 1)}
                      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-text/80 text-white transition hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-muted sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      data-testid="workout-image-remove"
                      disabled={isSubmitting}
                      onClick={() => removeImage(index)}
                      title={copy.form.removeImage(index + 1)}
                      type="button"
                    >
                      <FaTimes aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </div>
                ))}

            {selectedImages.length === 0 && !isPreparingImages ? (
              <div className="min-w-40 flex-1 px-1">
                <p className="text-sm font-medium text-text">{copy.form.dropImages}</p>
                <p className="mt-1 text-xs text-muted">{copy.form.imageFormats}</p>
              </div>
            ) : null}

            <span aria-live="polite" className="sr-only">
              {copy.form.selectedImageCount(selectedImages.length, MAX_SELECTED_IMAGES)}
            </span>
          </section>
        </div>
      </fieldset>

      <div className="mt-5 min-h-6">
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-accent">{success}</p> : null}
      </div>

      <button
        className="mt-5 h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:active:scale-100"
        disabled={isSubmitting || !canSubmit}
        type="submit"
      >
        {isSubmitting ? copy.common.saving : copy.form.submit}
      </button>

      <WebcamCaptureDialog
        copy={copy}
        isOpen={isCameraOpen}
        onCapture={(image) => {
          addImages([image]);
          setIsCameraOpen(false);
        }}
        onClose={() => setIsCameraOpen(false)}
      />
    </form>
  );
}
