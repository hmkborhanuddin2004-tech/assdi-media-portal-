import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAllTasks } from "@/lib/tasks/store";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" },
      { status: 401 }
    );
  }

  try {
    const tasks = getAllTasks(currentUser);
    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "টাস্ক তালিকা লোড করতে ব্যর্থ হয়েছে";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
