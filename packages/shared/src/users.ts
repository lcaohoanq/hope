import { hasFeature } from "./entitlements";
import type { Language, LocalizedText } from "./i18n";
import type { UserProfile, Workout } from "./workout-types";

/** Heatmap view mode: full lifetime or a single year. */
export type HeatmapView = { mode: "lifetime" } | { mode: "year"; year: number };

/** Default heatmap view persisted in user settings (`year` optional). */
export type HeatmapDefaultView = { mode: "lifetime" } | { mode: "year"; year?: number };

/** Optional map pin shown on a public profile. */
export type UserLocation = {
  label: LocalizedText;
  coordinates: { latitude: number; longitude: number };
  zoom?: number;
};

/** Optional social profile URLs. */
export type UserSocialLinks = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
};

/** UI color scheme preference. */
export type AppTheme = "light" | "dark";
/** Account plan tier. */
export type UserPlan = "standard" | "pro";

/** Persisted UI and workout preferences. */
export type UserSettings = {
  theme: AppTheme;
  heatmap: { defaultView: HeatmapDefaultView };
  workouts: { allowPastWorkoutEdits: boolean };
};

/** Full app user profile (includes private fields). */
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

/** Public-safe user shape (omits clerk id, avatar public id, reminder flag). */
export type PublicAppUser = Omit<AppUser, "clerkUserId" | "avatarPublicId" | "reminderEnabled">;

/** Default plan for new users. */
export const DEFAULT_USER_PLAN: UserPlan = "standard";

/**
 * Build default {@link UserSettings} for a new or reset profile.
 *
 * @param year - Year used for the default heatmap year view.
 * @returns Default settings object.
 */
export function getDefaultUserSettings(year = new Date().getFullYear()): UserSettings {
  return {
    theme: "light",
    heatmap: { defaultView: { mode: "year", year } },
    workouts: { allowPastWorkoutEdits: false },
  };
}

/**
 * Canonical profile path for a user (`/{username}`).
 *
 * @param user - User with a username.
 * @returns Path string.
 */
export function getCanonicalUserPath(user: Pick<AppUser, "username">) {
  return `/${user.username}`;
}

/**
 * Normalize a username: trim, strip leading `@`, lowercase.
 *
 * @param value - Raw username input.
 * @returns Normalized username.
 */
export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

/**
 * Normalize a URL path segment used as a profile identifier.
 *
 * @param value - Path segment (may be URI-encoded).
 * @returns Normalized username.
 */
export function normalizeProfilePathSegment(value: string) {
  const decodedValue = safeDecodeURIComponent(value);
  return normalizeUsername(decodedValue);
}

/**
 * Coerce an unknown value to a non-empty user id string, or `null`.
 *
 * @param value - Unknown input.
 * @returns Trimmed id or `null`.
 */
export function normalizeUserId(value: unknown) {
  if (typeof value !== "string") return null;
  const userId = value.trim();
  return userId.length > 0 ? userId : null;
}

/**
 * Type guard for {@link AppTheme}.
 *
 * @param value - Unknown input.
 * @returns Whether `value` is `"light"` or `"dark"`.
 */
export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark";
}

/**
 * Whether a workout belongs to the given user.
 *
 * @param workout - Workout record.
 * @param userId - Owner user id.
 * @returns `true` when `workout.userId` matches.
 */
export function isWorkoutVisibleForUser(workout: Workout, userId: string) {
  return workout.userId === userId;
}

/**
 * Whether the user may edit workouts on dates before today.
 *
 * Granted by the `past_workout_edits` plan feature. The settings flag remains
 * an admin/seed override for testing without a paid plan.
 *
 * @param user - User with plan and workout settings.
 * @returns `true` when past-day edits are unlocked.
 */
export function canUserEditPastWorkouts(user: Pick<AppUser, "plan" | "settings">) {
  return hasFeature(user, "past_workout_edits") || user.settings.workouts.allowPastWorkoutEdits;
}

/**
 * Whether the user may edit a workout on `workoutDate` given today's key.
 *
 * @param user - User with plan and workout settings.
 * @param workoutDate - Workout date key.
 * @param todayDateKey - Today's date key.
 * @returns `true` if past edits are allowed or the date is today/future-gated by caller.
 */
export function canUserEditWorkoutDate(
  user: Pick<AppUser, "plan" | "settings">,
  workoutDate: string,
  todayDateKey: string,
) {
  return canUserEditPastWorkouts(user) || workoutDate >= todayDateKey;
}

/**
 * Strip private fields from {@link AppUser} for public responses.
 *
 * @param user - Full app user.
 * @returns Public user object.
 */
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

/**
 * Redact sensitive public fields for a private profile shell (limited preview).
 *
 * @param user - Full app user.
 * @returns Redacted {@link PublicAppUser}.
 */
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
