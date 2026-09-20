import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateWfhStats,
  isWfhDateInEmployment,
  isWfhReminderDue,
  isWfhWorkday,
  wfhCheckInSchema,
  wfhSettingsSchema,
} from "./wfh";

test("annual allowance counts only WFH and resets without prorating", () => {
  const records = [6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21].map((day) => ({
    date: `2026-08-${String(day).padStart(2, "0")}`,
    status: "WFH" as const,
  }));
  const stats = calculateWfhStats([...records, { date: "2026-08-24", status: "OFFICE" }], 2026);
  assert.equal(stats.remaining, 33);
  assert.equal(stats.rate, 12 / 13);
  assert.equal(calculateWfhStats(records, 2027).remaining, 45);
  assert.equal(calculateWfhStats([], 2027).rate, null);
  assert.equal(calculateWfhStats(records, 2026, 10).overAllowance, 2);
  assert.equal(calculateWfhStats(records, 2026, 10).remaining, 0);
});

test("weekend check-ins are rejected and legacy weekend records do not affect stats", () => {
  for (const date of ["2026-09-19", "2026-09-20"]) {
    assert.equal(isWfhWorkday(date), false);
    for (const status of ["WFH", "OFFICE"])
      assert.equal(wfhCheckInSchema.safeParse({ date, status }).success, false);
  }
  for (const date of ["2026-09-18", "2026-09-21"])
    assert.equal(wfhCheckInSchema.safeParse({ date, status: "WFH" }).success, true);
  const stats = calculateWfhStats(
    [
      { date: "2026-09-18", status: "WFH" },
      { date: "2026-09-19", status: "WFH" },
      { date: "2026-09-20", status: "OFFICE" },
    ],
    2026,
  );
  assert.equal(stats.used, 1);
  assert.equal(stats.remaining, 44);
  assert.equal(stats.rate, 1);
});

const settings = { startDate: "2026-08-06", endDate: "2027-02-28", reminderEnabled: true };
test("employment dates are inclusive and separate from quota", () => {
  assert.equal(isWfhDateInEmployment("2026-08-05", settings), false);
  assert.equal(isWfhDateInEmployment("2026-08-06", settings), true);
  assert.equal(isWfhDateInEmployment("2027-02-28", settings), true);
  assert.equal(isWfhDateInEmployment("2027-03-01", settings), false);
});
test("reminders exclude weekends, recorded dates, opt-outs and nonemployment", () => {
  assert.equal(isWfhReminderDue("2026-09-21", settings, false), true);
  assert.equal(isWfhReminderDue("2026-09-20", settings, false), false);
  assert.equal(isWfhReminderDue("2026-09-21", settings, true), false);
  assert.equal(
    isWfhReminderDue("2026-09-21", { ...settings, reminderEnabled: false }, false),
    false,
  );
  assert.equal(isWfhReminderDue("2027-03-01", settings, false), false);
});
test("validation rejects impossible dates and reversed employment", () => {
  assert.equal(wfhCheckInSchema.safeParse({ date: "2026-02-29", status: "WFH" }).success, false);
  assert.equal(wfhCheckInSchema.safeParse({ date: "2028-02-29", status: "WFH" }).success, true);
  assert.equal(wfhSettingsSchema.safeParse({ ...settings, endDate: "2026-01-01" }).success, false);
});
