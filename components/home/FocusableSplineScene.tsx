"use client";

import { type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FaExpand, FaTimes } from "react-icons/fa";

type FocusableSplineSceneProps = {
  children: ReactNode;
  className?: string;
};

export function FocusableSplineScene({ children, className = "" }: FocusableSplineSceneProps) {
  const [isFocused, setIsFocused] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeScene = useCallback(() => {
    setIsFocused(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousOverscrollBehavior = root.style.overscrollBehavior;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    const scene = sceneRef.current;

    const preventPageScroll = (event: Event) => {
      event.preventDefault();
    };

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeScene();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    scene?.addEventListener("touchmove", preventPageScroll, { passive: false });
    scene?.addEventListener("wheel", preventPageScroll, { passive: false });
    scene?.focus({ preventScroll: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      scene?.removeEventListener("touchmove", preventPageScroll);
      scene?.removeEventListener("wheel", preventPageScroll);
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [closeScene, isFocused]);

  const focusCanvas = (event: PointerEvent<HTMLDivElement>) => {
    if (!isFocused) {
      return;
    }

    const canvas = event.currentTarget.querySelector("canvas");
    if (canvas) {
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    }
  };

  const modalProps = isFocused
    ? {
        "aria-label": "Interactive 3D movement scene",
        "aria-modal": true,
        role: "dialog" as const,
      }
    : {};

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0">
        <div
          className={
            isFocused
              ? "fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6"
              : "relative h-full w-full"
          }
        >
          <button
            aria-label="Close focused 3D scene"
            className={`absolute inset-0 cursor-default transition-opacity duration-300 ease-out ${
              isFocused
                ? "pointer-events-auto bg-overlay/[0.9] opacity-100 backdrop-blur-sm"
                : "pointer-events-none opacity-0"
            }`}
            onClick={closeScene}
            type="button"
          />

          <div
            {...modalProps}
            className={
              isFocused
                ? "relative h-full max-h-[920px] w-full max-w-[1500px] overflow-hidden rounded-[1.5rem] border border-white/[0.15] bg-panel-muted shadow-[0_30px_120px_rgba(0,0,0,0.48)]"
                : "relative h-full w-full overflow-hidden rounded-[1.5rem] border border-border bg-panel-muted shadow-panel"
            }
            onPointerDownCapture={focusCanvas}
            ref={sceneRef}
            style={{
              opacity: isFocused ? 1 : 0.98,
              transform: isFocused ? "translateY(0) scale(1)" : "translateY(6px) scale(0.985)",
              transformOrigin: "center center",
              transition:
                "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform, opacity",
              backfaceVisibility: "hidden",
            }}
            tabIndex={isFocused ? -1 : undefined}
          >
            {children}

            {isFocused ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-5">
                <p className="rounded-full bg-overlay/[0.74] px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                  {/* Scene focused. Press Esc to exit. */}
                </p>
                <button
                  aria-label="Exit 3D focus"
                  className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-overlay/[0.74] text-white backdrop-blur transition hover:bg-overlay/90 active:scale-[0.96]"
                  onClick={closeScene}
                  type="button"
                >
                  <FaTimes aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                aria-label="Focus 3D scene"
                className="group absolute inset-0 flex cursor-zoom-in items-end justify-center p-4 text-left sm:p-5"
                onClick={() => setIsFocused(true)}
                ref={triggerRef}
                type="button"
              >
                <span className="inline-flex translate-y-1 items-center gap-2 rounded-full border border-white/[0.18] bg-overlay/[0.62] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_32px_rgba(15,23,42,0.28)] backdrop-blur-xl backdrop-saturate-150 transition duration-200 group-hover:translate-y-0 group-hover:border-white/30 group-hover:bg-overlay/[0.78] group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transform-none motion-reduce:transition-none">
                  <FaExpand aria-hidden="true" className="h-3 w-3" />
                  Click to focus
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
