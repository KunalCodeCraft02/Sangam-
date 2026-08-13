import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import PushSubscription from "@/models/PushSubscription";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const keys = body?.keys;

  if (
    typeof endpoint !== "string" ||
    !endpoint ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  await connectToDatabase();

  // A device re-subscribing (e.g. after clearing site data) reuses the same
  // endpoint URL, so upsert on it rather than accumulating duplicates.
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId: session.user.id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    { upsert: true }
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
