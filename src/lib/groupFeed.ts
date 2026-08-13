import SosAlert from "@/models/SosAlert";
import RallyPoint from "@/models/RallyPoint";
import { serializeRallyPoint } from "./rallyPoint";

const ITEMS_LIMIT = 50;

export async function loadGroupFeed(tripId: string, currentUserId: string) {
  const [sosAlerts, rallyPoints] = await Promise.all([
    SosAlert.find({ tripId }).sort({ createdAt: -1 }).limit(ITEMS_LIMIT).lean(),
    RallyPoint.find({ tripId }).sort({ createdAt: -1 }).limit(ITEMS_LIMIT),
  ]);

  const items = [
    ...sosAlerts.map((a) => ({
      type: "sos" as const,
      id: a._id.toString(),
      userId: a.userId.toString(),
      userName: a.userName,
      lat: a.lat,
      lng: a.lng,
      resolved: a.resolved,
      createdAt: a.createdAt.toISOString(),
    })),
    ...rallyPoints.map((r) => ({
      type: "rally" as const,
      ...serializeRallyPoint(r, currentUserId),
    })),
  ];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items;
}

export type GroupFeedItem = Awaited<ReturnType<typeof loadGroupFeed>>[number];
