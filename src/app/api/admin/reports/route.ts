import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  calculateWorkHistoryReport,
  generateReportsCsv,
} from "@/lib/reports/analytics";
import { reportFilterSchema } from "@/lib/validations/daily-logs";
import { RlsForbiddenError } from "@/lib/daily-logs/store";

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
        error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান ওয়ার্ক হিস্ট্রি ও অ্যানালিটিক্স রিপোর্ট দেখতে পারেন।",
        code: "42501",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = reportFilterSchema.safeParse({
    user_id: searchParams.get("user_id") || undefined,
    role: searchParams.get("role") || undefined,
    period: searchParams.get("period") || undefined,
    refDate: searchParams.get("refDate") || undefined,
    format: searchParams.get("format") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "অবৈধ রিপোর্ট ফিল্টার প্যারামিটার।",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const reportData = calculateWorkHistoryReport(parsed.data, currentUser);

    // CSV Export Flow
    if (parsed.data.format === "csv") {
      const csvContent = generateReportsCsv(reportData);
      const filename = `assdi-media-report-${parsed.data.period}-${
        parsed.data.refDate || "latest"
      }.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    return NextResponse.json({
      success: true,
      report: reportData,
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
        : "রিপোর্ট ডাটা লোড করতে ব্যর্থ হয়েছে";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
