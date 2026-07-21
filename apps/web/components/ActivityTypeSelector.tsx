"use client";

import type { ActivityTypeSummary, Language } from "@hope/shared";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { FaBicycle, FaBook, FaEllipsisH, FaStar } from "react-icons/fa";
import { getClientApiClient, parseApiJson } from "@/lib/http";
import type { AppCopy } from "@/lib/i18n";

type ActivityTypeSelectorProps = {
  copy: AppCopy;
  disabled?: boolean;
  label: ReactNode;
  language?: Language;
  onChange: (value: string) => void;
  types?: ActivityTypeSummary[];
  value: string;
  variant?: "default" | "compact";
};

const ICON_BY_SLUG: Record<string, IconType> = {
  workout: FaBicycle,
  study: FaBook,
  other: FaEllipsisH,
};

const ACTIVITY_MODAL_BACKDROP_TRANSITION = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
} as const;
const ACTIVITY_MODAL_PANEL_TRANSITION = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
} as const;
const ACTIVITY_MODAL_BACKDROP_VARIANTS = {
  closed: {
    backdropFilter: "blur(0px)",
    opacity: 0,
  },
  open: {
    backdropFilter: "blur(8px)",
    opacity: 1,
  },
};
const ACTIVITY_MODAL_PANEL_VARIANTS = {
  closed: {
    opacity: 0,
    scale: 0.94,
    y: 18,
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
};

const FALLBACK_TYPES: ActivityTypeSummary[] = [
  {
    id: "activity-type-workout",
    slug: "workout",
    label: { en: "Workout", vi: "Tập luyện" },
    weight: 3,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "activity-type-study",
    slug: "study",
    label: { en: "Study", vi: "Học tập" },
    weight: 2,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "activity-type-other",
    slug: "other",
    label: { en: "Other", vi: "Hoạt động khác" },
    weight: 1,
    sortOrder: 2,
    isActive: true,
  },
];

export function ActivityTypeSelector({
  copy,
  disabled = false,
  label,
  language = "en",
  onChange,
  types: typesProp,
  value,
  variant = "default",
}: ActivityTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fetchedTypes, setFetchedTypes] = useState<ActivityTypeSummary[] | null>(null);
  const titleId = useId();
  const types = useMemo(
    () => (typesProp && typesProp.length > 0 ? typesProp : (fetchedTypes ?? FALLBACK_TYPES)),
    [fetchedTypes, typesProp],
  );
  const selectedOption = types.find((option) => option.slug === value.trim());
  const selectedLabel = formatActivityType(value, copy, types, language);
  const buttonHeightClass = variant === "compact" ? "h-10" : "h-11";
  const textSizeClass = variant === "compact" ? "text-sm" : "text-base";
  const fieldGapClass = variant === "compact" ? "gap-1.5" : "gap-2";
  const fieldBackgroundClass = variant === "compact" ? "bg-panel" : "bg-panel-muted";
  const SelectedIcon = selectedOption ? (ICON_BY_SLUG[selectedOption.slug] ?? FaStar) : null;

  useEffect(() => {
    if (typesProp && typesProp.length > 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const client = getClientApiClient();
        const res = await client["activity-types"].$get({ query: {} });
        const payload = await parseApiJson<{
          success: true;
          activityTypes: ActivityTypeSummary[];
        }>(res);
        if (!res.ok || cancelled) return;
        setFetchedTypes(payload.activityTypes.filter((type) => type.isActive));
      } catch {
        // Keep fallback seed types when the catalog cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [typesProp]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  function selectActivity(activityType: string) {
    onChange(activityType);
    setIsOpen(false);
  }

  return (
    <div className={`grid ${fieldGapClass} text-sm font-medium text-text`}>
      <span>{label}</span>
      <button
        aria-label={
          selectedLabel
            ? copy.activity.selectedActivity(selectedLabel)
            : copy.activity.selectActivity
        }
        className={`${buttonHeightClass} inline-flex w-full items-center justify-between gap-3 rounded-md border border-border ${fieldBackgroundClass} px-3 ${textSizeClass} font-normal text-text outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-border hover:bg-panel focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {SelectedIcon ? (
            <SelectedIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
          ) : null}
          <span className={selectedLabel ? "truncate text-text" : "truncate text-muted"}>
            {selectedLabel || copy.activity.selectActivity}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted">
          +
        </span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            aria-labelledby={titleId}
            aria-modal="true"
            animate="open"
            className="fixed inset-0 z-[10020] flex items-center justify-center bg-text/35 p-4"
            exit="closed"
            initial="closed"
            onClick={() => setIsOpen(false)}
            role="dialog"
            transition={ACTIVITY_MODAL_BACKDROP_TRANSITION}
            variants={ACTIVITY_MODAL_BACKDROP_VARIANTS}
          >
            <motion.div
              className="w-full max-w-lg rounded-lg border border-border bg-panel shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
              onClick={(event) => event.stopPropagation()}
              transition={ACTIVITY_MODAL_PANEL_TRANSITION}
              variants={ACTIVITY_MODAL_PANEL_VARIANTS}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-text" id={titleId}>
                  {copy.activity.modalTitle}
                </h3>
                <button
                  aria-label={copy.activity.closeModal}
                  className="h-9 w-9 rounded-md border border-border bg-panel text-xl leading-none text-muted transition hover:bg-panel-muted hover:text-text"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  x
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                {types.map((option) => {
                  const isSelected = option.slug === value;
                  const optionLabel = option.label[language] || option.label.en;
                  const OptionIcon = ICON_BY_SLUG[option.slug] ?? FaStar;
                  const showOtherTooltip = option.slug === "other";

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`group relative flex min-h-28 flex-col items-center justify-center gap-3 rounded-md border bg-panel p-4 text-center shadow-[0_10px_30px_rgba(28,25,23,0.08)] transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-border hover:shadow-[0_18px_38px_rgba(28,25,23,0.14)] focus:outline-none focus:ring-2 focus:ring-accent/20 active:translate-y-0 ${
                        isSelected ? "border-accent ring-2 ring-accent/20" : "border-border"
                      }`}
                      key={option.id}
                      onClick={() => selectActivity(option.slug)}
                      type="button"
                    >
                      {showOtherTooltip ? (
                        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-panel-muted text-xs font-semibold text-muted">
                          ?
                          <span className="pointer-events-none absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-text px-2.5 py-2 text-left text-xs font-medium leading-4 text-white opacity-0 shadow-[0_12px_28px_rgba(28,25,23,0.22)] transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                            {copy.activity.customTooltip}
                          </span>
                        </span>
                      ) : null}
                      <OptionIcon aria-hidden="true" className="h-7 w-7 text-text" />
                      <span className="text-sm font-semibold text-text">{optionLabel}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function formatActivityType(
  value: string,
  copy: AppCopy,
  types?: ActivityTypeSummary[],
  language: Language = "en",
) {
  const trimmed = value.trim();
  const fromCatalog = types?.find((option) => option.slug === trimmed);
  if (fromCatalog) {
    return fromCatalog.label[language] || fromCatalog.label.en;
  }

  const legacyKey = trimmed as keyof AppCopy["activity"]["labels"];
  if (legacyKey in copy.activity.labels) {
    return copy.activity.labels[legacyKey];
  }

  return trimmed;
}
