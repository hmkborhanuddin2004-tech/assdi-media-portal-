import { z } from "zod";
import type { GearCategory, GearStatus } from "@/lib/types/database";

export const GEAR_CATEGORIES: GearCategory[] = [
  "camera_body",
  "lens",
  "drone",
  "gimbal",
  "microphone",
  "light",
  "memory_card",
  "accessory",
];

export const GEAR_STATUSES: GearStatus[] = ["available", "in_use", "maintenance"];

export const GEAR_CATEGORY_LABELS: Record<GearCategory, { en: string; bn: string }> = {
  camera_body: { en: "Camera Body", bn: "ক্যামেরা বডি" },
  lens: { en: "Lens", bn: "লেন্স" },
  drone: { en: "Drone", bn: "ড্রোন" },
  gimbal: { en: "Gimbal", bn: "গিম্বল" },
  microphone: { en: "Microphone", bn: "মাইক্রোফোন" },
  light: { en: "Lighting", bn: "লাইট" },
  memory_card: { en: "Memory Card", bn: "মেমোরি কার্ড" },
  accessory: { en: "Accessory", bn: "এক্সেসরিজ" },
};

export const GEAR_STATUS_LABELS: Record<
  GearStatus,
  { en: string; bn: string; badgeClass: string; dotClass: string }
> = {
  available: {
    en: "Available",
    bn: "উপলব্ধ",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  in_use: {
    en: "In Use",
    bn: "ব্যবহৃত",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500",
  },
  maintenance: {
    en: "Maintenance",
    bn: "রক্ষণাবেক্ষণে",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    dotClass: "bg-rose-500",
  },
};

export const gearCategorySchema = z.enum([
  "camera_body",
  "lens",
  "drone",
  "gimbal",
  "microphone",
  "light",
  "memory_card",
  "accessory",
]);

export const gearStatusSchema = z.enum(["available", "in_use", "maintenance"]);

export const addGearSchema = z.object({
  name: z
    .string()
    .min(2, "সরঞ্জামের নাম কমপক্ষে ২ অক্ষরের হতে হবে (Name must be at least 2 chars)")
    .max(100, "Name too long"),
  category: gearCategorySchema,
  serial_number: z
    .string()
    .min(2, "সিরিয়াল নম্বর আবশ্যক (Serial number is required)")
    .max(50, "Serial number too long")
    .regex(/^[A-Za-z0-9\-_#.]+$/, "সিরিয়াল নম্বরে শুধুমাত্র অক্ষর, সংখ্যা, ড্যাশ বা আন্ডারস্কোর ব্যবহার করুন"),
  status: gearStatusSchema.default("available"),
  maintenance_note: z.string().nullable().optional(),
});

export const updateGearSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  category: gearCategorySchema.optional(),
  serial_number: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z0-9\-_#.]+$/)
    .optional(),
  status: gearStatusSchema.optional(),
  maintenance_note: z.string().nullable().optional(),
});

export const checkoutGearSchema = z
  .object({
    gear_id: z.string().min(1, "অবৈধ গিয়ার আইডি (Gear ID required)"),
    task_id: z.string().min(1, "অবৈধ টাস্ক আইডি (Task ID required)"),
    responsible_lead_id: z.string().min(1, "দায়িত্বপ্রাপ্ত লিড আবশ্যক (Responsible lead required)"),
    start_time: z.string().min(1, "শুটিং শুরুর সময় আবশ্যক (Start time required)"),
    end_time: z.string().min(1, "শুটিং সমাপ্তির সময় আবশ্যক (End time required)"),
    team_label: z.string().optional(),
  })
  .refine(
    (data) => {
      const s = new Date(data.start_time).getTime();
      const e = new Date(data.end_time).getTime();
      return !isNaN(s) && !isNaN(e) && s < e;
    },
    {
      message: "সমাপ্তির সময় অবশ্যই শুরুর সময়ের পরবর্তী হতে হবে (End time must be after start time)",
      path: ["end_time"],
    }
  );

export const checkinGearSchema = z.object({
  gear_id: z.string().min(1, "অবৈধ গিয়ার আইডি (Gear ID required)"),
  booking_id: z.string().optional(),
  battery_ok: z.boolean().default(true),
  sd_card_ok: z.boolean().default(true),
  return_condition_note: z.string().nullable().optional(),
  mark_maintenance: z.boolean().default(false),
  maintenance_note: z.string().nullable().optional(),
});

export type AddGearInput = z.infer<typeof addGearSchema>;
export type UpdateGearInput = z.infer<typeof updateGearSchema>;
export type CheckoutGearInput = z.infer<typeof checkoutGearSchema>;
export type CheckinGearInput = z.infer<typeof checkinGearSchema>;
