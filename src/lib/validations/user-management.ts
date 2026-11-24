import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "ইমেইল অ্যাড্রেস প্রয়োজন (Email is required)")
    .email("সঠিক ইমেইল অ্যাড্রেস দিন (Invalid email format)"),
  password: z
    .string()
    .min(1, "পাসওয়ার্ড প্রয়োজন (Password is required)")
    .min(6, "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে (Min 6 characters)"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z
  .object({
    email: z
      .string()
      .min(1, "ইমেইল অ্যাড্রেস প্রয়োজন (Email is required)")
      .email("সঠিক ইমেইল অ্যাড্রেস দিন (Valid email format)"),
    password: z
      .string()
      .min(8, "পাসওয়ার্ড ন্যূনতম ৮ অক্ষরের হতে হবে (Password must be at least 8 characters)"),
    full_name: z
      .string()
      .min(2, "পুরো নাম দিন (Full name must be at least 2 characters)")
      .max(100, "নাম অতিরিক্ত দীর্ঘ (Full name too long)"),
    phone: z
      .string()
      .min(1, "মোবাইল নম্বর প্রয়োজন (Phone number is required)")
      .regex(
        /^(?:\+8801|01)[3-9]\d{8}$/,
        "সঠিক বাংলাদেশী মোবাইল নম্বর দিন (Valid BD phone required: e.g. 01712345678)"
      ),
    role: z.enum(["admin", "coordinator", "staff", "intern"], {
      errorMap: () => ({
        message: "সঠিক রোল নির্বাচন করুন (Valid role: admin, coordinator, staff, intern)",
      }),
    }),
    course_id: z
      .string()
      .uuid("সঠিক কোর্স আইডি দিন (Valid course UUID required)")
      .nullable()
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.role === "coordinator") {
        return Boolean(data.course_id && data.course_id.trim() !== "");
      }
      return true;
    },
    {
      message:
        "কোর্স কোঅর্ডিনেটরের জন্য অবশ্যই একটি নির্দিষ্ট কোর্স নির্বাচন করতে হবে (Coordinator role strictly requires an assigned course_id)",
      path: ["course_id"],
    }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserStatusSchema = z.object({
  userId: z.string().uuid("সঠিক ইউজার আইডি দিন (Valid user UUID required)"),
  isActive: z.boolean(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
