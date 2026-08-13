"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlagOff } from "lucide-react";

export default function EndTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  async function handleEnd() {
    setEnding(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/end`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Couldn't end the trip");
      }
      router.push(`/trip/${tripId}/digest`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't end the trip");
      setEnding(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-terracotta-600">{error}</span>}
        <span className="text-xs font-medium text-forest-700/70">End the trip for everyone?</span>
        <button
          onClick={handleEnd}
          disabled={ending}
          className="rounded-full bg-terracotta-600 px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ending ? "Ending..." : "Yes, end trip"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={ending}
          className="rounded-full border border-sand-300 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-sand-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 rounded-full border border-terracotta-300 px-4 py-2 text-sm font-semibold text-terracotta-700 transition hover:bg-terracotta-50"
    >
      <FlagOff className="h-4 w-4" />
      End Trip
    </button>
  );
}
