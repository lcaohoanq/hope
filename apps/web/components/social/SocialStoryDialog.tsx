"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronLeft, FaChevronRight, FaDownload, FaShareAlt, FaTimes } from "react-icons/fa";
import type { Swiper as SwiperInstance } from "swiper";
import { A11y, Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  canNativeShareSocialStory,
  getSocialStoryCopy,
  getSocialStoryFilename,
  SOCIAL_STORY_HEIGHT,
  SOCIAL_STORY_TEMPLATE_IDS,
  SOCIAL_STORY_WIDTH,
  type SocialStoryInput,
  type SocialStoryTemplateId,
} from "@/lib/social-story";
import {
  loadSocialStoryImage,
  renderSocialStory,
  socialStoryCanvasToBlob,
} from "@/lib/social-story-renderer";

type SocialStoryDialogProps = {
  input: SocialStoryInput;
  isOpen: boolean;
  onClose: () => void;
};

export function SocialStoryDialog({ input, isOpen, onClose }: SocialStoryDialogProps) {
  const copy = getSocialStoryCopy(input.language);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isGeneratingRef = useRef(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<SocialStoryTemplateId>(
    SOCIAL_STORY_TEMPLATE_IDS[0],
  );
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const descriptionId = `social-story-description-${input.workout.id}`;
  const activeTemplateName = copy.templates[activeTemplate];

  const closeDialog = useCallback(() => {
    if (!isGeneratingRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [closeDialog, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadedImage(null);
    setError("");
    setIsLoadingImage(true);
    setActiveTemplate(SOCIAL_STORY_TEMPLATE_IDS[0]);

    void loadSocialStoryImage(input.image.src)
      .then((image) => {
        if (!cancelled) setLoadedImage(image);
      })
      .catch(() => {
        if (!cancelled) setError(copy.imageError);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.imageError, input.image.src, isOpen]);

  async function createStoryBlob() {
    if (!loadedImage) throw new Error("Workout image is not loaded.");
    const canvas = document.createElement("canvas");
    renderSocialStory(canvas, input, loadedImage, activeTemplate);
    return socialStoryCanvasToBlob(canvas);
  }

  async function handleShare() {
    if (isGenerating || !loadedImage) return;
    setIsGenerating(true);
    setError("");

    try {
      const blob = await createStoryBlob();
      const filename = getSocialStoryFilename(input, activeTemplate);
      const file = new File([blob], filename, { type: "image/png" });

      if (canNativeShareSocialStory(window.navigator, file)) {
        try {
          await window.navigator.share({ files: [file], title: copy.dialogTitle });
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
          setError(copy.shareError);
        }
      } else {
        downloadStoryBlob(blob, filename);
      }
    } catch {
      setError(copy.renderError);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    if (isGenerating || !loadedImage) return;
    setIsGenerating(true);
    setError("");

    try {
      const blob = await createStoryBlob();
      downloadStoryBlob(blob, getSocialStoryFilename(input, activeTemplate));
    } catch {
      setError(copy.renderError);
    } finally {
      setIsGenerating(false);
    }
  }

  const handlePreviewRenderError = useCallback(() => {
    setError(copy.renderError);
  }, [copy.renderError]);

  const dialog = (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-2 sm:p-4">
      <button
        aria-label={copy.close}
        className="absolute inset-0 cursor-default bg-slate-950/50"
        data-testid="social-story-backdrop"
        onClick={closeDialog}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-busy={isLoadingImage || isGenerating}
        aria-describedby={descriptionId}
        aria-label={copy.dialogTitle}
        aria-modal="true"
        className="relative z-10 flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:h-[calc(100dvh-2rem)]"
        data-active-template={activeTemplate}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-xl">
              {copy.dialogTitle}
            </h2>
            <p
              className="mt-1 max-w-2xl text-xs leading-5 text-white/60 sm:text-sm"
              id={descriptionId}
            >
              {copy.dialogDescription}
            </p>
          </div>
          <button
            aria-label={copy.close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#56d364] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating}
            onClick={closeDialog}
            ref={closeButtonRef}
            type="button"
          >
            <FaTimes aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-14 sm:py-4">
          {loadedImage ? (
            <>
              <Swiper
                a11y={{
                  enabled: true,
                  nextSlideMessage: copy.nextTemplate,
                  prevSlideMessage: copy.previousTemplate,
                }}
                breakpoints={{
                  640: { slidesPerView: 2.1, spaceBetween: 18 },
                  1024: { slidesPerView: 2.6, spaceBetween: 20 },
                }}
                className="social-story-swiper h-full w-full"
                keyboard={{ enabled: true, onlyInViewport: false }}
                modules={[A11y, Keyboard, Pagination]}
                onSlideChange={(instance) => {
                  setActiveTemplate(
                    SOCIAL_STORY_TEMPLATE_IDS[instance.activeIndex] ?? SOCIAL_STORY_TEMPLATE_IDS[0],
                  );
                }}
                onSwiper={setSwiper}
                pagination={{ clickable: true }}
                slidesPerView={1.12}
                spaceBetween={14}
              >
                {SOCIAL_STORY_TEMPLATE_IDS.map((template, index) => (
                  <SwiperSlide className="!flex items-center justify-center pb-8" key={template}>
                    <button
                      aria-label={copy.preview(copy.templates[template])}
                      aria-pressed={activeTemplate === template}
                      className={`relative flex h-full w-full items-center justify-center py-2 outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-[#56d364] ${
                        activeTemplate === template
                          ? "z-10 scale-100 opacity-100"
                          : "scale-[0.94] opacity-70 hover:scale-[0.97] hover:opacity-90"
                      }`}
                      onClick={() => {
                        setActiveTemplate(template);
                        swiper?.slideTo(index);
                      }}
                      type="button"
                    >
                      <StoryPreview
                        image={loadedImage}
                        input={input}
                        label={copy.preview(copy.templates[template])}
                        onRenderError={handlePreviewRenderError}
                        template={template}
                      />
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>

              <button
                aria-label={copy.previousTemplate}
                className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-900/80 text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#56d364] sm:grid"
                onClick={() => swiper?.slidePrev()}
                type="button"
              >
                <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label={copy.nextTemplate}
                className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-slate-900/80 text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#56d364] sm:grid"
                onClick={() => swiper?.slideNext()}
                type="button"
              >
                <FaChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-white/70">
              {isLoadingImage ? (
                <div>
                  <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#56d364]" />
                  <p className="mt-3">{copy.loadingImage}</p>
                </div>
              ) : (
                <p className="max-w-md text-red-200" role="alert">
                  {error || copy.imageError}
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-slate-950/95 px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-w-0 text-center sm:text-left">
              <p className="text-sm font-semibold text-white">{activeTemplateName}</p>
              {error && loadedImage ? (
                <p className="mt-1 text-xs text-red-200" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#56d364] disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
                disabled={!loadedImage || isGenerating}
                onClick={() => void handleDownload()}
                type="button"
              >
                <FaDownload aria-hidden="true" className="h-3.5 w-3.5" />
                {copy.download}
              </button>
              <button
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#56d364] px-5 text-sm font-bold text-slate-950 transition hover:bg-[#6ee77b] focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/60 sm:flex-none"
                disabled={!loadedImage || isGenerating}
                onClick={() => void handleShare()}
                type="button"
              >
                <FaShareAlt aria-hidden="true" className="h-3.5 w-3.5" />
                {isGenerating ? copy.generating : copy.share}
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );

  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}

function StoryPreview({
  image,
  input,
  label,
  onRenderError,
  template,
}: {
  image: HTMLImageElement;
  input: SocialStoryInput;
  label: string;
  onRenderError: () => void;
  template: SocialStoryTemplateId;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      renderSocialStory(canvas, input, image, template);
    } catch {
      onRenderError();
    }
  }, [image, input, onRenderError, template]);

  return (
    <canvas
      aria-label={label}
      className="block h-auto max-h-full w-auto max-w-full rounded-md bg-slate-900 shadow-[0_20px_55px_rgba(0,0,0,0.45)]"
      data-template={template}
      data-testid="social-story-canvas"
      height={SOCIAL_STORY_HEIGHT}
      ref={canvasRef}
      role="img"
      width={SOCIAL_STORY_WIDTH}
    />
  );
}

function downloadStoryBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
