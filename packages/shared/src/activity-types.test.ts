import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLeaderboardDateRange,
  parseLeaderboardPeriod,
  resolveActivityTypeSlug,
  scoreActivityByWeight,
  validateActivityTypeInput,
} from "./activity-types";

describe("activity scoring", () => {
  it("scores by weight only", () => {
    assert.equal(scoreActivityByWeight(3), 3);
    assert.equal(scoreActivityByWeight(2), 2);
    assert.equal(scoreActivityByWeight(1), 1);
    assert.equal(scoreActivityByWeight(0), 0);
  });

  it("maps unknown types to other when available", () => {
    assert.equal(resolveActivityTypeSlug("Workout", ["workout", "study", "other"]), "workout");
    assert.equal(resolveActivityTypeSlug("yoga", ["workout", "study", "other"]), "other");
  });

  it("parses leaderboard periods", () => {
    assert.equal(parseLeaderboardPeriod("weekly"), "weekly");
    assert.equal(parseLeaderboardPeriod("monthly"), "monthly");
    assert.equal(parseLeaderboardPeriod("all-time"), "all-time");
    assert.equal(parseLeaderboardPeriod("daily"), null);
  });

  it("builds weekly and monthly ranges", () => {
    const weekly = getLeaderboardDateRange("weekly", "2026-07-21");
    assert.equal(weekly.start, "2026-07-20");
    assert.equal(weekly.end, "2026-07-21");

    const monthly = getLeaderboardDateRange("monthly", "2026-07-21");
    assert.equal(monthly.start, "2026-07-01");
    assert.equal(monthly.end, "2026-07-21");

    const allTime = getLeaderboardDateRange("all-time", "2026-07-21");
    assert.equal(allTime.start, null);
    assert.equal(allTime.end, "2026-07-21");
  });

  it("validates activity type create input", () => {
    const ok = validateActivityTypeInput(
      {
        slug: "Reading",
        label: { en: "Reading", vi: "Đọc sách" },
        weight: 2,
      },
      { requireSlug: true },
    );
    assert.equal(ok.success, true);
    if (ok.success) {
      assert.equal(ok.input.slug, "reading");
      assert.equal(ok.input.weight, 2);
    }

    const bad = validateActivityTypeInput(
      { slug: "1bad", label: { en: "X", vi: "Y" }, weight: 1 },
      { requireSlug: true },
    );
    assert.equal(bad.success, false);
  });
});
