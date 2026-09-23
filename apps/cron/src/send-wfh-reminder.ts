import { resolve } from "node:path";
import { createClerkClient } from "@clerk/backend";
import { listWfhReminderCandidates, markWfhReminderSent } from "@hope/core";
import { closeDatabase } from "@hope/db";
import { getTodayInTimezone } from "@hope/shared";
import nextEnv from "@next/env";
import { Resend } from "resend";

nextEnv.loadEnvConfig(resolve(process.cwd(), "../.."));

async function main() {
  const today = getTodayInTimezone();
  const pending = await listWfhReminderCandidates(today);
  if (process.env.REMINDER_DRY_RUN === "1") {
    console.log(`WFH dry run: ${pending.length} reminders due on ${today}.`);
    return;
  }
  if (!pending.length) return;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || !process.env.RESEND_API_KEY || !process.env.CLERK_SECRET_KEY)
    throw new Error("APP_URL, RESEND_API_KEY and CLERK_SECRET_KEY are required.");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const failures: string[] = [];
  for (const profile of pending) {
    try {
      if (!profile.clerkUserId) continue;
      const user = await clerk.users.getUser(profile.clerkUserId);
      const email = user.emailAddresses.find(
        (entry) => entry.id === user.primaryEmailAddressId,
      )?.emailAddress;
      if (!email) throw new Error("Primary email is missing.");
      const url = new URL(`/${profile.username}/wfh`, appUrl).toString();
      const vi = profile.preferredLanguage === "vi";
      const { error } = await resend.emails.send(
        {
          from: process.env.RESEND_FROM || "Hope <onboarding@resend.dev>",
          to: email,
          subject: vi ? "Hôm nay bạn có WFH không?" : "Did you WFH today?",
          text: vi
            ? `${today}: Ghi nhận WFH hoặc Văn phòng tại ${url}\nBạn có thể tắt nhắc nhở trong tab WFH.`
            : `${today}: Record WFH or Office at ${url}\nYou can turn off these reminders in your WFH tab.`,
        },
        { idempotencyKey: `wfh/${profile.id}/${today}` },
      );
      if (error) throw new Error(error.message);
      await markWfhReminderSent(profile.id, today);
      console.log(`WFH reminder sent for ${profile.id} on ${today}.`);
    } catch (error) {
      failures.push(`${profile.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
