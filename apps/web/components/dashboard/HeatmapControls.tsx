"use client";

import { useEffect, useRef, useState } from "react";
import type { AppCopy } from "@/lib/i18n";
import type { HeatmapView } from "@/lib/users";

const heatmapIntensityClasses = [
  "",
  "bg-[#033A16]",
  "bg-[#196C2E]",
  "bg-[#2EA043]",
  "bg-[#56D364]",
] as const;

type HeatmapControlsProps = {
  birthYear: number;
  copy: AppCopy;
  onViewChange: (view: HeatmapView) => void;
  todayDateKey: string;
  view: HeatmapView;
};

export function HeatmapControls({
  birthYear,
  copy,
  onViewChange,
  todayDateKey,
  view,
}: HeatmapControlsProps) {
  const [isViewPickerOpen, setIsViewPickerOpen] = useState(false);
  const viewPickerRef = useRef<HTMLDivElement | null>(null);
  const currentYear = Number(todayDateKey.slice(0, 4));
  const viewOptions = [
    { label: copy.heatmap.lifetime, value: "lifetime" },
    ...Array.from({ length: currentYear - birthYear + 1 }, (_, index) => currentYear - index).map(
      (year) => ({ label: String(year), value: String(year) }),
    ),
  ];
  const selectedViewValue = view.mode === "lifetime" ? "lifetime" : String(view.year);
  const selectedViewLabel =
    viewOptions.find((option) => option.value === selectedViewValue)?.label ?? selectedViewValue;

  useEffect(() => {
    if (!isViewPickerOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (viewPickerRef.current && !viewPickerRef.current.contains(event.target as Node)) {
        setIsViewPickerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsViewPickerOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewPickerOpen]);

  function handleViewChange(value: string) {
    onViewChange(
      value === "lifetime" ? { mode: "lifetime" } : { mode: "year", year: Number(value) },
    );
    setIsViewPickerOpen(false);
  }

  return (
    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div />
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="relative flex items-center gap-2 text-xs font-medium text-muted"
          ref={viewPickerRef}
        >
          <span>{copy.heatmap.view}</span>
          <button
            aria-expanded={isViewPickerOpen}
            aria-haspopup="listbox"
            className="group inline-flex h-9 min-w-[116px] items-center justify-between gap-3 rounded-md border border-border bg-panel px-3 text-sm font-semibold text-text shadow-[0_1px_0_rgba(17,17,17,0.04)] outline-none transition hover:border-border hover:bg-panel-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 active:scale-[0.99]"
            onClick={() => setIsViewPickerOpen((current) => !current)}
            type="button"
          >
            <span>{selectedViewLabel}</span>
            <span
              aria-hidden="true"
              className={`h-2 w-2 border-b-2 border-r-2 border-muted transition group-hover:border-text ${isViewPickerOpen ? "-rotate-[135deg]" : "rotate-45"}`}
            />
          </button>
          {isViewPickerOpen ? (
            <div className="absolute right-0 top-11 z-50 w-[148px] overflow-hidden rounded-lg border border-border bg-panel shadow-[0_18px_45px_rgba(17,17,17,0.14)]">
              <div
                aria-label={copy.heatmap.view}
                className="max-h-72 overflow-y-auto p-1.5 [scrollbar-color:oklch(var(--color-muted))_transparent] [scrollbar-width:thin]"
                role="listbox"
              >
                {viewOptions.map((option) => {
                  const isSelected = option.value === selectedViewValue;
                  return (
                    <button
                      aria-selected={isSelected}
                      className={`flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-sm transition ${isSelected ? "bg-text font-semibold text-white" : "font-medium text-muted hover:bg-panel-muted hover:text-text"}`}
                      key={option.value}
                      onClick={() => handleViewChange(option.value)}
                      role="option"
                      type="button"
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-3 rotate-[-45deg] border-b-2 border-l-2 border-white"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="group relative flex flex-wrap items-center gap-2 text-xs text-muted">
          <span
            className="cursor-help underline decoration-dotted decoration-muted/70 underline-offset-2"
            title={copy.heatmap.intensityScaleHint}
          >
            {copy.heatmap.less}
          </span>
          <span
            className="h-3 w-3 rounded-[3px] bg-[#151B23]"
            title={copy.heatmap.intensityEmpty}
          />
          {[1, 2, 3, 4].map((workoutCount) => (
            <span
              className={`h-3 w-3 rounded-[3px] ${heatmapIntensityClasses[workoutCount]}`}
              key={workoutCount}
              title={copy.heatmap.intensityLevel(workoutCount)}
            />
          ))}
          <button
            className="cursor-help rounded-sm underline decoration-dotted decoration-muted/70 underline-offset-2 outline-none transition focus-visible:ring-2 focus-visible:ring-accent"
            title={copy.heatmap.intensityScaleHint}
            type="button"
          >
            {copy.heatmap.more}
          </button>
          <div
            className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-56 rounded-md border border-border bg-panel p-3 text-left opacity-0 shadow-[0_12px_28px_rgba(28,25,23,0.18)] transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            role="tooltip"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {copy.heatmap.intensityLegend}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-text">{copy.heatmap.intensityScaleHint}</p>
            <ul className="mt-2.5 grid gap-1.5">
              <li className="flex items-center gap-2 text-xs text-text">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-[#151B23]" />
                {copy.heatmap.intensityEmpty}
              </li>
              {[1, 2, 3, 4].map((workoutCount) => (
                <li className="flex items-center gap-2 text-xs text-text" key={workoutCount}>
                  <span
                    aria-hidden="true"
                    className={`h-3 w-3 rounded-[3px] ${heatmapIntensityClasses[workoutCount]}`}
                  />
                  {copy.heatmap.intensityLevel(workoutCount)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
