"use client";

import dynamic from "next/dynamic";
import type { TripMember } from "./TripMapInner";
import type { LatLng } from "./LocationProvider";
import type { RallyFeedItem } from "./coordination/types";
import type { ShoppingRoute } from "./market/types";

const TripMapInner = dynamic(() => import("./TripMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-sand-100 text-sm text-forest-700/70">
      Loading map…
    </div>
  ),
});

export type { TripMember };

export default function TripMap({
  members,
  selfId,
  selfName,
  rallyPointMode,
  onProposeRallyPoint,
  confirmedRally,
  shoppingRoute,
}: {
  members: TripMember[];
  selfId: string;
  selfName: string;
  rallyPointMode: boolean;
  onProposeRallyPoint: (pos: LatLng) => void;
  confirmedRally: RallyFeedItem | null;
  shoppingRoute?: ShoppingRoute | null;
}) {
  return (
    <TripMapInner
      members={members}
      selfId={selfId}
      selfName={selfName}
      rallyPointMode={rallyPointMode}
      onProposeRallyPoint={onProposeRallyPoint}
      confirmedRally={confirmedRally}
      shoppingRoute={shoppingRoute}
    />
  );
}
