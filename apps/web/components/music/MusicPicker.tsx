"use client";

import { useEffect, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import {
  type DeezerTrack,
  getDeezerTrackPreviewUrl,
  searchDeezerTracks,
} from "@/lib/deezer-client";
import type { Language } from "@/lib/i18n";
import type { WorkoutMusic } from "@/lib/workout-types";
import { MusicPlayer } from "./MusicPlayer";

const pickerCopy = {
  vi: {
    album: "Album",
    empty: "Không tìm thấy bài phù hợp.",
    error: "Chưa thể tìm trên Deezer. Vui lòng thử lại.",
    help: "Tùy chọn · tối đa một bài",
    label: "Nhạc",
    loading: "Đang tìm...",
    placeholder: "Tìm bài hát hoặc nghệ sĩ",
    remove: "Gỡ nhạc",
    results: "Kết quả Deezer",
    selected: "Bài đã chọn",
  },
  en: {
    album: "Album",
    empty: "No matching tracks found.",
    error: "Unable to search Deezer. Please try again.",
    help: "Optional · one track maximum",
    label: "Music",
    loading: "Searching...",
    placeholder: "Search songs or artists",
    remove: "Remove music",
    results: "Deezer results",
    selected: "Selected track",
  },
} as const;

export function MusicPicker({
  disabled = false,
  language,
  onChange,
  selected,
}: {
  disabled?: boolean;
  language: Language;
  onChange: (track: WorkoutMusic | null) => void;
  selected: WorkoutMusic | null;
  /** Kept for call-site compatibility; preview is resolved client-side from trackId. */
  workoutId?: string;
}) {
  const copy = pickerCopy[language];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const trimmedQuery = query.trim();

  async function loadSelectedPreview() {
    if (
      selected &&
      "previewUrl" in selected &&
      typeof selected.previewUrl === "string" &&
      selected.previewUrl
    ) {
      return selected.previewUrl;
    }
    if (!selected?.trackId) return null;
    return getDeezerTrackPreviewUrl(selected.trackId);
  }

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const tracks = await searchDeezerTracks(trimmedQuery, controller.signal);
        if (controller.signal.aborted) return;
        setResults(tracks);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setResults([]);
        setError(copy.error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [copy.error, trimmedQuery]);

  return (
    <section className="grid gap-2" data-testid="music-picker">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text">{copy.label}</p>
          {/* <p className="mt-0.5 text-xs text-muted">{copy.help}</p> */}
        </div>
        {selected ? (
          <button
            className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => onChange(null)}
            type="button"
          >
            <FaTimes aria-hidden="true" className="h-2.5 w-2.5" />
            {copy.remove}
          </button>
        ) : null}
      </div>

      {selected ? (
        <MusicPlayer
          compact
          language={language}
          loadPreviewUrl={loadSelectedPreview}
          music={selected}
        />
      ) : null}

      <label className="relative block">
        <span className="sr-only">{copy.placeholder}</span>
        <FaSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        />
        <input
          className="h-10 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm text-text outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.placeholder}
          type="search"
          value={query}
        />
      </label>

      {isLoading ? (
        <p aria-live="polite" className="text-xs text-muted">
          {copy.loading}
        </p>
      ) : error ? (
        <p aria-live="polite" className="text-xs text-danger">
          {error}
        </p>
      ) : trimmedQuery.length >= 2 && results.length === 0 ? (
        <p className="text-xs text-muted">{copy.empty}</p>
      ) : null}

      {results.length > 0 ? (
        <ul aria-label={copy.results} className="grid max-h-64 gap-1 overflow-y-auto">
          {results.map((track) => (
            <li key={track.trackId}>
              <button
                aria-pressed={selected?.trackId === track.trackId}
                className="flex w-full min-w-0 items-center gap-3 rounded-md border border-transparent p-2 text-left transition hover:border-border hover:bg-panel-muted disabled:opacity-60"
                disabled={disabled}
                onClick={() => {
                  // Keep previewUrl in memory for instant play; only trackId is persisted.
                  onChange(track);
                  setQuery("");
                  setResults([]);
                }}
                type="button"
              >
                {track.coverUrl ? (
                  // biome-ignore lint/performance/noImgElement: Deezer artwork is an external result URL.
                  <img
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                    src={track.coverUrl}
                  />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-border">
                    ♪
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text">
                    {track.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {track.artistName}
                    {track.albumTitle ? ` · ${track.albumTitle}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
