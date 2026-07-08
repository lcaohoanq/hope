import { promises as fs } from "node:fs";
import path from "node:path";
import { getTodayInTimezone } from "@/lib/date-utils";
import { sendReminderEmail } from "@/lib/resend";
import type { WorkoutData } from "@/lib/workout-types";
import { validateWorkoutData } from "@/lib/workout-utils";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_FROM = "Hope <onboarding@resend.dev>";

async function readWorkoutData() {
  const dataPath = process.env.WORKOUT_DATA_PATH || "data/workouts.json";
  const fullPath = path.isAbsolute(dataPath)
    ? dataPath
    : path.join(process.cwd(), dataPath);
  const raw = await fs.readFile(fullPath, "utf8");

  return validateWorkoutData(JSON.parse(raw)) as WorkoutData;
}

async function main() {
  const timezone = process.env.TIMEZONE || DEFAULT_TIMEZONE;
  const today = getTodayInTimezone(timezone);
  const data = await readWorkoutData();
  const hasWorkoutToday = data.workouts.some((workout) => workout.date === today);

  if (hasWorkoutToday) {
    console.log(`Workout already logged for ${today}; no reminder sent.`);
    return;
  }

  if (process.env.REMINDER_DRY_RUN === "1") {
    console.log(`Dry run: would send workout reminder for ${today}.`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REMINDER_EMAIL;
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send reminder email.");
  }

  if (!to) {
    throw new Error("REMINDER_EMAIL is required to send reminder email.");
  }

  await sendReminderEmail({
    apiKey,
    to,
    from,
    today,
  });

  console.log(`Reminder sent for ${today}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
