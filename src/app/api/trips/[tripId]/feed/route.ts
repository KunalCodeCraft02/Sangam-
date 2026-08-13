import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import { loadGroupFeed } from "@/lib/groupFeed";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const items = await loadGroupFeed(tripId, auth.userId);
  return NextResponse.json({ items });
}
