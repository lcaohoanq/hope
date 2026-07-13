"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaCamera,
  FaExternalLinkAlt,
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { Loading } from "@/components/Loading";
import { StatsCards } from "@/components/StatsCards";
import { WorkoutForm } from "@/components/WorkoutForm";
import { getTodayInTimezone } from "@/lib/date-utils";
import {
  languageOptions,
  translations,
  type AppCopy,
  type Language,
} from "@/lib/i18n";
import { prepareWorkoutImageUploads } from "@/lib/image-previews";
import { getAvatarUrl } from "@/lib/profile-utils";
import type {
  AppTheme,
  HeatmapView,
  PublicAppUser,
  UserLocation,
  UserSettings,
} from "@/lib/users";
import type {
  Workout,
  WorkoutData,
  WorkoutInput,
  WorkoutUpdateInput,
} from "@/lib/workout-types";

type ApiErrorResponse = {
  success: false;
  error: string;
};

type CreateWorkoutResponse =
  | {
      success: true;
      workout: Workout;
    }
  | ApiErrorResponse;

type UpdateWorkoutResponse =
  | {
      success: true;
      workout: Workout;
    }
  | ApiErrorResponse;

type UploadAvatarResponse =
  | {
      success: true;
      avatarUrl: string;
    }
  | ApiErrorResponse;

type UpdateSettingsResponse =
  | {
      success: true;
      settings: UserSettings;
    }
  | ApiErrorResponse;

type HopeDashboardProps = {
  isAuthenticated: boolean;
  isEditable: boolean;
  user: PublicAppUser;
};

type ProfileLink = {
  label: string;
  href: string;
  Icon: IconType;
};

const WORKOUT_LOAD_RETRY_DELAYS_MS = [500, 1000];
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

export function HopeDashboard({
  isAuthenticated,
  isEditable,
  user,
}: HopeDashboardProps) {
  const router = useRouter();
  const todayDateKey = getTodayInTimezone();
  const currentYear = Number(todayDateKey.slice(0, 4));
  const birthYear = user.birthYear ?? currentYear;
  const [language, setLanguage] = useState<Language>(user.preferredLanguage);
  const copy = translations[language];
  const themeStorageKey = `hope:theme:${user.id}`;
  const [theme, setTheme] = useState<AppTheme>(() =>
    getInitialTheme({
      fallbackTheme: user.settings.theme,
      isEditable,
      storageKey: themeStorageKey,
    }),
  );
  const [themeMessage, setThemeMessage] = useState("");
  const [themeError, setThemeError] = useState("");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [isUploadingWorkoutImages, setIsUploadingWorkoutImages] =
    useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    () => user.avatarUrl ?? getAvatarUrl(user.avatarSeed),
  );
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadMessage, setAvatarUploadMessage] = useState("");
  const [avatarUploadError, setAvatarUploadError] = useState("");
  const [workoutLoadError, setWorkoutLoadError] = useState("");
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [selectedHeatmapView, setSelectedHeatmapView] = useState<HeatmapView>(
    () => resolveDefaultHeatmapView(user, currentYear),
  );
  const visibleWorkouts = filterWorkoutsForHeatmapView(
    workouts,
    selectedHeatmapView,
  );
  const displayedAvatarUrl = pendingAvatarPreviewUrl || avatarUrl;

  const loadWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setWorkoutLoadError("");

    try {
      const payload = await fetchWorkoutDataWithRetry(
        user.id,
        copy.errors.workoutLoad,
      );
      setWorkouts(payload.workouts);
    } catch (error) {
      setWorkoutLoadError(
        error instanceof Error ? error.message : copy.errors.workoutLoad,
      );
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, [copy.errors.workoutLoad, user.id]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkouts]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  useEffect(() => {
    if (!isWorkoutDialogOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsWorkoutDialogOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWorkoutDialogOpen]);

  async function handleSubmitWorkout(input: WorkoutInput) {
    setIsSubmittingWorkout(true);
    setIsUploadingWorkoutImages(hasWorkoutImages(input));

    try {
      const requestInit = await createWorkoutRequestInit(input, user.id);
      const response = await fetch("/api/workouts", {
        method: "POST",
        ...requestInit,
      });
      const payload = await readApiJson<CreateWorkoutResponse>(
        response,
        copy.errors.saveWorkout,
      );

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : copy.errors.saveWorkout,
        );
      }

      setWorkouts((current) =>
        [...current, payload.workout].sort((a, b) => {
          const dateSort = a.date.localeCompare(b.date);

          if (dateSort !== 0) {
            return dateSort;
          }

          return a.startTime.localeCompare(b.startTime);
        }),
      );
      await loadWorkouts();
      setIsWorkoutDialogOpen(false);
    } finally {
      setIsSubmittingWorkout(false);
      setIsUploadingWorkoutImages(false);
    }
  }

  async function handleUpdateWorkout(input: WorkoutUpdateInput) {
    setIsUploadingWorkoutImages(hasWorkoutImages(input));

    try {
      const requestInit = await createWorkoutRequestInit(input, user.id);
      const response = await fetch("/api/workouts", {
        method: "PATCH",
        ...requestInit,
      });
      const payload = await readApiJson<UpdateWorkoutResponse>(
        response,
        copy.errors.updateWorkout,
      );

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : copy.errors.updateWorkout,
        );
      }

      setWorkouts((current) =>
        current
          .map((workout) =>
            workout.id === payload.workout.id ? payload.workout : workout,
          )
          .sort((a, b) => {
            const dateSort = a.date.localeCompare(b.date);

            if (dateSort !== 0) {
              return dateSort;
            }

            return a.startTime.localeCompare(b.startTime);
          }),
      );
      await loadWorkouts();

      return payload.workout;
    } finally {
      setIsUploadingWorkoutImages(false);
    }
  }

  async function handleUploadAvatar(file: File) {
    const formData = new FormData();
    const previewUrl = URL.createObjectURL(file);
    const previousPreviewUrl = pendingAvatarPreviewUrl;

    formData.set("userId", user.id);
    formData.set("avatar", file);

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
    }

    setPendingAvatarPreviewUrl(previewUrl);
    setIsUploadingAvatar(true);
    setAvatarUploadMessage(copy.dashboard.avatarUploadPending);
    setAvatarUploadError("");

    try {
      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = await readApiJson<UploadAvatarResponse>(
        response,
        copy.dashboard.avatarUploadFailed,
      );

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : copy.dashboard.avatarUploadFailed,
        );
      }

      setAvatarUrl(payload.avatarUrl);
      URL.revokeObjectURL(previewUrl);
      setPendingAvatarPreviewUrl("");
      setAvatarUploadMessage(copy.dashboard.avatarUpdated);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setPendingAvatarPreviewUrl("");
      setAvatarUploadError(
        error instanceof Error
          ? error.message
          : copy.dashboard.avatarUploadFailed,
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  async function handleThemeChange(nextTheme: AppTheme) {
    if (nextTheme === theme || isSavingTheme) {
      return;
    }

    const previousTheme = theme;

    setTheme(nextTheme);
    if (isEditable) {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    }
    setThemeError("");
    setThemeMessage(copy.header.savingTheme);
    setIsSavingTheme(true);

    try {
      const response = await fetch("/api/users/settings", {
        body: JSON.stringify({
          theme: nextTheme,
          userId: user.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload = await readApiJson<UpdateSettingsResponse>(
        response,
        copy.header.themeUpdateFailed,
      );

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : copy.header.themeUpdateFailed,
        );
      }

      setTheme(payload.settings.theme);
      setThemeMessage("");
    } catch (error) {
      setTheme(previousTheme);
      if (isEditable) {
        window.localStorage.setItem(themeStorageKey, previousTheme);
      }
      setThemeMessage("");
      setThemeError(
        error instanceof Error ? error.message : copy.header.themeUpdateFailed,
      );
    } finally {
      setIsSavingTheme(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-app text-text">
      {isSubmittingWorkout || isUploadingWorkoutImages ? (
        <Loading
          message={
            isUploadingWorkoutImages
              ? copy.dashboard.loadingImages
              : copy.dashboard.savingWorkout
          }
        />
      ) : null}
      <TopHeader
        avatarUrl={displayedAvatarUrl}
        copy={copy}
        language={language}
        onLanguageChange={setLanguage}
        onSignOut={() => void handleSignOut()}
        onThemeChange={(nextTheme) => void handleThemeChange(nextTheme)}
        showProfileShortcut={isEditable}
        showSignOut={isAuthenticated}
        showThemeControl={isEditable}
        theme={theme}
        themeError={themeError}
        themeMessage={themeMessage}
        isSavingTheme={isSavingTheme}
        user={user}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <UserProfileSidebar
            avatarUploadError={avatarUploadError}
            avatarUploadMessage={avatarUploadMessage}
            avatarUrl={displayedAvatarUrl}
            copy={copy}
            hasPendingAvatarPreview={Boolean(pendingAvatarPreviewUrl)}
            isUploadingAvatar={isUploadingAvatar}
            isEditable={isEditable}
            language={language}
            onAvatarLoad={(loadedAvatarUrl) => {
              if (pendingAvatarPreviewUrl && loadedAvatarUrl === avatarUrl) {
                URL.revokeObjectURL(pendingAvatarPreviewUrl);
                setPendingAvatarPreviewUrl("");
              }
            }}
            onAddWorkout={() => setIsWorkoutDialogOpen(true)}
            onUploadAvatar={handleUploadAvatar}
            user={user}
          />

          <div className="grid min-w-0 gap-6">
            {workoutLoadError ? (
              <section className="rounded-lg border border-danger-border bg-danger-soft p-4 text-sm text-danger">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>{workoutLoadError}</p>
                  <button
                    className="h-9 rounded-md border border-danger-border bg-panel px-3 font-semibold text-danger transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-danger-soft active:scale-[0.98]"
                    onClick={() => void loadWorkouts()}
                    type="button"
                  >
                    {copy.common.retry}
                  </button>
                </div>
              </section>
            ) : null}

            {isLoadingWorkouts ? (
              <WorkoutLoadingState />
            ) : (
              <StatsCards
                copy={copy}
                todayDateKey={todayDateKey}
                view={selectedHeatmapView}
                workouts={visibleWorkouts}
              />
            )}

            {isLoadingWorkouts ? (
              <section className="min-h-[480px] rounded-lg border border-border bg-panel p-5 sm:p-6">
                <div className="h-5 w-40 animate-pulse rounded bg-panel-muted" />
                <div className="mt-8 grid gap-5">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div className="grid gap-2" key={index}>
                      <div className="ml-24 h-3 w-80 rounded bg-panel-muted" />
                      <div className="flex gap-3">
                        <div className="h-3 w-10 rounded bg-panel-muted" />
                        <div className="grid flex-1 grid-cols-12 gap-1">
                          {Array.from({ length: 48 }, (_, cellIndex) => (
                            <div
                              className="h-2.5 rounded-[2px] bg-panel-muted"
                              key={cellIndex}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <ContributionHeatmap
                allowPastWorkoutEdits={user.settings.workouts.allowPastWorkoutEdits}
                birthYear={birthYear}
                canEditWorkouts={isEditable}
                copy={copy}
                language={language}
                onUpdateWorkout={handleUpdateWorkout}
                onViewChange={setSelectedHeatmapView}
                view={selectedHeatmapView}
                workouts={workouts}
                todayDateKey={todayDateKey}
              />
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isEditable && isWorkoutDialogOpen ? (
          <motion.div
            aria-label={copy.form.logWorkout}
            aria-modal="true"
            animate="open"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-text/35 p-4"
            exit="closed"
            initial="closed"
            onClick={() => setIsWorkoutDialogOpen(false)}
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
                onClick={() => setIsWorkoutDialogOpen(false)}
                type="button"
              >
                x
              </button>
              <WorkoutForm
                copy={copy}
                defaultDate={todayDateKey}
                isSubmitting={isSubmittingWorkout}
                onSubmitWorkout={handleSubmitWorkout}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function getInitialTheme({
  fallbackTheme,
  isEditable,
  storageKey,
}: {
  fallbackTheme: AppTheme;
  isEditable: boolean;
  storageKey: string;
}) {
  if (!isEditable || typeof window === "undefined") {
    return fallbackTheme;
  }

  const storedTheme = window.localStorage.getItem(storageKey);

  return storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : fallbackTheme;
}

function resolveDefaultHeatmapView(
  user: PublicAppUser,
  currentYear: number,
): HeatmapView {
  const defaultView = user.settings.heatmap.defaultView;

  if (defaultView.mode === "lifetime") {
    return defaultView;
  }

  return {
    mode: "year",
    year: clampYear(
      defaultView.year ?? currentYear,
      user.birthYear,
      currentYear,
    ),
  };
}

function filterWorkoutsForHeatmapView(workouts: Workout[], view: HeatmapView) {
  if (view.mode === "lifetime") {
    return workouts;
  }

  const yearPrefix = `${view.year}-`;

  return workouts.filter((workout) => workout.date.startsWith(yearPrefix));
}

function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.min(Math.max(year, minYear), maxYear);
}

function TopHeader({
  avatarUrl,
  copy,
  isSavingTheme,
  language,
  onLanguageChange,
  onSignOut,
  onThemeChange,
  showProfileShortcut,
  showSignOut,
  showThemeControl,
  theme,
  themeError,
  themeMessage,
  user,
}: {
  avatarUrl: string;
  copy: AppCopy;
  isSavingTheme: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onSignOut: () => void;
  onThemeChange: (theme: AppTheme) => void;
  showProfileShortcut: boolean;
  showSignOut: boolean;
  showThemeControl: boolean;
  theme: AppTheme;
  themeError: string;
  themeMessage: string;
  user: PublicAppUser;
}) {
  const profilePath = `/${user.username}`;
  const themeOptions: Array<{ label: string; value: AppTheme }> = [
    { label: copy.header.light, value: "light" },
    { label: copy.header.dark, value: "dark" },
  ];

  return (
    <header className="flex w-full flex-col gap-3 border-b border-border bg-app px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <Link
        className="inline-flex h-10 items-center rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
        href="/"
      >
        {copy.common.home}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        {showProfileShortcut ? (
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-text transition hover:bg-panel-muted"
            href={profilePath}
          >
            <span className="relative h-6 w-6 overflow-hidden rounded-full border border-border bg-panel-muted">
              <AvatarImage
                alt={`${user.displayName}'s avatar`}
                className="h-full w-full object-cover"
                sizes="24px"
                src={avatarUrl}
              />
            </span>
            <span className="sr-only">{copy.common.profile}</span>
            {/* <span>{user.displayName}</span> */}
          </Link>
        ) : null}
        {showThemeControl ? (
          <div className="grid gap-1">
            <div
              aria-label={copy.header.theme}
              className="inline-flex h-10 items-center rounded-md border border-border bg-panel-muted p-1"
              role="group"
            >
              {themeOptions.map((option) => (
                <button
                  aria-pressed={theme === option.value}
                  className={`h-8 rounded px-3 text-xs font-semibold transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    theme === option.value
                      ? "bg-panel text-text shadow-[0_1px_0_rgb(15_23_42/0.08)]"
                      : "text-muted hover:text-text"
                  }`}
                  disabled={isSavingTheme}
                  key={option.value}
                  onClick={() => onThemeChange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {themeMessage || themeError ? (
              <p
                className={`text-xs font-medium ${
                  themeError ? "text-danger" : "text-muted"
                }`}
              >
                {themeError || themeMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        <label className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-text">
          {/* <span className="text-xs font-medium text-muted">
            {copy.common.language}
          </span> */}
          <select
            className="bg-transparent text-sm font-semibold text-text outline-none"
            onChange={(event) =>
              onLanguageChange(event.target.value as Language)
            }
            value={language}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "vi"
                  ? copy.header.vietnamese
                  : copy.header.english}
              </option>
            ))}
          </select>
        </label>
        {showSignOut ? (
          <button
            className="h-10 rounded-md border border-border px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98]"
            onClick={onSignOut}
            type="button"
          >
            {copy.common.signOut}
          </button>
        ) : (
          <Link
            className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text active:scale-[0.98]"
            href={`/login?next=${encodeURIComponent(profilePath)}`}
          >
            {copy.common.signIn}
          </Link>
        )}
      </div>
    </header>
  );
}

function UserProfileSidebar({
  avatarUploadError,
  avatarUploadMessage,
  avatarUrl,
  copy,
  hasPendingAvatarPreview,
  isEditable,
  isUploadingAvatar,
  language,
  onAvatarLoad,
  user,
  onAddWorkout,
  onUploadAvatar,
}: {
  avatarUploadError: string;
  avatarUploadMessage: string;
  avatarUrl: string;
  copy: AppCopy;
  hasPendingAvatarPreview: boolean;
  isEditable: boolean;
  isUploadingAvatar: boolean;
  language: Language;
  onAvatarLoad: (avatarUrl: string) => void;
  user: PublicAppUser;
  onAddWorkout: () => void;
  onUploadAvatar: (file: File) => Promise<void>;
}) {
  const profileLinks: ProfileLink[] = [
    ...(user.website
      ? [
          {
            label: copy.dashboard.website,
            href: user.website,
            Icon: FaGlobe,
          },
        ]
      : []),
    ...(user.socialLinks?.facebook
      ? [
          {
            label: copy.dashboard.facebook,
            href: user.socialLinks.facebook,
            Icon: FaFacebookF,
          },
        ]
      : []),
    ...(user.socialLinks?.instagram
      ? [
          {
            label: copy.dashboard.instagram,
            href: user.socialLinks.instagram,
            Icon: FaInstagram,
          },
        ]
      : []),
    ...(user.socialLinks?.linkedin
      ? [
          {
            label: copy.dashboard.linkedin,
            href: user.socialLinks.linkedin,
            Icon: FaLinkedinIn,
          },
        ]
      : []),
  ];

  return (
    <aside className="rounded-lg p-5 lg:sticky lg:top-6">
      <div className="flex gap-4 lg:block">
        <div className="group relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted sm:h-28 sm:w-28 lg:h-auto lg:w-full">
          <AvatarImage
            alt={`${user.displayName}'s avatar`}
            className={`aspect-square h-full w-full object-cover ${
              hasPendingAvatarPreview ? "opacity-90" : ""
            }`}
            onLoad={() => onAvatarLoad(avatarUrl)}
            priority
            sizes="(min-width: 1024px) 248px, (min-width: 640px) 112px, 96px"
            src={avatarUrl}
          />
          {isUploadingAvatar ? (
            <div className="absolute inset-0 grid place-items-center bg-text/20">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          ) : null}
          {isEditable ? (
            <label
              className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-2 bg-text/75 px-3 py-2 text-xs font-semibold text-white opacity-100 transition group-hover:bg-accent/90 lg:opacity-0 lg:group-hover:opacity-100"
              title={copy.dashboard.uploadAvatar}
            >
              <FaCamera aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only lg:not-sr-only lg:truncate">
                {isUploadingAvatar
                  ? copy.dashboard.uploadingAvatar
                  : copy.dashboard.uploadAvatar}
              </span>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isUploadingAvatar}
                onChange={(event) => {
                  const [file] = Array.from(event.target.files ?? []);
                  event.currentTarget.value = "";

                  if (file) {
                    void onUploadAvatar(file);
                  }
                }}
                type="file"
              />
            </label>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 lg:mt-5">
          {/* <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {copy.dashboard.appName}
          </p> */}
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">
            {user.displayName}
          </h1>
          <div className="flex items-center gap-3">
            <p className="mt-1 truncate text-sm text-muted">{user.slug}</p>
            <span className="mt-1 text-sm text-muted">·</span>
          {user.pronouns ? (
            <span className="mt-1 text-sm text-muted">
              {user.pronouns[language]}
            </span>
        ) : null}
            </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-text">
            {user.bio[language]}
          </p>
          {avatarUploadMessage ? (
            <p className="mt-3 text-sm font-medium text-accent">
              {avatarUploadMessage}
            </p>
          ) : null}
          {avatarUploadError ? (
            <p className="mt-3 text-sm font-medium text-danger">
              {avatarUploadError}
            </p>
          ) : null}
        </div>
      </div>

      {isEditable ? (
        <button
          className="mt-5 h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 active:scale-[0.98]"
          onClick={onAddWorkout}
          type="button"
        >
          {copy.dashboard.addWorkout}
        </button>
      ) : null}

      {/* <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-muted">
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.birthYear}</span>
          <span className="font-medium text-text">{user.birthYear}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.ageMap}</span>
          <span className="font-medium text-text">
            {userAge} {copy.dashboard.years}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.trackingFrom}</span>
          <span className="font-medium text-text">{trackingStartYear}</span>
        </div>
      </div> */}

      {profileLinks.length > 0 ? (
        <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-muted">
          <div className="grid gap-2">
            {profileLinks.map(({ href, Icon, label }) => (
              <a
                className="group flex items-center justify-between gap-3 py-1.5 text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text"
                href={href}
                key={label}
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted transition group-hover:text-muted"
                  />
                  <span className="truncate font-medium">{label}</span>
                </span>
                <FaExternalLinkAlt
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 text-muted transition group-hover:text-muted"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {user.location ? (
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="text-muted">{copy.dashboard.location}</p>
              <p className="mt-1 font-medium text-text">
                {user.location.label[language]}
              </p>
            </div>
            <a
              className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-border hover:bg-panel-muted hover:text-text"
              href={getGoogleMaps3dUrl(user.location)}
              rel="noreferrer"
              target="_blank"
            >
              {copy.dashboard.open3dMap}
            </a>
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-border bg-panel-muted">
            <iframe
              allowFullScreen
              className="block h-48 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={getGoogleMapsEmbedUrl(user.location)}
              title={`${copy.dashboard.location}: ${user.location.label[language]}`}
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function AvatarImage({
  alt,
  className,
  onLoad,
  priority = false,
  sizes,
  src,
}: {
  alt: string;
  className: string;
  onLoad?: () => void;
  priority?: boolean;
  sizes: string;
  src: string;
}) {
  const [failedSrc, setFailedSrc] = useState("");
  const renderedSrc =
    failedSrc === src && src.startsWith("/uploads/avatars/") ? `/api${src}` : src;

  if (src.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        className={className}
        onLoad={onLoad}
        src={src}
      />
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => {
        if (src.startsWith("/uploads/avatars/")) {
          setFailedSrc(src);
        }
      }}
      onLoad={onLoad}
      priority={priority}
      sizes={sizes}
      src={renderedSrc}
      unoptimized={renderedSrc.startsWith("/api/uploads/avatars/")}
    />
  );
}

function getGoogleMapsEmbedUrl(location: UserLocation) {
  const { latitude, longitude } = location.coordinates;
  const zoom = location.zoom ?? 14;
  const query = encodeURIComponent(`${latitude},${longitude}`);

  return `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
}

function getGoogleMaps3dUrl(location: UserLocation) {
  const { latitude, longitude } = location.coordinates;
  const zoom = location.zoom ?? 14;
  const params = new URLSearchParams({
    api: "1",
    map_action: "map",
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    basemap: "satellite",
  });

  return `https://www.google.com/maps/@?${params.toString()}`;
}

function hasWorkoutImages(input: WorkoutInput | WorkoutUpdateInput) {
  return Boolean(input.images?.length);
}

async function fetchWorkoutDataWithRetry(
  userId: string,
  fallbackMessage: string,
) {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= WORKOUT_LOAD_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      const response = await fetch(`/api/workouts?userId=${userId}`, {
        cache: "no-store",
      });
      const payload = await readApiJson<WorkoutData | ApiErrorResponse>(
        response,
        fallbackMessage,
      );

      if (!response.ok || "success" in payload) {
        throw new Error(
          "error" in payload ? payload.error : fallbackMessage,
        );
      }

      return payload;
    } catch (error) {
      lastError = error;

      const retryDelay = WORKOUT_LOAD_RETRY_DELAYS_MS[attempt];

      if (retryDelay === undefined) {
        break;
      }

      await wait(retryDelay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(fallbackMessage);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function createWorkoutRequestInit(
  input: WorkoutInput | WorkoutUpdateInput,
  userId: string,
) {
  const hasImages = input.images && input.images.length > 0;
  const imageSrcs = "imageSrcs" in input ? input.imageSrcs : undefined;

  if (!hasImages) {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        ...(imageSrcs ? { imageSrcs } : {}),
        userId,
      }),
    };
  }

  const body = new FormData();

  if ("id" in input) {
    body.set("id", input.id);
  }

  body.set("userId", userId);
  body.set("date", input.date);
  body.set("type", input.type);
  body.set("startTime", input.startTime);
  body.set("endTime", input.endTime);
  body.set("note", input.note);

  imageSrcs?.forEach((src) => {
    body.append("imageSrcs", src);
  });

  const uploadImages = await prepareWorkoutImageUploads(input.images ?? []);

  uploadImages.forEach((image) => {
    body.append("images", image);
  });

  return {
    body,
  };
}

async function readApiJson<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(`${fallbackMessage} The server returned a non-JSON response.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage} The server returned invalid JSON.`);
  }
}

function WorkoutLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="rounded-lg border border-border bg-panel p-5"
          key={index}
        >
          <div className="h-3 w-24 animate-pulse rounded bg-panel-muted" />
          <div className="mt-5 h-8 w-16 animate-pulse rounded bg-panel-muted" />
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-panel-muted" />
        </div>
      ))}
    </section>
  );
}
