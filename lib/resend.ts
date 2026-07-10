import { Resend } from "resend";

import { renderWorkoutReminderEmail } from "@/emails/render-email";

type SendReminderEmailOptions = {
  apiKey: string;
  to: string;
  from: string;
  today: string;
  appUrl?: string;
  recipientName?: string;
};

export async function sendReminderEmail({
  apiKey,
  to,
  from,
  today,
  appUrl,
  recipientName,
}: SendReminderEmailOptions) {
  const resend = new Resend(apiKey);
  const email = await renderWorkoutReminderEmail({
    today,
    appUrl,
    recipientName,
  });

  const { error } = await resend.emails.send({
    from,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
