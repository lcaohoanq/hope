import assert from "node:assert/strict";
import test from "node:test";
import {
  DeezerServiceError,
  getDeezerTrack,
  normalizeDeezerTrack,
  searchDeezerTracks,
} from "./deezer";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    id: 3135556,
    title: "Harder, Better, Faster, Stronger",
    duration: 224,
    link: "https://www.deezer.com/track/3135556",
    preview: "https://cdn-preview.example/track.mp3",
    artist: { name: "Daft Punk" },
    album: {
      title: "Discovery",
      cover_medium: "https://cdn-images.example/cover.jpg",
    },
    ...overrides,
  };
}

function jsonFetcher(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

test("normalizes official metadata without requiring a preview URL", () => {
  const track = normalizeDeezerTrack(payload({ preview: "" }));
  assert.equal(track?.trackId, "3135556");
  assert.equal(track?.artistName, "Daft Punk");
  assert.equal(track?.albumTitle, "Discovery");
  assert.equal(track?.previewUrl, undefined);
});

test("search caps normalized results at ten and ignores malformed entries", async () => {
  const data = [
    payload({ id: "bad" }),
    ...Array.from({ length: 12 }, (_, i) => payload({ id: i + 1 })),
  ];
  const tracks = await searchDeezerTracks("daft punk", jsonFetcher({ data }));
  assert.equal(tracks.length, 10);
  assert.equal(tracks[0]?.trackId, "1");
});

test("maps Deezer API errors to a safe service error", async () => {
  await assert.rejects(
    () => getDeezerTrack("3135556", jsonFetcher({ error: { message: "raw provider detail" } })),
    (error) =>
      error instanceof DeezerServiceError &&
      error.kind === "not-found" &&
      !error.message.includes("raw provider detail"),
  );
});
