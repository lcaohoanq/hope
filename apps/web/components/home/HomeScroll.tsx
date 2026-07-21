"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import ScrollReveal from "@/components/home/ScrollReveal";

const JOKE =
  "When does a workout count? When you crush a PR? No! When you feel sore? No! When you post it online? No! A workout counts when you write it down.";

const SECTIONS = [
  { id: "hero", label: "Home" },
  { id: "joke", label: "Joke" },
  { id: "gallery", label: "Gallery" },
  { id: "story", label: "Story" },
  { id: "features", label: "Features" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type HomeScrollProps = {
  hero: ReactNode;
  features: ReactNode;
  gallery: ReactNode;
  story: ReactNode;
};

export function HomeScroll({ hero, features, gallery, story }: HomeScrollProps) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("hero");

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (el): el is HTMLElement => el != null,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const top = visible[0]?.target;
        if (top?.id && SECTIONS.some((section) => section.id === top.id)) {
          setActiveSection(top.id as SectionId);
        }
      },
      {
        root,
        threshold: [0.35, 0.55, 0.75],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function goToSection(id: SectionId) {
    const root = scrollRef.current;
    const target = document.getElementById(id);
    if (!root || !target) return;

    root.scrollTo({
      top: target.offsetTop,
      behavior: "smooth",
    });
    setActiveSection(id);
  }

  return (
    <main
      ref={scrollRef}
      className="h-dvh snap-y snap-mandatory overflow-y-auto overflow-x-hidden bg-app text-text"
      data-home-scroll
    >
      <nav
        aria-label="Page sections"
        className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 sm:right-6 sm:block lg:right-8"
      >
        <ul className="pointer-events-auto flex flex-col items-center gap-3">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <li key={section.id}>
                <button
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`Go to ${section.label}`}
                  className={`block rounded-full transition duration-300 ${
                    isActive
                      ? "h-2.5 w-2.5 bg-accent shadow-[0_0_0_4px_oklch(var(--color-accent)/0.18)]"
                      : "h-2 w-2 bg-muted/55 hover:bg-muted"
                  }`}
                  onClick={() => goToSection(section.id)}
                  type="button"
                />
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="relative min-h-dvh snap-start snap-always" id="hero">
        {hero}
      </section>

      <section
        className="relative flex min-h-dvh snap-start snap-always items-center border-t border-border bg-panel/[0.36]"
        id="joke"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 70% 40%, oklch(var(--color-accent) / 0.1), transparent 42%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            A little truth, dressed as a joke
          </p>
          <ScrollReveal
            scrollContainerRef={scrollRef}
            baseOpacity={0}
            enableBlur
            baseRotation={5}
            blurStrength={10}
            containerClassName="mt-6 max-w-4xl"
            textClassName="tracking-[-0.03em] text-text"
          >
            {JOKE}
          </ScrollReveal>
        </div>
      </section>

      <section
        className="relative min-h-dvh snap-start snap-always border-t border-border"
        id="gallery"
      >
        {gallery}
      </section>

      <section
        className="relative min-h-dvh snap-start snap-always border-t border-border"
        id="story"
      >
        {story}
      </section>

      <section className="relative min-h-dvh snap-start snap-always" id="features">
        {features}
      </section>
    </main>
  );
}
