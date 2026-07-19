"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import type { AppCopy } from "@/lib/i18n";
import { AvatarImage } from "./AvatarImage";

type AvatarPreviewDialogProps = {
  alt: string;
  copy: AppCopy;
  isOpen: boolean;
  onClose: () => void;
  src: string;
};

export function AvatarPreviewDialog({ alt, copy, isOpen, onClose, src }: AvatarPreviewDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100010] grid place-items-center p-4">
      <button
        aria-label={copy.common.close}
        className="absolute inset-0 cursor-default bg-text/65 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={alt}
        aria-modal="true"
        className="relative z-10 h-[min(80dvw,80dvh,640px)] w-[min(80dvw,80dvh,640px)]"
        role="dialog"
      >
        <AvatarImage
          alt={alt}
          className="h-full w-full rounded-full border-4 border-panel object-contain shadow-2xl"
          priority
          sizes="(min-width: 640px) 640px, 80vw"
          src={src}
        />
        <button
          aria-label={copy.common.close}
          className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full bg-overlay/75 text-white transition hover:bg-overlay focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <FaTimes aria-hidden="true" className="h-4 w-4" />
        </button>
      </section>
    </div>,
    document.body,
  );
}
