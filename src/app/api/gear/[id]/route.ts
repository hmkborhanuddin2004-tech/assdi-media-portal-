import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getGearItemById,
  updateGearItem,
  deleteGearItem,
  RlsForbiddenError,
  PostgresUniqueViolationError,
} from "@/lib/gear/store";
import { updateGearSchema } from "@/lib/validations/gear";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }

  // RLS check: current_user_role() IN ('admin', 'staff', 'intern')
  if (currentUser.role === "coordinator") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। কোর্স কোঅর্ডিনেটরের গিয়ার ইনভেন্টরি অ্যাক্সেস নেই।" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // 1. Try Supabase if live
  if (!isPlaceholderSupabaseConfig()) {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("gear_items")
        .select(`
          *,
          gear_bookings (
            id,
            task_id,
            responsible_lead_id,
            time_window,
            checked_out_at,
            returned_at,
            profiles:responsible_lead_id (full_name)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ success: true, item: data });
      }
    } catch {
      // Fall through to store
    }
  }

  // 2. Authoritative Store
  try {
    const item = getGearItemById(id, currentUser);
    if (!item) {
      return NextResponse.json({ success: false, error: "Gear item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র অ্যাডমিন সরঞ্জাম আপডেট করতে পারেন।" },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateGearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    // 1. Try Supabase if live
    if (!isPlaceholderSupabaseConfig()) {
      try {
        const adminSupabase = createAdminClient();
        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (parsed.data.name) updatePayload.name = parsed.data.name.trim();
        if (parsed.data.category) updatePayload.category = parsed.data.category;
        if (parsed.data.serial_number) updatePayload.serial_number = parsed.data.serial_number.trim();
        if (parsed.data.status) {
          updatePayload.status = parsed.data.status;
          if (parsed.data.status === "available") {
            updatePayload.maintenance_note = null;
          } else if (parsed.data.status === "maintenance" && parsed.data.maintenance_note !== undefined) {
            updatePayload.maintenance_note = parsed.data.maintenance_note;
          }
        }

        const { data, error } = await adminSupabase
          .from("gear_items")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return NextResponse.json(
              {
                success: false,
                error: `সিরিয়াল নম্বর ইতিমধ্যে নিবন্ধিত (Serial number already exists: ${parsed.data.serial_number})`,
              },
              { status: 409 }
            );
          }
          throw error;
        }

        if (data) {
          return NextResponse.json({ success: true, item: data });
        }
      } catch (dbErr: unknown) {
        const errorObj = dbErr as { code?: string; message?: string };
        if (errorObj?.code === "23505") {
          return NextResponse.json(
            {
              success: false,
              error: `সিরিয়াল নম্বর ইতিমধ্যে নিবন্ধিত (Serial number already exists: ${parsed.data.serial_number})`,
            },
            { status: 409 }
          );
        }
        // Fall through to store
      }
    }

    // 2. Authoritative Store
    const item = updateGearItem(id, parsed.data, currentUser);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    if (err instanceof PostgresUniqueViolationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 409 });
    }
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র অ্যাডমিন সরঞ্জাম মুছে ফেলতে পারেন।" },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    // 1. Try Supabase if live
    if (!isPlaceholderSupabaseConfig()) {
      try {
        const adminSupabase = createAdminClient();

        // Check for active bookings
        const { data: activeBookings } = await adminSupabase
          .from("gear_bookings")
          .select("id")
          .eq("gear_id", id)
          .is("returned_at", null)
          .limit(1);

        if (activeBookings && activeBookings.length > 0) {
          return NextResponse.json(
            { success: false, error: "Cannot delete gear item with active shoot booking (ON DELETE RESTRICT)" },
            { status: 400 }
          );
        }

        const { error } = await adminSupabase.from("gear_items").delete().eq("id", id);
        if (error) {
          if (error.code === "23503") {
            return NextResponse.json(
              { success: false, error: "Cannot delete gear item with booking history (ON DELETE RESTRICT)" },
              { status: 400 }
            );
          }
          throw error;
        }

        return NextResponse.json({ success: true, message: "Gear item deleted" });
      } catch (dbErr: unknown) {
        const errorObj = dbErr as { code?: string; message?: string };
        if (errorObj?.code === "23503") {
          return NextResponse.json(
            { success: false, error: "Cannot delete gear item with booking history (ON DELETE RESTRICT)" },
            { status: 400 }
          );
        }
        // Fall through to store
      }
    }

    // 2. Authoritative Store
    deleteGearItem(id, currentUser);
    return NextResponse.json({ success: true, message: "Gear item deleted" });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete item" },
      { status: 400 }
    );
  }
}
