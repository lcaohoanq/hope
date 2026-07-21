"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import {
  filterWorkoutsForHeatmapView,
  getInitialTheme,
  hasWorkoutImages,
  resolveDefaultHeatmapView,
} from "@/components/dashboard/dashboard-utils";
import { ProfileNavigationTabs } from "@/components/dashboard/ProfileNavigationTabs";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { UserProfileSidebar } from "@/components/dashboard/UserProfileSidebar";
import { WorkoutActivityTimeline } from "@/components/dashboard/WorkoutActivityTimeline";
import { WorkoutDialog } from "@/components/dashboard/WorkoutDialog";
import { WorkoutLoadingState } from "@/components/dashboard/WorkoutLoadingState";
import {
  type CreateWorkoutResponse,
  fetchWorkoutDataWithRetry,
  prepareWorkoutRequestData,
  type UpdateWorkoutResponse,
} from "@/components/dashboard/workout-api";
import { StatsCards } from "@/components/StatsCards";
import { Loading } from "@/components/shared/Loading";
import { getTodayInTimezone } from "@/lib/date-utils";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import { translations } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import { getSocialCopy } from "@/lib/social-copy";
import type { SocialSummary } from "@/lib/social-types";
import {
  type AppTheme,
  canUserEditPastWorkouts,
  type HeatmapView,
  type PublicAppUser,
} from "@/lib/users";
import { cleanupWorkoutImageUploads } from "@/lib/workout-image-upload";
import type { Workout, WorkoutInput, WorkoutUpdateInput } from "@/lib/workout-types";

type HopeDashboardProps = {
  currentTab?: "overview" | "workouts";
  isAuthenticated: boolean;
  isEditable: boolean;
  user: PublicAppUser;
  viewer?: PublicAppUser;
  socialSummary: SocialSummary;
  workoutCount: number;
};

export function HopeDashboard({
  currentTab = "overview",
  isAuthenticated,
  isEditable,
  user,
  viewer,
  socialSummary,
  workoutCount,
}: HopeDashboardProps) {
  const { getToken, has } = useAuth();
  const { signOut } = useClerk();
  // Clerk session entitlements update before the DB webhook; combine both for UI.
  const allowPastWorkoutEdits =
    canUserEditPastWorkouts(user) || Boolean(has?.({ feature: "past_workout_edits" }));
  const todayDateKey = getTodayInTimezone();
  const currentYear = Number(todayDateKey.slice(0, 4));
  const birthYear = user.birthYear ?? currentYear;
  const language = user.preferredLanguage;
  const copy = translations[language];
  const socialCopy = getSocialCopy(language);
  const themeStorageKey = `hope:theme:${user.id}`;
  const [theme] = useState<AppTheme>(() =>
    getInitialTheme({
      fallbackTheme: user.settings.theme,
      isEditable,
      storageKey: themeStorageKey,
    }),
  );
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(
    socialSummary.canViewWorkouts && currentTab === "overview",
  );
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [isUploadingWorkoutImages, setIsUploadingWorkoutImages] = useState(false);
  const avatarUrl = user.avatarUrl ?? getAvatarUrl(user.avatarSeed);
  const [workoutLoadError, setWorkoutLoadError] = useState("");
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [selectedHeatmapView, setSelectedHeatmapView] = useState<HeatmapView>(() =>
    resolveDefaultHeatmapView(user, currentYear),
  );
  const visibleWorkouts = filterWorkoutsForHeatmapView(workouts, selectedHeatmapView);
  const headerUser = viewer ?? user;
  const headerAvatarUrl = isEditable
    ? avatarUrl
    : (headerUser.avatarUrl ?? getAvatarUrl(headerUser.avatarSeed));

  const loadWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setWorkoutLoadError("");

    try {
      const token = await getToken();
      const payload = await fetchWorkoutDataWithRetry(user.id, copy.errors.workoutLoad, token);
      setWorkouts(payload.workouts);
    } catch (error) {
      setWorkoutLoadError(error instanceof Error ? error.message : copy.errors.workoutLoad);
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, [copy.errors.workoutLoad, getToken, user.id]);

  const closeWorkoutDialog = useCallback(() => {
    setIsWorkoutDialogOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    if (!socialSummary.canViewWorkouts || currentTab !== "overview") {
      setIsLoadingWorkouts(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadWorkouts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentTab, loadWorkouts, socialSummary.canViewWorkouts]);

  async function handleSubmitWorkout(input: WorkoutInput) {
    setIsSubmittingWorkout(true);
    setIsUploadingWorkoutImages(hasWorkoutImages(input));
    let uploadedImagePublicIds: string[] = [];
    let workoutSaved = false;
    const token = await getToken();

    try {
      const preparedRequest = await prepareWorkoutRequestData(input, token);
      uploadedImagePublicIds = preparedRequest.uploadedImagePublicIds;
      const client = getClientApiClient(token);
      const res = await client.workouts.$post({ json: preparedRequest.data });
      const payload = (await res.json()) as CreateWorkoutResponse;

      if (!payload.success) {
        throw new Error("error" in payload ? payload.error : copy.errors.saveWorkout);
      }

      workoutSaved = true;
      setWorkouts((current) =>
        [...current, payload.workout].sort((a, b) => {
          const dateSort = a.date.localeCompare(b.date);

          if (dateSort !== 0) {
            return dateSort;
          }

          return a.createdAt.localeCompare(b.createdAt);
        }),
      );
      await loadWorkouts();
      setActivityRefreshKey((current) => current + 1);
      setIsWorkoutDialogOpen(false);
    } catch (error) {
      if (!workoutSaved) {
        await cleanupWorkoutImageUploads(uploadedImagePublicIds, token);
      }

      throw new Error(getApiErrorMessage(error, copy.errors.saveWorkout));
    } finally {
      setIsSubmittingWorkout(false);
      setIsUploadingWorkoutImages(false);
    }
  }

  async function handleUpdateWorkout(input: WorkoutUpdateInput) {
    setIsUploadingWorkoutImages(hasWorkoutImages(input));
    let uploadedImagePublicIds: string[] = [];
    let workoutSaved = false;
    const token = await getToken();

    try {
      const preparedRequest = await prepareWorkoutRequestData(input, token);
      uploadedImagePublicIds = preparedRequest.uploadedImagePublicIds;
      const client = getClientApiClient(token);
      const res = await client.workouts.$patch({ json: preparedRequest.data });
      const payload = (await res.json()) as UpdateWorkoutResponse;

      if (!payload.success) {
        throw new Error("error" in payload ? payload.error : copy.errors.updateWorkout);
      }

      workoutSaved = true;
      setWorkouts((current) =>
        current
          .map((workout) => (workout.id === payload.workout.id ? payload.workout : workout))
          .sort((a, b) => {
            const dateSort = a.date.localeCompare(b.date);

            if (dateSort !== 0) {
              return dateSort;
            }

            return a.createdAt.localeCompare(b.createdAt);
          }),
      );
      await loadWorkouts();
      setActivityRefreshKey((current) => current + 1);

      return payload.workout;
    } catch (error) {
      if (!workoutSaved) {
        await cleanupWorkoutImageUploads(uploadedImagePublicIds, token);
      }

      throw new Error(getApiErrorMessage(error, copy.errors.updateWorkout));
    } finally {
      setIsUploadingWorkoutImages(false);
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/login" });
  }

  return (
    <main className="min-h-[100dvh] bg-app text-text">
      {isSubmittingWorkout || isUploadingWorkoutImages ? (
        <Loading messages={copy.dashboard.loadingJokes} />
      ) : null}
      <TopHeader
        avatarUrl={headerAvatarUrl}
        copy={copy}
        language={language}
        onSignOut={() => void handleSignOut()}
        showProfileShortcut={Boolean(viewer)}
        showNotifications={Boolean(viewer)}
        showSignOut={isAuthenticated}
        showSettings={isEditable}
        user={headerUser}
      />

      <ProfileNavigationTabs
        username={user.username}
        workoutCount={workoutCount}
        currentTab={currentTab}
        copy={copy}
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <UserProfileSidebar
            avatarUrl={avatarUrl}
            copy={copy}
            isEditable={isEditable}
            isAuthenticated={isAuthenticated}
            socialSummary={socialSummary}
            canViewDetails={socialSummary.canViewWorkouts}
            language={language}
            onAddWorkout={() => setIsWorkoutDialogOpen(true)}
            user={user}
          />

          {socialSummary.canViewWorkouts ? (
            <div className="grid min-w-0 gap-6">
              {currentTab === "workouts" ? (
                <WorkoutActivityTimeline
                  copy={copy}
                  emptyMessage={copy.workoutsList.empty}
                  language={language}
                  limit={20}
                  refreshKey={activityRefreshKey}
                  title={copy.workoutsList.title}
                  userId={user.id}
                  view={{ mode: "lifetime" }}
                />
              ) : (
                <>
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
                      language={language}
                      todayDateKey={todayDateKey}
                      view={selectedHeatmapView}
                      workouts={visibleWorkouts}
                    />
                  )}

                  {isLoadingWorkouts ? (
                    <HeatmapLoadingSkeleton />
                  ) : (
                    <>
                      <ContributionHeatmap
                        allowPastWorkoutEdits={allowPastWorkoutEdits}
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
                      <WorkoutActivityTimeline
                        copy={copy}
                        language={language}
                        refreshKey={activityRefreshKey}
                        userId={user.id}
                        view={selectedHeatmapView}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <section className="grid min-h-[420px] place-items-center rounded-lg border border-border bg-panel p-8 text-center">
              <div className="max-w-md">
                <h2 className="text-xl font-semibold text-text">{socialCopy.privateProfile}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{socialCopy.privateProfileHelp}</p>
              </div>
            </section>
          )}
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
    </main>
  );
}

function HeatmapLoadingSkeleton() {
  return (
    <section className="min-h-[480px] rounded-lg border border-border bg-panel p-5 sm:p-6">
      <div className="h-5 w-40 animate-pulse rounded bg-panel-muted" />
      <div className="mt-8 grid gap-5">
        {Array.from({ length: 8 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are fixed placeholders that never reorder.
          <div className="grid gap-2" key={index}>
            <div className="ml-24 h-3 w-80 rounded bg-panel-muted" />
            <div className="flex gap-3">
              <div className="h-3 w-10 rounded bg-panel-muted" />
              <div className="grid flex-1 grid-cols-12 gap-1">
                {Array.from({ length: 48 }, (_, cellIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton cells are fixed placeholders that never reorder.
                  <div className="h-2.5 rounded-[2px] bg-panel-muted" key={cellIndex} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
