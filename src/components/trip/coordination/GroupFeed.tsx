"use client";

import { useEffect, useState } from "react";
import { Siren, MapPin, CheckCircle2, Navigation } from "lucide-react";
import { useLocation } from "../LocationProvider";
import type { GroupFeedItem, MeetingRoute, RallyFeedItem, SosFeedItem } from "./types";

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "<1 min away";
  return `${mins} min${mins === 1 ? "" : "s"} away`;
}

function formatWalkMinutes(seconds: number) {
  const mins = Math.round(seconds / 60);
  return mins < 1 ? "under a minute" : `${mins} min${mins === 1 ? "" : "s"}`;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function SosCard({
  item,
  tripId,
  onUpdated,
}: {
  item: SosFeedItem;
  tripId: string;
  onUpdated: (item: GroupFeedItem) => void;
}) {
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    setResolving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/sos/${item.id}/resolve`, { method: "POST" });
      if (res.ok) {
        onUpdated({ ...item, resolved: true });
      }
    } finally {
      setResolving(false);
    }
  }

  return (
    <li
      className={`rounded-xl border-2 p-4 ${
        item.resolved ? "border-sand-200 bg-sand-50 opacity-70" : "border-red-300 bg-red-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Siren className={`mt-0.5 h-4 w-4 shrink-0 ${item.resolved ? "text-forest-500" : "text-red-600"}`} />
          <div>
            <p className={`text-sm font-bold ${item.resolved ? "text-forest-700" : "text-red-700"}`}>
              {item.resolved ? `${item.userName} is safe now` : `🚨 SOS ALERT: ${item.userName} needs help!`}
            </p>
            <p className="mt-0.5 text-xs text-forest-700/60">
              Last known location shared · {timeAgo(item.createdAt)}
            </p>
          </div>
        </div>
        {!item.resolved && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="shrink-0 rounded-full border border-forest-300 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-white disabled:opacity-50"
          >
            {resolving ? "..." : "Mark safe"}
          </button>
        )}
      </div>
    </li>
  );
}

function RallyCard({
  item,
  tripId,
  onUpdated,
  onShowRoute,
}: {
  item: RallyFeedItem;
  tripId: string;
  onUpdated: (item: GroupFeedItem) => void;
  onShowRoute: (route: MeetingRoute) => void;
}) {
  const { currentPosition } = useLocation();
  const [voting, setVoting] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState("");
  const [myRoute, setMyRoute] = useState<{
    durationSeconds: number;
    distanceMeters: number;
    routeGeoJson: [number, number][];
  } | null>(null);

  useEffect(() => {
    if (!currentPosition || item.status === "cancelled") return;
    let cancelled = false;
    const params = new URLSearchParams({
      fromLat: String(currentPosition.lat),
      fromLng: String(currentPosition.lng),
    });
    fetch(`/api/trips/${tripId}/rally-points/${item.id}/directions?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.route) setMyRoute(data.route);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tripId, item.id, item.status, currentPosition]);

  function handleShowRoute() {
    if (!myRoute) return;
    onShowRoute({
      rallyId: item.id,
      meetTimeLabel: item.meetTimeLabel,
      locationName: item.locationName,
      lat: item.lat,
      lng: item.lng,
      routeGeoJson: myRoute.routeGeoJson,
      durationSeconds: myRoute.durationSeconds,
      distanceMeters: myRoute.distanceMeters,
    });
  }

  async function castVote(vote: "yes" | "no") {
    setVoting(vote);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/rally-points/${item.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't vote");
      onUpdated({ type: "rally", ...data.rallyPoint });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't vote");
    } finally {
      setVoting(null);
    }
  }

  return (
    <li className="rounded-xl border border-sand-200 p-4">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-forest-900">
            {item.proposedByName} proposed a meeting at {item.meetTimeLabel}
          </p>
          <p className="mt-0.5 text-xs text-forest-700/60">{timeAgo(item.createdAt)}</p>

          {item.status !== "cancelled" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2">
              <Navigation className="h-3.5 w-3.5 shrink-0 text-saffron-700" />
              <p className="flex-1 text-xs font-medium text-forest-800">
                Meeting at {item.meetTimeLabel}
                {item.locationName ? ` (${item.locationName})` : ""}.{" "}
                {myRoute
                  ? `Walking time from your location: ${formatWalkMinutes(myRoute.durationSeconds)}.`
                  : currentPosition
                    ? "Calculating walking time…"
                    : "Enable your location to see walking time."}
              </p>
              {myRoute && (
                <button
                  type="button"
                  onClick={handleShowRoute}
                  className="shrink-0 rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:bg-forest-800"
                >
                  Show Route
                </button>
              )}
            </div>
          )}

          {item.status === "confirmed" ? (
            <div className="mt-3 rounded-lg bg-forest-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-forest-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Meeting Confirmed
              </p>
              {item.etas.length > 0 ? (
                <p className="mt-1 text-xs text-forest-700">
                  {item.etas
                    .map((e) => `${e.userName}: ${formatDuration(e.durationSeconds)}`)
                    .join("  ·  ")}
                </p>
              ) : (
                <p className="mt-1 text-xs text-forest-700/60">Calculating walking routes…</p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => castVote("yes")}
                  disabled={voting !== null}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    item.myVote === "yes"
                      ? "bg-forest-700 text-white"
                      : "border border-forest-300 text-forest-700 hover:bg-sand-50"
                  }`}
                >
                  Yes ({item.yesVotes})
                </button>
                <button
                  onClick={() => castVote("no")}
                  disabled={voting !== null}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    item.myVote === "no"
                      ? "bg-terracotta-600 text-white"
                      : "border border-terracotta-300 text-terracotta-700 hover:bg-sand-50"
                  }`}
                >
                  No ({item.noVotes})
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-terracotta-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function GroupFeed({
  tripId,
  items,
  onItemUpdated,
  onShowRoute,
}: {
  tripId: string;
  items: GroupFeedItem[];
  onItemUpdated: (item: GroupFeedItem) => void;
  onShowRoute: (route: MeetingRoute) => void;
}) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-forest-700/60">No alerts or meeting proposals yet.</p>;
  }

  // Unresolved SOS alerts stay pinned to the top regardless of recency.
  const sorted = [...items].sort((a, b) => {
    const aSticky = a.type === "sos" && !a.resolved ? 1 : 0;
    const bSticky = b.type === "sos" && !b.resolved ? 1 : 0;
    return bSticky - aSticky;
  });

  return (
    <ul className="mt-4 space-y-3">
      {sorted.map((item) =>
        item.type === "sos" ? (
          <SosCard key={item.id} item={item} tripId={tripId} onUpdated={onItemUpdated} />
        ) : (
          <RallyCard
            key={item.id}
            item={item}
            tripId={tripId}
            onUpdated={onItemUpdated}
            onShowRoute={onShowRoute}
          />
        )
      )}
    </ul>
  );
}
