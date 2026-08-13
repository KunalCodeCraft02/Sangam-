import Poll from "@/models/Poll";
import PriceLog from "@/models/PriceLog";
import RallyPoint from "@/models/RallyPoint";
import "@/models/User";

export interface DigestData {
  topRestaurant: { name: string; votes: number } | null;
  bestDeal: {
    itemName: string;
    priceInr: number;
    locationName: string | null;
    loggedBy: string;
  } | null;
  totalSpend: number;
  spendByMember: { userName: string; total: number }[];
  heatPoints: { lat: number; lng: number }[];
}

export async function loadTripDigest(tripId: string): Promise<DigestData> {
  const [polls, priceLogs, rallyPoints] = await Promise.all([
    Poll.find({ tripId }).lean(),
    PriceLog.find({ tripId }).populate("userId", "name").lean(),
    RallyPoint.find({ tripId, status: "confirmed" }).select("lat lng").lean(),
  ]);

  let topRestaurant: DigestData["topRestaurant"] = null;
  for (const poll of polls) {
    const killedOsmIds = new Set(poll.vetoes.map((v) => v.osmId));
    const tally = new Map<string, number>();
    poll.votes.forEach((v) => {
      if (killedOsmIds.has(v.osmId)) return;
      tally.set(v.osmId, (tally.get(v.osmId) ?? 0) + 1);
    });
    for (const opt of poll.options) {
      if (killedOsmIds.has(opt.osmId)) continue;
      const votes = tally.get(opt.osmId) ?? 0;
      if (votes > 0 && (!topRestaurant || votes > topRestaurant.votes)) {
        topRestaurant = { name: opt.name, votes };
      }
    }
  }

  let bestDeal: DigestData["bestDeal"] = null;
  let totalSpend = 0;
  const spendByUser = new Map<string, { userName: string; total: number }>();

  for (const log of priceLogs) {
    totalSpend += log.priceInr;

    const user = log.userId as unknown as { _id: { toString(): string }; name?: string } | null;
    const userName = user?.name ?? "A trip member";
    const key = user?._id?.toString() ?? "unknown";

    const entry = spendByUser.get(key) ?? { userName, total: 0 };
    entry.total += log.priceInr;
    spendByUser.set(key, entry);

    if (!bestDeal || log.priceInr < bestDeal.priceInr) {
      bestDeal = {
        itemName: log.itemName,
        priceInr: log.priceInr,
        locationName: log.locationName ?? null,
        loggedBy: userName,
      };
    }
  }

  const heatPoints = [
    ...priceLogs.map((l) => ({ lat: l.lat, lng: l.lng })),
    ...rallyPoints.map((r) => ({ lat: r.lat, lng: r.lng })),
  ];

  return {
    topRestaurant,
    bestDeal,
    totalSpend,
    spendByMember: [...spendByUser.values()].sort((a, b) => b.total - a.total),
    heatPoints,
  };
}
