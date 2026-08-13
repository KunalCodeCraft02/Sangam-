"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { MapPin, Camera, Bell, Check, X, Compass } from "lucide-react";
import { subscribeToPush } from "@/lib/push";

type PermissionStatus = "idle" | "checking" | "granted" | "denied" | "unsupported";

interface PermissionRow {
  key: "location" | "camera" | "notifications";
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const ROWS: PermissionRow[] = [
  {
    key: "location",
    icon: MapPin,
    title: "Location Services",
    description: "So your crew can see where you are on the trip map and route you to meeting points.",
  },
  {
    key: "camera",
    icon: Camera,
    title: "Camera Access",
    description: "So you can snap a photo of a price straight into the Market Feed.",
  },
  {
    key: "notifications",
    icon: Bell,
    title: "Push Notifications",
    description: "So you don't miss a food poll, a meeting point, or a wishlist match while your phone is locked.",
  },
];

function storageKey(tripId: string) {
  return `sangam:permissionsOnboarded:${tripId}`;
}

function requestLocation(): Promise<PermissionStatus> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      () => resolve("denied"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

async function requestCamera(): Promise<PermissionStatus> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

async function requestNotifications(): Promise<PermissionStatus> {
  // The Android WebView this app runs in doesn't implement the web
  // Notification/Push APIs at all, so on native builds we go straight to
  // Capacitor's push-notifications plugin (FCM) instead of the browser APIs.
  if (Capacitor.isNativePlatform()) {
    try {
      return (await subscribeToPush()) ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  if (!("Notification" in window)) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      await subscribeToPush();
      return "granted";
    }
    return "denied";
  } catch {
    return "denied";
  }
}

const REQUESTERS: Record<PermissionRow["key"], () => Promise<PermissionStatus>> = {
  location: requestLocation,
  camera: requestCamera,
  notifications: requestNotifications,
};

function StatusBadge({ status }: { status: PermissionStatus }) {
  if (status === "granted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2.5 py-1 text-xs font-semibold text-forest-700">
        <Check className="h-3 w-3" /> Allowed
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-100 px-2.5 py-1 text-xs font-semibold text-terracotta-700">
        <X className="h-3 w-3" /> Blocked
      </span>
    );
  }
  if (status === "unsupported") {
    return (
      <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-forest-500">
        Not supported
      </span>
    );
  }
  return null;
}

export default function PermissionsOnboardingModal({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<PermissionRow["key"], PermissionStatus>>({
    location: "idle",
    camera: "idle",
    notifications: "idle",
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        if (!window.localStorage.getItem(storageKey(tripId))) {
          setOpen(true);
        }
      } catch {
        setOpen(true);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [tripId]);

  async function requestOne(key: PermissionRow["key"]) {
    setStatuses((prev) => ({ ...prev, [key]: "checking" }));
    const result = await REQUESTERS[key]();
    setStatuses((prev) => ({ ...prev, [key]: result }));
  }

  async function handleEnableAll() {
    for (const row of ROWS) {
      await requestOne(row.key);
    }
  }

  function handleContinue() {
    try {
      window.localStorage.setItem(storageKey(tripId), "1");
    } catch {
      // localStorage unavailable (private browsing etc.) — just don't persist the dismissal
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-forest-950/50 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-warm-gradient bg-noise w-full max-w-lg rounded-3xl border border-sand-200 p-7 shadow-2xl"
      >
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron-300/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-terracotta-700 shadow-soft">
            <Compass className="h-3.5 w-3.5" />
            One-time setup
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold text-forest-900">
            Get the most out of this trip
          </h2>
          <p className="mt-2 text-sm text-forest-700/70">
            Sangam works best with a few permissions turned on. You can change these anytime in
            your browser settings.
          </p>
        </div>

        <ul className="mt-6 space-y-3">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const status = statuses[row.key];
            return (
              <li
                key={row.key}
                className="flex items-start gap-3 rounded-2xl border border-sand-200 bg-white/90 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-saffron-600">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-forest-900">{row.title}</h3>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-0.5 text-xs text-forest-700/70">{row.description}</p>
                </div>
                {status !== "granted" && (
                  <button
                    type="button"
                    onClick={() => requestOne(row.key)}
                    disabled={status === "checking"}
                    className="shrink-0 self-center rounded-full border border-forest-300 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === "checking" ? "Asking…" : "Allow"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-forest-700 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-forest-800"
          >
            Continue to trip
          </button>
          <button
            type="button"
            onClick={handleEnableAll}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-saffron-300 bg-white px-5 py-3 text-sm font-semibold text-saffron-700 transition hover:bg-saffron-50"
          >
            Enable all
          </button>
        </div>
      </motion.div>
    </div>
  );
}
