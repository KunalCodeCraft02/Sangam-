import webpush, { pushConfigured } from "./webPush";
import { fcmConfigured, getFcmMessaging } from "./firebaseAdmin";
import PushSubscription from "@/models/PushSubscription";
import DeviceToken from "@/models/DeviceToken";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendWebPush(userIds: string[], payload: PushPayload): Promise<void> {
  if (!pushConfigured) return;

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

async function sendFcmPush(userIds: string[], payload: PushPayload): Promise<void> {
  if (!fcmConfigured) return;

  const tokens = await DeviceToken.find({ userId: { $in: userIds } }).lean();
  if (tokens.length === 0) return;

  const messaging = getFcmMessaging();
  const staleTokens: string[] = [];

  await Promise.all(
    tokens.map(async (t) => {
      try {
        await messaging.send({
          token: t.token,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url ?? "/dashboard" },
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          staleTokens.push(t.token);
        }
      }
    })
  );

  if (staleTokens.length > 0) {
    await DeviceToken.deleteMany({ token: { $in: staleTokens } });
  }
}

/**
 * Best-effort push fan-out to a specific set of users' devices — over both
 * Web Push (browser tabs / installed PWAs) and FCM (the wrapped Android
 * app, which can't use Web Push since Android's WebView doesn't implement
 * it). Never throws — a push failure shouldn't roll back the poll/rally/
 * price-log write that triggered it. Dead endpoints/tokens are pruned so we
 * stop retrying them.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.all([sendWebPush(userIds, payload), sendFcmPush(userIds, payload)]);
}
