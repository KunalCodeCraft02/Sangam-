"use client";

import { useEffect, useState } from "react";
import type { GroupFeedItem } from "./types";

export function useGroupFeed(tripId: string) {
  const [items, setItems] = useState<GroupFeedItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/trips/${tripId}/feed`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setItems(data.items);
      })
      .catch(() => {});

    const es = new EventSource(`/api/trips/${tripId}/feed/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.items) setItems(data.items);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [tripId]);

  return { items, setItems };
}
