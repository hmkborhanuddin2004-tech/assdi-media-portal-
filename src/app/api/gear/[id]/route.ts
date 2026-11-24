import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getGearItemById,
  updateGearItem,
  deleteGearItem,
  RlsForbiddenError,
  PostgresUniqueViolationError,
} from "@/lib/gear/store";
import { updateGearSchema } from "@/lib/validations/gear";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const item = getGearItemById(id, currentUser);
    if (!item) {
      return NextResponse.json({ success: false, error: "Gear item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "শুধুমাত্র অ্যাডমিন সরঞ্জাম আপডেট করতে পারেন।" },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateGearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const item = updateGearItem(id, parsed.data, currentUser);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    if (err instanceof PostgresUniqueViolationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 409 });
    }
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "লগইন করুন" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "শুধুমাত্র অ্যাডমিন সরঞ্জাম মুছে ফেলতে পারেন।" },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    deleteGearItem(id, currentUser);
    return NextResponse.json({ success: true, message: "Gear item deleted" });
  } catch (err: unknown) {
    if (err instanceof RlsForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete item" },
      { status: 400 }
    );
  }
}
