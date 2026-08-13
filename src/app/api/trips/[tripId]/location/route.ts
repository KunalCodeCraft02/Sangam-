import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip from "@/models/Trip";
import User, { LOCATION_MODES } from "@/models/User";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const { lat, lng, mode } = await request.json();

  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 });
  }
  if (!LOCATION_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  await connectToDatabase();

  const trip = await Trip.findById(tripId).select("memberIds").lean();
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  const isMember = trip.memberIds.some((id) => id.toString() === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await User.findByIdAndUpdate(session.user.id, {
    location: { lat, lng, mode, updatedAt: new Date() },
  });

  return NextResponse.json({ message: "Location updated" }, { status: 200 });
}
