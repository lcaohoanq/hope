import { Resend } from "resend";

type SendReminderEmailOptions = {
  apiKey: string;
  to: string;
  from: string;
  today: string;
};

export async function sendReminderEmail({
  apiKey,
  to,
  from,
  today,
}: SendReminderEmailOptions) {
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Nhac tap hom nay",
    text: [
      `Hom nay (${today}) ban chua ghi nhan buoi tap nao.`,
      "",
      "Chi can van dong nhe 10-15 phut cung duoc.",
      "Mo app va ghi lai buoi tap hom nay nhe.",
    ].join("\n"),
    html: [
      `<p>Hom nay (${today}) ban chua ghi nhan buoi tap nao.</p>`,
      "<p>Chi can van dong nhe 10-15 phut cung duoc.<br />Mo app va ghi lai buoi tap hom nay nhe.</p>",
    ].join(""),
  });

  if (error) {
    throw new Error(error.message);
  }
}
