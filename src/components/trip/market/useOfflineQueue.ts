"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PriceLogCategory } from "@/lib/priceLogCategories";

export interface QueuedPriceLog {
  clientId: string;
  itemName: string;
  priceInr: number;
  lat: number;
  lng: number;
  loggedAt: string;
  shopName?: string;
  category: PriceLogCategory;
  imageUrl?: string;
}

export interface SyncedPriceLog {
  id: string;
  itemName: string;
  priceInr: number;
  lat: number;
  lng: number;
  locationName: string | null;
  shopName: string | null;
  category: PriceLogCategory;
  imageUrl: string | null;
  loggedAt: string;
  loggedBy: string;
}

export interface WishlistAlert {
  wishlistItemName: string;
  itemName: string;
}

function storageKey(tripId: string) {
  return `sangam:priceQueue:${tripId}`;
}

function readQueue(tripId: string): QueuedPriceLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    return raw ? (JSON.parse(raw) as QueuedPriceLog[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(tripId: string, queue: QueuedPriceLog[]) {
  try {
    window.localStorage.setItem(storageKey(tripId), JSON.stringify(queue));
  } catch {
    // storage full or unavailable — the in-memory pendingCount still reflects reality
  }
}

export function useOfflineQueue(
  tripId: string,
  onSynced: (log: SyncedPriceLog, alert: WishlistAlert | null) => void
) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const flushingRef = useRef(false);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    flushingRef.current = true;
    try {
      let queue = readQueue(tripId);
      while (queue.length > 0) {
        const [entry, ...rest] = queue;
        try {
          const res = await fetch(`/api/trips/${tripId}/prices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });
          if (!res.ok) break;
          const data = await res.json();
          queue = rest;
          writeQueue(tripId, queue);
          setPendingCount(queue.length);
          onSyncedRef.current(data.log, null);
        } catch {
          break;
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [tripId]);

  useEffect(() => {
    const initTimeoutId = setTimeout(() => {
      setIsOnline(navigator.onLine);
      setPendingCount(readQueue(tripId).length);
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      flush();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) flush();

    return () => {
      clearTimeout(initTimeoutId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [tripId, flush]);

  const logPrice = useCallback(
    async (entry: Omit<QueuedPriceLog, "clientId" | "loggedAt">): Promise<{ queued: boolean }> => {
      const fullEntry: QueuedPriceLog = {
        ...entry,
        clientId: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const queue = readQueue(tripId);
        queue.push(fullEntry);
        writeQueue(tripId, queue);
        setPendingCount(queue.length);
        return { queued: true };
      }

      try {
        const res = await fetch(`/api/trips/${tripId}/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fullEntry),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Couldn't save the price log");
        }
        const data = await res.json();
        onSyncedRef.current(data.log, null);
        return { queued: false };
      } catch (err) {
        // A fetch() network failure throws TypeError — treat that as "went
        // offline mid-request" and fall back to the queue instead of losing
        // the entry. A server-side validation error (thrown above) should
        // surface to the user immediately instead of being queued forever.
        if (err instanceof TypeError) {
          const queue = readQueue(tripId);
          queue.push(fullEntry);
          writeQueue(tripId, queue);
          setPendingCount(queue.length);
          return { queued: true };
        }
        throw err;
      }
    },
    [tripId]
  );

  return { isOnline, pendingCount, logPrice };
}
