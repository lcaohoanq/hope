import type { WorkoutMusic } from "@hope/shared";

const DEEZER_API_BASE_URL = "https://api.deezer.com";
const DEEZER_TIMEOUT_MS = 5_000;
const MAX_SEARCH_RESULTS = 10;

export type DeezerTrack = WorkoutMusic & {
  previewUrl?: string;
};

export class DeezerServiceError extends Error {
  constructor(
    message: string,
    readonly kind: "not-found" | "unavailable" = "unavailable",
  ) {
    super(message);
    this.name = "DeezerServiceError";
  }
}

type DeezerPayload = Record<string, unknown>;

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeHttpsUrl(value: unknown) {
  const candidate = nonEmptyString(value);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Normalize a Deezer payload and discard entries missing required metadata. */
export function normalizeDeezerTrack(value: unknown): DeezerTrack | undefined {
  if (!value || typeof value !== "object") return undefined;
  const payload = value as DeezerPayload;
  const rawId = payload.id;
  const trackId =
    typeof rawId === "number" && Number.isSafeInteger(rawId) && rawId > 0
      ? String(rawId)
      : typeof rawId === "string" && /^[1-9]\d{0,19}$/.test(rawId)
        ? rawId
        : undefined;
  const title = nonEmptyString(payload.title);
  const artist =
    payload.artist && typeof payload.artist === "object"
      ? (payload.artist as DeezerPayload)
      : undefined;
  const artistName = nonEmptyString(artist?.name);
  if (!trackId || !title || !artistName) return undefined;

  const album =
    payload.album && typeof payload.album === "object"
      ? (payload.album as DeezerPayload)
      : undefined;
  const duration =
    typeof payload.duration === "number" &&
    Number.isInteger(payload.duration) &&
    payload.duration >= 0
      ? payload.duration
      : undefined;

  return {
    provider: "deezer",
    trackId,
    title,
    artistName,
    albumTitle: nonEmptyString(album?.title),
    coverUrl:
      safeHttpsUrl(album?.cover_medium) ??
      safeHttpsUrl(album?.cover_big) ??
      safeHttpsUrl(album?.cover),
    providerUrl:
      safeHttpsUrl(payload.link) ?? `https://www.deezer.com/track/${encodeURIComponent(trackId)}`,
    durationSeconds: duration,
    previewUrl: safeHttpsUrl(payload.preview),
  };
}

async function requestDeezer(path: string, fetcher: typeof fetch = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEZER_TIMEOUT_MS);
  try {
    const response = await fetcher(`${DEEZER_API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new DeezerServiceError("Deezer is temporarily unavailable.");
    }
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      (payload as DeezerPayload).error
    ) {
      throw new DeezerServiceError("The Deezer track was not found.", "not-found");
    }
    return payload;
  } catch (error) {
    if (error instanceof DeezerServiceError) throw error;
    throw new DeezerServiceError("Deezer is temporarily unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchDeezerTracks(query: string, fetcher: typeof fetch = fetch) {
  const params = new URLSearchParams({ q: query, limit: String(MAX_SEARCH_RESULTS) });
  const payload = await requestDeezer(`/search?${params.toString()}`, fetcher);
  const data =
    payload && typeof payload === "object" && Array.isArray((payload as DeezerPayload).data)
      ? ((payload as DeezerPayload).data as unknown[])
      : [];
  return data
    .flatMap((item) => {
      const track = normalizeDeezerTrack(item);
      return track ? [track] : [];
    })
    .slice(0, MAX_SEARCH_RESULTS);
}

export async function getDeezerTrack(trackId: string, fetcher: typeof fetch = fetch) {
  const payload = await requestDeezer(`/track/${encodeURIComponent(trackId)}`, fetcher);
  const track = normalizeDeezerTrack(payload);
  if (!track) {
    throw new DeezerServiceError("The Deezer track was not found.", "not-found");
  }
  return track;
}

export function musicSnapshot(track: DeezerTrack): WorkoutMusic {
  const { previewUrl: _previewUrl, ...music } = track;
  return music;
}
