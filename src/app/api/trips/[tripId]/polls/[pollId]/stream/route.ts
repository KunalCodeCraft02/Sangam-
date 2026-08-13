import mongoose from "mongoose";
import { requireTripMember } from "@/lib/tripAuth";
import { closeIfExpired, serializePoll } from "@/lib/poll";
import Poll from "@/models/Poll";

const POLL_FALLBACK_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string; pollId: string }> }
) {
  const { tripId, pollId } = await params;
  const auth = await requireTripMember(tripId);
  if (auth.error) return auth.error;

  if (!mongoose.isValidObjectId(pollId)) {
    return new Response("Poll not found", { status: 404 });
  }

  const userId = auth.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let changeStream: ReturnType<typeof Poll.watch> | null = null;

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
        const poll = await Poll.findOne({ _id: pollId, tripId });
        if (!poll) {
          send({ poll: null });
          return;
        }
        await closeIfExpired(poll);
        send({ poll: serializePoll(poll, userId) });
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
        changeStream = Poll.watch([
          { $match: { "documentKey._id": new mongoose.Types.ObjectId(pollId) } },
        ]);
        changeStream.on("change", () => {
          loadAndSend().catch(() => {});
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
