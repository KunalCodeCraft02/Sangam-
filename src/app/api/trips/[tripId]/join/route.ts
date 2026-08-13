import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip, { MAX_TRIP_MEMBERS } from "@/models/Trip";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.onboardingComplete) {
    return NextResponse.json(
      { error: "Please complete your dietary profile first" },
      { status: 403 }
    );
  }

  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  await connectToDatabase();
  const trip = await Trip.findById(tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const alreadyMember = trip.memberIds.some((id) => id.toString() === userId);
  if (alreadyMember) {
    return NextResponse.json({ message: "Already a member" }, { status: 200 });
  }

  if (trip.memberIds.length >= MAX_TRIP_MEMBERS) {
    return NextResponse.json(
      { error: `This trip is full (max ${MAX_TRIP_MEMBERS} members)` },
      { status: 409 }
    );
  }

  trip.memberIds.push(new mongoose.Types.ObjectId(userId));
  await trip.save();

  return NextResponse.json({ message: "Joined trip" }, { status: 200 });
}
