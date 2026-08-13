import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import { getWalkingRoute } from "@/lib/osrm";
import RallyPoint from "@/models/RallyPoint";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string; rallyId: string }> }
) {
  const { tripId, rallyId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(rallyId)) {
    return NextResponse.json({ error: "Meeting point not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const fromLatParam = searchParams.get("fromLat");
  const fromLngParam = searchParams.get("fromLng");
  const fromLat = fromLatParam === null ? NaN : Number(fromLatParam);
  const fromLng = fromLngParam === null ? NaN : Number(fromLngParam);
  if (
    !Number.isFinite(fromLat) ||
    !Number.isFinite(fromLng) ||
    fromLat < -90 ||
    fromLat > 90 ||
    fromLng < -180 ||
    fromLng > 180
  ) {
    return NextResponse.json({ error: "Valid fromLat/fromLng are required" }, { status: 400 });
  }

  const rally = await RallyPoint.findOne({ _id: rallyId, tripId }).select("lat lng").lean();
  if (!rally) {
    return NextResponse.json({ error: "Meeting point not found" }, { status: 404 });
  }

  const route = await getWalkingRoute(fromLat, fromLng, rally.lat, rally.lng);
  if (!route) {
    return NextResponse.json({ error: "Couldn't find a walking route to this spot" }, { status: 502 });
  }

  return NextResponse.json({ route });
}
