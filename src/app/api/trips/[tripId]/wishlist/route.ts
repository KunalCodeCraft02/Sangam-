import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import WishlistItem from "@/models/WishlistItem";
import "@/models/User";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const items = await WishlistItem.find({ tripId })
    .populate("addedBy", "name")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    items: items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      addedBy:
        item.addedBy && "name" in item.addedBy
          ? (item.addedBy as unknown as { name: string }).name
          : "A trip member",
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const { name } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  if (name.trim().length > 80) {
    return NextResponse.json({ error: "Item name is too long" }, { status: 400 });
  }

  const item = await WishlistItem.create({
    tripId,
    name: name.trim(),
    addedBy: auth.userId,
  });

  return NextResponse.json(
    {
      item: {
        id: item._id.toString(),
        name: item.name,
        addedBy: "You",
        createdAt: item.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
