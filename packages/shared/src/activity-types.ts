import { addDays, getTodayInTimezone, parseDateKey, toDateKey } from "./date-utils";
import type { LocalizedText } from "./i18n";

/** Catalog entry for activity scoring and workout type selection. */
export type ActivityType = {
  id: string;
  slug: string;
  label: LocalizedText;
  weight: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Public/list shape without timestamps (optional for clients). */
export type ActivityTypeSummary = Pick<
  ActivityType,
  "id" | "slug" | "label" | "weight" | "sortOrder" | "isActive"
>;

/** Leaderboard time windows. */
export type LeaderboardPeriod = "weekly" | "monthly" | "all-time";

export const LEADERBOARD_PERIODS = ["weekly", "monthly", "all-time"] as const;

/** Inclusive date range for a leaderboard period (`start` null = unbounded). */
export type LeaderboardDateRange = {
  start: string | null;
  end: string;
};

/** One row on a mutual-friends leaderboard. */
export type LeaderboardEntry = {
  rank: number;
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  isViewer: boolean;
};

/** Seed catalog used at migration / empty-DB bootstrap. */
export const DEFAULT_ACTIVITY_TYPE_SEEDS: Array<{
  id: string;
  slug: string;
  label: LocalizedText;
  weight: number;
  sortOrder: number;
}> = [
  {
    id: "activity-type-workout",
    slug: "workout",
    label: { en: "Workout", vi: "Tập luyện" },
    weight: 3,
    sortOrder: 0,
  },
  {
    id: "activity-type-study",
    slug: "study",
    label: { en: "Study", vi: "Học tập" },
    weight: 2,
    sortOrder: 1,
  },
  {
    id: "activity-type-other",
    slug: "other",
    label: { en: "Other", vi: "Hoạt động khác" },
    weight: 1,
    sortOrder: 2,
  },
];

const ACTIVITY_TYPE_SLUG_PATTERN = /^[a-z][a-z0-9_-]*$/;

/**
 * Normalize a workout type string to a catalog slug candidate.
 *
 * @param value - Raw type from client or legacy data.
 * @returns Trimmed lowercase slug, or empty string.
 */
export function normalizeActivityTypeSlug(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Whether a slug matches the catalog format.
 *
 * @param slug - Candidate slug.
 */
export function isValidActivityTypeSlug(slug: string) {
  return ACTIVITY_TYPE_SLUG_PATTERN.test(slug);
}

/**
 * Points for one activity: weight only (no duration multiplier).
 *
 * @param weight - Activity type weight.
 */
export function scoreActivityByWeight(weight: number) {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  return Math.floor(weight);
}

/**
 * Map unknown/legacy type strings onto a known slug (defaults to `other`).
 *
 * @param rawType - Stored or submitted type.
 * @param knownSlugs - Active or all catalog slugs.
 */
export function resolveActivityTypeSlug(rawType: string, knownSlugs: Iterable<string>) {
  const normalized = normalizeActivityTypeSlug(rawType);
  const known = new Set(
    [...knownSlugs].map((slug) => normalizeActivityTypeSlug(slug)).filter(Boolean),
  );
  if (normalized && known.has(normalized)) return normalized;
  return known.has("other") ? "other" : normalized;
}

/**
 * Parse a leaderboard period query value.
 *
 * @param value - Raw query string.
 * @returns Period or null if invalid.
 */
export function parseLeaderboardPeriod(value: unknown): LeaderboardPeriod | null {
  if (typeof value !== "string") return null;
  return (LEADERBOARD_PERIODS as readonly string[]).includes(value)
    ? (value as LeaderboardPeriod)
    : null;
}

/**
 * Inclusive `workouts.date` range for a leaderboard period in app timezone.
 *
 * @param period - weekly | monthly | all-time.
 * @param todayDateKey - Anchor day (`YYYY-MM-DD`), defaults to today in app TZ.
 */
export function getLeaderboardDateRange(
  period: LeaderboardPeriod,
  todayDateKey = getTodayInTimezone(),
): LeaderboardDateRange {
  if (period === "all-time") {
    return { start: null, end: todayDateKey };
  }

  if (period === "monthly") {
    return { start: `${todayDateKey.slice(0, 7)}-01`, end: todayDateKey };
  }

  const today = parseDateKey(todayDateKey);
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(today, diffToMonday);
  return { start: toDateKey(monday), end: todayDateKey };
}

/**
 * Validate admin create/update payload for an activity type.
 *
 * @param body - Loose request body.
 * @param options - Whether slug is required (create) and if inactive types allowed.
 */
export function validateActivityTypeInput(
  body: {
    slug?: unknown;
    label?: unknown;
    weight?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  },
  options: { requireSlug: boolean },
) {
  const slug =
    typeof body.slug === "string"
      ? normalizeActivityTypeSlug(body.slug)
      : options.requireSlug
        ? ""
        : undefined;

  if (options.requireSlug) {
    if (!slug) {
      return { success: false as const, error: "Activity type slug is required." };
    }
    if (!isValidActivityTypeSlug(slug)) {
      return {
        success: false as const,
        error: "Slug must start with a letter and use only lowercase letters, numbers, _ or -.",
      };
    }
  } else if (typeof slug === "string" && slug.length > 0 && !isValidActivityTypeSlug(slug)) {
    return {
      success: false as const,
      error: "Slug must start with a letter and use only lowercase letters, numbers, _ or -.",
    };
  }

  let label: LocalizedText | undefined;
  if (typeof body.label !== "undefined") {
    if (!body.label || typeof body.label !== "object") {
      return { success: false as const, error: "Label must include en and vi strings." };
    }
    const record = body.label as Record<string, unknown>;
    const en = typeof record.en === "string" ? record.en.trim() : "";
    const vi = typeof record.vi === "string" ? record.vi.trim() : "";
    if (!en || !vi) {
      return { success: false as const, error: "Label must include non-empty en and vi strings." };
    }
    label = { en, vi };
  } else if (options.requireSlug) {
    return { success: false as const, error: "Label is required." };
  }

  let weight: number | undefined;
  if (typeof body.weight !== "undefined") {
    const parsed = typeof body.weight === "number" ? body.weight : Number(body.weight);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 1000) {
      return { success: false as const, error: "Weight must be an integer between 1 and 1000." };
    }
    weight = parsed;
  } else if (options.requireSlug) {
    return { success: false as const, error: "Weight is required." };
  }

  let sortOrder: number | undefined;
  if (typeof body.sortOrder !== "undefined") {
    const parsed = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100_000) {
      return { success: false as const, error: "Sort order must be a non-negative integer." };
    }
    sortOrder = parsed;
  }

  let isActive: boolean | undefined;
  if (typeof body.isActive !== "undefined") {
    if (typeof body.isActive !== "boolean") {
      return { success: false as const, error: "isActive must be a boolean." };
    }
    isActive = body.isActive;
  }

  return {
    success: true as const,
    input: {
      ...(typeof slug === "string" && slug.length > 0 ? { slug } : {}),
      ...(label ? { label } : {}),
      ...(typeof weight === "number" ? { weight } : {}),
      ...(typeof sortOrder === "number" ? { sortOrder } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
  };
}
