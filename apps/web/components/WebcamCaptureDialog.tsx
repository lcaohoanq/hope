"use client";

import { useEffect, useRef, useState } from "react";
import { FaCamera, FaTimes } from "react-icons/fa";
import type { AppCopy } from "@/lib/i18n";

type WebcamCaptureDialogProps = {
  copy: AppCopy;
  isOpen: boolean;
  onCapture: (image: File) => void;
  onClose: () => void;
};

function getCameraErrorMessage(error: unknown, copy: AppCopy) {
  if (!(error instanceof DOMException)) {
    return copy.form.cameraUnavailable;
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return copy.form.cameraPermissionDenied;
    case "NotFoundError":
    case "OverconstrainedError":
      return copy.form.cameraNotFound;
    case "AbortError":
    case "NotReadableError":
      return copy.form.cameraInUse;
    default:
      return copy.form.cameraUnavailable;
  }
}

function stopCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Unable to create a webcam image."));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function WebcamCaptureDialog({
  copy,
  isOpen,
  onCapture,
  onClose,
}: WebcamCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestCameraRef = useRef<() => void>(() => {});
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [cameraError, setCameraError] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let requestWasCancelled = false;
    let requestId = 0;
    const video = videoRef.current;

    setCameraError("");
    setIsCameraReady(false);
    closeButtonRef.current?.focus();

    async function startCamera() {
      requestId += 1;
      const currentRequestId = requestId;
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }
      setCameraError("");
      setIsCameraReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(copy.form.cameraUnavailable);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            height: { ideal: 1080 },
            width: { ideal: 1920 },
          },
        });

        if (requestWasCancelled || currentRequestId !== requestId) {
          stopCameraStream(stream);
          return;
        }

        streamRef.current = stream;
        if (video) {
          video.srcObject = stream;
        }
      } catch (error) {
        if (!requestWasCancelled && currentRequestId === requestId) {
          setCameraError(getCameraErrorMessage(error, copy));
        }
      }
    }

    requestCameraRef.current = () => {
      void startCamera();
    };
    void startCamera();

    return () => {
      requestWasCancelled = true;
      requestId += 1;
      requestCameraRef.current = () => {};
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [copy, isOpen]);

  if (!isOpen) {
    return null;
  }

  async function capturePhoto() {
    const video = videoRef.current;

    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError(copy.form.cameraCaptureFailed);
      return;
    }

    setIsCapturing(true);
    setCameraError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to create a webcam canvas.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToJpeg(canvas);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      onCapture(
        new File([blob], `workout-webcam-${timestamp}.jpg`, {
          lastModified: Date.now(),
          type: "image/jpeg",
        }),
      );
    } catch {
      setCameraError(copy.form.cameraCaptureFailed);
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div
      aria-label={copy.form.cameraDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-[10010] flex items-center justify-center bg-text/70 p-4 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-panel shadow-[0_30px_120px_rgba(17,17,17,0.36)]">
        <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-semibold text-text">{copy.form.cameraDialogTitle}</h3>
            <p className="mt-1 text-sm text-muted">{copy.form.cameraDialogDescription}</p>
          </div>
          <button
            aria-label={copy.common.close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-panel-muted text-muted transition hover:text-text"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <FaTimes aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <video
              aria-label={copy.form.cameraLivePreview}
              autoPlay
              className="h-full w-full -scale-x-100 object-cover"
              data-testid="webcam-live-preview"
              muted
              onCanPlay={() => setIsCameraReady(true)}
              playsInline
              ref={videoRef}
            />

            {!isCameraReady && !cameraError ? (
              <div
                className="absolute inset-0 grid place-items-center bg-black/70 text-sm font-medium text-white"
                role="status"
              >
                {copy.form.cameraStarting}
              </div>
            ) : null}

            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
                <p className="max-w-md text-sm font-medium text-white" role="alert">
                  {cameraError}
                </p>
                <button
                  className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  onClick={() => requestCameraRef.current()}
                  type="button"
                >
                  {copy.common.retry}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="h-11 rounded-md border border-border bg-panel-muted px-5 text-sm font-semibold text-text transition hover:bg-border/60"
              onClick={onClose}
              type="button"
            >
              {copy.common.cancel}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted"
              disabled={!isCameraReady || Boolean(cameraError) || isCapturing}
              onClick={() => void capturePhoto()}
              type="button"
            >
              <FaCamera aria-hidden="true" className="h-4 w-4" />
              {isCapturing ? copy.form.cameraCapturing : copy.form.cameraCapture}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
