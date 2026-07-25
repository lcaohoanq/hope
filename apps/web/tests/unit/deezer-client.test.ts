import assert from "node:assert/strict";
import test from "node:test";
import { musicSnapshot, normalizeDeezerTrack } from "../../lib/deezer-client";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    id: 132201196,
    title: "goosebumps",
    duration: 243,
    link: "https://www.deezer.com/track/132201196",
    preview: "https://cdnt-preview.dzcdn.net/preview.mp3",
    artist: { name: "Travis Scott" },
    album: {
      title: "Birds In The Trap Sing McKnight",
      cover_medium: "https://cdn-images.dzcdn.net/cover.jpg",
    },
    ...overrides,
  };
}

test("normalizes Deezer search hits used by the browser client", () => {
  const track = normalizeDeezerTrack(payload());
  assert.ok(track);
  assert.equal(track.trackId, "132201196");
  assert.equal(track.artistName, "Travis Scott");
  assert.equal(track.previewUrl, "https://cdnt-preview.dzcdn.net/preview.mp3");
  assert.equal("previewUrl" in musicSnapshot(track), false);
});

test("rejects malformed Deezer payloads", () => {
  assert.equal(normalizeDeezerTrack(payload({ id: "bad" })), undefined);
  assert.equal(normalizeDeezerTrack(payload({ artist: {} })), undefined);
});
