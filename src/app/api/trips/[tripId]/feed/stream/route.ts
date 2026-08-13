import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import { loadGroupFeed } from "@/lib/groupFeed";

const POLL_FALLBACK_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;
const WATCHED_COLLECTIONS = ["sosalerts", "rallypoints"];

interface ChangeStreamDoc {
  tripId?: { toString(): string };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  const userId = auth.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let changeStream: ReturnType<NonNullable<typeof mongoose.connection.db>["watch"]> | null = null;

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

      async function loadAndSend() {
        const items = await loadGroupFeed(tripId, userId);
        send({ items });
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
        const db = mongoose.connection.db;
        if (!db) throw new Error("No database connection");
        changeStream = db.watch(
          [{ $match: { "ns.coll": { $in: WATCHED_COLLECTIONS } } }],
          { fullDocument: "updateLookup" }
        );
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
