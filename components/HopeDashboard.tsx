"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaExternalLinkAlt,
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import Link from "next/link";
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
import { getAvatarUrl } from "@/lib/profile-utils";
import type { AppUser, HeatmapView, UserLocation } from "@/lib/users";
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

type HopeDashboardProps = {
  user: AppUser;
};

type ProfileLink = {
  label: string;
  href: string;
  Icon: IconType;
};

export function HopeDashboard({ user }: HopeDashboardProps) {
  const todayDateKey = getTodayInTimezone();
  const currentYear = Number(todayDateKey.slice(0, 4));
  const birthYear = user.birthYear ?? currentYear;
  const [language, setLanguage] = useState<Language>(user.preferredLanguage);
  const copy = translations[language];
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [isUploadingWorkoutImages, setIsUploadingWorkoutImages] =
    useState(false);
  const [workoutLoadError, setWorkoutLoadError] = useState("");
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [selectedHeatmapView, setSelectedHeatmapView] = useState<HeatmapView>(
    () => resolveDefaultHeatmapView(user, currentYear),
  );
  const visibleWorkouts = filterWorkoutsForHeatmapView(
    workouts,
    selectedHeatmapView,
  );

  const loadWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setWorkoutLoadError("");

    try {
      const response = await fetch(`/api/workouts?userId=${user.id}`, {
        cache: "no-store",
      });
      const payload = await readApiJson<WorkoutData | ApiErrorResponse>(
        response,
        copy.errors.workoutLoad,
      );

      if (!response.ok || "success" in payload) {
        throw new Error(
          "error" in payload ? payload.error : copy.errors.workoutLoad,
        );
      }

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
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkouts]);

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
      const response = await fetch("/api/workouts", {
        method: "POST",
        ...createWorkoutRequestInit(input, user.id),
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
    } finally {
      setIsSubmittingWorkout(false);
      setIsUploadingWorkoutImages(false);
    }
  }

  async function handleUpdateWorkout(input: WorkoutUpdateInput) {
    setIsUploadingWorkoutImages(hasWorkoutImages(input));

    try {
      const response = await fetch("/api/workouts", {
        method: "PATCH",
        ...createWorkoutRequestInit(input, user.id),
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

  return (
    <main className="min-h-[100dvh] bg-paper text-stone-950">
      {isUploadingWorkoutImages ? (
        <Loading message={copy.dashboard.loadingImages} />
      ) : null}
      <TopHeader
        copy={copy}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <UserProfileSidebar
            copy={copy}
            language={language}
            onAddWorkout={() => setIsWorkoutDialogOpen(true)}
            user={user}
          />

          <div className="grid min-w-0 gap-6">
            {workoutLoadError ? (
              <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>{workoutLoadError}</p>
                  <button
                    className="h-9 rounded-md border border-red-200 bg-white px-3 font-semibold text-red-800 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-red-100 active:scale-[0.98]"
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
              <section className="min-h-[480px] rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
                <div className="h-5 w-40 animate-pulse rounded bg-stone-100" />
                <div className="mt-8 grid gap-5">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div className="grid gap-2" key={index}>
                      <div className="ml-24 h-3 w-80 rounded bg-stone-100" />
                      <div className="flex gap-3">
                        <div className="h-3 w-10 rounded bg-stone-100" />
                        <div className="grid flex-1 grid-cols-12 gap-1">
                          {Array.from({ length: 48 }, (_, cellIndex) => (
                            <div
                              className="h-2.5 rounded-[2px] bg-stone-100"
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
                birthYear={birthYear}
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
        {isWorkoutDialogOpen ? (
          <motion.div
            aria-label={copy.form.logWorkout}
            aria-modal="true"
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-950/35 p-4 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setIsWorkoutDialogOpen(false)}
            role="dialog"
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-lg shadow-[0_30px_120px_rgba(17,17,17,0.22)]"
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                aria-label={copy.dashboard.closeWorkoutForm}
                className="absolute right-4 top-4 z-10 h-9 w-9 rounded-md border border-stone-200 bg-white text-xl leading-none text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
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

function resolveDefaultHeatmapView(
  user: AppUser,
  currentYear: number,
): HeatmapView {
  const defaultView = user.heatmapSettings.defaultView;

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
  copy,
  language,
  onLanguageChange,
  user,
}: {
  copy: AppCopy;
  language: Language;
  onLanguageChange: (language: Language) => void;
  user: AppUser;
}) {
  return (
    <header className="flex w-full flex-col gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <Link
        className="inline-flex h-10 items-center rounded-md px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-stone-950"
        href="/"
      >
        {copy.common.home}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
          href={`/${user.slug}`}
        >
          <span className="h-6 w-6 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${user.displayName}'s DiceBear avatar`}
              className="h-full w-full object-cover"
              src={getAvatarUrl(user.avatarSeed)}
            />
          </span>
          <span className="sr-only">{copy.common.profile}</span>
          <span>{user.displayName}</span>
        </Link>
        <label className="flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800">
          <span className="text-xs font-medium text-stone-500">
            {copy.common.language}
          </span>
          <select
            className="bg-transparent text-sm font-semibold text-stone-800 outline-none"
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
      </div>
    </header>
  );
}

function UserProfileSidebar({
  copy,
  language,
  user,
  onAddWorkout,
}: {
  copy: AppCopy;
  language: Language;
  user: AppUser;
  onAddWorkout: () => void;
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
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100 sm:h-28 sm:w-28 lg:h-auto lg:w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${user.displayName}'s DiceBear avatar`}
            className="aspect-square h-full w-full object-cover"
            src={getAvatarUrl(user.avatarSeed)}
          />
        </div>
        <div className="min-w-0 flex-1 lg:mt-5">
          {/* <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
            {copy.dashboard.appName}
          </p> */}
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
            {user.displayName}
          </h1>
          <div className="flex items-center gap-3">
            <p className="mt-1 truncate text-sm text-stone-500">{user.slug}</p>
            <span className="mt-1 text-sm text-stone-500">·</span>
          {user.pronouns ? (
            <span className="mt-1 text-sm text-stone-500">
              {user.pronouns[language]}
            </span>
        ) : null}
            </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-stone-950">
            {user.bio[language]}
          </p>
        </div>
      </div>

      <button
        className="mt-5 h-11 w-full rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-stone-800 active:scale-[0.98]"
        onClick={onAddWorkout}
        type="button"
      >
        {copy.dashboard.addWorkout}
      </button>

      {/* <div className="mt-5 grid gap-3 border-t border-stone-100 pt-5 text-sm text-stone-600">
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.birthYear}</span>
          <span className="font-medium text-stone-950">{user.birthYear}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.ageMap}</span>
          <span className="font-medium text-stone-950">
            {userAge} {copy.dashboard.years}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.trackingFrom}</span>
          <span className="font-medium text-stone-950">{trackingStartYear}</span>
        </div>
      </div> */}

      <div className="mt-5 grid gap-3 border-t border-stone-300 pt-5 text-sm text-stone-600">
        {profileLinks.length > 0 ? (
          <div className="grid gap-2">
            {profileLinks.map(({ href, Icon, label }) => (
              <a
                className="group flex items-center justify-between gap-3 py-1.5 text-stone-600 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-stone-950"
                href={href}
                key={label}
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:text-stone-700"
                  />
                  <span className="truncate font-medium">{label}</span>
                </span>
                <FaExternalLinkAlt
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 text-stone-300 transition group-hover:text-stone-500"
                />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {user.location ? (
        <div className="mt-5 border-t border-stone-300 pt-5">
          <div className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="text-stone-500">{copy.dashboard.location}</p>
              <p className="mt-1 font-medium text-stone-950">
                {user.location.label[language]}
              </p>
            </div>
            <a
              className="shrink-0 rounded-md border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950"
              href={getGoogleMaps3dUrl(user.location)}
              rel="noreferrer"
              target="_blank"
            >
              {copy.dashboard.open3dMap}
            </a>
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
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

function createWorkoutRequestInit(
  input: WorkoutInput | WorkoutUpdateInput,
  userId: string,
) {
  const hasImages = input.images && input.images.length > 0;

  if (!hasImages) {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
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

  input.images?.forEach((image) => {
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
          className="rounded-lg border border-stone-200 bg-white p-5"
          key={index}
        >
          <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
          <div className="mt-5 h-8 w-16 animate-pulse rounded bg-stone-100" />
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-stone-100" />
        </div>
      ))}
    </section>
  );
}
