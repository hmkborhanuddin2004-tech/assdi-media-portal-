import { z } from "zod";

export const CALENDAR_WINDOWS = ["tomorrow", "next_3_days", "next_7_days"] as const;
export type CalendarWindow = (typeof CALENDAR_WINDOWS)[number];

export const CALENDAR_WINDOW_LABELS: Record<
  CalendarWindow,
  { en: string; bn: string; daysCount: number }
> = {
  tomorrow: { en: "Tomorrow", bn: "আগামীকাল", daysCount: 1 },
  next_3_days: { en: "Next 3 Days", bn: "আগামী ৩ দিন", daysCount: 3 },
  next_7_days: { en: "Next 7 Days", bn: "আগামী ৭ দিন", daysCount: 7 },
};

export const calendarQuerySchema = z.object({
  window: z.enum(CALENDAR_WINDOWS).default("tomorrow"),
  refDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)")
    .optional(),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
