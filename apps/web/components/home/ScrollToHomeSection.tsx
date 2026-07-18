"use client";

import type { ReactNode } from "react";

type ScrollToHomeSectionProps = {
  sectionId: string;
  className?: string;
  children: ReactNode;
};

export function ScrollToHomeSection({ sectionId, className, children }: ScrollToHomeSectionProps) {
  return (
    <a
      className={className}
      href={`#${sectionId}`}
      onClick={(event) => {
        event.preventDefault();
        const root = document.querySelector<HTMLElement>("[data-home-scroll]");
        const target = document.getElementById(sectionId);
        if (!root || !target) return;
        root.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      }}
    >
      {children}
    </a>
  );
}
