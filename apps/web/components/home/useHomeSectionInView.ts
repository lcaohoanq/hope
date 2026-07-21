"use client";

import { useEffect, useRef, useState } from "react";

export function useHomeSectionInView<T extends HTMLElement>(minRatio = 0.45) {
  const elementRef = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const root = element.closest<HTMLElement>("[data-home-scroll]");
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= minRatio);
      },
      { root, threshold: [0, minRatio, 1] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [minRatio]);

  return [elementRef, isInView] as const;
}
