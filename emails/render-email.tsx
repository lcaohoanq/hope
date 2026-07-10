import { render } from "@react-email/render";

import WorkoutReminderEmail, {
  getWorkoutReminderEmailText,
  workoutReminderEmailSubject,
  type WorkoutReminderEmailProps,
} from "./workout-reminder";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export async function renderWorkoutReminderEmail(
  props: WorkoutReminderEmailProps,
): Promise<RenderedEmail> {
  const html = await render(<WorkoutReminderEmail {...props} />, {
    pretty: true,
  });

  return {
    subject: workoutReminderEmailSubject,
    html,
    text: getWorkoutReminderEmailText(props),
  };
}
