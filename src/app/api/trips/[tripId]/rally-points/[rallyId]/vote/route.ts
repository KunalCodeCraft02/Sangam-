import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import { serializeRallyPoint } from "@/lib/rallyPoint";
import { getWalkingRoute } from "@/lib/osrm";
import RallyPoint, { RALLY_VOTE_CHOICES } from "@/models/RallyPoint";
import User from "@/models/User";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string; rallyId: string }> }
) {
  const { tripId, rallyId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(rallyId)) {
    return NextResponse.json({ error: "Meeting point not found" }, { status: 404 });
  }

  const { vote } = await request.json();
  if (!RALLY_VOTE_CHOICES.includes(vote)) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  const rally = await RallyPoint.findOne({ _id: rallyId, tripId });
  if (!rally) {
    return NextResponse.json({ error: "Meeting point not found" }, { status: 404 });
  }
  if (rally.status !== "proposed") {
    return NextResponse.json({ error: "Voting has closed for this meeting point" }, { status: 409 });
  }

  const existingIndex = rally.votes.findIndex((v) => v.userId.toString() === auth.userId);
  if (existingIndex !== -1) {
    rally.votes.splice(existingIndex, 1);
  }
  rally.votes.push({
    userId: new mongoose.Types.ObjectId(auth.userId),
    vote,
    votedAt: new Date(),
  });

  const yesVotes = rally.votes.filter((v) => v.vote === "yes").length;
  const memberCount = auth.trip.memberIds.length;
  const hasMajority = yesVotes > memberCount / 2;

  if (hasMajority) {
    rally.status = "confirmed";
    rally.confirmedAt = new Date();

    const members = await User.find({ _id: { $in: auth.trip.memberIds } })
      .select("name location")
      .lean();

    const etaResults = await Promise.all(
      members
        .filter((m) => m.location)
        .map(async (m) => {
          const route = await getWalkingRoute(m.location!.lat, m.location!.lng, rally.lat, rally.lng);
          if (!route) return null;
          return {
            userId: m._id,
            userName: m.name,
            durationSeconds: route.durationSeconds,
            distanceMeters: route.distanceMeters,
            routeGeoJson: route.routeGeoJson,
          };
        })
    );

    rally.etas = etaResults.filter((e): e is NonNullable<typeof e> => e !== null);
  }

  await rally.save();

  return NextResponse.json({ rallyPoint: serializeRallyPoint(rally, auth.userId) });
}
