import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkInGear,
  RlsForbiddenError,
} from "@/lib/gear/store";
import { checkinGearSchema } from "@/lib/validations/gear";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "লগইন করুন (Authentication required)" },
      { status: 401 }
    );
  }

  // RLS: Admin only
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া হেড (অ্যাডমিন) সরঞ্জাম চেক-ইন করতে পারেন।" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = checkinGearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "ইনপুট ত্রুটি (Validation error)" },
        { status: 400 }
      );
    }

    // 1. Try Supabase if live
    if (!isPlaceholderSupabaseConfig()) {
      try {
        const adminSupabase = createAdminClient();
        const nowIso = new Date().toISOString();

        // Update active booking
        const { data: updatedBooking } = await adminSupabase
          .from("gear_bookings")
          .update({
            returned_at: nowIso,
            battery_ok: parsed.data.battery_ok,
            sd_card_ok: parsed.data.sd_card_ok,
            return_condition_note: parsed.data.return_condition_note || null,
          })
          .eq("gear_id", parsed.data.gear_id)
          .is("returned_at", null)
          .select()
          .maybeSingle();

        // Update gear item status
        const nextStatus = parsed.data.mark_maintenance ? "maintenance" : "available";
        const maintenanceNote = parsed.data.mark_maintenance
          ? parsed.data.maintenance_note || parsed.data.return_condition_note || "Flagged for maintenance"
          : null;

        const { data: updatedGear } = await adminSupabase
          .from("gear_items")
          .update({
            status: nextStatus,
            maintenance_note: maintenanceNote,
            updated_at: nowIso,
          })
          .eq("id", parsed.data.gear_id)
          .select()
          .single();

        return NextResponse.json(
          {
            success: true,
            booking: updatedBooking,
            item: updatedGear,
          },
          { status: 200 }
        );
      } catch {
        // Fall through
      }
    }

    // 2. Authoritative Store
    const result = await checkInGear(parsed.data, currentUser);
    return NextResponse.json(
      {
        success: true,
        booking: result.booking,
        item: result.gearItem,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "চেক-ইন সম্পন্ন করা যায়নি" },
      { status: 400 }
    );
  }
}
