import { getDatabase } from "@hope/db";
import { type ActivityTypeRow, activityTypes, workouts } from "@hope/db/schema";
import type { ActivityType, LocalizedText } from "@hope/shared";
import {
  normalizeActivityTypeSlug,
  scoreActivityByWeight,
  validateActivityTypeInput,
} from "@hope/shared";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";

function toActivityType(row: ActivityTypeRow): ActivityType {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    weight: row.weight,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listActivityTypes(options?: { activeOnly?: boolean }) {
  const db = getDatabase();
  const rows = options?.activeOnly
    ? await db
        .select()
        .from(activityTypes)
        .where(eq(activityTypes.isActive, true))
        .orderBy(asc(activityTypes.sortOrder), asc(activityTypes.slug))
    : await db
        .select()
        .from(activityTypes)
        .orderBy(asc(activityTypes.sortOrder), asc(activityTypes.slug));

  return rows.map(toActivityType);
}

export async function getActivityTypeBySlug(slug: string) {
  const normalized = normalizeActivityTypeSlug(slug);
  if (!normalized) return undefined;

  const [row] = await getDatabase()
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.slug, normalized))
    .limit(1);

  return row ? toActivityType(row) : undefined;
}

export async function getActivityTypeById(id: string) {
  const [row] = await getDatabase()
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.id, id))
    .limit(1);

  return row ? toActivityType(row) : undefined;
}

/**
 * Resolve points for a workout type from the live catalog weight.
 * Inactive types are rejected for new/updated workouts.
 */
export async function resolveWorkoutPoints(typeSlug: string) {
  const activityType = await getActivityTypeBySlug(typeSlug);
  if (!activityType) {
    return { success: false as const, error: "Unknown activity type." };
  }
  if (!activityType.isActive) {
    return { success: false as const, error: "That activity type is no longer available." };
  }
  return {
    success: true as const,
    type: activityType.slug,
    points: scoreActivityByWeight(activityType.weight),
  };
}

export async function createActivityType(input: {
  slug: string;
  label: LocalizedText;
  weight: number;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const validation = validateActivityTypeInput(input, { requireSlug: true });
  if (!validation.success) {
    return validation;
  }

  const payload = validation.input;
  const existing = await getActivityTypeBySlug(payload.slug!);
  if (existing) {
    return { success: false as const, error: "An activity type with that slug already exists." };
  }

  const now = new Date();
  const [row] = await getDatabase()
    .insert(activityTypes)
    .values({
      id: crypto.randomUUID(),
      slug: payload.slug!,
      label: payload.label!,
      weight: payload.weight!,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { success: true as const, activityType: toActivityType(row) };
}

export async function updateActivityType(
  id: string,
  input: {
    slug?: string;
    label?: LocalizedText;
    weight?: number;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const existing = await getActivityTypeById(id);
  if (!existing) {
    return { success: false as const, error: "Activity type was not found." };
  }

  const validation = validateActivityTypeInput(input, { requireSlug: false });
  if (!validation.success) {
    return validation;
  }

  const payload = validation.input;
  if (payload.slug && payload.slug !== existing.slug) {
    const conflict = await getActivityTypeBySlug(payload.slug);
    if (conflict && conflict.id !== id) {
      return { success: false as const, error: "An activity type with that slug already exists." };
    }

    const [usage] = await getDatabase()
      .select({ value: count() })
      .from(workouts)
      .where(eq(workouts.type, existing.slug));
    if ((usage?.value ?? 0) > 0) {
      return {
        success: false as const,
        error: "Cannot change the slug of an activity type that is already used by workouts.",
      };
    }
  }

  const [row] = await getDatabase()
    .update(activityTypes)
    .set({
      ...(payload.slug ? { slug: payload.slug } : {}),
      ...(payload.label ? { label: payload.label } : {}),
      ...(typeof payload.weight === "number" ? { weight: payload.weight } : {}),
      ...(typeof payload.sortOrder === "number" ? { sortOrder: payload.sortOrder } : {}),
      ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(activityTypes.id, id))
    .returning();

  return { success: true as const, activityType: toActivityType(row) };
}

/** Soft-delete: mark inactive. Fails only if type is missing. */
export async function deactivateActivityType(id: string) {
  const existing = await getActivityTypeById(id);
  if (!existing) {
    return { success: false as const, error: "Activity type was not found." };
  }

  if (!existing.isActive) {
    return { success: true as const, activityType: existing };
  }

  const [activeCount] = await getDatabase()
    .select({ value: count() })
    .from(activityTypes)
    .where(and(eq(activityTypes.isActive, true), ne(activityTypes.id, id)));

  if ((activeCount?.value ?? 0) === 0) {
    return {
      success: false as const,
      error: "At least one active activity type is required.",
    };
  }

  const [row] = await getDatabase()
    .update(activityTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(activityTypes.id, id))
    .returning();

  return { success: true as const, activityType: toActivityType(row) };
}

/** Optional admin tool: recompute all workout points from current type weights. */
export async function recomputeAllWorkoutPoints() {
  const result = await getDatabase().execute(sql`
    UPDATE workouts AS w
    SET points = at.weight
    FROM activity_types AS at
    WHERE w.type = at.slug
  `);
  return { success: true as const, updated: Number(result.count ?? 0) };
}
