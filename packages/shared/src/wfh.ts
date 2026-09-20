import { z } from "zod";

export function isWfhWorkday(date: string) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export const wfhDateSchema = z.iso
  .date()
  .refine((date) => date >= "1900-01-01" && date <= "9998-12-31", "Date is out of range.");
export const wfhYearSchema = z.coerce.number().int().min(1900).max(9998);
export const wfhSettingsSchema = z
  .object({
    startDate: wfhDateSchema,
    endDate: wfhDateSchema.nullable(),
    reminderEnabled: z.boolean(),
  })
  .refine(
    (value) => !value.endDate || value.endDate >= value.startDate,
    "Last working day must follow the start date.",
  );
export const wfhCheckInSchema = z.object({
  date: wfhDateSchema.refine(isWfhWorkday, "Check-ins are only available Monday–Friday."),
  status: z.enum(["WFH", "OFFICE"]),
  note: z.string().trim().max(2000).default(""),
});
export const wfhAllowanceSchema = z.object({
  year: wfhYearSchema,
  totalDays: z.number().int().min(0).max(366),
});
export type WfhSettings = z.infer<typeof wfhSettingsSchema>;
export type WfhCheckIn = z.infer<typeof wfhCheckInSchema>;

export function isWfhDateInEmployment(date: string, settings: WfhSettings) {
  return date >= settings.startDate && (!settings.endDate || date <= settings.endDate);
}

export function calculateWfhStats(
  records: Pick<WfhCheckIn, "date" | "status">[],
  year: number,
  totalDays = 45,
) {
  const annual = records.filter(
    (record) => record.date.startsWith(`${year}-`) && isWfhWorkday(record.date),
  );
  const used = annual.filter((record) => record.status === "WFH").length;
  return {
    year,
    totalDays,
    used,
    remaining: Math.max(0, totalDays - used),
    overAllowance: Math.max(0, used - totalDays),
    rate: annual.length ? used / annual.length : null,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function isWfhReminderDue(date: string, settings: WfhSettings, recorded: boolean) {
  return (
    settings.reminderEnabled &&
    !recorded &&
    isWfhWorkday(date) &&
    isWfhDateInEmployment(date, settings)
  );
}
