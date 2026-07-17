import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ENFORCED_FEATURES,
  FEATURE_SLUGS,
  getPlanFeatures,
  hasFeature,
  isProPlan,
  PLAN_FEATURES,
} from "./entitlements";
import { canUserEditPastWorkouts, getDefaultUserSettings } from "./users";

describe("entitlements", () => {
  it("gives standard users no features", () => {
    assert.deepEqual(getPlanFeatures("standard"), []);
    assert.equal(hasFeature({ plan: "standard" }, "past_workout_edits"), false);
    assert.equal(isProPlan({ plan: "standard" }), false);
  });

  it("gives pro users the full feature catalog", () => {
    assert.deepEqual([...getPlanFeatures("pro")], [...PLAN_FEATURES.pro]);
    for (const feature of FEATURE_SLUGS) {
      assert.equal(hasFeature({ plan: "pro" }, feature), true);
    }
    assert.equal(isProPlan({ plan: "pro" }), true);
  });

  it("enforces past workout edits via feature + settings override", () => {
    assert.equal(
      canUserEditPastWorkouts({
        plan: "standard",
        settings: getDefaultUserSettings(),
      }),
      false,
    );
    assert.equal(
      canUserEditPastWorkouts({
        plan: "pro",
        settings: getDefaultUserSettings(),
      }),
      true,
    );
    assert.equal(
      canUserEditPastWorkouts({
        plan: "standard",
        settings: {
          ...getDefaultUserSettings(),
          workouts: { allowPastWorkoutEdits: true },
        },
      }),
      true,
    );
  });

  it("lists past_workout_edits as currently enforced", () => {
    assert.ok((ENFORCED_FEATURES as readonly string[]).includes("past_workout_edits"));
  });
});
