import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  type UserRole,
  type UserProfile,
  ROLE_HOME_ROUTES,
  isPathAllowedForRole,
} from "@/lib/types/auth";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";

const SESSION_COOKIE_NAME = "assdi_portal_session";

export async function updateSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Bypass static assets and system routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Allow public API health check and auth action routes
  if (
    pathname === "/api/health" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signout"
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-ref.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

  // Create Supabase SSR client
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Helper for redirects that preserve cookies
  const createRedirect = (destination: string | URL) => {
    const redirectUrl = typeof destination === "string" ? new URL(destination, request.url) : destination;
    const response = NextResponse.redirect(redirectUrl);
    // Copy cookies from supabaseResponse
    supabaseResponse.cookies.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value, c);
    });
    return response;
  };

  // 3. Resolve user profile and role
  let userProfile: UserProfile | null = null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      // Check database profiles table
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("role, is_active, course_id, full_name, phone")
        .eq("id", user.id)
        .single();

      if (dbProfile) {
        userProfile = {
          id: user.id,
          email: user.email || "",
          full_name: dbProfile.full_name,
          phone: dbProfile.phone,
          role: dbProfile.role as UserRole,
          course_id: dbProfile.course_id,
          is_active: dbProfile.is_active,
          created_at: user.created_at,
        };
      } else if (user.user_metadata?.role) {
        userProfile = {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata.full_name || "Portal User",
          phone: user.user_metadata.phone || "",
          role: user.user_metadata.role as UserRole,
          course_id: user.user_metadata.course_id || null,
          is_active: true,
          created_at: user.created_at,
        };
      }
    }
  } catch {
    // Supabase unavailable or in mock mode
  }

  // Fallback to portal session cookie
  if (!userProfile) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie.value)) as UserProfile;
        if (parsed?.email) {
          const demo = DEMO_USERS[parsed.email.toLowerCase()];
          if (demo) {
            userProfile = toUserProfile(demo);
          } else {
            userProfile = parsed;
          }
        }
      } catch {
        // Invalid session cookie
      }
    }
  }

  // 4. Handle deactivated accounts
  if (userProfile && !userProfile.is_active) {
    const redirect = createRedirect("/login?error=deactivated");
    redirect.cookies.delete(SESSION_COOKIE_NAME);
    return redirect;
  }

  const isAuthenticated = Boolean(userProfile && userProfile.is_active);
  const userRole = userProfile?.role;
  const roleHome = userRole ? ROLE_HOME_ROUTES[userRole] : "/login";

  // 5. Handling `/login`
  if (pathname === "/login") {
    if (isAuthenticated && userRole) {
      // Check if there is a 'next' query param that is authorized for this role
      const nextParam = searchParams.get("next");
      if (nextParam && nextParam.startsWith("/") && isPathAllowedForRole(userRole, nextParam)) {
        return createRedirect(nextParam);
      }
      return createRedirect(roleHome);
    }
    return supabaseResponse;
  }

  // 6. Handling `/` (Root page)
  if (pathname === "/") {
    if (isAuthenticated && userRole) {
      return createRedirect(roleHome);
    }
    return createRedirect("/login");
  }

  // 7. Protected Routes Guarding
  const isProtectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/intern");

  if (isProtectedRoute) {
    // Unauthenticated -> redirect to /login with next param
    if (!isAuthenticated || !userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return createRedirect(loginUrl);
    }

    // Authenticated -> check role permission
    if (!isPathAllowedForRole(userRole, pathname)) {
      // Role violation: Redirect to their designated role dashboard
      return createRedirect(roleHome);
    }
  }

  return supabaseResponse;
}
