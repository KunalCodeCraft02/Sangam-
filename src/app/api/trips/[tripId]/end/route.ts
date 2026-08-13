import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (auth.trip.createdBy.toString() !== auth.userId) {
    return NextResponse.json({ error: "Only the trip leader can end the trip" }, { status: 403 });
  }
  if (auth.trip.status === "completed") {
    return NextResponse.json({ message: "Trip already ended" });
  }

  auth.trip.status = "completed";
  auth.trip.endedAt = new Date();
  await auth.trip.save();

  return NextResponse.json({ message: "Trip ended" });
}
