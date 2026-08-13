import type { HydratedDocument } from "mongoose";
import type { IRallyPoint } from "@/models/RallyPoint";

export function serializeRallyPoint(rally: HydratedDocument<IRallyPoint>, currentUserId: string) {
  const yesVotes = rally.votes.filter((v) => v.vote === "yes").length;
  const noVotes = rally.votes.filter((v) => v.vote === "no").length;
  const myVote = rally.votes.find((v) => v.userId.toString() === currentUserId)?.vote ?? null;

  return {
    id: rally._id.toString(),
    tripId: rally.tripId.toString(),
    proposedBy: rally.proposedBy.toString(),
    proposedByName: rally.proposedByName,
    lat: rally.lat,
    lng: rally.lng,
    locationName: rally.locationName ?? null,
    meetTimeLabel: rally.meetTimeLabel,
    status: rally.status,
    yesVotes,
    noVotes,
    myVote,
    createdAt: rally.createdAt.toISOString(),
    confirmedAt: rally.confirmedAt?.toISOString() ?? null,
    etas: rally.etas.map((e) => ({
      userId: e.userId.toString(),
      userName: e.userName,
      durationSeconds: e.durationSeconds,
      distanceMeters: e.distanceMeters,
      routeGeoJson: e.routeGeoJson,
    })),
  };
}

export type SerializedRallyPoint = ReturnType<typeof serializeRallyPoint>;
