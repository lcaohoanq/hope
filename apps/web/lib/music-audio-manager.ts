type ManagedAudio = {
  pause(): void;
};

let activeAudio: ManagedAudio | null = null;

/** Activate one preview globally and pause the previously active preview. */
export function activateMusicAudio(audio: ManagedAudio) {
  if (activeAudio && activeAudio !== audio) activeAudio.pause();
  activeAudio = audio;
}

export function releaseMusicAudio(audio: ManagedAudio) {
  if (activeAudio === audio) activeAudio = null;
}

export function resetMusicAudioManagerForTests() {
  activeAudio = null;
}
