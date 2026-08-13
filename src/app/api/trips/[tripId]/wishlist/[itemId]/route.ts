import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import WishlistItem from "@/models/WishlistItem";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  const { tripId, itemId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(itemId)) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const result = await WishlistItem.deleteOne({ _id: itemId, tripId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Removed" });
}
