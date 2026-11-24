import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  approveAndAssignTask,
  PostgresExclusionError,
  RlsForbiddenError,
} from "@/lib/tasks/store";
import { approveAndAssignSchema } from "@/lib/validations/tasks";

export async function POST(request: NextRequest) {
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
        error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান রিকুইজিশন অনুমোদন ও টিম অ্যাসাইন করতে পারেন।",
        code: "42501",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = approveAndAssignSchema.parse(body);

    const result = approveAndAssignTask(validated, currentUser);

    return NextResponse.json({
      success: true,
      task: result.task,
      slip: result.slip,
    });
  } catch (err: unknown) {
    if (err instanceof PostgresExclusionError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code, // "23P01"
          error: err.message,
          details: err.details,
        },
        { status: 409 }
      );
    }

    if (err instanceof RlsForbiddenError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code,
          error: err.message,
        },
        { status: 403 }
      );
    }

    const message = err instanceof Error ? err.message : "অনুমোদন ব্যর্থ হয়েছে";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
