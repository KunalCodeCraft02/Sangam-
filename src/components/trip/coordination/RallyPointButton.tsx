"use client";

import { MapPinPlus, X } from "lucide-react";

export default function RallyPointButton({
  armed,
  onToggle,
}: {
  armed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex flex-col items-start gap-2">
      {armed && (
        <span className="pointer-events-auto rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white shadow-soft">
          Tap the map to place your meeting point
        </span>
      )}
      <button
        onClick={onToggle}
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-soft transition ${
          armed
            ? "bg-terracotta-600 text-white hover:bg-terracotta-700"
            : "bg-white text-forest-800 hover:bg-sand-50"
        }`}
      >
        {armed ? <X className="h-4 w-4" /> : <MapPinPlus className="h-4 w-4" />}
        {armed ? "Cancel" : "Propose Meeting Point"}
      </button>
    </div>
  );
}
