"use client";

import { motion, type Transition } from "motion/react";
import { createElement, useEffect, useMemo, useRef, useState } from "react";

type AnimationSnapshot = {
  filter: string;
  opacity: number;
  y: number;
};

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: AnimationSnapshot;
  animationTo?: AnimationSnapshot[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "div";
};

const buildKeyframes = (from: AnimationSnapshot, steps: AnimationSnapshot[]) => {
  const keys = new Set([
    ...Object.keys(from),
    ...steps.flatMap((step) => Object.keys(step)),
  ]) as Set<keyof AnimationSnapshot>;

  const keyframes = {} as Record<keyof AnimationSnapshot, Array<string | number>>;
  keys.forEach((key) => {
    keyframes[key] = [from[key], ...steps.map((step) => step[key])];
  });
  return keyframes;
};

export default function BlurText({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  as = "p",
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction],
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction],
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1),
  );

  return createElement(
    as,
    {
      ref,
      className,
      style: { display: "flex", flexWrap: "wrap" as const },
    },
    elements.map((segment, index) => {
      const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

      const spanTransition: Transition = {
        duration: totalDuration,
        times,
        delay: (index * delay) / 1000,
        ease: easing,
      };

      return (
        <motion.span
          className="inline-block will-change-[transform,filter,opacity]"
          key={`${segment}-${index}`}
          initial={fromSnapshot}
          animate={inView ? animateKeyframes : fromSnapshot}
          transition={spanTransition}
          onAnimationComplete={
            index === elements.length - 1 ? onAnimationComplete : undefined
          }
        >
          {segment === " " ? "\u00A0" : segment}
          {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
        </motion.span>
      );
    }),
  );
}

export type { BlurTextProps };
