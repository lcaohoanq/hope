"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { WorkoutForm } from "@/components/WorkoutForm";
import type { AppCopy, Language } from "@/lib/i18n";
import type { WorkoutInput } from "@/lib/workout-types";

type WorkoutDialogProps = {
  copy: AppCopy;
  defaultDate: string;
  isOpen: boolean;
  isSubmitting: boolean;
  language?: Language;
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
    y: 28,
  },
  open: {
    opacity: 1,
    y: 0,
  },
};

export function WorkoutDialog({
  copy,
  defaultDate,
  isOpen,
  isSubmitting,
  language = "en",
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          aria-label={copy.form.logWorkout}
          aria-modal="true"
          animate="open"
          className="fixed inset-0 z-[10000] flex items-stretch justify-center bg-text/35 sm:items-center sm:p-4"
          exit="closed"
          initial="closed"
          onClick={onClose}
          role="dialog"
          transition={WORKOUT_DIALOG_BACKDROP_TRANSITION}
          variants={WORKOUT_DIALOG_BACKDROP_VARIANTS}
        >
          <motion.div
            className="relative flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-panel shadow-[0_30px_120px_rgba(17,17,17,0.22)] sm:h-auto sm:max-h-[90dvh] sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
            transition={WORKOUT_DIALOG_PANEL_TRANSITION}
            variants={WORKOUT_DIALOG_PANEL_VARIANTS}
          >
            <WorkoutForm
              closeAriaLabel={copy.dashboard.closeWorkoutForm}
              copy={copy}
              defaultDate={defaultDate}
              isSubmitting={isSubmitting}
              language={language}
              onClose={onClose}
              onSubmitWorkout={onSubmitWorkout}
              variant="sheet"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
