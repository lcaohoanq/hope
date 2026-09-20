import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { closeDatabase, getDatabase } from "@hope/db";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import {
  clearWfhCheckIn,
  getWfhStats,
  listWfhRecords,
  listWfhReminderCandidates,
  markWfhReminderSent,
  saveWfhAllowance,
  saveWfhCheckIn,
  saveWfhSettings,
} from "./wfh";

test("WFH migrations, isolation, corrections, limits and reminder deduplication", {
  skip: !process.env.WFH_TEST_DATABASE_URL,
}, async () => {
  const connectionString = process.env.WFH_TEST_DATABASE_URL;
  assert.ok(connectionString);
  const url = new URL(connectionString);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/hope_wfh_test");
  process.env.DATABASE_URL = url.toString();
  try {
    const db = getDatabase();
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../../../db/drizzle", import.meta.url)),
    });
    for (const id of ["wfh-test-owner", "wfh-test-other"]) {
      await db.execute(
        sql`insert into profiles (id, username, display_name, birth_year, avatar_seed, bio, settings) values (${id}, ${id}, 'WFH test', 1990, 'test', '{}', '{}') on conflict do nothing`,
      );
    }
    const owner = "wfh-test-owner";
    await saveWfhSettings(owner, {
      startDate: "2020-08-06",
      endDate: "2021-02-28",
      reminderEnabled: true,
    });
    const record = { date: "2020-08-06", status: "WFH" as const, note: "Home" };
    await Promise.all([saveWfhCheckIn(owner, record), saveWfhCheckIn(owner, record)]);
    assert.equal((await listWfhRecords(owner, 2020)).length, 1);
    assert.equal((await listWfhRecords("wfh-test-other", 2020)).length, 0);
    assert.equal((await getWfhStats(owner, 2020)).remaining, 44);
    assert.equal((await getWfhStats(owner, 2021)).remaining, 45);
    await clearWfhCheckIn("wfh-test-other", record.date);
    assert.equal((await listWfhRecords(owner, 2020)).length, 1);
    await saveWfhCheckIn(owner, { ...record, status: "OFFICE", note: "Corrected" });
    assert.equal((await getWfhStats(owner, 2020)).remaining, 45);
    assert.equal((await listWfhRecords(owner, 2020))[0].note, "Corrected");
    await assert.rejects(saveWfhCheckIn(owner, { ...record, date: "2020-08-05" }));
    await assert.rejects(saveWfhCheckIn(owner, { ...record, date: "2020-08-08" }), /Monday–Friday/);
    await assert.rejects(
      saveWfhCheckIn(owner, { ...record, date: "2020-08-09", status: "OFFICE" }),
      /Monday–Friday/,
    );
    await assert.rejects(saveWfhCheckIn(owner, { ...record, date: "2021-03-01" }));
    await assert.rejects(
      saveWfhSettings(owner, { startDate: "2020-08-07", endDate: null, reminderEnabled: true }),
    );
    await saveWfhSettings(owner, { startDate: "2020-08-06", endDate: null, reminderEnabled: true });
    await assert.rejects(saveWfhCheckIn(owner, { ...record, date: "9998-01-01" }));
    await saveWfhAllowance(owner, { year: 2020, totalDays: 0 });
    await saveWfhCheckIn(owner, record);
    assert.equal((await getWfhStats(owner, 2020)).overAllowance, 1);
    await clearWfhCheckIn(owner, record.date);
    assert.equal((await listWfhRecords(owner, 2020)).length, 0);
    assert.equal(
      (await listWfhReminderCandidates("2020-08-06")).some((p) => p.id === owner),
      true,
    );
    await markWfhReminderSent(owner, "2020-08-06");
    await markWfhReminderSent(owner, "2020-08-06");
    assert.equal(
      (await listWfhReminderCandidates("2020-08-06")).some((p) => p.id === owner),
      false,
    );
    const security = await db.execute(
      sql`select relname from pg_class where relname like 'wfh_%' and relkind = 'r' and relrowsecurity`,
    );
    assert.equal(security.length, 4);
    await db.execute(sql`delete from profiles where id in ('wfh-test-owner', 'wfh-test-other')`);
  } finally {
    await closeDatabase();
  }
});
