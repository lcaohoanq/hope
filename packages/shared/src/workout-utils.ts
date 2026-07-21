import {
  addDays,
  getCurrentTimeInTimezone,
  getDaysInRange,
  getLastNDays,
  getTodayInTimezone,
  parseDateKey,
  toDateKey,
} from "./date-utils";
import type {
  CreateWorkoutRequest,
  HeatmapDay,
  UpdateWorkoutRequest,
  Workout,
  WorkoutData,
  WorkoutImage,
} from "./workout-types";

/** Earliest date key included in workout tracking / heatmaps. */
export const TRACKING_START_DATE = "2026-01-01";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Group workouts by their `date` key.
 *
 * @param workouts - Workout list.
 * @returns Map of date key → workouts on that day.
 */
export function groupWorkoutsByDate(workouts: Workout[]) {
  const grouped = new Map<string, Workout[]>();

  for (const workout of workouts) {
    const existing = grouped.get(workout.date) ?? [];
    grouped.set(workout.date, [...existing, workout]);
  }

  return grouped;
}

/**
 * Build a 365-day contribution heatmap grid ending at `endDateKey`.
 *
 * @param endDateKey - Last day of the window (`YYYY-MM-DD`).
 * @param workouts - Workouts to place on the grid.
 * @returns Weeks of day cells (`null` for leading padding).
 */
export function createHeatmapWeeks(endDateKey: string, workouts: Workout[]) {
  const workoutsByDate = groupWorkoutsByDate(workouts);
  const days = getLastNDays(endDateKey, 365);
  const leadingEmptyDays = new Date(days[0]).getDay();
  const cells = [...Array.from({ length: leadingEmptyDays }, () => null), ...days];
  const weekCount = Math.ceil(cells.length / 7);

  return Array.from({ length: weekCount }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = cells[weekIndex * 7 + dayIndex];

      if (!date) {
        return null;
      }

      return {
        date,
        workouts: workoutsByDate.get(date) ?? [],
      };
    }),
  );
}

/**
 * Lifetime heatmap: one year grid from `birthYear` through the end date's year.
 *
 * @param options - `birthYear`, `endDateKey`, `workouts`, optional `trackingStartDateKey`.
 * @returns Array of `{ year, weeks }` heatmap years.
 */
export function createLifetimeHeatmapYears({
  birthYear,
  endDateKey,
  workouts,
  trackingStartDateKey = TRACKING_START_DATE,
}: {
  birthYear: number;
  endDateKey: string;
  workouts: Workout[];
  trackingStartDateKey?: string;
}) {
  const currentYear = Number(endDateKey.slice(0, 4));

  return createHeatmapYears({
    startYear: birthYear,
    endYear: currentYear,
    endDateKey,
    workouts,
    trackingStartDateKey,
  });
}

/**
 * Build per-year heatmap grids between `startYear` and `endYear`.
 *
 * @param options - `startYear`, `endYear`, `endDateKey`, `workouts`, optional `trackingStartDateKey`.
 * @returns Array of `{ year, weeks }` heatmap years.
 */
export function createHeatmapYears({
  startYear,
  endYear,
  endDateKey,
  workouts,
  trackingStartDateKey = TRACKING_START_DATE,
}: {
  startYear: number;
  endYear: number;
  endDateKey: string;
  workouts: Workout[];
  trackingStartDateKey?: string;
}) {
  const workoutsByDate = groupWorkoutsByDate(workouts);
  const currentYear = Number(endDateKey.slice(0, 4));
  const firstYear = Math.min(startYear, endYear);
  const lastYear = Math.min(Math.max(startYear, endYear), currentYear);

  return Array.from({ length: lastYear - firstYear + 1 }, (_, yearOffset) => {
    const year = firstYear + yearOffset;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const days = getDaysInRange(yearStart, yearEnd);
    const leadingEmptyDays = new Date(days[0]).getDay();
    const cells = [...Array.from({ length: leadingEmptyDays }, () => null), ...days];
    const weekCount = Math.ceil(cells.length / 7);
    const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex): HeatmapDay | null => {
        const date = cells[weekIndex * 7 + dayIndex];

        if (!date) {
          return null;
        }

        const dayWorkouts = workoutsByDate.get(date) ?? [];
        const isTrackable = date >= trackingStartDateKey && date <= endDateKey;

        return {
          date,
          workouts: dayWorkouts,
          status: !isTrackable ? "no-data" : dayWorkouts.length > 0 ? "workout" : "empty",
        };
      }),
    );

    return {
      year,
      weeks,
    };
  });
}

/**
 * Coerce unknown JSON into a {@link WorkoutData} shape with safe defaults.
 *
 * @param value - Unknown payload.
 * @returns Normalized workout data.
 */
export function validateWorkoutData(value: unknown): WorkoutData {
  if (!value || typeof value !== "object") {
    return {
      workouts: [],
      settings: {
        timezone: "Asia/Ho_Chi_Minh",
      },
    };
  }

  const candidate = value as Partial<WorkoutData>;

  return {
    workouts: Array.isArray(candidate.workouts) ? candidate.workouts : [],
    settings: {
      timezone:
        candidate.settings?.timezone && typeof candidate.settings.timezone === "string"
          ? candidate.settings.timezone
          : "Asia/Ho_Chi_Minh",
    },
  };
}

/**
 * Validate a create-workout request and stamp start/end times.
 *
 * @param body - Loose request body.
 * @param todayDateKey - Today for future-date checks.
 * @param currentTime - Clock time applied to start/end.
 * @returns Success with workout input, or `{ success: false, error }`.
 */
export function validateCreateWorkoutRequest(
  body: CreateWorkoutRequest,
  todayDateKey = getTodayInTimezone(),
  currentTime = getCurrentTimeInTimezone(),
) {
  const validation = validateWorkoutRequestDetails(body, todayDateKey);

  if (!validation.success) {
    return validation;
  }

  return {
    success: true as const,
    workoutInput: {
      ...validation.workoutInput,
      startTime: currentTime,
      endTime: currentTime,
      durationMinutes: 0,
    },
  };
}

function validateWorkoutRequestDetails(
  body: CreateWorkoutRequest,
  todayDateKey = getTodayInTimezone(),
) {
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const date = typeof body.date === "string" && body.date ? body.date : todayDateKey;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const isPublic = typeof body.isPublic === "undefined" ? true : body.isPublic;

  if (typeof isPublic !== "boolean") {
    return {
      success: false as const,
      error: "Workout visibility must be a boolean.",
    };
  }

  if (!type) {
    return {
      success: false as const,
      error: "Workout type is required.",
    };
  }

  if (!DATE_PATTERN.test(date)) {
    return {
      success: false as const,
      error: "Date must use YYYY-MM-DD format.",
    };
  }

  if (date < TRACKING_START_DATE) {
    return {
      success: false as const,
      error: "Workout tracking starts on 2026-01-01.",
    };
  }

  if (date > todayDateKey) {
    return {
      success: false as const,
      error: "Workout date cannot be in the future.",
    };
  }

  return {
    success: true as const,
    workoutInput: {
      date,
      type,
      note,
      isPublic,
    },
  };
}

/**
 * Validate an update-workout request including optional image srcs.
 *
 * @param body - Loose request body.
 * @param todayDateKey - Today for future-date checks.
 * @returns Success with id + input (+ imageSrcs), or `{ success: false, error }`.
 */
export function validateUpdateWorkoutRequest(
  body: UpdateWorkoutRequest,
  todayDateKey = getTodayInTimezone(),
) {
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const imageSrcs = parseWorkoutImageSrcs(body.imageSrcs);

  if (!id) {
    return {
      success: false as const,
      error: "Workout id is required.",
    };
  }

  const validation = validateWorkoutRequestDetails(body, todayDateKey);

  if (!validation.success) {
    return validation;
  }

  return {
    success: true as const,
    workoutId: id,
    workoutInput: validation.workoutInput,
    imageSrcs,
  };
}

function parseWorkoutImageSrcs(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];

  return values.filter((src): src is string => typeof src === "string" && src.trim().length > 0);
}

/**
 * Build a new {@link Workout} record with a generated id and `createdAt`.
 *
 * @param input - Workout fields.
 * @param now - Timestamp source for id / createdAt.
 * @returns New workout record.
 */
export function createWorkoutRecord(
  input: {
    userId: string;
    date: string;
    type: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    note: string;
    isPublic: boolean;
    points?: number;
    images?: WorkoutImage[];
  },
  now = new Date(),
): Workout {
  return {
    id: `${input.date}-${now.getTime()}-${crypto.randomUUID().slice(0, 8)}`,
    userId: input.userId,
    date: input.date,
    type: input.type,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    note: input.note,
    points: input.points ?? 0,
    isPublic: input.isPublic,
    ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
    createdAt: now.toISOString(),
  };
}

/**
 * Append a workout if its id is not already present; keeps sorted order.
 *
 * @param data - Existing workout data.
 * @param workout - Workout to append.
 * @returns Updated data (or original if duplicate id).
 */
export function appendWorkout(data: WorkoutData, workout: Workout): WorkoutData {
  if (data.workouts.some((existing) => existing.id === workout.id)) {
    return data;
  }

  return {
    ...data,
    workouts: [...data.workouts, workout].sort((a, b) => {
      const dateSort = a.date.localeCompare(b.date);

      if (dateSort !== 0) {
        return dateSort;
      }

      return a.startTime.localeCompare(b.startTime);
    }),
  };
}

/**
 * Replace an existing workout by id; no-op if missing.
 *
 * @param data - Existing workout data.
 * @param workout - Replacement workout.
 * @returns Updated data (or original if id not found).
 */
export function replaceWorkout(data: WorkoutData, workout: Workout): WorkoutData {
  if (!data.workouts.some((existing) => existing.id === workout.id)) {
    return data;
  }

  return {
    ...data,
    workouts: data.workouts
      .map((existing) => (existing.id === workout.id ? workout : existing))
      .sort((a, b) => {
        const dateSort = a.date.localeCompare(b.date);

        if (dateSort !== 0) {
          return dateSort;
        }

        return a.startTime.localeCompare(b.startTime);
      }),
  };
}

export type ActivityMixKey = "workout" | "study" | "other";

export type WorkoutDayCount = {
  date: string;
  count: number;
  types: ActivityMixKey[];
};

export type WorkoutStats = {
  activeDays: number;
  totalSessions: number;
  last30ActiveDays: number;
  last30Consistency: number;
  last30Series: WorkoutDayCount[];
  thisWeekActiveDays: number;
  thisWeekSeries: WorkoutDayCount[];
  streak: number;
  longestStreak: number;
  /** Days since the most recent active day; `null` when never active. */
  daysSinceLastActive: number | null;
  activityMix: Array<{ key: ActivityMixKey; count: number }>;
};

/**
 * Aggregate streak and activity stats from tracked workouts.
 *
 * @param workouts - Workout list.
 * @param todayDateKey - Today for streak / last-30 windows.
 * @returns Chart-ready consistency stats for the dashboard.
 */
export function getWorkoutStats(workouts: Workout[], todayDateKey: string): WorkoutStats {
  const trackedWorkouts = workouts.filter((workout) => workout.date >= TRACKING_START_DATE);
  const workoutsByDate = groupWorkoutsByDate(trackedWorkouts);
  const activeDays = workoutsByDate.size;
  const totalSessions = trackedWorkouts.length;
  const last30Days = getLastNDays(todayDateKey, 30);
  const thisWeekDays = getLastNDays(todayDateKey, 7);
  const last30Series = last30Days.map((date) => {
    const dayWorkouts = workoutsByDate.get(date) ?? [];

    return {
      date,
      count: dayWorkouts.length,
      types: getUniqueActivityTypes(dayWorkouts),
    };
  });
  const thisWeekSeries = thisWeekDays.map((date) => {
    const dayWorkouts = workoutsByDate.get(date) ?? [];

    return {
      date,
      count: dayWorkouts.length,
      types: getUniqueActivityTypes(dayWorkouts),
    };
  });
  const last30ActiveDays = last30Series.filter((day) => day.count > 0).length;
  const thisWeekActiveDays = thisWeekSeries.filter((day) => day.count > 0).length;
  const last30Consistency = Math.round((last30ActiveDays / 30) * 100);
  let streak = 0;

  for (const day of getLastNDays(todayDateKey, 365).reverse()) {
    if (!workoutsByDate.has(day)) {
      break;
    }

    streak += 1;
  }

  return {
    activeDays,
    totalSessions,
    last30ActiveDays,
    last30Consistency,
    last30Series,
    thisWeekActiveDays,
    thisWeekSeries,
    streak,
    longestStreak: getLongestStreak([...workoutsByDate.keys()]),
    daysSinceLastActive: getDaysSinceLastActive(workoutsByDate, todayDateKey),
    activityMix: getActivityMix(trackedWorkouts),
  };
}

function getDaysSinceLastActive(workoutsByDate: Map<string, Workout[]>, todayDateKey: string) {
  if (workoutsByDate.size === 0) {
    return null;
  }

  const today = parseDateKey(todayDateKey);

  for (let offset = 0; offset < 3650; offset += 1) {
    const dateKey = toDateKey(addDays(today, -offset));

    if (dateKey < TRACKING_START_DATE) {
      break;
    }

    if (workoutsByDate.has(dateKey)) {
      return offset;
    }
  }

  return null;
}

function getLongestStreak(activeDateKeys: string[]) {
  if (activeDateKeys.length === 0) {
    return 0;
  }

  const sorted = [...activeDateKeys].sort((a, b) => a.localeCompare(b));
  let longest = 1;
  let current = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previousKey = sorted[index - 1];
    const nextKey = sorted[index];

    if (!previousKey || !nextKey) {
      continue;
    }

    const previous = parseDateKey(previousKey);
    const next = parseDateKey(nextKey);
    const dayDiff = Math.round((next.getTime() - previous.getTime()) / 86_400_000);

    if (dayDiff === 1) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 1;
  }

  return longest;
}

function getUniqueActivityTypes(workouts: Workout[]) {
  const seen = new Set<ActivityMixKey>();
  const types: ActivityMixKey[] = [];

  for (const workout of workouts) {
    const key = normalizeActivityMixKey(workout.type);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    types.push(key);
  }

  return types;
}

function getActivityMix(workouts: Workout[]) {
  const counts: Record<ActivityMixKey, number> = {
    workout: 0,
    study: 0,
    other: 0,
  };

  for (const workout of workouts) {
    counts[normalizeActivityMixKey(workout.type)] += 1;
  }

  return (Object.entries(counts) as Array<[ActivityMixKey, number]>)
    .map(([key, count]) => ({ key, count }))
    .filter((entry) => entry.count > 0);
}

function normalizeActivityMixKey(type: string): ActivityMixKey {
  const normalized = type.trim().toLowerCase();

  if (normalized === "study" || normalized === "other") {
    return normalized;
  }

  return "workout";
}

/** Demo workouts used in local previews / fixtures. */
export const sampleWorkouts: Workout[] = [
  {
    id: "2026-06-02-demo",
    date: "2026-06-02",
    type: "Walking",
    startTime: "06:35",
    endTime: "07:10",
    durationMinutes: 35,
    note: "Easy morning pace",
    createdAt: "2026-06-01T23:35:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-06-07-demo",
    date: "2026-06-07",
    type: "Mobility",
    startTime: "21:00",
    endTime: "21:20",
    durationMinutes: 20,
    note: "Shoulders and hips",
    createdAt: "2026-06-07T14:00:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-06-12-demo",
    date: "2026-06-12",
    type: "Gym",
    startTime: "18:10",
    endTime: "19:05",
    durationMinutes: 55,
    note: "Upper body",
    createdAt: "2026-06-12T11:10:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-06-18-demo",
    date: "2026-06-18",
    type: "Running",
    startTime: "06:20",
    endTime: "06:52",
    durationMinutes: 32,
    note: "Short tempo run",
    createdAt: "2026-06-17T23:20:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-06-23-demo",
    date: "2026-06-23",
    type: "Yoga",
    startTime: "20:30",
    endTime: "21:00",
    durationMinutes: 30,
    note: "Recovery session",
    createdAt: "2026-06-23T13:30:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-06-28-demo",
    date: "2026-06-28",
    type: "Cycling",
    startTime: "07:00",
    endTime: "08:10",
    durationMinutes: 70,
    note: "River loop",
    createdAt: "2026-06-28T00:00:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-06-30-demo",
    date: "2026-06-30",
    type: "Walking",
    startTime: "19:20",
    endTime: "19:55",
    durationMinutes: 35,
    note: "After dinner",
    createdAt: "2026-06-30T12:20:00.000Z",
    isPublic: true,
  },
  {
    id: "2026-07-01-demo",
    date: "2026-07-01",
    type: "Strength",
    startTime: "06:40",
    endTime: "07:20",
    durationMinutes: 40,
    note: "Core and legs",
    createdAt: "2026-06-30T23:40:00.000Z",
    isPublic: true,
  },
];
