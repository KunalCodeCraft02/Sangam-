import { requireTripMember } from "@/lib/tripAuth";
import { findWishlistMatch } from "@/lib/wishlistMatch";
import PriceLog from "@/models/PriceLog";
import WishlistItem from "@/models/WishlistItem";
import "@/models/User";

const POLL_FALLBACK_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;
const MAX_RESULTS = 50;

interface ChangeStreamDoc {
  tripId?: { toString(): string };
}

function fetchLogs(tripId: string) {
  return PriceLog.find({ tripId })
    .sort({ loggedAt: -1 })
    .limit(MAX_RESULTS)
    .populate("userId", "name")
    .lean();
}

type LeanPriceLogs = Awaited<ReturnType<typeof fetchLogs>>;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const userId = auth.userId;
  const encoder = new TextEncoder();
  // Only alert about logs created after this connection opened, so a page
  // load/reconnect doesn't replay matches against the whole history.
  const connectionStartedAt = Date.now();
  const notifiedLogIds = new Set<string>();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let changeStream: ReturnType<typeof PriceLog.watch> | null = null;

      function send(data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller already closed underneath us; ignore
        }
      }

      function startFallbackPolling() {
        if (fallbackInterval) return;
        fallbackInterval = setInterval(() => {
          loadAndSend().catch(() => {});
        }, POLL_FALLBACK_INTERVAL_MS);
      }

      async function findAlertForConnectedUser(
        logs: LeanPriceLogs
      ): Promise<{ itemName: string; wishlistItemName: string } | null> {
        // A wishlist match should only notify the member who wants the item,
        // never the member who just logged the purchase — see prices/route.ts.
        const myWishlist = await WishlistItem.find({ tripId, addedBy: userId })
          .select("name")
          .lean();
        if (myWishlist.length === 0) return null;

        const candidates = myWishlist.map((w) => ({ id: w._id.toString(), name: w.name }));

        for (const log of logs) {
          const logUser = log.userId as unknown as { _id?: { toString(): string } } | null;
          const logUserId = logUser?._id?.toString();
          if (!logUserId || logUserId === userId) continue;
          if (log.createdAt.getTime() <= connectionStartedAt) continue;

          const logId = log._id.toString();
          if (notifiedLogIds.has(logId)) continue;

          const match = findWishlistMatch(log.itemName, candidates);
          if (match) {
            notifiedLogIds.add(logId);
            return { itemName: log.itemName, wishlistItemName: match.name };
          }
        }
        return null;
      }

      async function loadAndSend() {
        const logs = await fetchLogs(tripId);

        const alert = await findAlertForConnectedUser(logs);

        send({
          logs: logs.map((log) => {
            const user = log.userId as unknown as { name?: string } | null;
            return {
              id: log._id.toString(),
              itemName: log.itemName,
              priceInr: log.priceInr,
              lat: log.lat,
              lng: log.lng,
              locationName: log.locationName ?? null,
              shopName: log.shopName ?? null,
              category: log.category,
              imageUrl: log.imageUrl ?? null,
              loggedAt: log.loggedAt.toISOString(),
              loggedBy: user?.name ?? "A trip member",
            };
          }),
          alert,
        });
      }

      function cleanup() {
        if (closed) return;
        closed = true;
        if (fallbackInterval) clearInterval(fallbackInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (changeStream) changeStream.close().catch(() => {});
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      loadAndSend().catch(() => {});

      try {
        changeStream = PriceLog.watch([], { fullDocument: "updateLookup" });
        changeStream.on("change", (change: { fullDocument?: ChangeStreamDoc }) => {
          const doc = change.fullDocument;
          if (!doc || doc.tripId?.toString() === tripId) {
            loadAndSend().catch(() => {});
          }
        });
        changeStream.on("error", () => {
          if (changeStream) {
            changeStream.close().catch(() => {});
            changeStream = null;
          }
          startFallbackPolling();
        });
      } catch {
        changeStream = null;
        startFallbackPolling();
      }

      heartbeatInterval = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            cleanup();
          }
        }
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
