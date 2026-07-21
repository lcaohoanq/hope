"use client";

import CircularGallery, { type GalleryItem } from "@/components/home/CircularGallery";
import { useHomeSectionInView } from "@/components/home/useHomeSectionInView";

type HomeGallerySectionProps = {
  items: GalleryItem[];
  profileLabel?: string;
};

export function HomeGallerySection({ items, profileLabel }: HomeGallerySectionProps) {
  const [sectionRef, isInView] = useHomeSectionInView<HTMLDivElement>();

  if (items.length === 0) {
    return (
      <div
        className="mx-auto flex min-h-dvh w-full max-w-[1440px] items-center px-4 py-16 sm:px-6 lg:px-8"
        ref={sectionRef}
      >
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">In motion</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-text sm:text-5xl">
            Sessions worth remembering.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted">
            Public workout photos will appear here once they are logged.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col justify-center overflow-hidden"
      ref={sectionRef}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, oklch(var(--color-accent) / 0.14), transparent 36%), radial-gradient(circle at 80% 70%, oklch(var(--color-panel-muted) / 0.7), transparent 40%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pt-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">In motion</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-text sm:text-5xl lg:text-[3.4rem]">
            <span className="block">Proof of showing up.</span>
            <span className="mt-2 block text-muted">Drag through real sessions.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">
            {profileLabel
              ? `A curved look at recent public workouts from ${profileLabel}.`
              : "A curved look at recent public workouts — the kind of record that makes the next session easier."}
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-[min(52dvh,520px)] w-full sm:h-[min(56dvh,560px)]">
        {isInView ? (
          <CircularGallery
            items={items}
            bend={3}
            textColor="#1c1917"
            borderRadius={0.06}
            scrollSpeed={2}
            scrollEase={0.04}
            font="bold 28px Figtree"
          />
        ) : null}
      </div>
    </div>
  );
}
