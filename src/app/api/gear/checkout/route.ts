import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkOutGear,
  PostgresExclusionError,
  RlsForbiddenError,
  formatTimeWindow,
} from "@/lib/gear/store";
import { checkoutGearSchema } from "@/lib/validations/gear";

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

  // RLS Enforcement: Admin only
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া হেড (অ্যাডমিন) সরঞ্জাম চেক-আউট করতে পারেন।" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = checkoutGearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "ইনপুট ত্রুটি (Validation error)" },
        { status: 400 }
      );
    }

    // 1. Try Supabase PostgreSQL if live credentials configured
    if (!isPlaceholderSupabaseConfig()) {
      try {
        const adminSupabase = createAdminClient();
        const timeWindowStr = formatTimeWindow(parsed.data.start_time, parsed.data.end_time);

        // Attempt insert into gear_bookings table (subject to excl_no_gear_double_booking GiST constraint)
        const { data: bookingData, error: bookingError } = await adminSupabase
          .from("gear_bookings")
          .insert({
            gear_id: parsed.data.gear_id,
            task_id: parsed.data.task_id,
            responsible_lead_id: parsed.data.responsible_lead_id,
            time_window: timeWindowStr,
          })
          .select(`
            *,
            gear_items (name, serial_number),
            profiles:responsible_lead_id (full_name)
          `)
          .single();

        if (bookingError) {
          // Catch Postgres error code 23P01 (exclusion_violation)
          if (bookingError.code === "23P01" || bookingError.message.includes("excl_no_gear_double_booking")) {
            // Fetch conflicting active booking details for clear alert banner
            const { data: activeConflicting } = await adminSupabase
              .from("gear_bookings")
              .select(`
                *,
                gear_items (name, serial_number),
                profiles:responsible_lead_id (full_name)
              `)
              .eq("gear_id", parsed.data.gear_id)
              .is("returned_at", null)
              .limit(1)
              .maybeSingle();

            const conflictingRecord = activeConflicting as {
              gear_items?: { name?: string; serial_number?: string };
              profiles?: { full_name?: string };
              time_window?: string;
            } | null;

            const gearName = conflictingRecord?.gear_items?.name || "Equipment";
            const serialNo = conflictingRecord?.gear_items?.serial_number || "";
            const leadName = conflictingRecord?.profiles?.full_name || parsed.data.team_label || "Team A";

            const errorBannerMessage = `Double-Booking Blocked: ${gearName} (${serialNo}) is already assigned to ${leadName}.`;

            return NextResponse.json(
              {
                success: false,
                code: "23P01",
                error: errorBannerMessage,
                conflicting_booking: {
                  gear_id: parsed.data.gear_id,
                  gear_name: gearName,
                  serial_number: serialNo,
                  assigned_lead_name: leadName,
                  time_window: conflictingRecord?.time_window || timeWindowStr,
                  formatted_message: errorBannerMessage,
                },
              },
              { status: 409 }
            );
          }
          throw bookingError;
        }

        // Update gear item status to 'in_use'
        await adminSupabase
          .from("gear_items")
          .update({ status: "in_use", updated_at: new Date().toISOString() })
          .eq("id", parsed.data.gear_id);

        return NextResponse.json(
          {
            success: true,
            booking: bookingData,
          },
          { status: 200 }
        );
      } catch (dbErr: unknown) {
        const errorObj = dbErr as { code?: string; message?: string };
        if (errorObj?.code === "23P01" || errorObj?.message?.includes("excl_no_gear_double_booking")) {
          // Propagate exclusion error
          return NextResponse.json(
            {
              success: false,
              code: "23P01",
              error: `Double-Booking Blocked: Gear item is already booked during this time window.`,
            },
            { status: 409 }
          );
        }
        // Fallback to store
      }
    }

    // 2. Authoritative Store (Emulates PostgreSQL EXCLUDE USING gist with 23P01 error)
    const result = await checkOutGear(parsed.data, currentUser);
    return NextResponse.json(
      {
        success: true,
        booking: result.booking,
        item: result.gearItem,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof PostgresExclusionError) {
      return NextResponse.json(
        {
          success: false,
          code: "23P01",
          error: err.conflictingBooking.formatted_message,
          conflicting_booking: err.conflictingBooking,
        },
        { status: 409 }
      );
    }
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "চেক-আউট সম্পন্ন করা যায়নি" },
      { status: 400 }
    );
  }
}
