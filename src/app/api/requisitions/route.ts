import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createRequisitionSchema } from "@/lib/validations/requisitions";
import {
  getRequisitionsForUser,
  createRequisition,
  getAllVenues,
} from "@/lib/requisitions/store";
import { DEMO_COURSES } from "@/lib/auth/demo-users";

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

  // 1. Try Supabase if live credentials configured
  if (!isPlaceholderSupabaseConfig()) {
    try {
      const supabase = await createServerSupabase();
      let query = supabase
        .from("requisitions")
        .select(`
          *,
          courses(name, code),
          venues(name),
          tasks(id, stage, final_drive_url)
        `)
        .order("created_at", { ascending: false });

      if (currentUser.role === "coordinator" && currentUser.course_id) {
        query = query.eq("course_id", currentUser.course_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        const formatted = data.map((item: Record<string, unknown>) => {
          const coursesData = item.courses as { name?: string; code?: string } | null;
          const venuesData = item.venues as { name?: string } | null;
          const tasksData = (item.tasks as Array<{ id?: string; stage?: string; final_drive_url?: string }>) || [];
          return {
            ...item,
            course_name: coursesData?.name,
            course_code: coursesData?.code,
            venue_name: venuesData?.name,
            task_id: tasksData[0]?.id || null,
            task_stage: tasksData[0]?.stage || null,
            final_drive_url: tasksData[0]?.final_drive_url || null,
          };
        });

        return NextResponse.json({
          success: true,
          requisitions: formatted,
          venues: getAllVenues(),
          courses: DEMO_COURSES,
        });
      }
    } catch {
      // Fall through to store
    }
  }

  // 2. Authoritative Store (seeded + dynamic)
  const requisitions = getRequisitionsForUser(currentUser);
  return NextResponse.json({
    success: true,
    requisitions,
    venues: getAllVenues(),
    courses: DEMO_COURSES,
  });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "লগইন করুন (Authentication required)" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // If Coordinator, course_id is locked to their assigned course
    if (currentUser.role === "coordinator") {
      if (currentUser.course_id) {
        body.course_id = currentUser.course_id;
      }
      body.is_emergency_override = false;
      body.override_reason = null;
    }

    const parseResult = createRequisitionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "অবৈধ ইনপুট (Invalid input)",
          errors: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    // 1. Try Supabase if live credentials configured
    if (!isPlaceholderSupabaseConfig()) {
      try {
        const supabase = await createServerSupabase();
        const { data, error } = await supabase
          .from("requisitions")
          .insert({
            course_id: parseResult.data.course_id,
            coordinator_id: currentUser.id,
            program_type: parseResult.data.program_type,
            format_duration: parseResult.data.format_duration,
            framing_type: parseResult.data.framing_type,
            venue_id: parseResult.data.venue_id,
            shoot_date: parseResult.data.shoot_date,
            call_time: parseResult.data.call_time,
            coordinator_phone: parseResult.data.coordinator_phone,
            notes: parseResult.data.notes || null,
            is_emergency_override: parseResult.data.is_emergency_override || false,
            override_reason: parseResult.data.override_reason || null,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          requisition: data,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create requisition";
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        );
      }
    }

    // 2. Authoritative Store
    const requisition = createRequisition(parseResult.data, currentUser);
    return NextResponse.json({
      success: true,
      requisition,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create requisition";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
