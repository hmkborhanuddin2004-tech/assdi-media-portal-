import { z } from "zod";
import type { TaskStage } from "@/lib/types/database";

export const TASK_STAGES: [TaskStage, ...TaskStage[]] = [
  "pending",
  "shoot_assigned",
  "shoot_done",
  "editing",
  "review",
  "completed",
];

export const TASK_STAGE_LABELS: Record<TaskStage, { bn: string; en: string }> = {
  pending: { bn: "পেন্ডিং", en: "Pending" },
  shoot_assigned: { bn: "শ্যুট নির্ধারিত", en: "Shoot Assigned" },
  shoot_done: { bn: "শ্যুট সম্পন্ন", en: "Shoot Done" },
  editing: { bn: "এডিটিং চলমান", en: "Editing" },
  review: { bn: "রিভিউ", en: "Review" },
  completed: { bn: "সম্পন্ন / ডেলিভার্ড", en: "Completed" },
};

/**
 * PostgreSQL DB CHECK constraint:
 * CONSTRAINT chk_completed_drive_url
 *   CHECK (
 *     final_drive_url IS NULL
 *     OR final_drive_url ~* '^https://(drive|docs)\.google\.com/'
 *   )
 */
export const GOOGLE_DRIVE_URL_REGEX = /^https:\/\/(drive|docs)\.google\.com\//i;

export const approveAndAssignSchema = z
  .object({
    requisition_id: z.string().min(1, "রিকুইজিশন আইডি প্রয়োজন"),
    lead_staff_id: z.string().min(1, "টিম লিড নির্ধারণ করুন"),
    assignee_ids: z
      .array(z.string())
      .min(2, "কমপক্ষে ২ জন টিম মেম্বার নির্বাচন করুন")
      .max(3, "সর্বোচ্চ ৩ জন টিম মেম্বার নির্বাচন করা যাবে"),
    deadline_at: z.string().min(1, "কাজের ডেডলাইন নির্ধারণ করুন"),
    gear_ids: z
      .array(z.string())
      .min(1, "কমপক্ষে ১টি শুটিং সরঞ্জাম/ক্যামেরা নির্বাচন করুন"),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => data.assignee_ids.includes(data.lead_staff_id), {
    message: "নির্ধারিত টিম লিড অবশ্যই নির্বাচিত টিম মেম্বারদের একজন হতে হবে।",
    path: ["lead_staff_id"],
  });

export type ApproveAndAssignInput = z.infer<typeof approveAndAssignSchema>;

export const updateTaskStageSchema = z
  .object({
    stage: z
      .enum(TASK_STAGES, {
        errorMap: () => ({ message: "সঠিক টাস্ক স্টেজ নির্বাচন করুন" }),
      })
      .optional(),
    final_drive_url: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val || val === "") return true;
          return GOOGLE_DRIVE_URL_REGEX.test(val);
        },
        {
          message:
            'গুগল ড্রাইভ লিংক অবশ্যই "https://drive.google.com/" বা "https://docs.google.com/" দিয়ে শুরু হতে হবে। (Violates chk_completed_drive_url)',
        }
      ),
    raw_footage_uploaded: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.stage === "completed" && data.final_drive_url !== undefined) {
        return (
          Boolean(data.final_drive_url) &&
          GOOGLE_DRIVE_URL_REGEX.test(data.final_drive_url || "")
        );
      }
      return true;
    },
    {
      message:
        "টাস্ক 'Completed' করতে হলে একটি বৈধ গুগল ড্রাইভ ডেলিভারি লিংক আবশ্যক।",
      path: ["final_drive_url"],
    }
  );

export type UpdateTaskStageInput = z.infer<typeof updateTaskStageSchema>;
