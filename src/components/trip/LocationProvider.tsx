"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type LocationMode = "real" | "simulated";

export interface LatLng {
  lat: number;
  lng: number;
}

interface LocationContextValue {
  mode: LocationMode;
  setMode: (mode: LocationMode) => void;
  realPosition: LatLng | null;
  simulatedPosition: LatLng | null;
  currentPosition: LatLng | null;
  geoError: string | null;
  setSimulatedPosition: (pos: LatLng) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return ctx;
}

export function LocationProvider({
  tripId,
  initialSimulatedPosition,
  children,
}: {
  tripId: string;
  initialSimulatedPosition?: LatLng;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<LocationMode>("real");
  const [realPosition, setRealPosition] = useState<LatLng | null>(null);
  const [simulatedPosition, setSimulatedPosition] = useState<LatLng | null>(
    initialSimulatedPosition ?? null
  );
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "real") return;
    if (!("geolocation" in navigator)) {
      const timeoutId = setTimeout(() => {
        setGeoError("Geolocation is not supported by this browser.");
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // On-demand only: a single fix on mount/mode-switch plus one whenever the
    // tab regains focus, rather than a continuous watchPosition subscription.
    // Trades a little freshness for real battery savings on phones (and
    // avoids hammering the location API while the tab sits in the
    // background). A short cooldown collapses rapid repeated focus events
    // (e.g. quick alt-tabbing) into a single fetch.
    const MIN_REFRESH_INTERVAL_MS = 10000;
    let lastFetchAt = 0;
    let cancelled = false;

    function fetchPosition() {
      const now = Date.now();
      if (now - lastFetchAt < MIN_REFRESH_INTERVAL_MS) return;
      lastFetchAt = now;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setRealPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoError(null);
        },
        (err) => {
          if (cancelled) return;
          setGeoError(err.message || "Unable to fetch your location.");
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
      );
    }

    fetchPosition();
    window.addEventListener("focus", fetchPosition);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", fetchPosition);
    };
  }, [mode]);

  const currentPosition = mode === "real" ? realPosition : simulatedPosition;

  const lastSentKeyRef = useRef<string>("");
  useEffect(() => {
    if (!currentPosition) return;

    const key = `${mode}:${currentPosition.lat.toFixed(5)}:${currentPosition.lng.toFixed(5)}`;
    if (lastSentKeyRef.current === key) return;

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    function send() {
      fetch(`/api/trips/${tripId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: currentPosition!.lat, lng: currentPosition!.lng, mode }),
        signal: controller.signal,
      })
        .then((res) => {
          if (res.ok) {
            lastSentKeyRef.current = key;
          } else if (!cancelled) {
            retryTimeout = setTimeout(send, 3000);
          }
        })
        .catch(() => {
          if (!cancelled) retryTimeout = setTimeout(send, 3000);
        });
    }
    send();

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [tripId, mode, currentPosition]);

  const handleSetSimulatedPosition = useCallback((pos: LatLng) => {
    setSimulatedPosition(pos);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        mode,
        setMode,
        realPosition,
        simulatedPosition,
        currentPosition,
        geoError,
        setSimulatedPosition: handleSetSimulatedPosition,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
