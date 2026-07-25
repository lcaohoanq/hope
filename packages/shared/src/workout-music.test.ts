import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDeezerTrackId,
  validateCreateWorkoutRequest,
  validateUpdateWorkoutRequest,
} from "./workout-utils";

const baseRequest = {
  date: "2026-07-25",
  type: "workout",
  note: "",
  isPublic: true,
};

test("validates and normalizes a Deezer track id on create", () => {
  const result = validateCreateWorkoutRequest(
    { ...baseRequest, deezerTrackId: " 3135556 " },
    "2026-07-25",
    "08:00",
  );
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.workoutInput.deezerTrackId, "3135556");
});

test("rejects non-numeric and zero Deezer track ids", () => {
  assert.equal(parseDeezerTrackId("not-a-track").success, false);
  assert.equal(parseDeezerTrackId("0").success, false);
  assert.equal(parseDeezerTrackId(3135556).success, false);
});

test("preserves update music intent: omitted, remove, or replace", () => {
  const omitted = validateUpdateWorkoutRequest({ ...baseRequest, id: "workout-1" }, "2026-07-25");
  const removed = validateUpdateWorkoutRequest(
    { ...baseRequest, id: "workout-1", deezerTrackId: null },
    "2026-07-25",
  );
  const replaced = validateUpdateWorkoutRequest(
    { ...baseRequest, id: "workout-1", deezerTrackId: "3135556" },
    "2026-07-25",
  );

  assert.equal(omitted.success, true);
  assert.equal(removed.success, true);
  assert.equal(replaced.success, true);
  if (omitted.success) assert.equal(omitted.workoutInput.deezerTrackId, undefined);
  if (removed.success) assert.equal(removed.workoutInput.deezerTrackId, null);
  if (replaced.success) assert.equal(replaced.workoutInput.deezerTrackId, "3135556");
});
