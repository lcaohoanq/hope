import { loadEnvConfig } from "@next/env";
import { getTodayInTimezone } from "@/lib/date-utils";
import { closeDatabase } from "@/lib/db";
import { listReminderProfiles } from "@/lib/repositories/profiles";
import { listWorkoutsByProfile } from "@/lib/repositories/workouts";
import { sendReminderEmail } from "@/lib/resend";

loadEnvConfig(process.cwd());

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_FROM = "Hope <onboarding@resend.dev>";

async function main() {
  const today = getTodayInTimezone(process.env.TIMEZONE || DEFAULT_TIMEZONE);
  const profiles = await listReminderProfiles();
  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerk = await clerkClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const pending = [] as Array<{ profile: (typeof profiles)[number]; email: string; appUrl?: string }>;

  for (const profile of profiles) {
    const workouts = await listWorkoutsByProfile(profile.id);
    if (workouts.some((workout) => workout.date === today)) continue;

    const clerkUser = await clerk.users.getUser(profile.clerkUserId!);
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;
    if (!primaryEmail) {
      console.warn(`Skipping ${profile.id}: Clerk primary email is missing.`);
      continue;
    }
    pending.push({
      profile,
      email: primaryEmail,
      appUrl: appUrl ? new URL(`/${profile.username}`, appUrl).toString() : undefined,
    });
  }

  if (pending.length === 0) {
    console.log(`No workout reminders are due on ${today}.`);
    return;
  }
  if (process.env.REMINDER_DRY_RUN === "1") {
    console.log(`Dry run: would remind ${pending.map(({ profile }) => profile.id).join(", ")} on ${today}.`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required to send reminder email.");
  const failures: string[] = [];
  for (const { profile, email, appUrl: profileUrl } of pending) {
    try {
      await sendReminderEmail({
        apiKey,
        to: email,
        from: process.env.RESEND_FROM || DEFAULT_FROM,
        today,
        appUrl: profileUrl,
        recipientName: profile.displayName,
      });
      console.log(`Reminder sent for ${today} to ${profile.id}.`);
    } catch (error) {
      failures.push(`${profile.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) throw new Error(`Failed reminder sends:\n${failures.join("\n")}`);
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    try {
      await closeDatabase();
    } catch (closeError) {
      console.error("Failed to close the database connection:", closeError);
    }
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
