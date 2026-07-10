import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type WorkoutReminderEmailProps = {
  today: string;
  appUrl?: string;
  recipientName?: string;
};

export const workoutReminderEmailSubject = "Nhắc tập hôm nay";

const previewText = "Một lời nhắc nhẹ để giữ nhịp vận động hôm nay.";

export function getWorkoutReminderEmailText({
  today,
  appUrl,
  recipientName,
}: WorkoutReminderEmailProps) {
  const greeting = recipientName ? `Chào ${recipientName},` : "Chào bạn,";

  return [
    greeting,
    "",
    `Hôm nay (${today}) bạn chưa ghi nhận buổi tập nào.`,
    "Chỉ cần vận động nhẹ 10-15 phút cũng được. Quan trọng là giữ nhịp.",
    "",
    appUrl ? `Mở Hope để ghi lại buổi tập: ${appUrl}` : "Mở Hope và ghi lại buổi tập hôm nay nhé.",
  ].join("\n");
}

export const WorkoutReminderEmail = ({
  today,
  appUrl,
  recipientName,
}: WorkoutReminderEmailProps) => {
  const greeting = recipientName ? `Chào ${recipientName},` : "Chào bạn,";

  return (
    <Html lang="vi">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.brandRow}>
            <Text style={styles.brand}>Hope</Text>
            <Text style={styles.date}>{today}</Text>
          </Section>

          <Section style={styles.hero}>
            <Text style={styles.kicker}>Workout reminder</Text>
            <Heading style={styles.heading}>Đừng để hôm nay trôi qua trống nhé.</Heading>
            <Text style={styles.copy}>
              {greeting} hôm nay bạn chưa ghi nhận buổi tập nào. Một buổi ngắn cũng đủ để giữ
              lời hứa với bản thân.
            </Text>
          </Section>

          <Section style={styles.panel}>
            <Text style={styles.panelTitle}>Gợi ý nhanh</Text>
            <Text style={styles.panelCopy}>
              Đi bộ 10 phút, giãn cơ nhẹ, hoặc một vòng bodyweight đơn giản. Hoàn thành rồi
              mở Hope để lưu lại nhịp hôm nay.
            </Text>
          </Section>

          {appUrl ? (
            <Section style={styles.action}>
              <Button href={appUrl} style={styles.button}>
                Ghi lại buổi tập
              </Button>
            </Section>
          ) : null}

          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Email này được gửi tự động vì Hope chưa thấy workout nào cho ngày {today}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

WorkoutReminderEmail.PreviewProps = {
  today: "2026-07-10",
  appUrl: "https://hope.local",
} satisfies WorkoutReminderEmailProps;

export default WorkoutReminderEmail;

const styles = {
  body: {
    margin: "0",
    backgroundColor: "#f4f0e8",
    color: "#201c18",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    padding: "32px 20px",
  },
  brandRow: {
    padding: "0 0 18px",
  },
  brand: {
    display: "inline-block",
    margin: "0",
    color: "#201c18",
    fontSize: "20px",
    fontWeight: "800",
    lineHeight: "28px",
  },
  date: {
    display: "inline-block",
    float: "right" as const,
    margin: "4px 0 0",
    color: "#756b5f",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: "20px",
  },
  hero: {
    backgroundColor: "#fffaf2",
    border: "1px solid #e3d8c8",
    borderRadius: "18px",
    padding: "34px 30px",
  },
  kicker: {
    margin: "0 0 12px",
    color: "#b45f2a",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.8px",
    lineHeight: "18px",
    textTransform: "uppercase" as const,
  },
  heading: {
    margin: "0 0 16px",
    color: "#201c18",
    fontSize: "32px",
    fontWeight: "800",
    lineHeight: "38px",
  },
  copy: {
    margin: "0",
    color: "#4f463d",
    fontSize: "16px",
    lineHeight: "26px",
  },
  panel: {
    marginTop: "16px",
    backgroundColor: "#25362f",
    borderRadius: "16px",
    padding: "22px 24px",
  },
  panelTitle: {
    margin: "0 0 8px",
    color: "#f8f0e4",
    fontSize: "14px",
    fontWeight: "800",
    lineHeight: "20px",
  },
  panelCopy: {
    margin: "0",
    color: "#d8e2d5",
    fontSize: "15px",
    lineHeight: "24px",
  },
  action: {
    padding: "24px 0 10px",
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: "#d66f2f",
    borderRadius: "999px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "800",
    lineHeight: "22px",
    padding: "13px 22px",
    textDecoration: "none",
  },
  hr: {
    borderColor: "#ded2c3",
    margin: "24px 0 14px",
  },
  footer: {
    margin: "0",
    color: "#756b5f",
    fontSize: "12px",
    lineHeight: "20px",
    textAlign: "center" as const,
  },
};
