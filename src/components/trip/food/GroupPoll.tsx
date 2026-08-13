"use client";

import { useEffect, useState } from "react";
import { Timer, ShieldAlert, Vote as VoteIcon, Crown } from "lucide-react";

export interface PollOption {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  cuisine?: string;
  score: number;
  light: "green" | "yellow" | "red";
  reasons: string[];
  votes: number;
  vetoed: boolean;
  vetoedByMe: boolean;
}

export interface PollData {
  id: string;
  tripId: string;
  createdBy: string;
  status: "open" | "closed";
  createdAt: string;
  closesAt: string;
  remainingMs: number;
  totalVotes: number;
  options: PollOption[];
  myVote: string | null;
  myVetoUsed: boolean;
  winner: PollOption | null;
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function GroupPoll({
  tripId,
  pollId,
  initialPoll,
}: {
  tripId: string;
  pollId: string;
  initialPoll: PollData;
}) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [remaining, setRemaining] = useState(initialPoll.remainingMs);
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/trips/${tripId}/polls/${pollId}/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.poll) {
          setPoll(data.poll);
          setRemaining(data.poll.remainingMs);
        }
      } catch {
        // ignore malformed frames
      }
    };
    return () => es.close();
  }, [tripId, pollId]);

  useEffect(() => {
    if (poll.status !== "open") return;
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(tick);
  }, [poll.status]);

  async function castVote(osmId: string) {
    setPending(osmId);
    setActionError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osmId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setPoll(data.poll);
      setRemaining(data.poll.remainingMs);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  async function castVeto(osmId: string) {
    setPending(`veto-${osmId}`);
    setActionError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/polls/${pollId}/veto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osmId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setPoll(data.poll);
      setRemaining(data.poll.remainingMs);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  const isOpen = poll.status === "open" && remaining > 0;

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Group poll</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isOpen ? "bg-forest-50 text-forest-700" : "bg-sand-100 text-forest-500"
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          {isOpen ? formatRemaining(remaining) : "Closed"}
        </span>
      </div>

      {actionError && (
        <p className="mt-3 rounded-xl bg-terracotta-100 px-4 py-2.5 text-sm text-terracotta-700">
          {actionError}
        </p>
      )}

      {!isOpen && poll.winner && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-800">
          <Crown className="h-4 w-4 text-saffron-600" />
          {poll.winner.name} won with {poll.winner.votes} vote{poll.winner.votes === 1 ? "" : "s"}!
        </div>
      )}
      {!isOpen && !poll.winner && (
        <p className="mt-4 text-sm text-forest-700/70">This poll closed with no votes.</p>
      )}

      <ul className="mt-5 space-y-3">
        {poll.options.map((opt) => {
          const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
          return (
            <li
              key={opt.osmId}
              className={`rounded-xl border p-4 ${
                opt.vetoed ? "border-sand-200 bg-sand-50 opacity-60" : "border-sand-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-forest-900">{opt.name}</h3>
                  <p className="text-xs text-forest-700/60">
                    {opt.score}% match{opt.cuisine ? ` · ${opt.cuisine.replace(/;/g, ", ")}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-forest-800">
                  {opt.votes} vote{opt.votes === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sand-100">
                <div
                  className="h-full rounded-full bg-saffron-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {opt.vetoed ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-terracotta-600">
                  <ShieldAlert className="h-3.5 w-3.5" /> Vetoed by a trip member
                </p>
              ) : isOpen ? (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => castVote(opt.osmId)}
                    disabled={pending === opt.osmId || poll.myVote === opt.osmId}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed ${
                      poll.myVote === opt.osmId
                        ? "bg-forest-700 text-white"
                        : "border border-forest-300 text-forest-700 hover:bg-sand-50"
                    }`}
                  >
                    <VoteIcon className="h-3.5 w-3.5" />
                    {poll.myVote === opt.osmId ? "Your vote" : "Vote"}
                  </button>
                  <button
                    onClick={() => castVeto(opt.osmId)}
                    disabled={poll.myVetoUsed || pending === `veto-${opt.osmId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-terracotta-300 px-3 py-1.5 text-xs font-semibold text-terracotta-700 transition hover:bg-terracotta-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Veto
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {poll.myVetoUsed && isOpen && (
        <p className="mt-4 text-xs text-forest-500">You&apos;ve used your one-time veto for this poll.</p>
      )}
    </div>
  );
}
