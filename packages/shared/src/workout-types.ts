/** Optimized workout image asset metadata. */
export type WorkoutImage = {
  src: string;
  format: "avif" | "webp" | "jpg";
  width: number;
  height: number;
  sizeBytes: number;
};

/** Persisted workout record. */
export type Workout = {
  id: string;
  userId?: string;
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note?: string;
  /** Snapshot score from activity type weight at create/update time. */
  points?: number;
  images?: WorkoutImage[];
  createdAt: string;
  isPublic: boolean;
};

/** Legacy / file-shaped workout payload with settings. */
export type WorkoutData = {
  workouts: Workout[];
  settings: {
    timezone: string;
  };
};

/** Loose create-workout request body before validation. */
export type CreateWorkoutRequest = {
  userId?: unknown;
  date?: unknown;
  type?: unknown;
  note?: unknown;
  isPublic?: unknown;
  imagePublicIds?: unknown;
};

/** Loose update-workout request body before validation. */
export type UpdateWorkoutRequest = CreateWorkoutRequest & {
  id?: unknown;
  imageSrcs?: unknown;
};

/** Validated client form input for creating a workout. */
export type WorkoutInput = {
  date: string;
  type: string;
  note: string;
  isPublic: boolean;
  images?: File[];
};

/** Validated client form input for updating a workout. */
export type WorkoutUpdateInput = WorkoutInput & {
  id: string;
  imageSrcs?: string[];
};

/** Public display fields used on heatmaps and profiles. */
export type UserProfile = {
  displayName: string;
  birthYear: number;
  avatarSeed: string;
};

/** Heatmap cell status relative to tracking window. */
export type HeatmapDayStatus = "no-data" | "empty" | "workout";

/** One day cell in a year/lifetime heatmap. */
export type HeatmapDay = {
  date: string;
  workouts: Workout[];
  status: HeatmapDayStatus;
};
