export type UserRole = "admin" | "coordinator" | "staff" | "intern";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  course_id: string | null;
  course_name?: string | null;
  course_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  coordinator: "/coordinator/requests",
  staff: "/staff/tasks",
  intern: "/intern/daily-log",
};

export const ROLE_LABELS: Record<UserRole, { en: string; bn: string }> = {
  admin: {
    en: "Media Head / Admin",
    bn: "মিডিয়া প্রধান / অ্যাডমিন",
  },
  coordinator: {
    en: "Course Coordinator",
    bn: "কোর্স কোঅর্ডিনেটর",
  },
  staff: {
    en: "Permanent Staff",
    bn: "স্থায়ী স্টাফ",
  },
  intern: {
    en: "Intern / Trainee",
    bn: "ইন্টার্ন / ট্রেইনি",
  },
};

export function getRoleHomeRoute(role: UserRole | string | null | undefined): string {
  if (role && role in ROLE_HOME_ROUTES) {
    return ROLE_HOME_ROUTES[role as UserRole];
  }
  return "/login";
}

export function isPathAllowedForRole(role: UserRole, pathname: string): boolean {
  if (role === "admin") {
    // Admin has access to all portal routes
    return true;
  }

  if (pathname.startsWith("/admin")) {
    return false;
  }

  if (pathname.startsWith("/coordinator")) {
    return role === "coordinator";
  }

  if (pathname.startsWith("/staff")) {
    return role === "staff";
  }

  if (pathname.startsWith("/intern")) {
    return role === "intern";
  }

  return true;
}
