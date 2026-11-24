import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardKpiData } from "@/lib/calendar/store";
import { calendarQuerySchema } from "@/lib/validations/calendar";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json(
      {
        success: false,
        error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান ড্যাশবোর্ড দেখতে পারেন।",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const refDateParam = searchParams.get("refDate") || undefined;

  const parsed = calendarQuerySchema.safeParse({
    window: "next_7_days",
    refDate: refDateParam,
  });

  if (refDateParam && !parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "অবৈধ তারিখ ফরম্যাট। অনুগ্রহ করে YYYY-MM-DD ফরম্যাট ব্যবহার করুন।",
      },
      { status: 400 }
    );
  }

  const refDate = parsed.success ? parsed.data.refDate : undefined;

  try {
    const data = getDashboardKpiData(currentUser, refDate);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "ড্যাশবোর্ড ডাটা লোড করতে ব্যর্থ হয়েছে";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
