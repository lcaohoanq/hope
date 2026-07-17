import type { AppUser, UserPlan } from "./users";

/** Clerk Billing plan slug for Hope Pro (must match `clerk/billing.json`). */
export const CLERK_PRO_PLAN_SLUG = "pro";

/**
 * Feature slugs shared with Clerk Billing Features.
 * Gate capabilities with {@link hasFeature}; reserve plan checks for badge/pricing UI.
 */
export const FEATURE_SLUGS = [
  "past_workout_edits",
  "more_workout_images",
  "workout_reminders",
  "export_csv",
  "delete_workouts",
  "advanced_stats",
] as const;

/** Clerk / app feature entitlement slug. */
export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

/**
 * Features unlocked by each Hope plan.
 * Add a slug here and in Clerk (`clerk/billing.json`) when shipping a Pro capability.
 */
export const PLAN_FEATURES: Record<UserPlan, readonly FeatureSlug[]> = {
  standard: [],
  pro: [
    "past_workout_edits",
    "more_workout_images",
    "workout_reminders",
    "export_csv",
    "delete_workouts",
    "advanced_stats",
  ],
};

/** Features currently enforced in app code (others are reserved for upcoming work). */
export const ENFORCED_FEATURES = ["past_workout_edits"] as const satisfies readonly FeatureSlug[];

/**
 * Features granted by a plan tier.
 *
 * @param plan - Hope plan mirrored from Clerk Billing.
 * @returns Feature slug list for that plan.
 */
export function getPlanFeatures(plan: UserPlan): readonly FeatureSlug[] {
  return PLAN_FEATURES[plan];
}

/**
 * Whether the account is on the paid Pro plan (badge / billing UI only).
 *
 * @param user - User with a plan field.
 * @returns `true` when `plan === "pro"`.
 */
export function isProPlan(user: Pick<AppUser, "plan">) {
  return user.plan === "pro";
}

/**
 * Whether the user's plan includes a feature.
 *
 * Prefer this over `plan === "pro"` when gating a capability so new tiers
 * and feature mixes stay centralized in {@link PLAN_FEATURES}.
 *
 * @param user - User with a plan field.
 * @param feature - Feature slug (matches Clerk Billing).
 * @returns `true` when the plan grants the feature.
 */
export function hasFeature(user: Pick<AppUser, "plan">, feature: FeatureSlug) {
  return getPlanFeatures(user.plan).includes(feature);
}
