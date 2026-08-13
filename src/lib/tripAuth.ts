import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose, { type HydratedDocument } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip, { type ITrip } from "@/models/Trip";

type TripMembershipResult =
  | { error: NextResponse; userId?: undefined; trip?: undefined }
  | { error: null; userId: string; trip: HydratedDocument<ITrip> };

export async function requireTripMember(tripId: string): Promise<TripMembershipResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!mongoose.isValidObjectId(tripId)) {
    return { error: NextResponse.json({ error: "Trip not found" }, { status: 404 }) };
  }

  await connectToDatabase();
  const trip = await Trip.findById(tripId);
  if (!trip) {
    return { error: NextResponse.json({ error: "Trip not found" }, { status: 404 }) };
  }

  const isMember = trip.memberIds.some((id) => id.toString() === session.user.id);
  if (!isMember) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null, userId: session.user.id, trip };
}
