import { NextResponse } from "next/server";
import { getAllVenues } from "@/lib/requisitions/store";

export async function GET() {
  const venues = getAllVenues();
  return NextResponse.json({ success: true, venues });
}
