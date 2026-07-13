"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { IconType } from "react-icons";
import { FaBicycle, FaBook, FaEllipsisH } from "react-icons/fa";
import type { AppCopy } from "@/lib/i18n";

type ActivityTypeSelectorProps = {
  copy: AppCopy;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
  variant?: "default" | "compact";
};

type ActivityTypeOption = {
  Icon: IconType;
  hasCustomTooltip?: boolean;
  key: "workout" | "study" | "other";
  labelKey: keyof AppCopy["activity"]["labels"];
};

const activityTypeOptions: ActivityTypeOption[] = [
  {
    Icon: FaBicycle,
    key: "workout",
    labelKey: "workout",
  },
  {
    Icon: FaBook,
    key: "study",
    labelKey: "study",
  },
  {
    Icon: FaEllipsisH,
    hasCustomTooltip: true,
    key: "other",
    labelKey: "other",
  },
];
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

export function ActivityTypeSelector({
  copy,
  disabled = false,
  label,
  onChange,
  value,
  variant = "default",
}: ActivityTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const selectedOption = getActivityTypeOption(value);
  const selectedLabel = formatActivityType(value, copy);
  const buttonHeightClass = variant === "compact" ? "h-10" : "h-11";
  const textSizeClass = variant === "compact" ? "text-sm" : "text-base";
  const fieldGapClass = variant === "compact" ? "gap-1.5" : "gap-2";
  const fieldBackgroundClass = variant === "compact" ? "bg-white" : "bg-stone-50";

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
    <div className={`grid ${fieldGapClass} text-sm font-medium text-stone-800`}>
      <span>{label}</span>
      <button
        aria-label={
          selectedLabel
            ? copy.activity.selectedActivity(selectedLabel)
            : copy.activity.selectActivity
        }
        className={`${buttonHeightClass} inline-flex w-full items-center justify-between gap-3 rounded-md border border-stone-300 ${fieldBackgroundClass} px-3 ${textSizeClass} font-normal text-stone-950 outline-none transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-stone-400 hover:bg-white focus:border-moss focus:bg-white focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {selectedOption ? (
            <selectedOption.Icon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-stone-700"
            />
          ) : null}
          <span
            className={
              selectedLabel
                ? "truncate text-stone-950"
                : "truncate text-stone-400"
            }
          >
            {selectedLabel || copy.activity.selectActivity}
          </span>
        </span>
        <span aria-hidden="true" className="text-stone-400">
          +
        </span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            aria-labelledby={titleId}
            aria-modal="true"
            animate="open"
            className="fixed inset-0 z-[10020] flex items-center justify-center bg-stone-950/35 p-4"
            exit="closed"
            initial="closed"
            onClick={() => setIsOpen(false)}
            role="dialog"
            transition={ACTIVITY_MODAL_BACKDROP_TRANSITION}
            variants={ACTIVITY_MODAL_BACKDROP_VARIANTS}
          >
            <motion.div
              className="w-full max-w-lg rounded-lg border border-stone-300 bg-white shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
              onClick={(event) => event.stopPropagation()}
              transition={ACTIVITY_MODAL_PANEL_TRANSITION}
              variants={ACTIVITY_MODAL_PANEL_VARIANTS}
            >
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-4 sm:p-5">
                <h3
                  className="text-lg font-semibold tracking-[-0.02em] text-stone-950"
                  id={titleId}
                >
                  {copy.activity.modalTitle}
                </h3>
                <button
                  aria-label={copy.activity.closeModal}
                  className="h-9 w-9 rounded-md border border-stone-300 bg-white text-xl leading-none text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  x
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                {activityTypeOptions.map((option) => {
                  const isSelected = option.key === value;
                  const optionLabel = copy.activity.labels[option.labelKey];

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`group relative flex min-h-28 flex-col items-center justify-center gap-3 rounded-md border bg-white p-4 text-center shadow-[0_10px_30px_rgba(28,25,23,0.08)] transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-[0_18px_38px_rgba(28,25,23,0.14)] focus:outline-none focus:ring-2 focus:ring-moss/20 active:translate-y-0 ${
                        isSelected
                          ? "border-moss ring-2 ring-moss/20"
                          : "border-stone-300"
                      }`}
                      key={option.key}
                      onClick={() => selectActivity(option.key)}
                      type="button"
                    >
                      {option.hasCustomTooltip ? (
                        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-600">
                          ?
                          <span className="pointer-events-none absolute right-0 top-8 z-10 w-40 rounded-md border border-stone-300 bg-stone-950 px-2.5 py-2 text-left text-xs font-medium leading-4 text-white opacity-0 shadow-[0_12px_28px_rgba(28,25,23,0.22)] transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                            {copy.activity.customTooltip}
                          </span>
                        </span>
                      ) : null}
                      <option.Icon
                        aria-hidden="true"
                        className="h-7 w-7 text-stone-900"
                      />
                      <span className="text-sm font-semibold text-stone-950">
                        {optionLabel}
                      </span>
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

export function formatActivityType(value: string, copy: AppCopy) {
  const option = getActivityTypeOption(value);

  if (!option) {
    return value.trim();
  }

  return copy.activity.labels[option.labelKey];
}

function getActivityTypeOption(value: string) {
  return activityTypeOptions.find((option) => option.key === value.trim());
}
