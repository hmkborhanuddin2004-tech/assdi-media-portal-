import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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
