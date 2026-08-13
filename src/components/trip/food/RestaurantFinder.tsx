"use client";

import { useState } from "react";
import { Search, Loader2, ThumbsUp, Utensils } from "lucide-react";
import { useLocation } from "../LocationProvider";
import LoadingOverlay from "@/components/LoadingOverlay";

const SEARCH_MESSAGES = [
  "Scanning nearby restaurants...",
  "Analyzing group dietary profiles...",
  "Scoring matches for everyone...",
];

export interface AffectedMember {
  name: string;
  dietType: "veg" | "non-veg" | "jain" | "vegan";
  status: "unsuitable" | "limited";
}

export interface Restaurant {
  osmId: string;
  name: string;
  amenity?: string;
  cuisine?: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  score: number;
  light: "green" | "yellow" | "red";
  reasons: string[];
  notes: string[];
  affectedMembers: AffectedMember[];
  impactSummary: string | null;
}

const LIGHT_STYLES: Record<Restaurant["light"], { dot: string; badge: string; impact: string }> = {
  green: {
    dot: "bg-forest-500",
    badge: "border-forest-200 bg-forest-50 text-forest-700",
    impact: "border-forest-200 bg-forest-50 text-forest-700",
  },
  yellow: {
    dot: "bg-saffron-500",
    badge: "border-saffron-200 bg-saffron-50 text-saffron-700",
    impact: "border-saffron-300 bg-saffron-50 text-saffron-800",
  },
  red: {
    dot: "bg-terracotta-600",
    badge: "border-terracotta-200 bg-terracotta-50 text-terracotta-700",
    impact: "border-terracotta-300 bg-terracotta-50 text-terracotta-800",
  },
};

const MAX_SELECTED = 3;

export default function RestaurantFinder({
  tripId,
  onStartPoll,
}: {
  tripId: string;
  onStartPoll: (options: Restaurant[]) => Promise<void>;
}) {
  const { currentPosition } = useLocation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!currentPosition) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(
        `/api/trips/${tripId}/restaurants?lat=${currentPosition.lat}&lng=${currentPosition.lng}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setRestaurants(data.restaurants);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(osmId: string, light: Restaurant["light"]) {
    if (light === "red") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(osmId)) {
        next.delete(osmId);
      } else if (next.size < MAX_SELECTED) {
        next.add(osmId);
      }
      return next;
    });
  }

  async function handleStartPoll() {
    const options = restaurants.filter((r) => selected.has(r.osmId));
    if (options.length < 2) return;
    setCreatingPoll(true);
    setError("");
    try {
      await onStartPoll(options);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the poll");
    } finally {
      setCreatingPoll(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
      <LoadingOverlay visible={loading} messages={SEARCH_MESSAGES} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
          <Utensils className="h-4 w-4 text-terracotta-600" />
          Find a place to eat
        </h2>
        <button
          onClick={handleSearch}
          disabled={!currentPosition || loading}
          className="inline-flex items-center gap-2 rounded-full bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {searched ? "Search again" : "Search nearby"}
        </button>
      </div>

      {!currentPosition && (
        <p className="mt-3 text-sm text-forest-700/70">
          Enable Real GPS or drop a simulated pin on the map above to search nearby restaurants.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-terracotta-100 px-4 py-2.5 text-sm text-terracotta-700">{error}</p>
      )}

      {restaurants.length > 0 && (
        <>
          <ul className="mt-5 space-y-3">
            {restaurants.map((r) => {
              const style = LIGHT_STYLES[r.light];
              const isSelected = selected.has(r.osmId);
              return (
                <li
                  key={r.osmId}
                  className={`rounded-xl border p-4 transition ${
                    isSelected ? "border-saffron-400 bg-saffron-50/50" : "border-sand-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                        <h3 className="font-semibold text-forest-900">{r.name}</h3>
                      </div>
                      <p className="mt-0.5 text-xs text-forest-700/60">
                        {(r.cuisine ? r.cuisine.replace(/;/g, ", ") : r.amenity) ?? "Restaurant"} ·{" "}
                        {(r.distanceMeters / 1000).toFixed(1)} km away
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                    >
                      {r.score}% Match
                    </span>
                  </div>

                  {r.impactSummary && (
                    <p
                      className={`mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${style.impact}`}
                    >
                      {r.impactSummary}
                    </p>
                  )}

                  {r.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-forest-700/70">
                      {r.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  )}
                  {r.notes.length > 0 && (
                    <ul className="mt-1 space-y-1 text-xs text-forest-500">
                      {r.notes.map((note, i) => (
                        <li key={i}>ℹ {note}</li>
                      ))}
                    </ul>
                  )}

                  {r.light !== "red" && (
                    <button
                      onClick={() => toggleSelect(r.osmId, r.light)}
                      disabled={!isSelected && selected.size >= MAX_SELECTED}
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        isSelected
                          ? "border-saffron-500 bg-saffron-500 text-white"
                          : "border-forest-300 text-forest-700 hover:bg-sand-50"
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {isSelected ? "Selected for poll" : "Add to poll"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 pt-4">
            <p className="text-xs text-forest-700/60">
              {selected.size}/{MAX_SELECTED} selected — pick 2 or 3 to start a group poll
            </p>
            <button
              onClick={handleStartPoll}
              disabled={selected.size < 2 || creatingPoll}
              className="rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingPoll ? "Starting..." : `Start poll (${selected.size})`}
            </button>
          </div>
        </>
      )}

      {searched && !loading && restaurants.length === 0 && !error && (
        <p className="mt-4 text-sm text-forest-700/70">
          No restaurants found within 2km. Try simulating a location in a busier area.
        </p>
      )}
    </div>
  );
}
