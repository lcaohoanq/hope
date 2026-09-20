import { getDatabase } from "@hope/db";
import {
  profiles,
  wfhAllowances,
  wfhRecords,
  wfhReminderDeliveries,
  wfhSettings,
} from "@hope/db/schema";
import {
  calculateWfhStats,
  getTodayInTimezone,
  isWfhDateInEmployment,
  isWfhReminderDue,
  isWfhWorkday,
  type WfhCheckIn,
  type WfhSettings,
} from "@hope/shared";
import { and, eq, gt, gte, lt, lte, or } from "drizzle-orm";

export async function getWfhSettings(profileId: string) {
  const [settings] = await getDatabase()
    .select()
    .from(wfhSettings)
    .where(eq(wfhSettings.profileId, profileId));
  return settings ?? null;
}

export async function saveWfhSettings(profileId: string, settings: WfhSettings) {
  return getDatabase().transaction(async (tx) => {
    await tx.select().from(profiles).where(eq(profiles.id, profileId)).for("update");
    const [outside] = await tx
      .select()
      .from(wfhRecords)
      .where(
        and(
          eq(wfhRecords.profileId, profileId),
          or(
            lt(wfhRecords.date, settings.startDate),
            settings.endDate ? gt(wfhRecords.date, settings.endDate) : undefined,
          ),
        ),
      )
      .limit(1);
    if (outside)
      throw new WfhValidationError("Clear records outside the new employment dates first.");
    await tx
      .insert(wfhSettings)
      .values({ profileId, ...settings })
      .onConflictDoUpdate({ target: wfhSettings.profileId, set: settings });
    return settings;
  });
}

export async function listWfhRecords(profileId: string, year: number) {
  return getDatabase()
    .select()
    .from(wfhRecords)
    .where(
      and(
        eq(wfhRecords.profileId, profileId),
        gte(wfhRecords.date, `${year}-01-01`),
        lte(wfhRecords.date, `${year}-12-31`),
      ),
    )
    .orderBy(wfhRecords.date);
}

export async function getWfhAllowance(profileId: string, year: number) {
  const [allowance] = await getDatabase()
    .select()
    .from(wfhAllowances)
    .where(and(eq(wfhAllowances.profileId, profileId), eq(wfhAllowances.year, year)));
  return { year, totalDays: allowance?.totalDays ?? 45 };
}

export async function saveWfhAllowance(
  profileId: string,
  allowance: { year: number; totalDays: number },
) {
  await getDatabase()
    .insert(wfhAllowances)
    .values({ profileId, ...allowance })
    .onConflictDoUpdate({
      target: [wfhAllowances.profileId, wfhAllowances.year],
      set: { totalDays: allowance.totalDays },
    });
  return allowance;
}

export async function getWfhStats(profileId: string, year: number) {
  const records = await listWfhRecords(profileId, year);
  const allowance = await getWfhAllowance(profileId, year);
  return calculateWfhStats(records, year, allowance.totalDays);
}

export class WfhValidationError extends Error {}

export async function saveWfhCheckIn(profileId: string, record: WfhCheckIn) {
  if (!isWfhWorkday(record.date))
    throw new WfhValidationError("Check-ins are only available Monday–Friday.");
  return getDatabase().transaction(async (tx) => {
    await tx.select().from(profiles).where(eq(profiles.id, profileId)).for("update");
    const [settings] = await tx
      .select()
      .from(wfhSettings)
      .where(eq(wfhSettings.profileId, profileId));
    if (
      !settings ||
      !isWfhDateInEmployment(record.date, settings) ||
      record.date > getTodayInTimezone()
    )
      throw new WfhValidationError("Choose a past or current date within your employment dates.");
    const [saved] = await tx
      .insert(wfhRecords)
      .values({ profileId, ...record })
      .onConflictDoUpdate({
        target: [wfhRecords.profileId, wfhRecords.date],
        set: { status: record.status, note: record.note, updatedAt: new Date() },
      })
      .returning();
    return saved;
  });
}

export async function clearWfhCheckIn(profileId: string, date: string) {
  await getDatabase()
    .delete(wfhRecords)
    .where(and(eq(wfhRecords.profileId, profileId), eq(wfhRecords.date, date)));
}

export async function listWfhReminderCandidates(today: string) {
  const rows = await getDatabase()
    .select({
      profile: profiles,
      settings: wfhSettings,
      record: wfhRecords,
      delivery: wfhReminderDeliveries,
    })
    .from(wfhSettings)
    .innerJoin(profiles, eq(profiles.id, wfhSettings.profileId))
    .leftJoin(wfhRecords, and(eq(wfhRecords.profileId, profiles.id), eq(wfhRecords.date, today)))
    .leftJoin(
      wfhReminderDeliveries,
      and(eq(wfhReminderDeliveries.profileId, profiles.id), eq(wfhReminderDeliveries.date, today)),
    )
    .where(eq(wfhSettings.reminderEnabled, true));
  return rows
    .filter((row) => !row.delivery && isWfhReminderDue(today, row.settings, Boolean(row.record)))
    .map((row) => row.profile);
}

export async function markWfhReminderSent(profileId: string, date: string) {
  await getDatabase()
    .insert(wfhReminderDeliveries)
    .values({ profileId, date })
    .onConflictDoNothing();
}
