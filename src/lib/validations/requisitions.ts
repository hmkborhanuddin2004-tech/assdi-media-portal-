import { z } from "zod";
import { parseISO, startOfDay, addDays, format } from "date-fns";
import type { ProgramType, FramingType, UserRole } from "@/lib/types/database";

export const PROGRAM_TYPES: [ProgramType, ...ProgramType[]] = [
  "orientation",
  "final_exam",
  "workshop",
  "documentary",
  "visitor_reel",
  "promotional_video",
];

export const PROGRAM_TYPE_LABELS: Record<ProgramType, { en: string; bn: string; major: boolean }> = {
  orientation: { en: "Orientation", bn: "অরিয়েন্টেশন", major: true },
  final_exam: { en: "Final Exam", bn: "চূড়ান্ত পরীক্ষা", major: true },
  workshop: { en: "Workshop", bn: "ওয়ার্কশপ", major: false },
  documentary: { en: "Documentary", bn: "ডকুমেন্টারি", major: true },
  visitor_reel: { en: "Visitor Reel", bn: "ভিজিটর রিল", major: false },
  promotional_video: { en: "Promotional Video", bn: "প্রমোশনাল ভিডিও", major: false },
};

export const FORMAT_DURATIONS = ["30-40s Reel", "3-5m Documentary"] as const;

export const FRAMING_TYPES: [FramingType, ...FramingType[]] = [
  "vertical_9_16",
  "horizontal_16_9",
];

export const FRAMING_LABELS: Record<FramingType, string> = {
  vertical_9_16: "Vertical 9:16",
  horizontal_16_9: "Horizontal 16:9",
};

/**
 * Returns current date string (YYYY-MM-DD) in Asia/Dhaka time zone.
 * Matches PostgreSQL: `(NOW() AT TIME ZONE 'Asia/Dhaka')::date`
 */
export function getDhakaTodayString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Lead days rule:
 * Major events (orientation, final_exam, documentary) require >= 7 full days notice.
 * Routine shoots (workshop, visitor_reel, promotional_video) require >= 3 full days notice.
 */
export function getRequiredLeadDays(programType: ProgramType): number {
  if (
    programType === "orientation" ||
    programType === "final_exam" ||
    programType === "documentary"
  ) {
    return 7;
  }
  return 3;
}

/**
 * Calculates earliest allowed shoot date in Asia/Dhaka time zone.
 */
export function getEarliestAllowedDateString(
  programType: ProgramType,
  todayStr: string = getDhakaTodayString()
): string {
  const leadDays = getRequiredLeadDays(programType);
  const baseDate = parseISO(todayStr);
  const earliestDate = addDays(startOfDay(baseDate), leadDays);
  return format(earliestDate, "yyyy-MM-dd");
}

/**
 * Evaluates lead-time compliance against Asia/Dhaka time.
 */
export function checkLeadTimeCompliance({
  programType,
  shootDate,
  isEmergencyOverride = false,
  overrideReason,
  callerRole = "coordinator",
  todayStr = getDhakaTodayString(),
}: {
  programType: ProgramType;
  shootDate: string;
  isEmergencyOverride?: boolean;
  overrideReason?: string | null;
  callerRole?: UserRole;
  todayStr?: string;
}): { ok: boolean; requiredDays: number; earliestDate: string; error?: string } {
  const requiredDays = getRequiredLeadDays(programType);
  const earliestDate = getEarliestAllowedDateString(programType, todayStr);

  const parsedShoot = parseISO(shootDate);
  const parsedEarliest = parseISO(earliestDate);

  if (startOfDay(parsedShoot) < startOfDay(parsedEarliest)) {
    if (isEmergencyOverride) {
      if (callerRole !== "admin") {
        return {
          ok: false,
          requiredDays,
          earliestDate,
          error: "Only Media Head can apply Emergency Override.",
        };
      }
      if (!overrideReason || overrideReason.trim().length === 0) {
        return {
          ok: false,
          requiredDays,
          earliestDate,
          error: "Emergency Override requires a non-empty override_reason.",
        };
      }
      return { ok: true, requiredDays, earliestDate };
    }

    return {
      ok: false,
      requiredDays,
      earliestDate,
      error: `Lead-time rule violation: ${programType} requires at least ${requiredDays} days notice before shoot_date (Asia/Dhaka). Only Media Head can apply Emergency Override.`,
    };
  }

  return { ok: true, requiredDays, earliestDate };
}

/**
 * Zod schema for creating a requisition.
 */
export const createRequisitionSchema = z
  .object({
    course_id: z.string().uuid("অবৈধ কোর্স আইডি (Valid course UUID required)"),
    program_type: z.enum(PROGRAM_TYPES, {
      errorMap: () => ({ message: "অবৈধ প্রোগ্রাম টাইপ (Invalid program type)" }),
    }),
    format_duration: z.string().min(1, "ফরম্যাট ও ব্যাপ্তি নির্বাচন করুন (Format & duration required)"),
    framing_type: z.enum(FRAMING_TYPES, {
      errorMap: () => ({ message: "ফ্র্রেমিং টাইপ নির্বাচন করুন (Vertical 9:16 or Horizontal 16:9)" }),
    }),
    venue_id: z.string().uuid("অবৈধ ভেন্যু আইডি (Valid venue UUID required)"),
    shoot_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "তারিখ অবশ্যই YYYY-MM-DD ফরম্যাটে হতে হবে"),
    call_time: z.string().min(1, "কল টাইম আবশ্যক (Call time is required)"),
    coordinator_phone: z
      .string()
      .min(1, "ফোন নম্বর দিন (Phone number is required)")
      .refine(
        (val) => /^(?:\+?88)?01[3-9]\d{8}$/.test(val.replace(/[\s-]/g, "")),
        "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01711000000 বা 017XX-XXXXXX)"
      ),
    notes: z.string().optional().nullable(),
    is_emergency_override: z.boolean().default(false),
    override_reason: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.is_emergency_override) {
      if (!data.override_reason || data.override_reason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Emergency Override requires a non-empty override_reason.",
          path: ["override_reason"],
        });
      }
      return;
    }

    // Enforce 3-day (routine) vs 7-day (major event) lead-time rule in Asia/Dhaka time in Zod
    if (data.shoot_date && data.program_type) {
      const todayDhaka = getDhakaTodayString();
      const compliance = checkLeadTimeCompliance({
        programType: data.program_type,
        shootDate: data.shoot_date,
        isEmergencyOverride: false,
        callerRole: "coordinator",
        todayStr: todayDhaka,
      });

      if (!compliance.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            compliance.error ||
            `Lead-time rule violation: ${data.program_type} requires at least ${compliance.requiredDays} days notice before shoot_date (Asia/Dhaka).`,
          path: ["shoot_date"],
        });
      }
    }
  });

export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;

/**
 * Zod schema for rejecting a requisition.
 * Enforces DB CHECK constraint:
 * CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL)
 */
export const rejectRequisitionSchema = z.object({
  status: z.literal("rejected"),
  rejection_reason: z
    .string({
      required_error: "Rejection requires a non-empty rejection_reason.",
    })
    .min(1, "Rejection requires a non-empty rejection_reason.")
    .refine(
      (val) => val.trim().length > 0,
      "Rejection requires a non-empty rejection_reason."
    ),
});

export type RejectRequisitionInput = z.infer<typeof rejectRequisitionSchema>;
