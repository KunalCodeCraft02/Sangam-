import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import SosAlert from "@/models/SosAlert";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; alertId: string }> }
) {
  const { tripId, alertId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(alertId)) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const alert = await SosAlert.findOne({ _id: alertId, tripId });
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  alert.resolved = true;
  alert.resolvedAt = new Date();
  await alert.save();

  return NextResponse.json({ message: "Resolved" });
}
