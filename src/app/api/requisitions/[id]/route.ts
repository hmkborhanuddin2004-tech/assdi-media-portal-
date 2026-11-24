import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approveRequisition,
  rejectRequisition,
} from "@/lib/requisitions/store";
import { rejectRequisitionSchema } from "@/lib/validations/requisitions";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser(request);

  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json(
      {
        success: false,
        error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান রিকুইজিশন পরিচালনা করতে পারেন।",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const action = body.action || (body.status === "rejected" ? "reject" : "approve");

    if (action === "approve") {
      // 1. Try Supabase if live credentials configured
      if (!isPlaceholderSupabaseConfig()) {
        try {
          const adminSupabase = createAdminClient();
          const { data: updatedReq, error: reqError } = await adminSupabase
            .from("requisitions")
            .update({
              status: "approved",
              rejection_reason: null,
              reviewed_by: currentUser.id,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

          if (reqError) {
            return NextResponse.json(
              { success: false, error: reqError.message },
              { status: 400 }
            );
          }

          // Atomically create task in tasks table
          await adminSupabase.from("tasks").insert({
            requisition_id: id,
            stage: "shoot_assigned",
          });

          return NextResponse.json({
            success: true,
            requisition: updatedReq,
          });
        } catch {
          // Fall through to store
        }
      }

      // 2. Authoritative Store
      const result = approveRequisition(id, currentUser);
      return NextResponse.json({
        success: true,
        requisition: result.requisition,
        task: result.task,
      });
    }

    if (action === "reject") {
      const parseResult = rejectRequisitionSchema.safeParse({
        status: "rejected",
        rejection_reason: body.rejection_reason,
      });

      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parseResult.error.errors[0]?.message ||
              'new row for relation "requisitions" violates check constraint "chk_rejection_requires_reason"',
          },
          { status: 400 }
        );
      }

      const reason = parseResult.data.rejection_reason;

      // 1. Try Supabase if live credentials configured
      if (!isPlaceholderSupabaseConfig()) {
        try {
          const adminSupabase = createAdminClient();
          const { data: updatedReq, error: reqError } = await adminSupabase
            .from("requisitions")
            .update({
              status: "rejected",
              rejection_reason: reason,
              reviewed_by: currentUser.id,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

          if (reqError) {
            return NextResponse.json(
              { success: false, error: reqError.message },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            requisition: updatedReq,
          });
        } catch {
          // Fall through to store
        }
      }

      // 2. Authoritative Store
      const requisition = rejectRequisition(id, reason, currentUser);
      return NextResponse.json({
        success: true,
        requisition,
      });
    }

    return NextResponse.json(
      { success: false, error: "অবৈধ অ্যাকশন (Invalid action)" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process requisition";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
