import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import SosAlert from "@/models/SosAlert";
import User from "@/models/User";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const { lat, lng } = await request.json();
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

  const user = await User.findById(auth.userId).select("name").lean();

  const alert = await SosAlert.create({
    tripId,
    userId: auth.userId,
    userName: user?.name ?? "A trip member",
    lat,
    lng,
    resolved: false,
  });

  return NextResponse.json(
    {
      alert: {
        id: alert._id.toString(),
        userId: alert.userId.toString(),
        userName: alert.userName,
        lat: alert.lat,
        lng: alert.lng,
        resolved: alert.resolved,
        createdAt: alert.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
