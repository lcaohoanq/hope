import assert from "node:assert/strict";
import test from "node:test";
import {
  HEATMAP_INACTIVE_COLOR,
  HEATMAP_INTENSITY_COLORS,
  resolveWorkoutIntensity,
} from "@/lib/heatmap-intensity";

test("resolves workout counts to the expected contribution heatmap intensity", () => {
  assert.equal(resolveWorkoutIntensity(0), 0);
  assert.equal(resolveWorkoutIntensity(1), 1);
  assert.equal(resolveWorkoutIntensity(2), 2);
  assert.equal(resolveWorkoutIntensity(3), 3);
  assert.equal(resolveWorkoutIntensity(4), 4);
  assert.equal(resolveWorkoutIntensity(7), 4);
  assert.deepEqual(HEATMAP_INTENSITY_COLORS, ["#033A16", "#196C2E", "#2EA043", "#56D364"]);
  assert.equal(HEATMAP_INACTIVE_COLOR, "#151B23");
});
