"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });

type HeroSplineSceneProps = {
  scene: string;
};

function ScenePoster() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-panel-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_30%,oklch(var(--color-accent)/0.23),transparent_19%),radial-gradient(circle_at_72%_64%,oklch(var(--color-accent)/0.12),transparent_31%),linear-gradient(145deg,oklch(var(--color-panel)/0.92),oklch(var(--color-panel-muted)))]" />
      <div className="absolute left-[19%] top-[14%] h-[72%] w-[62%] rounded-[46%] border border-white/25 shadow-[inset_0_0_70px_oklch(var(--color-accent)/0.14),0_30px_80px_rgba(17,17,17,0.12)]" />
      <div className="absolute left-[31%] top-[25%] h-[42%] w-[42%] rounded-[45%] border border-white/20" />
      <div className="absolute left-1/2 top-[18%] h-20 w-20 -translate-x-1/2 rounded-full border border-white/35 bg-white/15 shadow-[0_12px_32px_oklch(var(--color-accent)/0.2)] backdrop-blur-sm" />
      <div className="absolute left-[41%] top-[38%] h-[34%] w-[18%] rounded-t-[45%] rounded-b-[36%] border border-white/30 bg-white/10 shadow-[inset_0_1px_16px_rgba(255,255,255,0.18)]" />
      <div className="absolute left-[17%] top-[53%] h-3 w-[31%] -rotate-[18deg] rounded-full bg-white/30 shadow-[0_0_24px_oklch(var(--color-accent)/0.35)]" />
      <div className="absolute right-[16%] top-[53%] h-3 w-[31%] rotate-[18deg] rounded-full bg-white/30 shadow-[0_0_24px_oklch(var(--color-accent)/0.35)]" />
      <div className="absolute bottom-[13%] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted/80">
        Movement in progress
      </div>
    </div>
  );
}

export function HeroSplineScene({ scene }: HeroSplineSceneProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Let the browser paint and hydrate the primary CTA before starting the 3D download.
    const timeout = window.setTimeout(() => setShouldLoad(true), 600);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="absolute inset-0">
      <ScenePoster />
      {shouldLoad ? (
        <Spline
          aria-label="Interactive movement scene"
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 motion-reduce:hidden [&_canvas]:!h-full [&_canvas]:!w-full [&_canvas]:touch-pan-y ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsReady(true)}
          renderOnDemand
          scene={scene}
        />
      ) : null}
    </div>
  );
}
