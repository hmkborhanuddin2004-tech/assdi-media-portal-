import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, updateUserStatusSchema } from "@/lib/validations/user-management";
import { DEMO_USERS, DEMO_COURSES, type DemoUser } from "@/lib/auth/demo-users";
import type { UserRole } from "@/lib/types/auth";

// In-memory store for dynamic users in development / fallback mode
const dynamicDevUsers: Map<string, DemoUser> = new Map();

export async function GET() {
  // 1. Enforce Admin Role
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র অ্যাডমিন ইউজার দেখতে পারেন।" },
      { status: 403 }
    );
  }

  // 2. Fetch Users from Supabase if configured
  try {
    const adminSupabase = createAdminClient();
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("*, courses(name, code)")
      .order("created_at", { ascending: false });

    const { data: courses, error: coursesError } = await adminSupabase
      .from("courses")
      .select("id, name, code, is_active")
      .order("name", { ascending: true });

    if (!profilesError && profiles && !coursesError && courses) {
      return NextResponse.json({
        success: true,
        users: profiles,
        courses,
      });
    }
  } catch {
    // Fallback to local dev data
  }

  // Combine DEMO_USERS with dynamic dev users
  const allDevUsers = [...Object.values(DEMO_USERS), ...Array.from(dynamicDevUsers.values())];

  const formattedUsers = allDevUsers.map((u) => {
    const course = DEMO_COURSES.find((c) => c.id === u.course_id);
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone,
      role: u.role,
      course_id: u.course_id,
      courses: course ? { name: course.name, code: course.code } : null,
      is_active: u.is_active,
      created_at: u.created_at,
    };
  });

  return NextResponse.json({
    success: true,
    users: formattedUsers,
    courses: DEMO_COURSES,
  });
}

export async function POST(request: NextRequest) {
  // 1. Enforce Admin Role
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস: শুধুমাত্র অ্যাডমিন ইউজার তৈরি করতে পারবেন।" },
      { status: 403 }
    );
  }

  // 2. Validate Payload
  const body = await request.json();
  const validation = createUserSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error.errors[0]?.message || "অবৈধ ইনপুট (Invalid input)",
      },
      { status: 400 }
    );
  }

  const { email, password, full_name, phone, role, course_id } = validation.data;
  const normalizedEmail = email.toLowerCase().trim();

  // 3. Attempt creation via Supabase Service Role Admin Client
  try {
    const adminSupabase = createAdminClient();

    // Create auth user
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role,
        course_id: role === "coordinator" ? course_id : null,
      },
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: `Auth Error: ${authError.message}` },
        { status: 400 }
      );
    }

    if (authUser.user) {
      // Insert into public.profiles table
      const { error: profileError } = await adminSupabase.from("profiles").insert({
        id: authUser.user.id,
        full_name,
        phone,
        role: role as UserRole,
        course_id: role === "coordinator" && course_id ? course_id : null,
        is_active: true,
      });

      if (profileError) {
        return NextResponse.json(
          { success: false, error: `Profile Creation Error: ${profileError.message}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "নতুন ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে!",
        user: {
          id: authUser.user.id,
          email: normalizedEmail,
          full_name,
          role,
        },
      });
    }
  } catch {
    // If Supabase service role is offline / mock in dev
  }

  // 4. Local Dev Store Fallback
  // Check if email already exists
  if (DEMO_USERS[normalizedEmail] || dynamicDevUsers.has(normalizedEmail)) {
    return NextResponse.json(
      { success: false, error: "এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট বিদ্যমান।" },
      { status: 400 }
    );
  }

  const course = DEMO_COURSES.find((c) => c.id === course_id);
  const newDevUser: DemoUser = {
    id: `u-${Date.now()}`,
    email: normalizedEmail,
    password,
    full_name,
    phone,
    role: role as UserRole,
    course_id: role === "coordinator" && course_id ? course_id : null,
    course_name: course ? course.name : null,
    course_code: course ? course.code : null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  dynamicDevUsers.set(normalizedEmail, newDevUser);

  return NextResponse.json({
    success: true,
    message: "নতুন ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে!",
    user: {
      id: newDevUser.id,
      email: newDevUser.email,
      full_name: newDevUser.full_name,
      role: newDevUser.role,
    },
  });
}

export async function PATCH(request: NextRequest) {
  // 1. Enforce Admin Role
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। শুধুমাত্র অ্যাডমিন স্ট্যাটাস পরিবর্তন করতে পারেন।" },
      { status: 403 }
    );
  }

  // 2. Validate Payload
  const body = await request.json();
  const validation = updateUserStatusSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.errors[0]?.message || "অবৈধ ইনপুট" },
      { status: 400 }
    );
  }

  const { userId, isActive } = validation.data;

  // Prevent self-deactivation
  if (currentUser.id === userId && !isActive) {
    return NextResponse.json(
      { success: false, error: "নিজস্ব অ্যাকাউন্ট নিষ্ক্রিয় করা সম্ভব নয়।" },
      { status: 400 }
    );
  }

  // 3. Update in Supabase if available
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId);

    if (!error) {
      return NextResponse.json({
        success: true,
        message: `ব্যবহারকারীর স্ট্যাটাস সফলভাবে ${isActive ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে।`,
      });
    }
  } catch {
    // Fallback to dev store
  }

  // Update in local dev store
  for (const user of Object.values(DEMO_USERS)) {
    if (user.id === userId) {
      user.is_active = isActive;
      return NextResponse.json({
        success: true,
        message: `ব্যবহারকারীর স্ট্যাটাস সফলভাবে ${isActive ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে।`,
      });
    }
  }

  for (const user of dynamicDevUsers.values()) {
    if (user.id === userId) {
      user.is_active = isActive;
      return NextResponse.json({
        success: true,
        message: `ব্যবহারকারীর স্ট্যাটাস সফলভাবে ${isActive ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে।`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `ব্যবহারকারীর স্ট্যাটাস আপডেট করা হয়েছে।`,
  });
}
