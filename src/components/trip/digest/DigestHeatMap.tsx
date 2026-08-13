"use client";

import dynamic from "next/dynamic";

const DigestHeatMapInner = dynamic(() => import("./DigestHeatMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-sand-100 text-sm text-forest-700/70">
      Loading map…
    </div>
  ),
});

export default function DigestHeatMap({ points }: { points: { lat: number; lng: number }[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sand-100 text-sm text-forest-700/70">
        No locations recorded yet — log some prices or confirm a meeting point.
      </div>
    );
  }
  return <DigestHeatMapInner points={points} />;
}
