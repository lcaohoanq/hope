import type { AppTheme, HeatmapView, PublicAppUser, UserLocation } from "@/lib/users";
import type { Workout, WorkoutInput, WorkoutUpdateInput } from "@/lib/workout-types";

export function getInitialTheme({
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

  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : fallbackTheme;
}

export function resolveDefaultHeatmapView(user: PublicAppUser, currentYear: number): HeatmapView {
  const defaultView = user.settings.heatmap.defaultView;

  if (defaultView.mode === "lifetime") {
    return defaultView;
  }

  return {
    mode: "year",
    year: clampYear(defaultView.year ?? currentYear, user.birthYear, currentYear),
  };
}

export function filterWorkoutsForHeatmapView(workouts: Workout[], view: HeatmapView) {
  if (view.mode === "lifetime") {
    return workouts;
  }

  const yearPrefix = `${view.year}-`;

  return workouts.filter((workout) => workout.date.startsWith(yearPrefix));
}

export function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.min(Math.max(year, minYear), maxYear);
}

export function getGoogleMapsEmbedUrl(location: UserLocation) {
  const { latitude, longitude } = location.coordinates;
  const zoom = location.zoom ?? 14;
  const query = encodeURIComponent(`${latitude},${longitude}`);

  return `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
}

export function getGoogleMaps3dUrl(location: UserLocation) {
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

export function hasWorkoutImages(input: WorkoutInput | WorkoutUpdateInput) {
  return Boolean(input.images?.length);
}

export function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
