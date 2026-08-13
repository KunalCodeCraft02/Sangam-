import type { HydratedDocument } from "mongoose";
import type { IPoll } from "@/models/Poll";

export async function closeIfExpired(poll: HydratedDocument<IPoll>) {
  if (poll.status === "open" && Date.now() >= poll.closesAt.getTime()) {
    poll.status = "closed";
    await poll.save();
  }
  return poll;
}

export function serializePoll(poll: HydratedDocument<IPoll>, currentUserId: string) {
  const killedOsmIds = new Set(poll.vetoes.map((v) => v.osmId));

  const tally = new Map<string, number>();
  poll.votes.forEach((v) => {
    if (killedOsmIds.has(v.osmId)) return;
    tally.set(v.osmId, (tally.get(v.osmId) ?? 0) + 1);
  });

  const options = poll.options.map((opt) => ({
    osmId: opt.osmId,
    name: opt.name,
    lat: opt.lat,
    lng: opt.lng,
    cuisine: opt.cuisine,
    score: opt.score,
    light: opt.light,
    reasons: opt.reasons,
    votes: tally.get(opt.osmId) ?? 0,
    vetoed: killedOsmIds.has(opt.osmId),
    vetoedByMe: poll.vetoes.some((v) => v.osmId === opt.osmId && v.userId.toString() === currentUserId),
  }));

  const isOpen = poll.status === "open" && Date.now() < poll.closesAt.getTime();

  let winner = null;
  if (!isOpen) {
    const contenders = options.filter((o) => !o.vetoed);
    if (contenders.length > 0) {
      winner = contenders.reduce((best, o) =>
        o.votes > best.votes || (o.votes === best.votes && o.score > best.score) ? o : best
      );
    }
  }

  const myVote = poll.votes.find((v) => v.userId.toString() === currentUserId)?.osmId ?? null;
  const myVetoUsed = poll.vetoes.some((v) => v.userId.toString() === currentUserId);

  return {
    id: poll._id.toString(),
    tripId: poll.tripId.toString(),
    createdBy: poll.createdBy.toString(),
    status: isOpen ? ("open" as const) : ("closed" as const),
    createdAt: poll.createdAt.toISOString(),
    closesAt: poll.closesAt.toISOString(),
    remainingMs: Math.max(0, poll.closesAt.getTime() - Date.now()),
    totalVotes: options.reduce((sum, o) => sum + o.votes, 0),
    options,
    myVote,
    myVetoUsed,
    winner,
  };
}

export type SerializedPoll = ReturnType<typeof serializePoll>;
