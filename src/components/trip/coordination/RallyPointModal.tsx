"use client";

import { useState, type FormEvent } from "react";
import { X, CalendarClock } from "lucide-react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import LoadingOverlay from "@/components/LoadingOverlay";

const PROPOSE_MESSAGES = ["Placing your pin...", "Starting the group poll...", "Notifying the group..."];

function formatTimeLabel(value: string) {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h) || !mStr) return value;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr.padStart(2, "0")} ${period}`;
}

export default function RallyPointModal({
  position,
  onCancel,
  onConfirm,
}: {
  position: { lat: number; lng: number };
  onCancel: () => void;
  onConfirm: (meetTimeLabel: string) => Promise<void>;
}) {
  const [time, setTime] = useState("18:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(formatTimeLabel(time));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't propose meeting point");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-forest-950/40 px-4 backdrop-blur-sm">
      <LoadingOverlay visible={submitting} messages={PROPOSE_MESSAGES} />
      <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-7 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest-900">
            <CalendarClock className="h-5 w-5 text-terracotta-600" />
            Propose meeting point
          </h2>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-forest-500 transition hover:bg-sand-100 hover:text-forest-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-forest-700/70">
          Pinned at {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-terracotta-100 px-4 py-2.5 text-sm text-terracotta-700">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="meetTime" className={labelClass}>
              Meet at
            </label>
            <input
              id="meetTime"
              type="time"
              required
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Proposing..." : "Start Yes/No poll"}
          </button>
        </form>
      </div>
    </div>
  );
}
