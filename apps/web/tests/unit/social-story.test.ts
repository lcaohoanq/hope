import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCoverCrop,
  canNativeShareSocialStory,
  formatSocialStoryDuration,
  getSocialStoryDisplayValues,
  getSocialStoryFilename,
  isSocialStoryTemplateId,
  SOCIAL_STORY_TEMPLATE_IDS,
  type SocialStoryInput,
  sanitizeSocialStoryFilenamePart,
  wrapSocialStoryText,
} from "@/lib/social-story";

const storyInput: SocialStoryInput = {
  image: {
    format: "jpg",
    height: 1600,
    sizeBytes: 128_000,
    src: "/apple-touch-icon.png",
    width: 1200,
  },
  language: "en",
  profile: {
    displayName: "Hope Runner",
    username: "hope.runner",
  },
  workout: {
    createdAt: "2026-07-21T02:00:00.000Z",
    date: "2026-07-21",
    durationMinutes: 75,
    endTime: "08:15",
    id: "story-workout",
    images: [],
    isPublic: true,
    note: "Morning miles with friends",
    startTime: "07:00",
    type: "Chạy Bộ / HIIT",
  },
};

test("exposes exactly the three fixed social story templates", () => {
  assert.deepEqual(SOCIAL_STORY_TEMPLATE_IDS, ["photo-first", "bold-stat", "editorial"]);
  assert.equal(isSocialStoryTemplateId("photo-first"), true);
  assert.equal(isSocialStoryTemplateId("unknown"), false);
});

test("localizes story dates and durations", () => {
  const english = getSocialStoryDisplayValues(storyInput);
  const vietnamese = getSocialStoryDisplayValues({ ...storyInput, language: "vi" });

  assert.match(english.date, /2026/);
  assert.match(vietnamese.date, /2026/);
  assert.equal(english.duration, "1 hr 15 min");
  assert.equal(vietnamese.duration, "1 giờ 15 phút");
  assert.equal(formatSocialStoryDuration(120, "en"), "2 hr");
  assert.equal(formatSocialStoryDuration(0, "vi"), "0 phút");
  assert.equal(english.username, "@hope.runner");
});

test("creates safe, descriptive PNG filenames", () => {
  assert.equal(sanitizeSocialStoryFilenamePart("  Chạy Bộ / HIIT  "), "chay-bo-hiit");
  assert.equal(
    getSocialStoryFilename(storyInput, "bold-stat"),
    "hope-2026-07-21-chay-bo-hiit-bold-stat.png",
  );
});

test("calculates centered cover crops for landscape and portrait sources", () => {
  assert.deepEqual(calculateCoverCrop(2000, 1000, 900, 1600), {
    height: 1000,
    width: 562.5,
    x: 718.75,
    y: 0,
  });

  const portrait = calculateCoverCrop(1000, 2000, 900, 1600);
  assert.equal(portrait.x, 0);
  assert.equal(portrait.width, 1000);
  assert.ok(Math.abs(portrait.y - 111.111_111_111_111_09) < 0.0001);
  assert.ok(Math.abs(portrait.height - 1777.777_777_777_777_8) < 0.0001);
});

test("wraps, splits, and truncates story text to fixed line limits", () => {
  const measure = (value: string) => value.length;

  assert.deepEqual(wrapSocialStoryText("one two three four", 7, 2, measure), ["one two", "three…"]);
  assert.deepEqual(wrapSocialStoryText("abcdefgh", 4, 2, measure), ["abcd", "efgh"]);
  assert.deepEqual(wrapSocialStoryText("abcdefghij", 4, 2, measure), ["abcd", "efg…"]);
});

test("detects native file sharing and rejects unsupported share surfaces", () => {
  const file = new File(["png"], "story.png", { type: "image/png" });
  const share = async () => undefined;

  assert.equal(
    canNativeShareSocialStory({ share, canShare: ({ files } = {}) => files?.[0] === file }, file),
    true,
  );
  assert.equal(canNativeShareSocialStory({ share, canShare: () => false }, file), false);
  assert.equal(canNativeShareSocialStory({ canShare: () => true }, file), false);
  assert.equal(
    canNativeShareSocialStory(
      {
        share,
        canShare: () => {
          throw new Error("blocked");
        },
      },
      file,
    ),
    false,
  );
});
