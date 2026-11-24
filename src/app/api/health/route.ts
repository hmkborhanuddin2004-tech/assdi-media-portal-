import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resetRequisitionsForTesting } from "@/lib/requisitions/store";
import { resetGearForTesting } from "@/lib/gear/store";
import { resetTasksForTesting } from "@/lib/tasks/store";
import { resetDailyLogsForTesting } from "@/lib/daily-logs/store";

export async function GET(request: NextRequest) {
  const resetParam = request.nextUrl.searchParams.get("reset");
  if (resetParam === "true" || resetParam === "1") {
    resetRequisitionsForTesting();
    resetGearForTesting({ withMockupSeed: true });
    resetTasksForTesting();
    resetDailyLogsForTesting();
    return NextResponse.json({
      status: "reset_ok",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = await createClient();

    // Verify Supabase connectivity
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        {
          status: "unhealthy",
          supabase: "error",
          error: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: "healthy",
        supabase: "connected",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        status: "unhealthy",
        supabase: "disconnected",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
