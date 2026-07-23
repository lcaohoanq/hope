import assert from "node:assert/strict";
import test from "node:test";
import { isProfileRoute, requiresClerk } from "../../lib/route-access";

test("recognizes profile pages without performing an existence lookup", () => {
  assert.equal(isProfileRoute("/hope"), true);
  assert.equal(isProfileRoute("/hope/workouts"), true);
  assert.equal(isProfileRoute("/hope/followers"), true);
  assert.equal(isProfileRoute("/hope/following"), true);
  assert.equal(isProfileRoute("/hope/unknown"), false);
  assert.equal(isProfileRoute("/workouts/workout-id/comments"), false);
});

test("routes Clerk only by pathname shape", () => {
  for (const pathname of [
    "/",
    "/feed",
    "/leaderboard",
    "/notifications",
    "/settings/profile",
    "/pricing/success",
    "/workouts/workout-id",
    "/hope",
    "/hope/workouts",
  ]) {
    assert.equal(requiresClerk(pathname), true, pathname);
  }

  assert.equal(requiresClerk("/privacy-policy/details"), false);
  assert.equal(requiresClerk("/api/webhooks/clerk"), false);
});
