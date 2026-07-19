export const HEATMAP_INACTIVE_COLOR = "#151B23";

export const HEATMAP_INTENSITY_COLORS = ["#033A16", "#196C2E", "#2EA043", "#56D364"] as const;

/** Maps a day's workout count to the four contribution-heatmap intensity levels. */
export function resolveWorkoutIntensity(workoutCount: number) {
  if (workoutCount < 1) {
    return 0;
  }

  return Math.min(Math.max(1, Math.floor(workoutCount)), HEATMAP_INTENSITY_COLORS.length) as
    | 1
    | 2
    | 3
    | 4;
}
