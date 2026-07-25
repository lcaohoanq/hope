import assert from "node:assert/strict";
import test from "node:test";
import {
  activateMusicAudio,
  releaseMusicAudio,
  resetMusicAudioManagerForTests,
} from "../../lib/music-audio-manager";

test("starting a music preview pauses the previously active preview", () => {
  resetMusicAudioManagerForTests();
  let firstPauseCount = 0;
  let secondPauseCount = 0;
  const first = { pause: () => firstPauseCount++ };
  const second = { pause: () => secondPauseCount++ };

  activateMusicAudio(first);
  activateMusicAudio(first);
  assert.equal(firstPauseCount, 0);

  activateMusicAudio(second);
  assert.equal(firstPauseCount, 1);
  assert.equal(secondPauseCount, 0);

  releaseMusicAudio(second);
  activateMusicAudio(first);
  assert.equal(secondPauseCount, 0);
});
