export type WorkoutImage = {
  src: string;
  format: "avif";
  width: number;
  height: number;
  sizeBytes: number;
};

export type Workout = {
  id: string;
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note?: string;
  images?: WorkoutImage[];
  createdAt: string;
};

export type WorkoutData = {
  workouts: Workout[];
  settings: {
    timezone: string;
  };
};

export type CreateWorkoutRequest = {
  date?: unknown;
  type?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  note?: unknown;
};

export type UpdateWorkoutRequest = CreateWorkoutRequest & {
  id?: unknown;
};

export type WorkoutInput = {
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  note: string;
  images?: File[];
};

export type WorkoutUpdateInput = WorkoutInput & {
  id: string;
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
