import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the service worker, subscribes this device to Web Push (or
 * reuses its existing subscription), and saves it server-side. Assumes
 * Notification permission has already been granted by the caller.
 */
async function subscribeToWebPush(): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Android's WebView (which wraps this app in the Capacitor build) doesn't
 * implement the Push API at all, so Web Push is a no-op there. Native
 * builds instead request OS notification permission and register for FCM,
 * saving the resulting token server-side.
 */
function registerNativePush(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    PushNotifications.addListener("registration", async (token) => {
      try {
        const res = await fetch("/api/push/register-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        });
        finish(res.ok);
      } catch {
        finish(false);
      }
    });

    PushNotifications.addListener("registrationError", () => finish(false));

    PushNotifications.register().catch(() => finish(false));

    // Belt-and-suspenders: if neither listener ever fires (older devices,
    // Play Services unavailable, etc.), don't leave the caller hanging.
    setTimeout(() => finish(false), 10000);
  });
}

export async function subscribeToPush(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return false;
    return registerNativePush();
  }
  return subscribeToWebPush();
}
