"use client";

import { LocateFixed, FlaskConical } from "lucide-react";
import { useLocation } from "./LocationProvider";

export default function LocationModeToggle() {
  const { mode, setMode, geoError } = useLocation();

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-sand-200 bg-white/95 p-1 shadow-card backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setMode("real")}
          aria-pressed={mode === "real"}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
            mode === "real"
              ? "bg-forest-700 text-white shadow-soft"
              : "text-forest-700 hover:bg-sand-50"
          }`}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Real GPS
        </button>
        <button
          type="button"
          onClick={() => setMode("simulated")}
          aria-pressed={mode === "simulated"}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
            mode === "simulated"
              ? "bg-terracotta-600 text-white shadow-soft"
              : "text-forest-700 hover:bg-sand-50"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Developer Simulation
        </button>
      </div>

      {mode === "simulated" && (
        <span className="pointer-events-auto rounded-full bg-terracotta-600 px-3 py-1 text-[11px] font-semibold text-white shadow-soft">
          Click anywhere on the map to spoof your location
        </span>
      )}
      {mode === "real" && geoError && (
        <span className="pointer-events-auto rounded-full bg-terracotta-100 px-3 py-1 text-[11px] font-semibold text-terracotta-700 shadow-soft">
          {geoError}
        </span>
      )}
    </div>
  );
}
