"use client";

import { getDeezerTrackPreviewUrl } from "@/lib/deezer-client";
import type { Language } from "@/lib/i18n";
import type { WorkoutMusic } from "@/lib/workout-types";
import { MusicPlayer } from "./MusicPlayer";

export function WorkoutMusicPlayer({
  language,
  music,
}: {
  language: Language;
  music: WorkoutMusic;
  /** Kept for call-site compatibility; preview is resolved client-side from trackId. */
  workoutId?: string;
}) {
  async function loadPreviewUrl() {
    if ("previewUrl" in music && typeof music.previewUrl === "string" && music.previewUrl) {
      return music.previewUrl;
    }
    if (!music.trackId) return null;
    return getDeezerTrackPreviewUrl(music.trackId);
  }

  return <MusicPlayer language={language} loadPreviewUrl={loadPreviewUrl} music={music} />;
}
