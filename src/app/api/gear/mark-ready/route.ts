import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { markGearReady, RlsForbiddenError } from "@/lib/gear/store";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "শুধুমাত্র মিডিয়া হেড (অ্যাডমিন) সরঞ্জাম প্রস্তুত চিহ্নিত করতে পারেন।" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const gearId = body.gear_id;
    if (!gearId) {
      return NextResponse.json({ success: false, error: "gear_id required" }, { status: 400 });
    }

    if (!isPlaceholderSupabaseConfig()) {
      try {
        const adminSupabase = createAdminClient();
        const { data: updatedGear } = await adminSupabase
          .from("gear_items")
          .update({
            status: "available",
            maintenance_note: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", gearId)
          .select()
          .single();

        if (updatedGear) {
          return NextResponse.json({ success: true, item: updatedGear });
        }
      } catch {
        // Fall through
      }
    }

    const item = markGearReady(gearId, currentUser);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to mark gear ready" },
      { status: 400 }
    );
  }
}
