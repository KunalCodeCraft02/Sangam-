import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import DeviceToken from "@/models/DeviceToken";

const PLATFORMS = ["android", "ios"] as const;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  const platform = body?.platform;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  await connectToDatabase();

  // A device re-registering (app reinstall, token refresh) reuses the same
  // FCM token string, so upsert on it rather than accumulating duplicates.
  await DeviceToken.findOneAndUpdate(
    { token },
    { userId: session.user.id, token, platform },
    { upsert: true }
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
