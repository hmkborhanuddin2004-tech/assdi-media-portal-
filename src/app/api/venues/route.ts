import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getAllVenues } from "@/lib/requisitions/store";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export async function GET() {
  if (!isPlaceholderSupabaseConfig()) {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, is_active")
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, venues: data });
      }
    } catch {
      // Fall through to store
    }
  }

  const venues = getAllVenues();
  return NextResponse.json({ success: true, venues });
}
