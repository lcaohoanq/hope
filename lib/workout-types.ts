export type WorkoutImage = {
  src: string;
  format: "avif";
  width: number;
  height: number;
  sizeBytes: number;
};

export type Workout = {
  id: string;
  userId?: string;
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note?: string;
  images?: WorkoutImage[];
  createdAt: string;
  isPublic: boolean;
};

export type WorkoutData = {
  workouts: Workout[];
  settings: {
    timezone: string;
  };
};

export type CreateWorkoutRequest = {
  userId?: unknown;
  date?: unknown;
  type?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  note?: unknown;
  isPublic?: unknown;
};

export type UpdateWorkoutRequest = CreateWorkoutRequest & {
  id?: unknown;
  imageSrcs?: unknown;
};

export type WorkoutInput = {
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  note: string;
  isPublic: boolean;
  images?: File[];
};

export type WorkoutUpdateInput = WorkoutInput & {
  id: string;
  imageSrcs?: string[];
};

export type UserProfile = {
  displayName: string;
  birthYear: number;
  avatarSeed: string;
};

export type HeatmapDayStatus = "no-data" | "empty" | "workout";

export type HeatmapDay = {
  date: string;
  workouts: Workout[];
  status: HeatmapDayStatus;
};
