"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FALLBACK_TIMEOUT_MS = 10_000;

function isInternalNavigation(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  return destination.pathname !== current.pathname || destination.search !== current.search;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const completedPathnameRef = useRef(pathname);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (completedPathnameRef.current === pathname) return;
    completedPathnameRef.current = pathname;
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (isInternalNavigation(event)) setIsNavigating(true);
    }

    function handleHistoryNavigation() {
      setIsNavigating(true);
    }

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handleHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (!isNavigating) return;
    const timeout = window.setTimeout(() => setIsNavigating(false), FALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div
      aria-label="Đang chuyển trang"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[30000] h-[3px] overflow-hidden bg-accent/15"
      role="status"
    >
      <div className="navigation-progress__bar h-full w-2/5 bg-accent shadow-[0_0_10px_oklch(var(--color-accent)/0.6)]" />
      <style jsx>{`
        .navigation-progress__bar {
          animation: navigation-progress 1.1s ease-in-out infinite;
          transform-origin: left;
          will-change: transform;
        }

        @keyframes navigation-progress {
          0% {
            transform: translateX(-110%) scaleX(0.45);
          }
          55% {
            transform: translateX(105%) scaleX(1);
          }
          100% {
            transform: translateX(285%) scaleX(0.55);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .navigation-progress__bar {
            animation: none;
            width: 100%;
            opacity: 0.75;
          }
        }
      `}</style>
    </div>
  );
}
