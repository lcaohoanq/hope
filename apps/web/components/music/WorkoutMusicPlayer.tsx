"use client";

import { useAuth } from "@clerk/nextjs";
import type { Language } from "@/lib/i18n";
import type { WorkoutMusic } from "@/lib/workout-types";
import { MusicPlayer } from "./MusicPlayer";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export function WorkoutMusicPlayer({
  language,
  music,
  workoutId,
}: {
  language: Language;
  music: WorkoutMusic;
  workoutId: string;
}) {
  const { getToken } = useAuth();

  async function loadPreviewUrl() {
    const token = await getToken();
    const response = await fetch(
      `${API_URL}/workouts/${encodeURIComponent(workoutId)}/music-preview`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    );
    const payload = (await response.json()) as { previewUrl?: string | null; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Preview unavailable");
    return payload.previewUrl ?? null;
  }

  return <MusicPlayer language={language} loadPreviewUrl={loadPreviewUrl} music={music} />;
}
