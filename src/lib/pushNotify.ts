import webpush, { pushConfigured } from "./webPush";
import PushSubscription from "@/models/PushSubscription";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Best-effort push fan-out to a specific set of users' devices. Never throws
 * — a push failure shouldn't roll back the poll/rally/price-log write that
 * triggered it. Subscriptions the push service reports as gone (410/404)
 * are removed so we stop retrying dead endpoints.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!pushConfigured || userIds.length === 0) return;

  const subs = await PushSubscription.find({ userId: { $in: userIds } }).lean();
  if (subs.length === 0) return;

  const staleEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
  }
}
