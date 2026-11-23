import { z } from "zod";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import type { ProgramType, UserRole } from "@/lib/types/database";

/**
 * Lead-time calculation in Asia/Dhaka time zone.
 * Routine shoots require at least 3 full days notice.
 * Major events require at least 7 full days notice.
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

export function getEarliestAllowedDate(
  programType: ProgramType,
  today: Date = new Date()
): Date {
  const leadDays = getRequiredLeadDays(programType);
  return addDays(startOfDay(today), leadDays);
}

export function validateRequisitionLeadTime({
  programType,
  shootDate,
  isEmergencyOverride = false,
  overrideReason,
  callerRole,
  today = new Date(),
}: {
  programType: ProgramType;
  shootDate: string | Date;
  isEmergencyOverride?: boolean;
  overrideReason?: string | null;
  callerRole: UserRole;
  today?: Date;
}): { valid: boolean; error?: string } {
  const parsedDate = typeof shootDate === "string" ? parseISO(shootDate) : shootDate;
  const earliestAllowed = getEarliestAllowedDate(programType, today);

  if (startOfDay(parsedDate) < earliestAllowed) {
    if (isEmergencyOverride) {
      if (callerRole !== "admin") {
        return {
          valid: false,
          error: "Only Media Head (admin) can apply Emergency Override.",
        };
      }
      if (!overrideReason || overrideReason.trim().length === 0) {
        return {
          valid: false,
          error: "Emergency Override requires a non-empty override_reason.",
        };
      }
      return { valid: true };
    }

    const requiredDays = getRequiredLeadDays(programType);
    return {
      valid: false,
      error: `Lead-time rule violation: ${programType} requires at least ${requiredDays} days notice before shoot_date. Earliest allowed: ${format(
        earliestAllowed,
        "yyyy-MM-dd"
      )}.`,
    };
  }

  return { valid: true };
}

/**
 * Zod schema verifying chk_coordinator_must_have_course:
 * CHECK (role <> 'coordinator' OR course_id IS NOT NULL)
 */
export const profileValidationSchema = z
  .object({
    id: z.string().uuid(),
    full_name: z.string().min(1, "Full name is required"),
    phone: z.string().min(1, "Phone is required"),
    role: z.enum(["admin", "coordinator", "staff", "intern"]),
    course_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.role === "coordinator" && !data.course_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Coordinator must be assigned to an active course_id.",
        path: ["course_id"],
      });
    }
  });

/**
 * Zod schema verifying chk_rejection_requires_reason:
 * CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL)
 */
export const rejectionValidationSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
    rejection_reason: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected") {
      if (!data.rejection_reason || data.rejection_reason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rejection requires a non-empty rejection_reason.",
          path: ["rejection_reason"],
        });
      }
    }
  });

/**
 * Zod schema verifying chk_completed_drive_url:
 * CHECK (final_drive_url IS NULL OR final_drive_url ~* '^https://(drive|docs)\.google\.com/')
 */
export const googleDriveUrlSchema = z
  .string()
  .regex(
    /^https:\/\/(drive|docs)\.google\.com\//,
    "URL must be a valid Google Drive or Google Docs link (https://drive.google.com/... or https://docs.google.com/...)"
  )
  .nullable()
  .optional();
