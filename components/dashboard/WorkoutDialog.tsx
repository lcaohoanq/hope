"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WorkoutForm } from "@/components/WorkoutForm";
import type { AppCopy } from "@/lib/i18n";
import type { WorkoutInput } from "@/lib/workout-types";

type WorkoutDialogProps = {
  copy: AppCopy;
  defaultDate: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitWorkout: (input: WorkoutInput) => Promise<void>;
};

const WORKOUT_DIALOG_BACKDROP_TRANSITION = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
} as const;
const WORKOUT_DIALOG_PANEL_TRANSITION = {
  duration: 0.34,
  ease: [0.16, 1, 0.3, 1],
} as const;
const WORKOUT_DIALOG_BACKDROP_VARIANTS = {
  closed: {
    backdropFilter: "blur(0px)",
    opacity: 0,
  },
  open: {
    backdropFilter: "blur(8px)",
    opacity: 1,
  },
};
const WORKOUT_DIALOG_PANEL_VARIANTS = {
  closed: {
    opacity: 0,
    scale: 0.94,
    y: 24,
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
};

export function WorkoutDialog({
  copy,
  defaultDate,
  isOpen,
  isSubmitting,
  onClose,
  onSubmitWorkout,
}: WorkoutDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          aria-label={copy.form.logWorkout}
          aria-modal="true"
          animate="open"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-text/35 p-4"
          exit="closed"
          initial="closed"
          onClick={onClose}
          role="dialog"
          transition={WORKOUT_DIALOG_BACKDROP_TRANSITION}
          variants={WORKOUT_DIALOG_BACKDROP_VARIANTS}
        >
          <motion.div
            className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-lg shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
            transition={WORKOUT_DIALOG_PANEL_TRANSITION}
            variants={WORKOUT_DIALOG_PANEL_VARIANTS}
          >
            <button
              aria-label={copy.dashboard.closeWorkoutForm}
              className="absolute right-4 top-4 z-10 h-9 w-9 rounded-md border border-border bg-panel text-xl leading-none text-muted transition hover:bg-panel-muted hover:text-text"
              onClick={onClose}
              type="button"
            >
              x
            </button>
            <WorkoutForm
              copy={copy}
              defaultDate={defaultDate}
              isSubmitting={isSubmitting}
              onSubmitWorkout={onSubmitWorkout}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
