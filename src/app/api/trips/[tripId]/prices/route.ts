import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/tripAuth";
import { reverseGeocode } from "@/lib/nominatim";
import { PRICE_LOG_CATEGORIES, type PriceLogCategory } from "@/lib/priceLogCategories";
import PriceLog, { type IPriceLog } from "@/models/PriceLog";
import "@/models/User";

const MAX_RESULTS = 50;
// Client-side compression targets ~100-200KB; this is a generous upper bound
// against abuse, well under MongoDB's 16MB document limit.
const MAX_IMAGE_STRING_LENGTH = 3_000_000;

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
    imageString: log.imageString ?? null,
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
  const { clientId, itemName, priceInr, lat, lng, loggedAt, shopName, category, imageString } =
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
  if (imageString !== undefined) {
    if (typeof imageString !== "string" || !imageString.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }
    if (imageString.length > MAX_IMAGE_STRING_LENGTH) {
      return NextResponse.json({ error: "Image is too large" }, { status: 400 });
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
      imageString: imageString || undefined,
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

  // Wishlist-match notifications are delivered to the matched (non-buying)
  // members over the SSE stream, not echoed back to the buyer here — see
  // prices/stream/route.ts.
  return NextResponse.json({ log: serializeLog(log, "You") }, { status: 201 });
}
