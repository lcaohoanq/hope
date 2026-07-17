"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { FaArrowsAlt, FaMinus, FaPlus, FaTimes } from "react-icons/fa";
import { createCroppedAvatarFile } from "@/lib/avatar-crop";
import type { AppCopy } from "@/lib/i18n";

type AvatarCropDialogProps = {
  copy: AppCopy;
  error: string;
  imageName: string;
  imageUrl: string;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<boolean>;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function AvatarCropDialog({
  copy,
  error,
  imageName,
  imageUrl,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: AvatarCropDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [cropError, setCropError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  const handleCropComplete = useCallback(
    (_area: Area, areaPixels: Area) => setCroppedArea(areaPixels),
    [],
  );

  async function handleSave() {
    if (!croppedArea || isSaving) {
      return;
    }

    setCropError("");

    try {
      const croppedFile = await createCroppedAvatarFile(imageUrl, croppedArea, imageName);
      const didSave = await onSave(croppedFile);

      if (didSave) {
        onClose();
      }
    } catch (cropFailure) {
      setCropError(
        cropFailure instanceof Error ? cropFailure.message : copy.dashboard.avatarCropFailed,
      );
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6">
      <button
        aria-label={copy.common.close}
        className="absolute inset-0 cursor-default bg-text/55"
        disabled={isSaving}
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="avatar-crop-title"
        aria-modal="true"
        className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-panel text-text shadow-[0_28px_100px_rgba(15,23,42,0.3)] sm:max-h-[calc(100dvh-48px)]"
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold tracking-[-0.02em]" id="avatar-crop-title">
            {copy.dashboard.avatarCropTitle}
          </h2>
          <button
            aria-label={copy.common.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <FaTimes aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative h-[min(56dvh,460px)] min-h-[300px] bg-overlay sm:min-h-[380px]">
            <Cropper
              aspect={1}
              classes={{ cropAreaClassName: "avatar-crop-area" }}
              crop={crop}
              cropShape="round"
              cropperProps={{
                "aria-label": copy.dashboard.avatarCropCanvas,
                tabIndex: 0,
              }}
              disableAutomaticStylesInjection
              image={imageUrl}
              maxZoom={MAX_ZOOM}
              minZoom={MIN_ZOOM}
              objectFit="contain"
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
              roundCropAreaPixels
              showGrid={false}
              zoom={zoom}
              zoomWithScroll
            />
            <div className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-2 rounded-md bg-overlay/85 px-3 py-2 text-center text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              <FaArrowsAlt aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{copy.dashboard.avatarCropInstruction}</span>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 sm:px-6">
            <label className="grid gap-2 text-sm font-semibold text-text">
              <span>{copy.dashboard.avatarCropZoom}</span>
              <span className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-3">
                <button
                  aria-label={copy.dashboard.avatarCropZoomOut}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98] disabled:opacity-40"
                  disabled={isSaving || zoom <= MIN_ZOOM}
                  onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
                  type="button"
                >
                  <FaMinus aria-hidden="true" className="h-3 w-3" />
                </button>
                <input
                  aria-label={copy.dashboard.avatarCropZoom}
                  className="h-2 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
                  disabled={isSaving}
                  max={MAX_ZOOM}
                  min={MIN_ZOOM}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  step={ZOOM_STEP}
                  type="range"
                  value={zoom}
                />
                <button
                  aria-label={copy.dashboard.avatarCropZoomIn}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98] disabled:opacity-40"
                  disabled={isSaving || zoom >= MAX_ZOOM}
                  onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
                  type="button"
                >
                  <FaPlus aria-hidden="true" className="h-3 w-3" />
                </button>
              </span>
            </label>

            <p className="text-xs leading-5 text-muted">{copy.dashboard.avatarCropPublic}</p>
            {cropError || error ? (
              <p aria-live="polite" className="text-sm font-medium text-danger">
                {cropError || error}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-border px-4 py-3 sm:px-5">
          <button
            className="h-10 rounded-md px-4 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            {copy.common.cancel}
          </button>
          <button
            className="h-10 min-w-28 rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!croppedArea || isSaving}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? copy.dashboard.avatarCropSaving : copy.dashboard.avatarCropSave}
          </button>
        </footer>
      </section>
    </div>
  );
}
