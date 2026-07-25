import assert from "node:assert/strict";
import test from "node:test";
import { prepareWorkoutRequestData } from "../../components/dashboard/workout-api";

const baseInput = {
  date: "2026-07-25",
  type: "workout",
  note: "",
  isPublic: true,
};

test("includes a selected Deezer track id in create payloads", async () => {
  const prepared = await prepareWorkoutRequestData({
    ...baseInput,
    deezerTrackId: "3135556",
  });
  assert.equal(prepared.data.deezerTrackId, "3135556");
  assert.deepEqual(prepared.data.imagePublicIds, []);
});

test("preserves null as explicit music removal in update payloads", async () => {
  const prepared = await prepareWorkoutRequestData({
    ...baseInput,
    id: "workout-1",
    deezerTrackId: null,
  });
  assert.equal(prepared.data.deezerTrackId, null);
});
