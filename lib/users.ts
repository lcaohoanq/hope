import type { UserProfile, Workout } from "@/lib/workout-types";

export type AppUser = UserProfile & {
  id: string;
  slug: string;
};

export const APP_USERS = [
  {
    id: "hoang",
    slug: "@hoang",
    displayName: "Hoang",
    birthYear: 2004,
    avatarSeed: "hoang",
  },
  {
    id: "linh",
    slug: "@linh",
    displayName: "Linh",
    birthYear: 2004,
    avatarSeed: "linh",
  },
] as const satisfies readonly AppUser[];

export const DEFAULT_USER_ID = "hoang";

export function getDefaultUser() {
  return APP_USERS[0];
}

export function getUserBySlug(slug: string) {
  const normalizedSlug = normalizeUserSlug(slug);

  return APP_USERS.find((user) => user.slug === normalizedSlug);
}

export function isKnownUserId(userId: string) {
  return APP_USERS.some((user) => user.id === userId);
}

export function normalizeUserId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const userId = value.trim().toLowerCase();

  return isKnownUserId(userId) ? userId : null;
}

export function isWorkoutVisibleForUser(workout: Workout, userId: string) {
  return workout.userId ? workout.userId === userId : userId === DEFAULT_USER_ID;
}

function normalizeUserSlug(value: string) {
  const decodedValue = safeDecodeURIComponent(value);
  const trimmedValue = decodedValue.trim().toLowerCase();

  return trimmedValue.startsWith("@") ? trimmedValue : `@${trimmedValue}`;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
