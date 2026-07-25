"use client";

import { useEffect, useRef, useState } from "react";
import { FaExternalLinkAlt, FaPause, FaPlay, FaRedo } from "react-icons/fa";
import type { Language } from "@/lib/i18n";
import { activateMusicAudio, releaseMusicAudio } from "@/lib/music-audio-manager";
import type { WorkoutMusic } from "@/lib/workout-types";

type MusicPlayerProps = {
  language: Language;
  music: WorkoutMusic;
  loadPreviewUrl: () => Promise<string | null>;
  compact?: boolean;
};

const playerCopy = {
  vi: {
    open: "Mở trên Deezer",
    pause: "Tạm dừng",
    play: "Nghe thử",
    retry: "Thử lại preview",
    unavailable: "Preview hiện không khả dụng.",
  },
  en: {
    open: "Open on Deezer",
    pause: "Pause",
    play: "Preview",
    retry: "Retry preview",
    unavailable: "The preview is currently unavailable.",
  },
} as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const rounded = Math.floor(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export function MusicPlayer(props: MusicPlayerProps) {
  return <MusicPlayerInstance key={props.music.trackId} {...props} />;
}

function MusicPlayerInstance({
  compact = false,
  language,
  loadPreviewUrl,
  music,
}: MusicPlayerProps) {
  const copy = playerCopy[language];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        releaseMusicAudio(audio);
      }
    };
  }, []);

  function connectAudio(url: string) {
    const audio = new Audio(url);
    audio.preload = "metadata";
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("durationchange", () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0),
    );
    audio.addEventListener("error", () => {
      setError(copy.unavailable);
      setIsPlaying(false);
    });
    audioRef.current = audio;
    return audio;
  }

  async function togglePlayback() {
    const existing = audioRef.current;
    if (existing && !existing.paused) {
      existing.pause();
      return;
    }

    setError("");
    if (existing?.src) {
      activateMusicAudio(existing);
      await existing.play().catch(() => setError(copy.unavailable));
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    try {
      const url = await loadPreviewUrl();
      if (requestId !== requestIdRef.current) return;
      if (!url) {
        setError(copy.unavailable);
        return;
      }
      const audio = connectAudio(url);
      activateMusicAudio(audio);
      await audio.play();
    } catch {
      if (requestId === requestIdRef.current) setError(copy.unavailable);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }

  function retry() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      releaseMusicAudio(audio);
    }
    setCurrentTime(0);
    setDuration(0);
    setError("");
    void togglePlayback();
  }

  return (
    <div
      className={`rounded-md border border-border bg-panel-muted ${compact ? "p-2.5" : "p-3"}`}
      data-testid="music-player"
    >
      <div className="flex min-w-0 items-center gap-3">
        {music.coverUrl ? (
          // biome-ignore lint/performance/noImgElement: Deezer artwork is an external snapshot URL.
          <img
            alt=""
            className={`${compact ? "h-11 w-11" : "h-14 w-14"} shrink-0 rounded object-cover`}
            src={music.coverUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className={`${compact ? "h-11 w-11" : "h-14 w-14"} grid shrink-0 place-items-center rounded bg-border text-lg text-muted`}
          >
            ♪
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{music.title}</p>
          <p className="truncate text-xs text-muted">
            {music.artistName}
            {music.albumTitle ? ` · ${music.albumTitle}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              aria-label={isPlaying ? copy.pause : copy.play}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs text-accent-contrast transition hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
              disabled={isLoading}
              onClick={() => void togglePlayback()}
              type="button"
            >
              {isLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPlaying ? (
                <FaPause aria-hidden="true" />
              ) : (
                <FaPlay aria-hidden="true" className="ml-0.5" />
              )}
            </button>
            <span className="w-9 font-mono text-[10px] text-muted">{formatTime(currentTime)}</span>
            <input
              aria-label={`${copy.play}: ${music.title}`}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent)]"
              max={duration || 30}
              min={0}
              onChange={(event) => {
                const nextTime = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
              step={0.1}
              type="range"
              value={Math.min(currentTime, duration || 30)}
            />
            <span className="w-9 text-right font-mono text-[10px] text-muted">
              {formatTime(duration || Math.min(music.durationSeconds ?? 30, 30))}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-0 sm:pl-[4.25rem]">
        {error ? (
          <p aria-live="polite" className="text-xs text-danger">
            {error}
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {error ? (
            <button
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              onClick={retry}
              type="button"
            >
              <FaRedo aria-hidden="true" className="h-2.5 w-2.5" />
              {copy.retry}
            </button>
          ) : null}
          <a
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            href={music.providerUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy.open}
            <FaExternalLinkAlt aria-hidden="true" className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
