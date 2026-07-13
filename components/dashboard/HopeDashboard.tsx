"use client";

import { useCallback, useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { Loading } from "@/components/shared/Loading";
import { StatsCards } from "@/components/StatsCards";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { UserProfileSidebar } from "@/components/dashboard/UserProfileSidebar";
import { AvatarCropDialog } from "@/components/dashboard/AvatarCropDialog";
import { WorkoutDialog } from "@/components/dashboard/WorkoutDialog";
import { WorkoutLoadingState } from "@/components/dashboard/WorkoutLoadingState";
import {
  filterWorkoutsForHeatmapView,
  getInitialTheme,
  hasWorkoutImages,
  resolveDefaultHeatmapView,
} from "@/components/dashboard/dashboard-utils";
import {
  createWorkoutRequestInit,
  fetchWorkoutDataWithRetry,
  readApiJson,
  type CreateWorkoutResponse,
  type UpdateSettingsResponse,
  type UpdateWorkoutResponse,
  type UploadAvatarResponse,
} from "@/components/dashboard/workout-api";
import { getTodayInTimezone } from "@/lib/date-utils";
import { translations, type Language } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import { validateAvatarFile } from "@/lib/avatar-image";
import type { AppTheme, HeatmapView, PublicAppUser } from "@/lib/users";
import type {
  Workout,
  WorkoutInput,
  WorkoutUpdateInput,
} from "@/lib/workout-types";
import type { SocialSummary } from "@/lib/social-types";
import { getSocialCopy } from "@/lib/social-copy";

type HopeDashboardProps = {
  isAuthenticated: boolean;
  isEditable: boolean;
  user: PublicAppUser;
  viewer?: PublicAppUser;
  socialSummary: SocialSummary;
};

export function HopeDashboard({
  isAuthenticated,
  isEditable,
  user,
  viewer,
  socialSummary,
}: HopeDashboardProps) {
  const { signOut } = useClerk();
  const todayDateKey = getTodayInTimezone();
  const currentYear = Number(todayDateKey.slice(0, 4));
  const birthYear = user.birthYear ?? currentYear;
  const [language, setLanguage] = useState<Language>(user.preferredLanguage);
  const copy = translations[language];
  const socialCopy = getSocialCopy(language);
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
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(socialSummary.canViewWorkouts);
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
  const [avatarCropImageUrl, setAvatarCropImageUrl] = useState("");
  const [avatarCropImageName, setAvatarCropImageName] = useState("");
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
  const headerUser = viewer ?? user;
  const headerAvatarUrl = isEditable
    ? displayedAvatarUrl
    : headerUser.avatarUrl ?? getAvatarUrl(headerUser.avatarSeed);

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

  const closeWorkoutDialog = useCallback(() => {
    setIsWorkoutDialogOpen(false);
  }, []);

  const closeAvatarCropDialog = useCallback(() => {
    setAvatarCropImageUrl("");
    setAvatarCropImageName("");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    if (!socialSummary.canViewWorkouts) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkouts, socialSummary.canViewWorkouts]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (avatarCropImageUrl) {
        URL.revokeObjectURL(avatarCropImageUrl);
      }
    };
  }, [avatarCropImageUrl]);

  async function handleSubmitWorkout(input: WorkoutInput) {
    setIsSubmittingWorkout(true);
    setIsUploadingWorkoutImages(hasWorkoutImages(input));

    try {
      const requestInit = await createWorkoutRequestInit(input);
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
      const requestInit = await createWorkoutRequestInit(input);
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

  function handleSelectAvatar(file: File) {
    const validationError = validateAvatarFile(file);

    if (validationError) {
      setAvatarUploadError(
        validationError === "too-large"
          ? copy.dashboard.avatarTooLarge
          : copy.dashboard.avatarInvalidType,
      );
      setAvatarUploadMessage("");
      return;
    }

    setAvatarUploadError("");
    setAvatarUploadMessage("");
    setAvatarCropImageName(file.name);
    setAvatarCropImageUrl(URL.createObjectURL(file));
  }

  async function handleUploadAvatar(file: File) {
    const formData = new FormData();
    const previewUrl = URL.createObjectURL(file);
    const previousPreviewUrl = pendingAvatarPreviewUrl;

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
      return true;
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setPendingAvatarPreviewUrl("");
      setAvatarUploadError(
        error instanceof Error
          ? error.message
          : copy.dashboard.avatarUploadFailed,
      );
      return false;
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/login" });
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
        avatarUrl={headerAvatarUrl}
        copy={copy}
        language={language}
        onLanguageChange={setLanguage}
        onSignOut={() => void handleSignOut()}
        onThemeChange={(nextTheme) => void handleThemeChange(nextTheme)}
        showProfileShortcut={Boolean(viewer)}
        showNotifications={Boolean(viewer)}
        showSignOut={isAuthenticated}
        showThemeControl={isEditable}
        theme={theme}
        themeError={themeError}
        themeMessage={themeMessage}
        isSavingTheme={isSavingTheme}
        user={headerUser}
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
            isAuthenticated={isAuthenticated}
            socialSummary={socialSummary}
            canViewDetails={socialSummary.canViewWorkouts}
            language={language}
            onAvatarLoad={(loadedAvatarUrl) => {
              if (pendingAvatarPreviewUrl && loadedAvatarUrl === avatarUrl) {
                URL.revokeObjectURL(pendingAvatarPreviewUrl);
                setPendingAvatarPreviewUrl("");
              }
            }}
            onAddWorkout={() => setIsWorkoutDialogOpen(true)}
            onSelectAvatar={handleSelectAvatar}
            user={user}
          />

          {socialSummary.canViewWorkouts ? <div className="grid min-w-0 gap-6">
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
          </div> : <section className="grid min-h-[420px] place-items-center rounded-lg border border-border bg-panel p-8 text-center"><div className="max-w-md"><h2 className="text-xl font-semibold text-text">{socialCopy.privateProfile}</h2><p className="mt-3 text-sm leading-6 text-muted">{socialCopy.privateProfileHelp}</p></div></section>}
        </div>
      </div>
      <WorkoutDialog
        copy={copy}
        defaultDate={todayDateKey}
        isOpen={isEditable && isWorkoutDialogOpen}
        isSubmitting={isSubmittingWorkout}
        onClose={closeWorkoutDialog}
        onSubmitWorkout={handleSubmitWorkout}
      />
      <AvatarCropDialog
        copy={copy}
        error={avatarUploadError}
        imageName={avatarCropImageName}
        imageUrl={avatarCropImageUrl}
        isOpen={Boolean(avatarCropImageUrl)}
        isSaving={isUploadingAvatar}
        key={avatarCropImageUrl || "closed-avatar-crop"}
        onClose={closeAvatarCropDialog}
        onSave={handleUploadAvatar}
      />
    </main>
  );
}
