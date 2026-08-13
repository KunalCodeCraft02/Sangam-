"use client";

import { useState } from "react";
import { Siren } from "lucide-react";
import { useLocation } from "../LocationProvider";

export default function SosButton({ tripId }: { tripId: string }) {
  const { currentPosition } = useLocation();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  async function handleClick() {
    if (!currentPosition || sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: currentPosition.lat, lng: currentPosition.lng }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Couldn't send SOS");
      }
      setMessage({ text: "SOS sent — your location was shared with the group", tone: "ok" });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Couldn't send SOS", tone: "error" });
    } finally {
      setSending(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
      {message && (
        <span
          className={`pointer-events-auto rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-soft ${
            message.tone === "ok" ? "bg-forest-700" : "bg-terracotta-700"
          }`}
        >
          {message.text}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={!currentPosition || sending}
        title={!currentPosition ? "Waiting for your location..." : undefined}
        className="sos-pulse-ring pointer-events-auto flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:animate-none"
      >
        <Siren className="h-5 w-5" />
        {sending ? "Sending..." : "I'm Lost / SOS"}
      </button>
    </div>
  );
}
