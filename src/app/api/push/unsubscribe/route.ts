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
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await connectToDatabase();
  await PushSubscription.deleteOne({ endpoint, userId: session.user.id });

  return NextResponse.json({ ok: true });
}
