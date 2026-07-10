import { promises as fs } from "node:fs";
import path from "node:path";
import { getTodayInTimezone } from "@/lib/date-utils";
import { sendReminderEmail } from "@/lib/resend";
import { APP_USERS, isWorkoutVisibleForUser } from "@/lib/users";
import type { WorkoutData } from "@/lib/workout-types";
import { validateWorkoutData } from "@/lib/workout-utils";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_FROM = "Hope <onboarding@resend.dev>";
const REMINDER_RECIPIENTS = [
  {
    userId: "hoang",
    email: "hoangclw@gmail.com",
  },
  {
    userId: "test",
    email: "mitokuhoang@gmail.com",
  },
  {
    userId: "linh",
    email: "linh@example.com",
  },
] as const;

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const recipients = REMINDER_RECIPIENTS.map((recipient) => {
    const user = APP_USERS.find((appUser) => appUser.id === recipient.userId);

    if (!user) {
      throw new Error(`Unknown reminder user: ${recipient.userId}`);
    }

    return {
      ...recipient,
      user,
      appUrl: appUrl ? new URL(user.slug, appUrl).toString() : undefined,
    };
  });
  const pendingRecipients = recipients.filter(
    ({ user }) =>
      !data.workouts.some(
        (workout) =>
          workout.date === today && isWorkoutVisibleForUser(workout, user.id),
      ),
  );

  if (pendingRecipients.length === 0) {
    console.log(`Workouts already logged for all users on ${today}; no reminder sent.`);
    return;
  }

  if (process.env.REMINDER_DRY_RUN === "1") {
    const summary = pendingRecipients
      .map(({ user, email }) => `${user.id} <${email}>`)
      .join(", ");
    console.log(`Dry run: would send workout reminders for ${today} to ${summary}.`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send reminder email.");
  }

  const failures: string[] = [];

  for (const { user, email, appUrl: userAppUrl } of pendingRecipients) {
    try {
      await sendReminderEmail({
        apiKey,
        to: email,
        from,
        today,
        appUrl: userAppUrl,
        recipientName: user.displayName,
      });

      console.log(`Reminder sent for ${today} to ${user.id} <${email}>.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${user.id} <${email}>: ${message}`);
      console.error(`Failed to send reminder for ${user.id} <${email}>: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed reminder sends:\n${failures.join("\n")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
