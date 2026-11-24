import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/user-management";
import { getDemoUserByEmail, toUserProfile } from "@/lib/auth/demo-users";
import { ROLE_HOME_ROUTES, type UserRole } from "@/lib/types/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createSignedSessionToken } from "@/lib/auth/session-token";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return url.includes("your-project-ref") || key === "your-anon-key" || !url || !key;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "অবৈধ ইনপুট (Invalid input)",
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Attempt Supabase Auth login if live credentials configured
    if (!isPlaceholderSupabaseConfig()) {
      try {
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!authError && authData.user) {
          // Query profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_active, full_name, phone, course_id")
            .eq("id", authData.user.id)
            .single();

          if (profile) {
            if (!profile.is_active) {
              await supabase.auth.signOut();
              return NextResponse.json(
                {
                  success: false,
                  error:
                    "আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় করা আছে। মিডিয়া প্রধানের সাথে যোগাযোগ করুন। (Account is deactivated)",
                },
                { status: 403 }
              );
            }

            const role = profile.role as UserRole;
            const redirectTo = ROLE_HOME_ROUTES[role] || "/admin/dashboard";

            const response = NextResponse.json({
              success: true,
              role,
              redirectTo,
              user: {
                id: authData.user.id,
                email: authData.user.email,
                full_name: profile.full_name,
                role,
              },
            });

            // Set backup session cookie
            const userSession = {
              id: authData.user.id,
              email: authData.user.email || "",
              full_name: profile.full_name,
              phone: profile.phone,
              role,
              course_id: profile.course_id,
              is_active: true,
              created_at: authData.user.created_at,
            };

            const sessionToken = await createSignedSessionToken(userSession);
            response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 7, // 7 days
            });

            return response;
          }
        }
      } catch {
        // Supabase unavailable or local dev/test mode
      }
    }

    // 2. Dev / Seed Fallback Authentication
    const demo = getDemoUserByEmail(normalizedEmail);
    if (demo) {
      if (demo.password !== password) {
        return NextResponse.json(
          {
            success: false,
            error: "ভুল পাসওয়ার্ড। আবার চেষ্টা করুন। (Invalid password)",
          },
          { status: 401 }
        );
      }

      if (!demo.is_active) {
        return NextResponse.json(
          {
            success: false,
            error:
              "আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় করা আছে। মিডিয়া প্রধানের সাথে যোগাযোগ করুন। (Account is deactivated)",
          },
          { status: 403 }
        );
      }

      const userProfile = toUserProfile(demo);
      const redirectTo = ROLE_HOME_ROUTES[demo.role];

      const response = NextResponse.json({
        success: true,
        role: demo.role,
        redirectTo,
        user: {
          id: demo.id,
          email: demo.email,
          full_name: demo.full_name,
          role: demo.role,
        },
      });

      const sessionToken = await createSignedSessionToken(userProfile);

      response.cookies.set(
        SESSION_COOKIE_NAME,
        sessionToken,
        {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        }
      );

      return response;
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "ভুল ইমেইল বা পাসওয়ার্ড অথবা অ্যাকাউন্টটি বিদ্যমান নেই। (Invalid credentials)",
      },
      { status: 401 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: `সার্ভার ত্রুটি: ${message}` },
      { status: 500 }
    );
  }
}
