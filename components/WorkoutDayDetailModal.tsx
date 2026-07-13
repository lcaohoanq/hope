"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
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
import { ActivityTypeSelector } from "@/components/ActivityTypeSelector";
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

type EditGalleryImage =
  | {
      image: NonNullable<Workout["images"]>[number];
      kind: "existing";
    }
  | {
      index: number;
      kind: "preview";
      url: string;
    };

const MAX_WORKOUT_IMAGES = 3;
const MIN_IMAGE_ZOOM = 1;
const MAX_IMAGE_ZOOM = 3;
const IMAGE_ZOOM_STEP = 0.25;
const CAPTION_MAX_LENGTH = 48;
const SWIPE_MIN_DISTANCE = 48;
const SWIPE_MAX_VERTICAL_DRIFT = 72;

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
  const selectedEditableWorkout =
    selectedImage?.workout &&
    canEditWorkoutDate(
      selectedImage.workout.date,
      todayDateKey,
      allowPastWorkoutEdits,
    )
      ? selectedImage.workout
      : workouts.find((workout) =>
          canEditWorkoutDate(
            workout.date,
            todayDateKey,
            allowPastWorkoutEdits,
          ),
        );
  const editingWorkout = workouts.find(
    (workout) => workout.id === editingWorkoutId,
  );

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
  const gallerySwipeHandlers = useSwipeNavigation({
    enabled: galleryImages.length > 1,
    onNext: showNextImage,
    onPrevious: showPreviousImage,
  });

  const cancelEditing = useCallback(() => {
    editImageSelectionIdRef.current += 1;
    revokeImagePreviewUrls(editPreviewUrlsRef.current);
    editPreviewUrlsRef.current = [];
    setEditingWorkoutId(null);
    setEditForm(null);
    setEditImageSrcs([]);
    setEditImages([]);
    setEditPreviewUrls([]);
    setEditError("");
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (editingWorkoutId) {
          cancelEditing();
          return;
        }

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
  }, [
    cancelEditing,
    editingWorkoutId,
    onClose,
    showNextImage,
    showPreviousImage,
    zoomImageIn,
    zoomImageOut,
  ]);

  useEffect(() => {
    return () => {
      revokeImagePreviewUrls(editPreviewUrlsRef.current);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
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
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-text/45 p-3 sm:p-4"
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
        className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
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
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-text">
              {formatDisplayDate(date, language)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {editingWorkout ? (
              <button
                aria-label={copy.modal.backToWorkoutDetail}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98]"
                disabled={isSavingEdit}
                onClick={cancelEditing}
                type="button"
              >
                <FaChevronLeft aria-hidden="true" className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {copy.modal.backToWorkoutDetail}
                </span>
              </button>
            ) : canEditWorkouts && selectedEditableWorkout ? (
              <button
                aria-label={copy.form.editWorkout}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98]"
                onClick={() => startEditing(selectedEditableWorkout)}
                type="button"
              >
                <FaPen aria-hidden="true" className="h-3 w-3" />
                <span className="hidden sm:inline">{copy.form.editWorkout}</span>
              </button>
            ) : null}
            <button
              aria-label={copy.modal.closeWorkoutDetail}
              className="h-9 w-9 rounded-md border border-border bg-panel text-xl leading-none text-muted transition hover:bg-panel-muted hover:text-text"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overscroll-contain p-3 sm:p-4 ${
            editingWorkout ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
          {editingWorkout && editForm ? (
            <section
              aria-label={copy.form.editWorkout}
              aria-modal="true"
              className="rounded-lg border border-border bg-panel-muted p-4 sm:p-5"
              role="dialog"
            >
              <EditWorkoutPanel
                copy={copy}
                editError={editError}
                editForm={editForm}
                existingImages={(editingWorkout.images ?? []).filter((image) =>
                  editImageSrcs.includes(image.src),
                )}
                editPreviewUrls={editPreviewUrls}
                editSuccess={editSuccess}
                isSavingEdit={isSavingEdit}
                onCancel={cancelEditing}
                onRemoveExistingImage={removeExistingImage}
                onSubmit={() => void submitEdit(editingWorkout)}
                onUpdateField={updateEditField}
                onUpdateImages={updateEditImages}
              />
            </section>
          ) : (
            <div className="grid min-h-0 gap-3">
              {selectedImage ? (
                <div className="overflow-hidden rounded-lg border border-border bg-text">
                  <div
                    className="group relative h-[calc(92dvh-12.75rem)] min-h-[20rem] touch-pan-y overflow-hidden"
                    {...gallerySwipeHandlers}
                  >
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
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-text/70 text-white opacity-100 transition hover:bg-text/90 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={showPreviousImage}
                          type="button"
                        >
                          <FaChevronLeft
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </button>
                        <button
                          aria-label={copy.modal.nextWorkoutImage}
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-text/70 text-white opacity-100 transition hover:bg-text/90 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={showNextImage}
                          type="button"
                        >
                          <FaChevronRight
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </button>
                      </>
                    ) : null}
                    <div className="absolute right-3 top-3 flex items-center overflow-hidden rounded-md border border-white/15 bg-text/70 text-white">
                      <button
                        aria-label={copy.modal.zoomOutWorkoutImage}
                        className="flex h-9 w-9 items-center justify-center transition hover:bg-panel/10 disabled:cursor-not-allowed disabled:text-white/35"
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
                        className="flex h-9 w-9 items-center justify-center transition hover:bg-panel/10 disabled:cursor-not-allowed disabled:text-white/35"
                        disabled={imageZoom >= MAX_IMAGE_ZOOM}
                        onClick={zoomImageIn}
                        type="button"
                      >
                        <FaSearchPlus aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                    <CaptionPill caption={selectedImage.workout.note} />
                    {galleryImages.length > 1 ? (
                      <span className="absolute bottom-3 right-3 rounded-full bg-text/70 px-2 py-1 font-mono text-xs text-white">
                        {clampedSelectedImageIndex + 1}/{galleryImages.length}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {galleryImages.length > 0 ? (
                <div>
                  <div className="flex justify-center snap-x gap-2 overflow-x-auto pb-1">
                    {galleryImages.map(({ image, workout }, index) => (
                      <button
                        aria-label={copy.modal.showWorkoutImage(index + 1)}
                        className={`h-[4.5rem] w-28 shrink-0 snap-start overflow-hidden rounded-md border bg-panel-muted transition sm:h-20 sm:w-32 ${
                          index === clampedSelectedImageIndex
                            ? "border-accent ring-2 ring-accent/20"
                            : "border-border hover:border-border"
                        }`}
                        key={`${workout.id}-${image.src}`}
                        onClick={() => {
                          setImageZoom(1);
                          setSelectedImageIndex(index);
                        }}
                        type="button"
                      >
                        <WorkoutImageThumbnail
                          image={image}
                          workoutDate={date}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                {workouts.length === 0 ? (
                  <div className="rounded-lg border border-border bg-panel-muted p-4 text-sm text-muted">
                    {!isTrackable
                      ? `${copy.heatmap.noTrackingYet}.`
                      : copy.modal.noWorkoutLogged}
                  </div>
                ) : null}
              </div>
            </div>
          )}
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
  const editGalleryImages = useMemo<EditGalleryImage[]>(
    () => [
      ...((existingImages ?? []).map((image) => ({
        image,
        kind: "existing" as const,
      })) ?? []),
      ...editPreviewUrls.map((url, index) => ({
        index,
        kind: "preview" as const,
        url,
      })),
    ],
    [editPreviewUrls, existingImages],
  );
  const [selectedEditImageIndex, setSelectedEditImageIndex] = useState<
    number | null
  >(null);
  const selectedEditImage =
    selectedEditImageIndex === null
      ? null
      : editGalleryImages[
          Math.min(selectedEditImageIndex, editGalleryImages.length - 1)
        ];
  const selectedEditImageDisplayIndex =
    selectedEditImageIndex === null
      ? 0
      : Math.min(selectedEditImageIndex, editGalleryImages.length - 1);

  function updateSelectedEditImage(direction: -1 | 1) {
    setSelectedEditImageIndex((currentIndex) => {
      if (editGalleryImages.length === 0) {
        return null;
      }

      const safeIndex =
        currentIndex === null
          ? 0
          : Math.min(Math.max(0, currentIndex), editGalleryImages.length - 1);

      return (
        (safeIndex + direction + editGalleryImages.length) %
        editGalleryImages.length
      );
    });
  }
  const editGallerySwipeHandlers = useSwipeNavigation({
    enabled: editGalleryImages.length > 1,
    onNext: () => updateSelectedEditImage(1),
    onPrevious: () => updateSelectedEditImage(-1),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-base font-semibold text-text">
            {copy.form.editWorkout}
          </p>
          <p className="mt-1 text-sm text-muted">
            {copy.form.durationPreview}: {durationPreview}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="h-9 rounded-md bg-accent px-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-muted"
            disabled={isSavingEdit}
            type="submit"
          >
            {isSavingEdit ? copy.common.saving : copy.common.saveChanges}
          </button>
          <button
            className="h-9 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted"
            disabled={isSavingEdit}
            onClick={onCancel}
            type="button"
          >
            {copy.common.cancel}
          </button>
        </div>
      </div>

      {selectedEditImage ? (
        <div
          aria-label={copy.modal.editWorkoutImageGallery}
          aria-modal="true"
          className="fixed inset-0 z-[10020] flex items-center justify-center bg-text/70 p-4"
          onClick={() => setSelectedEditImageIndex(null)}
          role="dialog"
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-[0_30px_120px_rgba(17,17,17,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border p-3 sm:p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">
                  {copy.modal.editWorkoutImageGallery}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {selectedEditImageDisplayIndex + 1}/
                  {editGalleryImages.length}
                </p>
              </div>
              <button
                className="h-9 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
                onClick={() => setSelectedEditImageIndex(null)}
                type="button"
              >
                {copy.modal.backToEditWorkout}
              </button>
            </div>

            <div
              className="group relative flex min-h-[50dvh] touch-pan-y items-center justify-center bg-text p-3 sm:min-h-[64dvh] sm:p-5"
              {...editGallerySwipeHandlers}
            >
              {selectedEditImage.kind === "existing" ? (
                <WorkoutImageThumbnail
                  image={selectedEditImage.image}
                  imageClassName="max-h-[72dvh] w-full object-contain"
                  key={selectedEditImage.image.src}
                  workoutDate={editForm.date}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={copy.form.selectedEditPreviewAlt(
                    selectedEditImage.index + 1,
                  )}
                  className="max-h-[72dvh] w-full object-contain"
                  key={selectedEditImage.url}
                  src={selectedEditImage.url}
                />
              )}

              {editGalleryImages.length > 1 ? (
                <>
                  <button
                    aria-label={copy.modal.previousWorkoutImage}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-text/70 text-white opacity-100 transition hover:bg-text/90 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => updateSelectedEditImage(-1)}
                    type="button"
                  >
                    <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={copy.modal.nextWorkoutImage}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-white/15 bg-text/70 text-white opacity-100 transition hover:bg-text/90 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => updateSelectedEditImage(1)}
                    type="button"
                  >
                    <FaChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </>
              ) : null}
              <CaptionPill caption={editForm.note} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="grid gap-3 content-start">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActivityTypeSelector
              copy={copy}
              disabled={isSavingEdit}
              label={copy.form.type}
              onChange={(value) => onUpdateField("type", value)}
              value={editForm.type}
              variant="compact"
            />
            <label className="grid gap-1.5 text-sm font-medium text-text">
              {copy.form.date}
              <input
                className="h-10 rounded-md border border-border bg-panel px-3 text-sm font-normal text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                onChange={(event) => onUpdateField("date", event.target.value)}
                type="date"
                value={editForm.date}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-text">
              {copy.form.start}
              <input
                className="h-10 rounded-md border border-border bg-panel px-3 text-sm font-normal text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                onChange={(event) =>
                  onUpdateField("startTime", event.target.value)
                }
                type="time"
                value={editForm.startTime}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-text">
              {copy.form.end}
              <input
                className="h-10 rounded-md border border-border bg-panel px-3 text-sm font-normal text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                onChange={(event) =>
                  onUpdateField("endTime", event.target.value)
                }
                type="time"
                value={editForm.endTime}
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-text">
            {copy.form.note}
            <textarea
              className="min-h-32 resize-y rounded-md border border-border bg-panel px-3 py-2 text-sm font-normal text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              onChange={(event) => onUpdateField("note", event.target.value)}
              value={editForm.note}
            />
          </label>
        </div>

        <div className="grid gap-3 content-start rounded-md border border-border bg-panel p-3">
          {existingImages && existingImages.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-text">
                {copy.form.images}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((image, index) => (
                  <div
                    className="group relative aspect-square overflow-hidden rounded-md border border-border bg-panel-muted"
                    key={image.src}
                  >
                    <button
                      aria-label={copy.modal.expandWorkoutImage}
                      className="block h-full w-full transition hover:opacity-90"
                      onClick={() => setSelectedEditImageIndex(index)}
                      type="button"
                    >
                      <WorkoutImageThumbnail
                        image={image}
                        workoutDate={editForm.date}
                      />
                    </button>
                    <button
                      aria-label={copy.form.removeImage(index + 1)}
                      className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/70 bg-text/80 text-white opacity-100 shadow-sm transition hover:bg-danger disabled:cursor-not-allowed disabled:bg-muted sm:opacity-0 sm:group-hover:opacity-100"
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

          <label className="grid gap-1.5 text-sm font-medium text-text">
            {copy.form.newImages}
            <input
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="block w-full rounded-md border border-border bg-panel px-3 py-2 text-sm font-normal text-muted file:mr-3 file:rounded-md file:border-0 file:bg-text file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={remainingImageSlots === 0 || isSavingEdit}
              multiple
              onChange={(event) =>
                onUpdateImages(event.target.files, remainingImageSlots)
              }
              type="file"
            />
            <span className="text-xs font-normal text-muted">
              {copy.form.existingImages(existingImageCount)} /{" "}
              {copy.form.imageSlotAvailable(remainingImageSlots)}
            </span>
          </label>

          {editPreviewUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {editPreviewUrls.map((url, index) => (
                <button
                  aria-label={copy.modal.expandWorkoutImage}
                  className="aspect-square overflow-hidden rounded-md border border-border bg-panel-muted transition hover:opacity-90"
                  key={url}
                  onClick={() =>
                    setSelectedEditImageIndex(existingImageCount + index)
                  }
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={copy.form.selectedEditPreviewAlt(index + 1)}
                    className="h-full w-full object-cover"
                    src={url}
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-5">
            {editError ? (
              <p className="text-sm font-medium text-danger">{editError}</p>
            ) : null}
            {editSuccess ? (
              <p className="text-sm font-medium text-accent">{editSuccess}</p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

function CaptionPill({ caption }: { caption?: string }) {
  const trimmedCaption = caption?.trim();

  if (!trimmedCaption) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-[min(82%,34rem)] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-center text-sm font-semibold leading-snug text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      <span className="line-clamp-2">
        {truncateCaption(trimmedCaption, CAPTION_MAX_LENGTH)}
      </span>
    </div>
  );
}

function truncateCaption(caption: string, maxLength: number) {
  const normalizedCaption = caption.trim();

  if (normalizedCaption.length <= maxLength) {
    return normalizedCaption;
  }

  return `${normalizedCaption.slice(0, maxLength).trimEnd()}...`;
}

function useSwipeNavigation({
  enabled,
  onNext,
  onPrevious,
}: {
  enabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || event.pointerType === "mouse") {
        return;
      }

      swipeStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [enabled],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const swipeStart = swipeStartRef.current;
      swipeStartRef.current = null;

      if (!enabled || !swipeStart || swipeStart.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;

      if (
        Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
        Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT
      ) {
        return;
      }

      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
    },
    [enabled, onNext, onPrevious],
  );

  const handlePointerCancel = useCallback(() => {
    swipeStartRef.current = null;
  }, []);

  return {
    onPointerCancel: handlePointerCancel,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
  };
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
