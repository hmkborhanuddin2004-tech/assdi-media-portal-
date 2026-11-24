import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAllGearItems,
  createGearItem,
  getActiveShootsAndTasks,
  getStaffTeamMembers,
  PostgresUniqueViolationError,
  RlsForbiddenError,
} from "@/lib/gear/store";
import { addGearSchema, GEAR_CATEGORIES } from "@/lib/validations/gear";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "লগইন করুন (Authentication required)" },
      { status: 401 }
    );
  }

  // RLS Policy Check: gear_items_select: current_user_role() IN ('admin', 'staff', 'intern')
  if (currentUser.role === "coordinator") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। কোর্স কোঅর্ডিনেটরের গিয়ার ইনভেন্টরি অ্যাক্সেস নেই।" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";

  // 1. Try Supabase if live credentials configured
  if (!isPlaceholderSupabaseConfig()) {
    try {
      const supabase = await createServerSupabase();
      let query = supabase
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
        .order("created_at", { ascending: false });

      if (category !== "all") {
        query = query.eq("category", category);
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,serial_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        return NextResponse.json({
          success: true,
          items: data,
          categories: GEAR_CATEGORIES,
          tasks: getActiveShootsAndTasks(),
          staffMembers: getStaffTeamMembers(),
        });
      }
    } catch {
      // Fall through to store
    }
  }

  // 2. Authoritative Store (seeded + dynamic)
  try {
    const items = getAllGearItems(currentUser, { category, status, search });
    return NextResponse.json({
      success: true,
      items,
      categories: GEAR_CATEGORIES,
      tasks: getActiveShootsAndTasks(),
      staffMembers: getStaffTeamMembers(),
    });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: "গিয়ার তালিকা লোড করা যায়নি (Failed to load gear items)" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "লগইন করুন (Authentication required)" },
      { status: 401 }
    );
  }

  // RLS Enforcement: Only admin can insert
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া হেড নতুন সরঞ্জাম যোগ করতে পারেন।" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = addGearSchema.safeParse(body);
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
        const { data, error } = await adminSupabase
          .from("gear_items")
          .insert({
            name: parsed.data.name,
            category: parsed.data.category,
            serial_number: parsed.data.serial_number,
            status: parsed.data.status,
            maintenance_note: parsed.data.maintenance_note || null,
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, item: data }, { status: 201 });
        }
        if (error && error.code === "23505") {
          return NextResponse.json(
            { success: false, error: `সিরিয়াল নম্বর ইতিমধ্যে নিবন্ধিত (Serial number already exists: ${parsed.data.serial_number})` },
            { status: 409 }
          );
        }
      } catch {
        // Fall through
      }
    }

    // 2. Authoritative Store
    const item = createGearItem(parsed.data, currentUser);
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof PostgresUniqueViolationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 409 });
    }
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "গিয়ার যোগ করা যায়নি" },
      { status: 500 }
    );
  }
}
