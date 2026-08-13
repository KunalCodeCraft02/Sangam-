import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import { getWalkingRoute } from "@/lib/osrm";
import PriceLog from "@/models/PriceLog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string; priceLogId: string }> }
) {
  const { tripId, priceLogId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(priceLogId)) {
    return NextResponse.json({ error: "Price log not found" }, { status: 404 });
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

  const log = await PriceLog.findOne({ _id: priceLogId, tripId }).select("lat lng").lean();
  if (!log) {
    return NextResponse.json({ error: "Price log not found" }, { status: 404 });
  }

  const route = await getWalkingRoute(fromLat, fromLng, log.lat, log.lng);
  if (!route) {
    return NextResponse.json({ error: "Couldn't find a walking route to this spot" }, { status: 502 });
  }

  return NextResponse.json({ route });
}
