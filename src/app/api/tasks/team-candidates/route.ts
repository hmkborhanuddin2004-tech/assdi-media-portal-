import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { getAllGearItemsRaw } from "@/lib/gear/store";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  // Eligible team members are staff and intern users who are active
  const candidates = Object.values(DEMO_USERS)
    .filter((u) => (u.role === "staff" || u.role === "intern") && u.is_active)
    .map((u) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
    }));

  const allGear = getAllGearItemsRaw();

  return NextResponse.json({
    success: true,
    candidates,
    gear: allGear,
  });
}
