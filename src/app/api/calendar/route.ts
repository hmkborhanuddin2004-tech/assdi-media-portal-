import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCalendarShoots,
  getWindowBounds,
  getDhakaDateString,
} from "@/lib/calendar/store";
import {
  calendarQuerySchema,
  type CalendarWindow,
} from "@/lib/validations/calendar";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get("window") || "tomorrow";
  const refDateParam = searchParams.get("refDate") || undefined;

  const parsed = calendarQuerySchema.safeParse({
    window: windowParam,
    refDate: refDateParam,
  });

  const calendarWindow: CalendarWindow = parsed.success
    ? parsed.data.window
    : "tomorrow";
  const refDate = parsed.success ? parsed.data.refDate : undefined;

  try {
    const shoots = getCalendarShoots({
      window: calendarWindow,
      user: currentUser,
      refDate,
    });

    const bounds = getWindowBounds(refDate || new Date());
    const dhakaToday = refDate || getDhakaDateString();

    return NextResponse.json({
      success: true,
      window: calendarWindow,
      shoots,
      bounds,
      dhaka_today: dhakaToday,
      count: shoots.length,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "ক্যালেন্ডার শিডিউল লোড করতে ব্যর্থ হয়েছে";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
