import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import { reverseGeocode } from "@/lib/nominatim";
import { findWishlistMatch } from "@/lib/wishlistMatch";
import { sendPushToUsers } from "@/lib/pushNotify";
import { PRICE_LOG_CATEGORIES, type PriceLogCategory } from "@/lib/priceLogCategories";
import PriceLog, { type IPriceLog } from "@/models/PriceLog";
import WishlistItem from "@/models/WishlistItem";
import "@/models/User";

const MAX_RESULTS = 50;
const MAX_IMAGE_URL_LENGTH = 2048;

function serializeLog(log: IPriceLog & { _id: unknown }, loggedBy: string) {
  return {
    id: (log._id as { toString(): string }).toString(),
    itemName: log.itemName,
    priceInr: log.priceInr,
    lat: log.lat,
    lng: log.lng,
    locationName: log.locationName ?? null,
    shopName: log.shopName ?? null,
    category: log.category,
    imageUrl: log.imageUrl ?? null,
    loggedAt: log.loggedAt.toISOString(),
    loggedBy,
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const logs = await PriceLog.find({ tripId })
    .sort({ loggedAt: -1 })
    .limit(MAX_RESULTS)
    .populate("userId", "name")
    .lean();

  return NextResponse.json({
    logs: logs.map((log) => {
      const user = log.userId as unknown as { _id: unknown; name?: string } | null;
      return serializeLog(log, user?.name ?? "A trip member");
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const body = await request.json();
  const { clientId, itemName, priceInr, lat, lng, loggedAt, shopName, category, imageUrl } =
    body ?? {};

  if (typeof clientId !== "string" || !clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  if (typeof itemName !== "string" || !itemName.trim() || itemName.trim().length > 80) {
    return NextResponse.json({ error: "A valid item name is required" }, { status: 400 });
  }
  const price = Number(priceInr);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "A valid price in INR is required" }, { status: 400 });
  }
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    return NextResponse.json({ error: "Valid lat/lng are required" }, { status: 400 });
  }
  const loggedAtDate = loggedAt ? new Date(loggedAt) : new Date();
  if (Number.isNaN(loggedAtDate.getTime())) {
    return NextResponse.json({ error: "Invalid loggedAt timestamp" }, { status: 400 });
  }
  if (shopName !== undefined && (typeof shopName !== "string" || shopName.length > 120)) {
    return NextResponse.json({ error: "Shop name is too long" }, { status: 400 });
  }
  const resolvedCategory: PriceLogCategory = PRICE_LOG_CATEGORIES.includes(category)
    ? category
    : "Other";
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }
    if (imageUrl.length > MAX_IMAGE_URL_LENGTH) {
      return NextResponse.json({ error: "Image URL is too long" }, { status: 400 });
    }
  }

  // Idempotent replay: an offline-queued entry may be retried after a flaky
  // sync, so a log with the same clientId is treated as already-saved.
  const existing = await PriceLog.findOne({ tripId, clientId });
  if (existing) {
    return NextResponse.json({
      log: serializeLog(existing, "You"),
      duplicate: true,
    });
  }

  const locationName = await reverseGeocode(parsedLat, parsedLng);

  let log;
  try {
    log = await PriceLog.create({
      tripId,
      userId: auth.userId,
      clientId,
      itemName: itemName.trim(),
      priceInr: price,
      lat: parsedLat,
      lng: parsedLng,
      locationName: locationName ?? undefined,
      shopName: shopName?.trim() || undefined,
      category: resolvedCategory,
      imageUrl: imageUrl || undefined,
      loggedAt: loggedAtDate,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const raced = await PriceLog.findOne({ tripId, clientId });
      if (raced) {
        return NextResponse.json({ log: serializeLog(raced, "You"), duplicate: true });
      }
    }
    throw err;
  }

  // In-app toasts for currently-connected members are delivered over the SSE
  // stream (see prices/stream/route.ts). Here we additionally push a device
  // notification, but only to members whose *own* wishlist actually matches
  // — never the buyer, and never the whole trip.
  const otherMemberIds = auth.trip.memberIds
    .map((id) => id.toString())
    .filter((id) => id !== auth.userId);
  if (otherMemberIds.length > 0) {
    const otherWishlistItems = await WishlistItem.find({ tripId, addedBy: { $in: otherMemberIds } })
      .select("name addedBy")
      .lean();
    const itemsByUser = new Map<string, { id: string; name: string }[]>();
    for (const w of otherWishlistItems) {
      const uid = w.addedBy.toString();
      const list = itemsByUser.get(uid) ?? [];
      list.push({ id: w._id.toString(), name: w.name });
      itemsByUser.set(uid, list);
    }

    const matchedUserIds = Array.from(itemsByUser.entries())
      .filter(([, items]) => findWishlistMatch(itemName.trim(), items))
      .map(([uid]) => uid);

    if (matchedUserIds.length > 0) {
      const place = shopName?.trim() || locationName || "the market";
      await sendPushToUsers(matchedUserIds, {
        title: "Wishlist Alert",
        body: `${itemName.trim()} was just logged at ${place}!`,
        url: `/trip/${tripId}`,
      });
    }
  }

  return NextResponse.json({ log: serializeLog(log, "You") }, { status: 201 });
}
