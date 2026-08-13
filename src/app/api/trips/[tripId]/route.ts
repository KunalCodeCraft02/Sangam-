import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Trip from "@/models/Trip";
import SosAlert from "@/models/SosAlert";
import "@/models/User";

export async function GET(
  _request: Request,
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

  await connectToDatabase();
  const trip = await Trip.findById(tripId)
    .populate("memberIds", "name email location")
    .lean();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const isMember = trip.memberIds.some(
    (member) => "_id" in member && member._id.toString() === session.user.id
  );
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeSosUserIds = new Set(
    (await SosAlert.find({ tripId, resolved: false }).select("userId").lean()).map((a) =>
      a.userId.toString()
    )
  );

  return NextResponse.json({
    id: trip._id.toString(),
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    status: trip.status,
    createdBy: trip.createdBy.toString(),
    members: trip.memberIds.map((member) => {
      const m = member as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        email: string;
        location?: { lat: number; lng: number; mode: string; updatedAt: Date };
      };
      return {
        id: m._id.toString(),
        name: m.name,
        location: m.location
          ? {
              lat: m.location.lat,
              lng: m.location.lng,
              mode: m.location.mode,
              updatedAt: m.location.updatedAt.toISOString(),
            }
          : null,
        hasActiveSos: activeSosUserIds.has(m._id.toString()),
      };
    }),
  });
}
