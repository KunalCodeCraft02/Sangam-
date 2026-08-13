import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import { serializeRallyPoint } from "@/lib/rallyPoint";
import { reverseGeocode } from "@/lib/nominatim";
import { sendPushToUsers } from "@/lib/pushNotify";
import RallyPoint from "@/models/RallyPoint";
import User from "@/models/User";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const rallyPoints = await RallyPoint.find({ tripId }).sort({ createdAt: -1 });

  return NextResponse.json({
    rallyPoints: rallyPoints.map((r) => serializeRallyPoint(r, auth.userId)),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const { lat, lng, meetTimeLabel } = await request.json();
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "Valid lat/lng are required" }, { status: 400 });
  }
  if (typeof meetTimeLabel !== "string" || !meetTimeLabel.trim()) {
    return NextResponse.json({ error: "A meeting time is required" }, { status: 400 });
  }

  const user = await User.findById(auth.userId).select("name").lean();
  const locationName = await reverseGeocode(lat, lng);

  const rally = await RallyPoint.create({
    tripId,
    proposedBy: auth.userId,
    proposedByName: user?.name ?? "A trip member",
    lat,
    lng,
    locationName: locationName ?? undefined,
    meetTimeLabel: meetTimeLabel.trim(),
    status: "proposed",
    votes: [],
    etas: [],
  });

  const otherMemberIds = auth.trip.memberIds
    .map((id) => id.toString())
    .filter((id) => id !== auth.userId);
  await sendPushToUsers(otherMemberIds, {
    title: "Rally Alert",
    body: `Group meeting proposed at ${meetTimeLabel.trim()}.`,
    url: `/trip/${tripId}`,
  });

  return NextResponse.json(
    { rallyPoint: serializeRallyPoint(rally, auth.userId) },
    { status: 201 }
  );
}
