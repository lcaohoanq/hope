import assert from "node:assert/strict";
import test from "node:test";
import { canViewWorkoutVisibility } from "@hope/core";

test("music preview visibility allows public viewers and private workout owners only", () => {
  assert.equal(canViewWorkoutVisibility({ isPublic: true, profileId: "owner" }), true);
  assert.equal(canViewWorkoutVisibility({ isPublic: false, profileId: "owner" }, "owner"), true);
  assert.equal(canViewWorkoutVisibility({ isPublic: false, profileId: "owner" }, "viewer"), false);
  assert.equal(canViewWorkoutVisibility({ isPublic: false, profileId: "owner" }), false);
});
