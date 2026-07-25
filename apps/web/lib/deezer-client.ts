import type { WorkoutMusic } from "@/lib/workout-types";

const DEEZER_API_BASE_URL = "https://api.deezer.com";
const MAX_SEARCH_RESULTS = 10;
const JSONP_TIMEOUT_MS = 8_000;

export type DeezerTrack = WorkoutMusic & {
  previewUrl?: string;
};

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

/**
 * Call Deezer from the browser via JSONP.
 * Deezer search is geo-restricted by caller IP and blocks CORS, so Workers
 * (cloud IPs) often get empty results while the user's browser works.
 */
type JsonpWindow = Window & Record<string, ((payload: unknown) => void) | undefined>;

function requestDeezerJsonp(path: string, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Deezer JSONP is only available in the browser."));
      return;
    }

    const callbackName = `__hopeDz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const script = document.createElement("script");
    const target = window as JsonpWindow;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      target[callbackName] = undefined;
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (payload: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    const timeoutId = window.setTimeout(() => {
      fail(new Error("Deezer request timed out."));
    }, JSONP_TIMEOUT_MS);

    const onAbort = () => {
      fail(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    target[callbackName] = (payload: unknown) => {
      signal?.removeEventListener("abort", onAbort);
      succeed(payload);
    };

    script.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      fail(new Error("Deezer is temporarily unavailable."));
    };

    const url = new URL(`${DEEZER_API_BASE_URL}${path}`);
    url.searchParams.set("output", "jsonp");
    url.searchParams.set("callback", callbackName);
    script.async = true;
    script.src = url.toString();
    document.documentElement.appendChild(script);
  });
}

export async function searchDeezerTracks(
  query: string,
  signal?: AbortSignal,
): Promise<DeezerTrack[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(MAX_SEARCH_RESULTS),
  });
  const payload = await requestDeezerJsonp(`/search?${params.toString()}`, signal);
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    (payload as DeezerPayload).error
  ) {
    return [];
  }
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

export async function getDeezerTrackPreviewUrl(
  trackId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const payload = await requestDeezerJsonp(`/track/${encodeURIComponent(trackId)}`, signal);
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    (payload as DeezerPayload).error
  ) {
    return null;
  }
  return normalizeDeezerTrack(payload)?.previewUrl ?? null;
}

export function musicSnapshot(track: DeezerTrack): WorkoutMusic {
  const { previewUrl: _previewUrl, ...music } = track;
  return music;
}
