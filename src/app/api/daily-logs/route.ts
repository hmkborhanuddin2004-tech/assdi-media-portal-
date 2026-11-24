import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createDailyLog,
  getDailyLogs,
  PostgresCheckConstraintError,
  RlsForbiddenError,
} from "@/lib/daily-logs/store";
import type { StaffWorkCategory, ShootLocationType } from "@/lib/types/database";
import {
  staffDailyLogSchema,
  internDailyLogSchema,
  dailyLogQuerySchema,
} from "@/lib/validations/daily-logs";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = dailyLogQuerySchema.safeParse({
    user_id: searchParams.get("user_id") || undefined,
    role: searchParams.get("role") || undefined,
    period: searchParams.get("period") || undefined,
    refDate: searchParams.get("refDate") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        success: false,
        error: "অবৈধ ফিল্টার প্যারামিটার",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const result = getDailyLogs(parsedQuery.data, currentUser);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 403 }
      );
    }
    const message =
      err instanceof Error
        ? err.message
        : "দৈনিক লগ লোড করতে ব্যর্থ হয়েছে";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  if (currentUser.role !== "staff" && currentUser.role !== "intern") {
    return NextResponse.json(
      {
        success: false,
        error: "শুধুমাত্র স্টাফ ও ইন্টার্ন সদস্যগণ দৈনিক কাজের লগ সাবমিট করতে পারবেন।",
        code: "42501",
      },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "অবৈধ JSON রিকোয়েস্ট বডি।" },
      { status: 400 }
    );
  }

  // Validate according to role schema
  if (currentUser.role === "staff") {
    const parsed = staffDailyLogSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "অবৈধ ফর্ম তথ্য।";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          code: "23514",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
  } else if (currentUser.role === "intern") {
    const parsed = internDailyLogSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "অবৈধ ফর্ম তথ্য।";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          code: "23514",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
  }

  try {
    const createdLog = createDailyLog(
      {
        user_id: currentUser.id,
        log_role: currentUser.role,
        log_date: typeof body.log_date === "string" ? body.log_date : undefined,
        task_id: typeof body.task_id === "string" ? body.task_id : null,
        work_category:
          typeof body.work_category === "string"
            ? (body.work_category as StaffWorkCategory)
            : null,
        hours_spent: Number(body.hours_spent),
        shoot_location_type:
          typeof body.shoot_location_type === "string"
            ? (body.shoot_location_type as ShootLocationType)
            : null,
        raw_footage_uploaded:
          typeof body.raw_footage_uploaded === "boolean"
            ? body.raw_footage_uploaded
            : null,
        notes: String(body.notes || ""),
      },
      currentUser
    );

    return NextResponse.json(
      {
        success: true,
        log: createdLog,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof PostgresCheckConstraintError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: err.code,
          constraint: err.constraint,
        },
        { status: 400 }
      );
    }
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 403 }
      );
    }
    const message =
      err instanceof Error
        ? err.message
        : "দৈনিক কাজের লগ সংরক্ষণ করতে ব্যর্থ হয়েছে।";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
