"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPen,
  FaSearchMinus,
  FaSearchPlus,
  FaTrash,
} from "react-icons/fa";
import { formatDisplayDate } from "@/lib/date-utils";
import {
  createImagePreviewUrls,
  revokeImagePreviewUrls,
} from "@/lib/image-previews";
import type { AppCopy, Language } from "@/lib/i18n";
import type { Workout, WorkoutUpdateInput } from "@/lib/workout-types";
import { calculateDurationMinutes } from "@/lib/workout-utils";
import { WorkoutImageThumbnail } from "@/components/WorkoutImageThumbnail";

type WorkoutDayDetailModalProps = {
  allowPastWorkoutEdits: boolean;
  canEditWorkouts: boolean;
  copy: AppCopy;
  date: string;
  todayDateKey: string;
  language: Language;
  workouts: Workout[];
  isTrackable: boolean;
  origin?: {
    x: number;
    y: number;
  };
  onClose: () => void;
  onUpdateWorkout: (input: WorkoutUpdateInput) => Promise<Workout>;
};

type EditWorkoutForm = {
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  note: string;
};

const MAX_WORKOUT_IMAGES = 3;
const MIN_IMAGE_ZOOM = 1;
const MAX_IMAGE_ZOOM = 3;
const IMAGE_ZOOM_STEP = 0.25;

export function WorkoutDayDetailModal({
  allowPastWorkoutEdits,
  canEditWorkouts,
  copy,
  date,
  todayDateKey,
  language,
  workouts,
  isTrackable,
  origin,
  onClose,
  onUpdateWorkout,
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
  const [imageZoom, setImageZoom] = useState(1);
  const clampedSelectedImageIndex = Math.min(
    selectedImageIndex,
    Math.max(0, galleryImages.length - 1),
  );
  const selectedImage = galleryImages[clampedSelectedImageIndex];
  const spawnOffset = getSpawnOffset(origin);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditWorkoutForm | null>(null);
  const [editImageSrcs, setEditImageSrcs] = useState<string[]>([]);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([]);
  const editPreviewUrlsRef = useRef<string[]>([]);
  const editImageSelectionIdRef = useRef(0);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const updateSelectedImage = useCallback(
    (direction: -1 | 1) => {
      if (galleryImages.length === 0) {
        setSelectedImageIndex(0);
        return;
      }

      setImageZoom(1);
      setSelectedImageIndex((currentIndex) => {
        const safeCurrentIndex = Math.min(
          Math.max(0, currentIndex),
          galleryImages.length - 1,
        );

        return (
          (safeCurrentIndex + direction + galleryImages.length) %
          galleryImages.length
        );
      });
    },
    [galleryImages.length],
  );

  const showPreviousImage = useCallback(() => {
    updateSelectedImage(-1);
  }, [updateSelectedImage]);

  const showNextImage = useCallback(() => {
    updateSelectedImage(1);
  }, [updateSelectedImage]);

  const updateImageZoom = useCallback((direction: -1 | 1) => {
    setImageZoom((currentZoom) =>
      clampImageZoom(currentZoom + IMAGE_ZOOM_STEP * direction),
    );
  }, []);

  const zoomImageOut = useCallback(() => {
    updateImageZoom(-1);
  }, [updateImageZoom]);

  const zoomImageIn = useCallback(() => {
    updateImageZoom(1);
  }, [updateImageZoom]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousImage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomImageIn();
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomImageOut();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showNextImage, showPreviousImage, zoomImageIn, zoomImageOut]);

  useEffect(() => {
    return () => {
      revokeImagePreviewUrls(editPreviewUrlsRef.current);
    };
  }, []);

  function startEditing(workout: Workout) {
    setEditingWorkoutId(workout.id);
    setEditForm({
      date: workout.date,
      type: workout.type,
      startTime: workout.startTime,
      endTime: workout.endTime,
      note: workout.note ?? "",
    });
    setEditImageSrcs((workout.images ?? []).map((image) => image.src));
    setEditImageSelection([]);
    setEditError("");
    setEditSuccess("");
  }

  function cancelEditing() {
    setEditingWorkoutId(null);
    setEditForm(null);
    setEditImageSrcs([]);
    setEditImageSelection([]);
    setEditError("");
  }

  function updateEditField(field: keyof EditWorkoutForm, value: string) {
    setEditForm((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setEditError("");
    setEditSuccess("");
  }

  function updateEditImages(files: FileList | null, remainingImageSlots: number) {
    const nextImages = files ? Array.from(files) : [];

    if (nextImages.length > remainingImageSlots) {
      setEditImageSelection(nextImages.slice(0, remainingImageSlots));
      setEditError(copy.modal.addMoreImages(remainingImageSlots));
      setEditSuccess("");
      return;
    }

    setEditImageSelection(nextImages);
    setEditError("");
    setEditSuccess("");
  }

  async function setEditImageSelection(images: File[]) {
    const selectionId = editImageSelectionIdRef.current + 1;
    editImageSelectionIdRef.current = selectionId;
    revokeImagePreviewUrls(editPreviewUrlsRef.current);
    editPreviewUrlsRef.current = [];
    setEditImages(images);
    setEditPreviewUrls([]);

    try {
      const nextPreviewUrls = await createImagePreviewUrls(images);

      if (selectionId !== editImageSelectionIdRef.current) {
        revokeImagePreviewUrls(nextPreviewUrls);
        return;
      }

      editPreviewUrlsRef.current = nextPreviewUrls;
      setEditPreviewUrls(nextPreviewUrls);
    } catch {
      if (selectionId !== editImageSelectionIdRef.current) {
        return;
      }

      setEditError(copy.errors.imagePreviewFailed);
    }
  }

  function removeExistingImage(src: string) {
    setEditImageSrcs((current) =>
      current.filter((currentSrc) => currentSrc !== src),
    );
    setEditError("");
    setEditSuccess("");
  }

  async function submitEdit(workout: Workout) {
    if (!editForm) {
      return;
    }

    const type = editForm.type.trim();
    const note = editForm.note.trim();
    const durationMinutes = calculateDurationMinutes(
      editForm.startTime,
      editForm.endTime,
    );

    if (!type) {
      setEditError(copy.errors.typeRequired);
      return;
    }

    if (!editForm.startTime || !editForm.endTime) {
      setEditError(copy.errors.timeRequired);
      return;
    }

    if (durationMinutes <= 0) {
      setEditError(copy.errors.startBeforeEnd);
      return;
    }

    setIsSavingEdit(true);
    setEditError("");
    setEditSuccess("");

    try {
      await onUpdateWorkout({
        id: workout.id,
        date: editForm.date,
        type,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        note,
        imageSrcs: editImageSrcs,
        images: editImages,
      });
      setEditingWorkoutId(null);
      setEditForm(null);
      setEditImageSrcs([]);
      setEditImageSelection([]);
      setEditSuccess(copy.form.workoutUpdated);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : copy.errors.updateWorkout,
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <motion.div
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-950/35 p-4 backdrop-blur-sm"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      role="dialog"
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={{
          opacity: 1,
          rotate: [0, -1.1, 0.7, -0.35, 0],
          scaleX: [0.04, 1.06, 0.97, 1.015, 1],
          scaleY: [0.04, 0.9, 1.05, 0.985, 1],
          x: 0,
          y: 0,
        }}
        className="max-h-[88dvh] w-full max-w-3xl overflow-hidden rounded-lg border border-stone-300 bg-white shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
        exit={{
          opacity: 0,
          rotate: 0,
          scaleX: 0.04,
          scaleY: 0.04,
          x: spawnOffset.x,
          y: spawnOffset.y,
        }}
        initial={{
          opacity: 0,
          rotate: 0,
          scaleX: 0.04,
          scaleY: 0.04,
          x: spawnOffset.x,
          y: spawnOffset.y,
        }}
        onClick={(event) => event.stopPropagation()}
        style={{
          transformOrigin: "50% 50%",
        }}
        transition={{
          opacity: { duration: 0.12 },
          rotate: {
            duration: 0.56,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.38, 0.62, 0.82, 1],
          },
          scaleX: {
            duration: 0.56,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.38, 0.62, 0.82, 1],
          },
          scaleY: {
            duration: 0.58,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.34, 0.58, 0.82, 1],
          },
          x: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
          y: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-4 sm:p-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
              {copy.modal.dayDetail}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
              {formatDisplayDate(date, language)}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {!isTrackable
                ? copy.heatmap.noTrackingYet
                : workouts.length > 0
                  ? copy.modal.loggedWorkoutCount(workouts.length)
                  : copy.modal.noWorkoutLogged}
            </p>
          </div>
          <button
            aria-label={copy.modal.closeWorkoutDetail}
            className="h-9 w-9 rounded-md border border-stone-300 bg-white text-xl leading-none text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <div className="max-h-[calc(88dvh-88px)] overflow-y-auto p-4 sm:p-5">
          {selectedImage ? (
            <div className="overflow-hidden rounded-lg border border-stone-300 bg-stone-950">
              <div className="relative aspect-[16/10] overflow-auto">
                <WorkoutImageThumbnail
                  image={selectedImage.image}
                  imageClassName="h-full w-full object-contain transition-transform duration-150"
                  imageStyle={{
                    transform: `scale(${imageZoom})`,
                    transformOrigin: "center",
                  }}
                  key={selectedImage.image.src}
                  workoutDate={date}
                />
                {galleryImages.length > 1 ? (
                  <>
                    <button
                      aria-label={copy.modal.previousWorkoutImage}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-stone-950/70 text-white backdrop-blur transition hover:bg-stone-900 active:scale-95"
                      onClick={showPreviousImage}
                      type="button"
                    >
                      <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={copy.modal.nextWorkoutImage}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-stone-950/70 text-white backdrop-blur transition hover:bg-stone-900 active:scale-95"
                      onClick={showNextImage}
                      type="button"
                    >
                      <FaChevronRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
                <div className="absolute right-3 top-3 flex items-center overflow-hidden rounded-md border border-white/15 bg-stone-950/70 text-white backdrop-blur">
                  <button
                    aria-label={copy.modal.zoomOutWorkoutImage}
                    className="flex h-9 w-9 items-center justify-center transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/35"
                    disabled={imageZoom <= MIN_IMAGE_ZOOM}
                    onClick={zoomImageOut}
                    type="button"
                  >
                    <FaSearchMinus aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <span className="min-w-12 border-x border-white/10 px-2 text-center font-mono text-xs">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <button
                    aria-label={copy.modal.zoomInWorkoutImage}
                    className="flex h-9 w-9 items-center justify-center transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/35"
                    disabled={imageZoom >= MAX_IMAGE_ZOOM}
                    onClick={zoomImageIn}
                    type="button"
                  >
                    <FaSearchPlus aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-white/10 px-3 py-2 text-xs text-stone-200">
                <span>
                  {selectedImage.workout.type} - {selectedImage.workout.startTime} -{" "}
                  {selectedImage.workout.endTime}
                </span>
                {galleryImages.length > 1 ? (
                  <span className="float-right font-mono text-stone-400">
                    {clampedSelectedImageIndex + 1}/{galleryImages.length}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {galleryImages.length > 0 ? (
            <div className="mt-4">
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {galleryImages.map(({ image, workout }, index) => (
                  <button
                    aria-label={copy.modal.showWorkoutImage(index + 1)}
                    className={`h-28 w-40 shrink-0 snap-start overflow-hidden rounded-md border bg-stone-100 transition ${
                      index === clampedSelectedImageIndex
                        ? "border-moss ring-2 ring-moss/20"
                        : "border-stone-300 hover:border-stone-300"
                    }`}
                    key={`${workout.id}-${image.src}`}
                    onClick={() => {
                      setImageZoom(1);
                      setSelectedImageIndex(index);
                    }}
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
              <div className="rounded-lg border border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                {!isTrackable
                  ? `${copy.heatmap.noTrackingYet}.`
                  : copy.modal.noWorkoutLogged}
              </div>
            ) : (
              workouts.map((workout) => (
                <article
                  className="rounded-lg border border-stone-300 bg-stone-50 p-4"
                  key={workout.id}
                >
                  {editingWorkoutId === workout.id && editForm ? (
                    <EditWorkoutPanel
                      copy={copy}
                      editError={editError}
                      editForm={editForm}
                      existingImages={(workout.images ?? []).filter((image) =>
                        editImageSrcs.includes(image.src),
                      )}
                      editPreviewUrls={editPreviewUrls}
                      editSuccess={editSuccess}
                      isSavingEdit={isSavingEdit}
                      onCancel={cancelEditing}
                      onRemoveExistingImage={removeExistingImage}
                      onSubmit={() => void submitEdit(workout)}
                      onUpdateField={updateEditField}
                      onUpdateImages={updateEditImages}
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-base font-semibold text-stone-950">
                          {workout.type}
                        </h4>
                        <p className="text-sm text-stone-500">
                          {workout.startTime} - {workout.endTime}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">
                        {workout.durationMinutes} {copy.common.minutes}
                      </p>
                      {workout.note ? (
                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          {workout.note}
                        </p>
                      ) : null}
                      {canEditWorkouts &&
                      canEditWorkoutDate(
                        workout.date,
                        todayDateKey,
                        allowPastWorkoutEdits,
                      ) ? (
                        <button
                          className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 active:scale-[0.98]"
                          onClick={() => startEditing(workout)}
                          type="button"
                        >
                          <FaPen aria-hidden="true" className="h-3 w-3" />
                          {copy.form.editWorkout}
                        </button>
                      ) : null}
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditWorkoutPanel({
  copy,
  editError,
  editForm,
  existingImages,
  editPreviewUrls,
  editSuccess,
  isSavingEdit,
  onCancel,
  onRemoveExistingImage,
  onSubmit,
  onUpdateField,
  onUpdateImages,
}: {
  copy: AppCopy;
  editError: string;
  editForm: EditWorkoutForm;
  existingImages: Workout["images"];
  editPreviewUrls: string[];
  editSuccess: string;
  isSavingEdit: boolean;
  onCancel: () => void;
  onRemoveExistingImage: (src: string) => void;
  onSubmit: () => void;
  onUpdateField: (field: keyof EditWorkoutForm, value: string) => void;
  onUpdateImages: (files: FileList | null, remainingImageSlots: number) => void;
}) {
  const existingImageCount = existingImages?.length ?? 0;
  const remainingImageSlots = Math.max(0, MAX_WORKOUT_IMAGES - existingImageCount);
  const durationMinutes = calculateDurationMinutes(
    editForm.startTime,
    editForm.endTime,
  );
  const durationPreview =
    durationMinutes > 0
      ? `${durationMinutes} ${copy.common.minutes}`
      : copy.errors.startBeforeEnd;

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-1 border-b border-stone-300 pb-3">
        <p className="text-base font-semibold text-stone-950">
          {copy.form.editWorkout}
        </p>
        <p className="text-sm text-stone-500">
          {copy.form.durationPreview}: {durationPreview}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          {copy.form.type}
          <input
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus:border-moss focus:ring-2 focus:ring-moss/15"
            onChange={(event) => onUpdateField("type", event.target.value)}
            value={editForm.type}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          {copy.form.date}
          <input
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus:border-moss focus:ring-2 focus:ring-moss/15"
            onChange={(event) => onUpdateField("date", event.target.value)}
            type="date"
            value={editForm.date}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          {copy.form.start}
          <input
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus:border-moss focus:ring-2 focus:ring-moss/15"
            onChange={(event) => onUpdateField("startTime", event.target.value)}
            type="time"
            value={editForm.startTime}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          {copy.form.end}
          <input
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus:border-moss focus:ring-2 focus:ring-moss/15"
            onChange={(event) => onUpdateField("endTime", event.target.value)}
            type="time"
            value={editForm.endTime}
          />
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-stone-800">
        {copy.form.note}
        <textarea
          className="min-h-20 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-950 outline-none focus:border-moss focus:ring-2 focus:ring-moss/15"
          onChange={(event) => onUpdateField("note", event.target.value)}
          value={editForm.note}
        />
      </label>

      {existingImages && existingImages.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-stone-800">
            {copy.form.images}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {existingImages.map((image, index) => (
              <div
                className="group relative aspect-square overflow-hidden rounded-md border border-stone-300 bg-stone-100"
                key={image.src}
              >
                <WorkoutImageThumbnail
                  image={image}
                  workoutDate={editForm.date}
                />
                <button
                  aria-label={copy.form.removeImage(index + 1)}
                  className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/70 bg-stone-950/80 text-white opacity-100 shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-500 sm:opacity-0 sm:group-hover:opacity-100"
                  disabled={isSavingEdit}
                  onClick={() => onRemoveExistingImage(image.src)}
                  title={copy.form.removeImage(index + 1)}
                  type="button"
                >
                  <FaTrash aria-hidden="true" className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-stone-800">
        {copy.form.newImages}
        <input
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={remainingImageSlots === 0 || isSavingEdit}
          multiple
          onChange={(event) =>
            onUpdateImages(event.target.files, remainingImageSlots)
          }
          type="file"
        />
        <span className="text-xs font-normal text-stone-500">
          {copy.form.existingImages(existingImageCount)} ·{" "}
          {copy.form.imageSlotAvailable(remainingImageSlots)}
        </span>
      </label>

      {editPreviewUrls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {editPreviewUrls.map((url, index) => (
            <div
              className="aspect-square overflow-hidden rounded-md border border-stone-300 bg-stone-100"
              key={url}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={copy.form.selectedEditPreviewAlt(index + 1)}
                className="h-full w-full object-cover"
                src={url}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="min-h-5">
        {editError ? (
          <p className="text-sm font-medium text-red-700">{editError}</p>
        ) : null}
        {editSuccess ? (
          <p className="text-sm font-medium text-moss">{editSuccess}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="h-9 rounded-md bg-stone-950 px-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={isSavingEdit}
          type="submit"
        >
          {isSavingEdit ? copy.common.saving : copy.common.saveChanges}
        </button>
        <button
          className="h-9 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          disabled={isSavingEdit}
          onClick={onCancel}
          type="button"
        >
          {copy.common.cancel}
        </button>
      </div>
    </form>
  );
}

function getSpawnOffset(origin?: { x: number; y: number }) {
  if (!origin || typeof window === "undefined") {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: origin.x - window.innerWidth / 2,
    y: origin.y - window.innerHeight / 2,
  };
}

function clampImageZoom(value: number) {
  return Math.min(MAX_IMAGE_ZOOM, Math.max(MIN_IMAGE_ZOOM, value));
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function canEditWorkoutDate(
  workoutDate: string,
  todayDateKey: string,
  allowPastWorkoutEdits: boolean,
) {
  return allowPastWorkoutEdits || workoutDate >= todayDateKey;
}
