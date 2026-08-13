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

    // A poll created by another trip member wouldn't otherwise show up here
    // until this member reloads the page — this stream pushes the trip's
    // latest poll (creation, votes, vetoes, closing) to everyone live, the
    // same way rally points broadcast over the group feed stream.
    const es = new EventSource(`/api/trips/${tripId}/polls/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if ("poll" in data) setPoll(data.poll);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      es.close();
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
