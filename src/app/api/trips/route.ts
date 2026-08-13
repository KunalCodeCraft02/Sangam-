import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip from "@/models/Trip";

export async function POST(request: Request) {
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

  const { name, destination, destLat, destLng, startDate, endDate } = await request.json();

  if (!name || !destination || !startDate || !endDate) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (
    (destLat !== undefined && typeof destLat !== "number") ||
    (destLng !== undefined && typeof destLng !== "number")
  ) {
    return NextResponse.json({ error: "Invalid destination coordinates" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }
  if (end < start) {
    return NextResponse.json(
      { error: "End date must be on or after the start date" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const trip = await Trip.create({
    name,
    destination,
    destLat,
    destLng,
    startDate: start,
    endDate: end,
    createdBy: session.user.id,
    memberIds: [session.user.id],
  });

  return NextResponse.json({ id: trip._id.toString() }, { status: 201 });
}
