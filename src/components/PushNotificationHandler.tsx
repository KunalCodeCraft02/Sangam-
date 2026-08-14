"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type ActionPerformed } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

let nextLocalNotificationId = 1;

// Android's FCM only auto-shows a system-tray notification for pushes
// received while the app is backgrounded or killed. While the app is in the
// foreground (the common case — you're on some other screen when a poll/
// price/rally push comes in), the OS hands it to `pushNotificationReceived`
// instead and expects the app to display it itself, so we mirror it into a
// local notification here.
export default function PushNotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const receivedPromise = PushNotifications.addListener("pushNotificationReceived", (notification) => {
      LocalNotifications.schedule({
        notifications: [
          {
            id: nextLocalNotificationId++,
            title: notification.title ?? "Sangam",
            body: notification.body ?? "",
            extra: notification.data,
          },
        ],
      }).catch(() => {});
    });

    function openUrl(url: unknown) {
      if (typeof url === "string" && url.startsWith("/")) router.push(url);
    }

    const pushActionPromise = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => openUrl(action.notification.data?.url)
    );

    const localActionPromise = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => openUrl(action.notification.extra?.url)
    );

    return () => {
      receivedPromise.then((handle) => handle.remove());
      pushActionPromise.then((handle) => handle.remove());
      localActionPromise.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
