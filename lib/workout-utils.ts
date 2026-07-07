import type {
  CreateWorkoutRequest,
  HeatmapDay,
  UpdateWorkoutRequest,
  Workout,
  WorkoutData,
  WorkoutImage,
} from "@/lib/workout-types";
import {
  getDaysInRange,
  getLastNDays,
  getTodayInTimezone,
  minutesBetween,
} from "@/lib/date-utils";

export const TRACKING_START_DATE = "2026-01-01";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function isValidTime(value: string) {
  if (!TIME_PATTERN.test(value)) {
    return false;
  }

  const [hour, minute] = value.split(":").map(Number);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function groupWorkoutsByDate(workouts: Workout[]) {
  const grouped = new Map<string, Workout[]>();

  for (const workout of workouts) {
    const existing = grouped.get(workout.date) ?? [];
    grouped.set(workout.date, [...existing, workout]);
  }

  return grouped;
}

export function createHeatmapWeeks(endDateKey: string, workouts: Workout[]) {
  const workoutsByDate = groupWorkoutsByDate(workouts);
  const days = getLastNDays(endDateKey, 365);
  const leadingEmptyDays = new Date(days[0]).getDay();
  const cells = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...days,
  ];
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

  return Array.from(
    { length: lastYear - firstYear + 1 },
    (_, yearOffset) => {
      const year = firstYear + yearOffset;
      const yearStart = `${year}-01-01`;
      const yearEnd = year === currentYear ? endDateKey : `${year}-12-31`;
      const days = getDaysInRange(yearStart, yearEnd);
      const leadingEmptyDays = new Date(days[0]).getDay();
      const cells = [
        ...Array.from({ length: leadingEmptyDays }, () => null),
        ...days,
      ];
      const weekCount = Math.ceil(cells.length / 7);
      const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
        Array.from({ length: 7 }, (_, dayIndex): HeatmapDay | null => {
          const date = cells[weekIndex * 7 + dayIndex];

          if (!date) {
            return null;
          }

          const dayWorkouts = workoutsByDate.get(date) ?? [];
          const isTrackable = date >= trackingStartDateKey;

          return {
            date,
            workouts: dayWorkouts,
            status: !isTrackable
              ? "no-data"
              : dayWorkouts.length > 0
                ? "workout"
                : "empty",
          };
        }),
      );

      return {
        year,
        weeks,
      };
    },
  );
}

export function calculateDurationMinutes(startTime: string, endTime: string) {
  return minutesBetween(startTime, endTime);
}

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
        candidate.settings?.timezone &&
        typeof candidate.settings.timezone === "string"
          ? candidate.settings.timezone
          : "Asia/Ho_Chi_Minh",
    },
  };
}

export function validateCreateWorkoutRequest(
  body: CreateWorkoutRequest,
  todayDateKey = getTodayInTimezone(),
) {
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const date = typeof body.date === "string" && body.date ? body.date : todayDateKey;
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const endTime = typeof body.endTime === "string" ? body.endTime : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

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

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return {
      success: false as const,
      error: "Start time and end time are required.",
    };
  }

  const durationMinutes = calculateDurationMinutes(startTime, endTime);

  if (durationMinutes <= 0) {
    return {
      success: false as const,
      error: "Start time must be earlier than end time.",
    };
  }

  return {
    success: true as const,
    workoutInput: {
      date,
      type,
      startTime,
      endTime,
      note,
      durationMinutes,
    },
  };
}

export function validateUpdateWorkoutRequest(
  body: UpdateWorkoutRequest,
  todayDateKey = getTodayInTimezone(),
) {
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!id) {
    return {
      success: false as const,
      error: "Workout id is required.",
    };
  }

  const validation = validateCreateWorkoutRequest(body, todayDateKey);

  if (!validation.success) {
    return validation;
  }

  return {
    success: true as const,
    workoutId: id,
    workoutInput: validation.workoutInput,
  };
}

export function createWorkoutRecord(
  input: {
    userId: string;
    date: string;
    type: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    note: string;
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
    ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
    createdAt: now.toISOString(),
  };
}

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

export function getWorkoutStats(workouts: Workout[], todayDateKey: string) {
  const trackedWorkouts = workouts.filter(
    (workout) => workout.date >= TRACKING_START_DATE,
  );
  const workoutsByDate = groupWorkoutsByDate(trackedWorkouts);
  const activeDays = workoutsByDate.size;
  const totalMinutes = trackedWorkouts.reduce(
    (sum, workout) => sum + workout.durationMinutes,
    0,
  );
  const last30Days = getLastNDays(todayDateKey, 30);
  const last30ActiveDays = last30Days.filter((day) =>
    workoutsByDate.has(day),
  ).length;
  let streak = 0;

  for (const day of getLastNDays(todayDateKey, 365).reverse()) {
    if (!workoutsByDate.has(day)) {
      break;
    }

    streak += 1;
  }

  return {
    activeDays,
    totalMinutes,
    last30ActiveDays,
    streak,
  };
}

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
  },
];
