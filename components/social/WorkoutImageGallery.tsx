"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import type { Language } from "@/lib/i18n";
import { getSocialCopy } from "@/lib/social-copy";
import type { WorkoutImage } from "@/lib/workout-types";

type WorkoutImageGalleryProps = {
  images: WorkoutImage[];
  language: Language;
  workoutType: string;
  authorName: string;
  eagerFirstImage?: boolean;
};

function getGalleryClassName(count: number) {
  if (count === 1) return "grid grid-cols-1";
  if (count === 2) return "grid aspect-[4/3] grid-cols-2 gap-0.5";
  if (count === 3) return "grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-0.5";
  if (count === 4) {
    return "grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 sm:aspect-[4/3]";
  }
  return "grid aspect-square grid-cols-2 grid-rows-3 gap-0.5";
}

function getTileClassName(count: number, index: number) {
  if (count === 3 && index === 0) return "row-span-2";
  if (count >= 5 && index === 0) return "row-span-2";
  if (count >= 5 && index === 3) return "col-start-1 row-start-3";
  if (count >= 5 && index === 4) return "col-start-2 row-start-3";
  return "";
}

export function WorkoutImageGallery({
  images,
  language,
  workoutType,
  authorName,
  eagerFirstImage = false,
}: WorkoutImageGalleryProps) {
  const copy = getSocialCopy(language);
  const visibleImages = images.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + images.length) % images.length,
        );
      } else if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current === null ? null : (current + 1) % images.length));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [images.length, isOpen]);

  if (images.length === 0) return null;

  const singleImageRatio = Math.min(16 / 9, Math.max(4 / 5, images[0].width / images[0].height));

  const viewer =
    activeIndex === null ? null : (
      <div
        aria-label={copy.imageViewer}
        aria-modal="true"
        className="fixed inset-0 z-[70] grid bg-slate-950/95 p-3 sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveIndex(null);
        }}
        role="dialog"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 text-white sm:p-5">
          <p
            aria-live="polite"
            className="rounded-md bg-slate-950/70 px-3 py-2 text-sm font-semibold"
          >
            {activeIndex + 1}/{images.length}
          </p>
          <button
            aria-label={copy.closeImageViewer}
            className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
            onClick={() => setActiveIndex(null)}
            ref={closeButtonRef}
            type="button"
          >
            <FaTimes aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute inset-0">
          <Image
            alt={`${workoutType} - ${authorName} - ${activeIndex + 1}/${images.length}`}
            className="object-contain"
            fill
            quality={75}
            sizes="100vw"
            src={images[activeIndex].src}
          />
        </div>

        {images.length > 1 ? (
          <>
            <button
              aria-label={copy.previousImage}
              className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] sm:left-5"
              onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)}
              type="button"
            >
              <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label={copy.nextImage}
              className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] sm:right-5"
              onClick={() => setActiveIndex((activeIndex + 1) % images.length)}
              type="button"
            >
              <FaChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
    );

  return (
    <>
      <section
        aria-label={copy.workoutImages(images.length)}
        className={`${getGalleryClassName(images.length)} overflow-hidden bg-panel-muted`}
        style={images.length === 1 ? { aspectRatio: singleImageRatio } : undefined}
      >
        {visibleImages.map((image, index) => {
          const remainingCount = images.length - visibleImages.length;
          const showRemainingCount = index === 4 && remainingCount > 0;

          return (
            <button
              aria-label={copy.openImage(index + 1, images.length)}
              className={`group relative min-h-0 min-w-0 overflow-hidden bg-panel-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${getTileClassName(images.length, index)}`}
              key={image.src}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setActiveIndex(index);
              }}
              type="button"
            >
              <Image
                alt={`${workoutType} - ${authorName} - ${index + 1}/${images.length}`}
                className="object-cover transition duration-300 group-hover:scale-[1.015] motion-reduce:transition-none"
                fill
                loading={eagerFirstImage && index === 0 ? "eager" : "lazy"}
                quality={75}
                sizes={
                  images.length === 1
                    ? "(max-width: 768px) 100vw, 640px"
                    : "(max-width: 768px) 50vw, 320px"
                }
                src={image.src}
              />
              {showRemainingCount ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center bg-slate-950/60 text-3xl font-semibold text-white sm:text-4xl"
                >
                  +{remainingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </section>
      {viewer && typeof document !== "undefined" ? createPortal(viewer, document.body) : null}
    </>
  );
}
