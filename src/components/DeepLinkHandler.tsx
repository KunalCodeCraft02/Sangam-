"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Inside the Android app, tapping a sangam-phi.vercel.app link (e.g. a trip
// invite) launches the app via an App Links intent instead of the browser,
// but Capacitor still boots the WebView at the configured server root. This
// picks up the actual tapped URL — for both a cold start and the app
// already being open — and routes to it client-side. No-ops in a normal
// browser since the native "appUrlOpen" event never fires there.
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener("appUrlOpen", ({ url }) => {
      try {
        const { pathname, search, hash } = new URL(url);
        router.push(`${pathname}${search}${hash}`);
      } catch {
        // Malformed or non-http(s) URL — ignore.
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
