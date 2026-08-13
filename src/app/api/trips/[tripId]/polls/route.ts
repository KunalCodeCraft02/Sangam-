import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import { closeIfExpired, serializePoll } from "@/lib/poll";
import { sendPushToUsers } from "@/lib/pushNotify";
import Poll, { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS, POLL_DURATION_MS } from "@/models/Poll";

interface IncomingOption {
  osmId?: unknown;
  name?: unknown;
  lat?: unknown;
  lng?: unknown;
  cuisine?: unknown;
  score?: unknown;
  light?: unknown;
  reasons?: unknown;
}

interface CleanOption {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  cuisine?: string;
  score: number;
  light: "green" | "yellow";
  reasons: string[];
}

function toCleanOption(o: IncomingOption): CleanOption | null {
  const osmId = String(o.osmId ?? "");
  const name = String(o.name ?? "");
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  const score = Number(o.score);
  const light = o.light;

  if (
    !osmId ||
    !name ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(score) ||
    (light !== "green" && light !== "yellow")
  ) {
    return null;
  }

  return {
    osmId,
    name,
    lat,
    lng,
    cuisine: o.cuisine ? String(o.cuisine) : undefined,
    score,
    light,
    reasons: Array.isArray(o.reasons) ? o.reasons.map(String) : [],
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const poll = await Poll.findOne({ tripId }).sort({ createdAt: -1 });
  if (!poll) {
    return NextResponse.json({ poll: null });
  }

  await closeIfExpired(poll);
  return NextResponse.json({ poll: serializePoll(poll, auth.userId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const body = await request.json();
  const options: IncomingOption[] = Array.isArray(body?.options) ? body.options : [];

  if (options.length < MIN_POLL_OPTIONS || options.length > MAX_POLL_OPTIONS) {
    return NextResponse.json(
      { error: `Select ${MIN_POLL_OPTIONS}-${MAX_POLL_OPTIONS} restaurants for the poll` },
      { status: 400 }
    );
  }

  const cleanOptions = options.map(toCleanOption);
  if (cleanOptions.some((o) => o === null)) {
    return NextResponse.json(
      { error: "Only green or yellow restaurants with valid data can go to a poll" },
      { status: 400 }
    );
  }
  const validOptions = cleanOptions as CleanOption[];

  const uniqueOsmIds = new Set(validOptions.map((o) => o.osmId));
  if (uniqueOsmIds.size !== validOptions.length) {
    return NextResponse.json({ error: "Duplicate restaurant selected" }, { status: 400 });
  }

  const now = new Date();
  const poll = await Poll.create({
    tripId,
    createdBy: auth.userId,
    options: validOptions,
    votes: [],
    vetoes: [],
    status: "open",
    createdAt: now,
    closesAt: new Date(now.getTime() + POLL_DURATION_MS),
  });

  const otherMemberIds = auth.trip.memberIds
    .map((id) => id.toString())
    .filter((id) => id !== auth.userId);
  await sendPushToUsers(otherMemberIds, {
    title: "New Food Poll",
    body: `${validOptions.length} restaurants proposed for dinner!`,
    url: `/trip/${tripId}`,
  });

  return NextResponse.json({ poll: serializePoll(poll, auth.userId) }, { status: 201 });
}
