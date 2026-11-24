import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";
import type { UserProfile } from "@/lib/types/auth";

export const SESSION_COOKIE_NAME = "assdi_portal_session";

export async function getCurrentUser(): Promise<UserProfile | null> {
  // 1. Try Supabase Auth via SSR client
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      // Fetch profile from Supabase
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, courses(name, code)")
        .eq("id", user.id)
        .single();

      if (profile) {
        const courseData = profile.courses as { name: string; code: string } | null;
        return {
          id: user.id,
          email: user.email || "",
          full_name: profile.full_name,
          phone: profile.phone,
          role: profile.role,
          course_id: profile.course_id,
          course_name: courseData?.name || null,
          course_code: courseData?.code || null,
          is_active: profile.is_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
      }

      // Fallback to user metadata if profile table row not yet inserted
      if (user.user_metadata?.role) {
        return {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata.full_name || "User",
          phone: user.user_metadata.phone || "",
          role: user.user_metadata.role,
          course_id: user.user_metadata.course_id || null,
          is_active: true,
          created_at: user.created_at,
        };
      }
    }
  } catch {
    // If Supabase is unreachable or in mock mode, continue to session cookie
  }

  // 2. Read portal session cookie
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (sessionCookie?.value) {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie.value)) as UserProfile;
      if (parsed && parsed.email) {
        // If known demo user, verify is_active flag
        const demo = DEMO_USERS[parsed.email.toLowerCase()];
        if (demo) {
          return toUserProfile(demo);
        }
        return parsed;
      }
    }
  } catch {
    // Malformed session cookie
  }

  return null;
}
