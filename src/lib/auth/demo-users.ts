import type { UserProfile, UserRole } from "@/lib/types/auth";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
  course_id: string | null;
  course_name?: string | null;
  course_code?: string | null;
  is_active: boolean;
  created_at: string;
}

export const DEMO_USERS: Record<string, DemoUser> = {
  "admin@assdi.org": {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@assdi.org",
    password: "assdi123",
    full_name: "Engr. Mahmudul Hasan",
    phone: "01711000001",
    role: "admin",
    course_id: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  "coordinator@assdi.org": {
    id: "00000000-0000-0000-0000-000000000002",
    email: "coordinator@assdi.org",
    password: "assdi123",
    full_name: "Muhammad Abdullah",
    phone: "01711000002",
    role: "coordinator",
    course_id: "c1000000-0000-0000-0000-000000000001",
    course_name: "Refrigeration & Air Conditioning (RAC)",
    course_code: "RAC",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  "staff@assdi.org": {
    id: "00000000-0000-0000-0000-000000000003",
    email: "staff@assdi.org",
    password: "assdi123",
    full_name: "Tariqul Islam",
    phone: "01711000003",
    role: "staff",
    course_id: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  "intern@assdi.org": {
    id: "00000000-0000-0000-0000-000000000004",
    email: "intern@assdi.org",
    password: "assdi123",
    full_name: "Habibur Rahman",
    phone: "01711000004",
    role: "intern",
    course_id: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  "deactivated@assdi.org": {
    id: "00000000-0000-0000-0000-000000000005",
    email: "deactivated@assdi.org",
    password: "assdi123",
    full_name: "Deactivated Staff",
    phone: "01711000005",
    role: "staff",
    course_id: null,
    is_active: false,
    created_at: "2026-01-01T00:00:00Z",
  },
};

export const DEMO_COURSES = [
  { id: "c1000000-0000-0000-0000-000000000001", name: "Refrigeration & Air Conditioning (RAC)", code: "RAC" },
  { id: "c1000000-0000-0000-0000-000000000002", name: "Motorcycle Servicing", code: "MOTO" },
  { id: "c1000000-0000-0000-0000-000000000003", name: "Mobile Servicing", code: "MOB" },
  { id: "c1000000-0000-0000-0000-000000000004", name: "Electrical", code: "ELEC" },
  { id: "c1000000-0000-0000-0000-000000000005", name: "SBMC (Bakery & Pastry)", code: "SBMC" },
  { id: "c1000000-0000-0000-0000-000000000006", name: "English Language", code: "ENG" },
  { id: "c1000000-0000-0000-0000-000000000007", name: "The Art of Creation", code: "AOC" },
  { id: "c1000000-0000-0000-0000-000000000008", name: "Professional Cooking", code: "COOK" },
  { id: "c1000000-0000-0000-0000-000000000009", name: "Dawah", code: "DAWAH" },
];

export function getDemoUserByEmail(email: string): DemoUser | null {
  return DEMO_USERS[email.toLowerCase().trim()] || null;
}

export function toUserProfile(user: DemoUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    course_id: user.course_id,
    course_name: user.course_name,
    course_code: user.course_code,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}
