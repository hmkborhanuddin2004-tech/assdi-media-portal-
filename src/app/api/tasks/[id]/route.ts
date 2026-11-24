import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getTaskById,
  updateTaskStage,
  deriveShootSlipData,
  PostgresCheckConstraintError,
  RlsForbiddenError,
} from "@/lib/tasks/store";
import { updateTaskStageSchema } from "@/lib/validations/tasks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const task = getTaskById(id, currentUser);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "টাস্ক পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    const slip = deriveShootSlipData(task);

    return NextResponse.json({
      success: true,
      task,
      slip,
    });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json(
        { success: false, code: err.code, error: err.message },
        { status: 403 }
      );
    }
    const message = err instanceof Error ? err.message : "টাস্ক লোড করতে ব্যর্থ হয়েছে";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateTaskStageSchema.parse(body);

    const updatedTask = updateTaskStage(id, validated, currentUser);

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (err: unknown) {
    if (err instanceof PostgresCheckConstraintError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code, // "23514"
          error: err.message,
          constraint: err.constraint,
        },
        { status: 400 }
      );
    }

    if (err instanceof RlsForbiddenError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code, // "42501"
          error: err.message,
        },
        { status: 403 }
      );
    }

    const message = err instanceof Error ? err.message : "টাস্ক আপডেট ব্যর্থ হয়েছে";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
