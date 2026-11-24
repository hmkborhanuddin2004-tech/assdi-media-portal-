import { z } from "zod";
import type {
  StaffWorkCategory,
  ShootLocationType,
} from "@/lib/types/database";

export const STAFF_WORK_CATEGORIES: {
  value: StaffWorkCategory;
  labelEn: string;
  labelBn: string;
}[] = [
  {
    value: "daily_cinematography",
    labelEn: "Daily Cinematography",
    labelBn: "ডেইলি সিনেমাটোগ্রাফি",
  },
  {
    value: "video_editing",
    labelEn: "Video Editing",
    labelBn: "ভিডিও এডিটিং",
  },
  {
    value: "book_review",
    labelEn: "Book Review",
    labelBn: "বুক রিভিউ",
  },
  {
    value: "script_research",
    labelEn: "Script Research",
    labelBn: "স্ক্রিপ্ট রিসার্চ",
  },
  {
    value: "content_management",
    labelEn: "Content Management",
    labelBn: "কনটেন্ট ম্যানেজমেন্ট",
  },
];

export const SHOOT_LOCATION_TYPES: {
  value: ShootLocationType;
  labelEn: string;
  labelBn: string;
}[] = [
  {
    value: "indoor",
    labelEn: "Indoor",
    labelBn: "ইনডোর (Indoor)",
  },
  {
    value: "outdoor",
    labelEn: "Outdoor",
    labelBn: "আউটডোর (Outdoor)",
  },
];

/**
 * DB CHECK: hours_spent > 0 AND hours_spent <= 24
 */
export const hoursSpentSchema = z.coerce
  .number({
    invalid_type_error: "কাজের ঘণ্টা একটি সংখ্যা হতে হবে।",
  })
  .positive("কাজের ঘণ্টা ০ এর বেশি হতে হবে। (Violates hours_spent > 0)")
  .max(24, "কাজের ঘণ্টা সর্বোচ্চ ২৪ হতে পারে। (Violates hours_spent <= 24)");

/**
 * Permanent Staff Daily Worklog Schema
 * DB CHECK chk_staff_log_fields:
 * CHECK (log_role <> 'staff' OR work_category IS NOT NULL)
 */
export const staffDailyLogSchema = z.object({
  work_category: z.enum(
    [
      "daily_cinematography",
      "video_editing",
      "book_review",
      "script_research",
      "content_management",
    ],
    {
      required_error: "কাজের ক্যাটাগরি নির্বাচন করা আবশ্যক। (chk_staff_log_fields)",
      invalid_type_error: "সঠিক ক্যাটাগরি নির্বাচন করুন।",
    }
  ),
  hours_spent: hoursSpentSchema,
  task_id: z.string().trim().optional().nullable(),
  notes: z
    .string()
    .trim()
    .min(1, "কাজের বিবরণ বা সংক্ষিপ্ত সারাংশ আবশ্যক। (notes cannot be empty)"),
  log_date: z.string().optional(),
});

export type StaffDailyLogInput = z.infer<typeof staffDailyLogSchema>;

/**
 * Intern / Trainee Daily Worklog Schema
 * DB CHECK chk_intern_log_fields:
 * CHECK (log_role <> 'intern' OR (shoot_location_type IS NOT NULL AND raw_footage_uploaded IS NOT NULL))
 */
export const internDailyLogSchema = z.object({
  shoot_location_type: z.enum(["indoor", "outdoor"], {
    required_error: "শুটিং লোকেশন নির্বাচন করা আবশ্যক। (chk_intern_log_fields)",
    invalid_type_error: "ইনডোর বা আউটডোর নির্বাচন করুন।",
  }),
  raw_footage_uploaded: z.boolean({
    required_error:
      "র-ফুটেজ আপলোড স্ট্যাটাস আবশ্যক। (chk_intern_log_fields)",
  }),
  hours_spent: hoursSpentSchema,
  task_id: z.string().trim().optional().nullable(),
  notes: z
    .string()
    .trim()
    .min(1, "কাজের সংক্ষিপ্ত বিবরণ আবশ্যক। (notes cannot be empty)"),
  log_date: z.string().optional(),
});

export type InternDailyLogInput = z.infer<typeof internDailyLogSchema>;

/**
 * Query schema for daily logs filter and server-side pagination
 */
export const dailyLogQuerySchema = z.object({
  user_id: z.string().optional(),
  role: z.enum(["all", "staff", "intern"]).optional().default("all"),
  period: z
    .enum(["daily", "weekly", "monthly", "all"])
    .optional()
    .default("monthly"),
  refDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type DailyLogQueryInput = z.infer<typeof dailyLogQuerySchema>;

/**
 * Report Filter Schema for /admin/reports
 */
export const reportFilterSchema = z.object({
  user_id: z.string().optional(),
  role: z.enum(["all", "staff", "intern"]).optional().default("all"),
  period: z
    .enum(["daily", "weekly", "monthly", "all"])
    .optional()
    .default("monthly"),
  refDate: z.string().optional(),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
