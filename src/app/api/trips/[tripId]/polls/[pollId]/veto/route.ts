import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import { closeIfExpired, serializePoll } from "@/lib/poll";
import Poll from "@/models/Poll";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string; pollId: string }> }
) {
  const { tripId, pollId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(pollId)) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const { osmId } = await request.json();
  if (typeof osmId !== "string" || !osmId) {
    return NextResponse.json({ error: "osmId is required" }, { status: 400 });
  }

  const poll = await Poll.findOne({ _id: pollId, tripId });
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  await closeIfExpired(poll);
  if (poll.status !== "open") {
    return NextResponse.json({ error: "This poll has closed" }, { status: 409 });
  }

  if (!poll.options.some((o) => o.osmId === osmId)) {
    return NextResponse.json({ error: "Unknown restaurant option" }, { status: 400 });
  }
  if (poll.vetoes.some((v) => v.userId.toString() === auth.userId)) {
    return NextResponse.json(
      { error: "You've already used your one-time veto for this poll" },
      { status: 409 }
    );
  }

  poll.vetoes.push({
    userId: new mongoose.Types.ObjectId(auth.userId),
    osmId,
    vetoedAt: new Date(),
  });
  await poll.save();

  return NextResponse.json({ poll: serializePoll(poll, auth.userId) });
}
