"use client";

import { useEffect, useState } from "react";
import RestaurantFinder, { type Restaurant } from "./RestaurantFinder";
import GroupPoll, { type PollData } from "./GroupPoll";

export default function FoodSection({ tripId }: { tripId: string }) {
  const [poll, setPoll] = useState<PollData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trips/${tripId}/polls`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPoll(data.poll);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function handleStartPoll(options: Restaurant[]) {
    const res = await fetch(`/api/trips/${tripId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Couldn't start the poll");
    setPoll(data.poll);
  }

  return (
    <div className="space-y-6">
      {poll && <GroupPoll key={poll.id} tripId={tripId} pollId={poll.id} initialPoll={poll} />}
      <RestaurantFinder tripId={tripId} onStartPoll={handleStartPoll} />
    </div>
  );
}
