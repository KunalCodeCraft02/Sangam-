"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ShoppingBag, WifiOff, Sparkles } from "lucide-react";
import WishlistPanel, { type WishlistItem } from "./WishlistPanel";
import LogPriceModal from "./LogPriceModal";
import MarketFeed from "./MarketFeed";
import { useOfflineQueue, type SyncedPriceLog, type WishlistAlert } from "./useOfflineQueue";
import type { ShoppingRoute } from "./types";
import LoadingOverlay from "@/components/LoadingOverlay";

const REFRESH_MESSAGES = ["Refreshing market feed..."];

const ALERT_DISPLAY_MS = 6000;

export default function MarketSection({
  tripId,
  onTakeMeThere,
}: {
  tripId: string;
  onTakeMeThere: (route: ShoppingRoute) => void;
}) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [logs, setLogs] = useState<SyncedPriceLog[]>([]);
  const [alert, setAlert] = useState<WishlistAlert | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trips/${tripId}/wishlist`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setWishlistItems(data.items ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const showAlert = useCallback((incomingAlert: WishlistAlert) => {
    setAlert(incomingAlert);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setAlert(null), ALERT_DISPLAY_MS);
  }, []);

  useEffect(() => {
    // The stream sends the full, authoritative feed on every change (same
    // pattern as the poll/group-feed streams), so other members' price logs
    // show up here live instead of only on next page load. `alert`, when
    // present, is a wishlist match scoped to *this* connected user only —
    // never the member who logged the purchase (see prices/stream/route.ts).
    const es = new EventSource(`/api/trips/${tripId}/prices/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.logs) setLogs(data.logs);
        if (data.alert) showAlert(data.alert);
      } catch {
        // ignore malformed frames
      }
    };
    return () => es.close();
  }, [tripId, showAlert]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  const handleSynced = useCallback((log: SyncedPriceLog) => {
    setLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [log, ...prev]));
  }, []);

  const { isOnline, pendingCount, logPrice } = useOfflineQueue(tripId, handleSynced);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/prices`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      // best-effort — the SSE stream will still keep the feed eventually consistent
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay visible={refreshing} messages={REFRESH_MESSAGES} />
      {alert && (
        <div className="flex items-center gap-3 rounded-2xl border border-saffron-300 bg-saffron-50 px-5 py-4 shadow-soft">
          <Sparkles className="h-5 w-5 shrink-0 text-saffron-600" />
          <p className="text-sm font-medium text-forest-800">
            <span className="font-semibold">{alert.itemName}</span> matches your wishlist item{" "}
            <span className="font-semibold">&ldquo;{alert.wishlistItemName}&rdquo;</span>!
          </p>
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-2xl border border-terracotta-200 bg-terracotta-50 px-5 py-3 text-sm font-medium text-terracotta-700">
          <WifiOff className="h-4 w-4 shrink-0" />
          You&apos;re offline — price logs are saved on this device
          {pendingCount > 0 && ` (${pendingCount} pending)`} and will sync automatically once you&apos;re
          back online.
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-saffron-200 bg-saffron-50 px-5 py-3 text-sm font-medium text-saffron-700">
          Syncing {pendingCount} queued price log{pendingCount === 1 ? "" : "s"}...
        </div>
      )}

      <WishlistPanel tripId={tripId} items={wishlistItems} onItemsChange={setWishlistItems} />

      <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
            <ShoppingBag className="h-4 w-4 text-terracotta-600" />
            Market feed
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh market feed"
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 px-3.5 py-2 text-xs font-semibold text-forest-700 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <LogPriceModal wishlistItems={wishlistItems} onLog={logPrice} />
          </div>
        </div>
        <MarketFeed tripId={tripId} logs={logs} onTakeMeThere={onTakeMeThere} />
      </div>
    </div>
  );
}
