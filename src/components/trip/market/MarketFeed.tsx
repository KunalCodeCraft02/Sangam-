"use client";

import { useMemo, useState } from "react";
import { Clock, MapPin, Store, Navigation, Tag } from "lucide-react";
import { useLocation } from "../LocationProvider";
import { PRICE_LOG_CATEGORIES, type PriceLogCategory } from "@/lib/priceLogCategories";
import type { SyncedPriceLog } from "./useOfflineQueue";
import type { ShoppingRoute } from "./types";

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const FILTER_OPTIONS: ("All" | PriceLogCategory)[] = ["All", ...PRICE_LOG_CATEGORIES];

export default function MarketFeed({
  tripId,
  logs,
  onTakeMeThere,
}: {
  tripId: string;
  logs: SyncedPriceLog[];
  onTakeMeThere: (route: ShoppingRoute) => void;
}) {
  const { currentPosition } = useLocation();
  const [filter, setFilter] = useState<"All" | PriceLogCategory>("All");
  const [routingLogId, setRoutingLogId] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);

  const filteredLogs = useMemo(
    () => (filter === "All" ? logs : logs.filter((log) => log.category === filter)),
    [logs, filter]
  );

  async function handleTakeMeThere(log: SyncedPriceLog) {
    if (!currentPosition) {
      setRoutingError("Turn on Real GPS or drop a simulated pin on the map first.");
      return;
    }
    setRoutingLogId(log.id);
    setRoutingError(null);
    try {
      const params = new URLSearchParams({
        fromLat: String(currentPosition.lat),
        fromLng: String(currentPosition.lng),
      });
      const res = await fetch(`/api/trips/${tripId}/prices/${log.id}/directions?${params}`);
      const data = await res.json();
      if (!res.ok || !data.route) {
        throw new Error(data.error || "Couldn't find a walking route to this spot");
      }
      onTakeMeThere({
        logId: log.id,
        itemName: log.itemName,
        lat: log.lat,
        lng: log.lng,
        routeGeoJson: data.route.routeGeoJson,
        durationSeconds: data.route.durationSeconds,
        distanceMeters: data.route.distanceMeters,
      });
    } catch (err) {
      setRoutingError(err instanceof Error ? err.message : "Couldn't find a walking route");
    } finally {
      setRoutingLogId(null);
    }
  }

  if (logs.length === 0) {
    return (
      <p className="mt-4 text-sm text-forest-700/60">
        No prices logged yet. Be the first to log a market find!
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === option
                ? "bg-forest-700 text-white"
                : "border border-sand-200 text-forest-600 hover:bg-sand-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {routingError && (
        <p className="mt-3 rounded-xl bg-terracotta-100 px-4 py-2.5 text-sm text-terracotta-700">
          {routingError}
        </p>
      )}

      {filteredLogs.length === 0 ? (
        <p className="mt-4 text-sm text-forest-700/60">No logs in this category yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filteredLogs.map((log) => (
            <li key={log.id} className="rounded-xl border border-sand-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {log.imageString ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={log.imageString}
                      alt={log.itemName}
                      className="h-14 w-14 shrink-0 rounded-lg border border-sand-200 object-cover"
                    />
                  ) : null}
                  <div>
                    <h3 className="font-semibold text-forest-900">{log.itemName}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-forest-700">
                      <Tag className="h-3.5 w-3.5" />
                      {log.category}
                    </p>
                    {log.shopName && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-forest-700/70">
                        <Store className="h-3.5 w-3.5" />
                        {log.shopName}
                      </p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-forest-700/60">
                      <MapPin className="h-3.5 w-3.5" />
                      {log.locationName ?? "Location unknown"}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-forest-50 px-3 py-1 text-sm font-bold text-forest-800">
                  {rupeeFormatter.format(log.priceInr)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs text-forest-500">
                  <Clock className="h-3.5 w-3.5" />
                  {log.loggedBy} · {timeFormatter.format(new Date(log.loggedAt))}
                </p>
                <button
                  type="button"
                  onClick={() => handleTakeMeThere(log)}
                  disabled={routingLogId === log.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-forest-300 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {routingLogId === log.id ? "Finding route..." : "Take me there"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
