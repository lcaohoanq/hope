import type { Language, LocalizedText } from "@/lib/i18n";
import type { UserProfile, Workout } from "@/lib/workout-types";

export type HeatmapView =
  | { mode: "lifetime" }
  | { mode: "year"; year: number };

export type HeatmapDefaultView =
  | { mode: "lifetime" }
  | { mode: "year"; year?: number };

export type UserLocation = {
  label: LocalizedText;
  coordinates: { latitude: number; longitude: number };
  zoom?: number;
};

export type UserSocialLinks = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
};

export type AppTheme = "light" | "dark";
export type UserPlan = "standard" | "pro";

export type UserSettings = {
  theme: AppTheme;
  heatmap: { defaultView: HeatmapDefaultView };
  workouts: { allowPastWorkoutEdits: boolean };
};

export type AppUser = UserProfile & {
  id: string;
  clerkUserId?: string | null;
  username: string;
  slug: string;
  plan: UserPlan;
  avatarUrl?: string;
  avatarPublicId?: string | null;
  bio: LocalizedText;
  location?: UserLocation;
  pronouns?: LocalizedText;
  preferredLanguage: Language;
  socialLinks?: UserSocialLinks;
  website?: string;
  settings: UserSettings;
  reminderEnabled?: boolean;
  isPrivate: boolean;
};

export type PublicAppUser = Omit<
  AppUser,
  "clerkUserId" | "avatarPublicId" | "reminderEnabled"
>;

export const DEFAULT_USER_PLAN: UserPlan = "standard";

export function getDefaultUserSettings(year = new Date().getFullYear()): UserSettings {
  return {
    theme: "light",
    heatmap: { defaultView: { mode: "year", year } },
    workouts: { allowPastWorkoutEdits: false },
  };
}

export function getCanonicalUserPath(user: Pick<AppUser, "username">) {
  return `/${user.username}`;
}

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function normalizeProfilePathSegment(value: string) {
  const decodedValue = safeDecodeURIComponent(value);
  return normalizeUsername(decodedValue);
}

export function normalizeUserId(value: unknown) {
  if (typeof value !== "string") return null;
  const userId = value.trim();
  return userId.length > 0 ? userId : null;
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark";
}

export function isWorkoutVisibleForUser(workout: Workout, userId: string) {
  return workout.userId === userId;
}

export function canUserEditWorkoutDate(
  user: Pick<AppUser, "settings">,
  workoutDate: string,
  todayDateKey: string,
) {
  return user.settings.workouts.allowPastWorkoutEdits || workoutDate >= todayDateKey;
}

export function toPublicUser(user: AppUser): PublicAppUser {
  return {
    id: user.id,
    username: user.username,
    slug: user.slug,
    plan: user.plan,
    displayName: user.displayName,
    birthYear: user.birthYear,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    pronouns: user.pronouns,
    preferredLanguage: user.preferredLanguage,
    socialLinks: user.socialLinks,
    website: user.website,
    settings: user.settings,
    isPrivate: user.isPrivate,
  };
}

export function toPrivateProfileShell(user: AppUser): PublicAppUser {
  const profile = toPublicUser(user);
  return {
    ...profile,
    birthYear: new Date().getFullYear(),
    location: undefined,
    pronouns: undefined,
    socialLinks: undefined,
    website: undefined,
    plan: "standard",
  };
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
