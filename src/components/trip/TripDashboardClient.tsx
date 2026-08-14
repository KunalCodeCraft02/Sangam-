"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Users, MapPinned, Utensils, ShoppingBag, Siren } from "lucide-react";
import { LocationProvider, type LatLng } from "./LocationProvider";
import LocationModeToggle from "./LocationModeToggle";
import TripMap, { type TripMember } from "./TripMap";
import PermissionsOnboardingModal from "./PermissionsOnboardingModal";
import FoodSection from "./food/FoodSection";
import MarketSection from "./market/MarketSection";
import SosButton from "./coordination/SosButton";
import RallyPointButton from "./coordination/RallyPointButton";
import RallyPointModal from "./coordination/RallyPointModal";
import GroupFeed from "./coordination/GroupFeed";
import { useGroupFeed } from "./coordination/useGroupFeed";
import type { GroupFeedItem, MeetingRoute, RallyFeedItem } from "./coordination/types";
import type { ShoppingRoute } from "./market/types";

const POLL_INTERVAL_MS = 5000;

type TabId = "map" | "food" | "market";

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "map", label: "Trip Map", icon: MapPinned },
  { id: "food", label: "Food & Dining", icon: Utensils },
  { id: "market", label: "Market Feed", icon: ShoppingBag },
];

export default function TripDashboardClient({
  tripId,
  selfId,
  selfName,
  initialMembers,
}: {
  tripId: string;
  selfId: string;
  selfName: string;
  initialMembers: TripMember[];
}) {
  const [members, setMembers] = useState<TripMember[]>(initialMembers);
  const [activeTab, setActiveTab] = useState<TabId>("map");
  const [proposingRally, setProposingRally] = useState(false);
  const [pendingRallyClick, setPendingRallyClick] = useState<LatLng | null>(null);
  const [shoppingRoute, setShoppingRoute] = useState<ShoppingRoute | null>(null);
  const [meetingRoute, setMeetingRoute] = useState<MeetingRoute | null>(null);
  const { items: feedItems, setItems: setFeedItems } = useGroupFeed(tripId);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/trips/${tripId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMembers(data.members);
      } catch {
        // transient network errors are fine, we'll retry on the next tick
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tripId]);

  const confirmedRally =
    (feedItems.find(
      (item): item is RallyFeedItem => item.type === "rally" && item.status === "confirmed"
    ) as RallyFeedItem | undefined) ?? null;

  function handleFeedItemUpdated(updated: GroupFeedItem) {
    setFeedItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  function handleTakeMeThere(route: ShoppingRoute) {
    setShoppingRoute(route);
    setActiveTab("map");
  }

  function handleShowMeetingRoute(route: MeetingRoute) {
    setMeetingRoute(route);
    setActiveTab("map");
  }

  async function handleProposeRallyPoint(meetTimeLabel: string) {
    if (!pendingRallyClick) return;
    const res = await fetch(`/api/trips/${tripId}/rally-points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: pendingRallyClick.lat, lng: pendingRallyClick.lng, meetTimeLabel }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Couldn't propose meeting point");
    setFeedItems((prev) => [{ type: "rally", ...data.rallyPoint }, ...prev]);
    setPendingRallyClick(null);
  }

  return (
    <LocationProvider tripId={tripId}>
      <PermissionsOnboardingModal />
      <div className="mb-6 inline-flex rounded-full border border-sand-200 bg-white p-1 shadow-card">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-forest-700 text-white shadow-soft" : "text-forest-700 hover:bg-sand-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sections stay mounted and are hidden via CSS rather than unmounted on
          tab switch — Leaflet mis-sizes if re-mounted into a display:none
          container, and the poll's SSE connection shouldn't reconnect on
          every tab flip. */}
      <div className={activeTab === "map" ? "" : "hidden"}>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-sand-200 shadow-card">
            <LocationModeToggle />
            <SosButton tripId={tripId} />
            <RallyPointButton armed={proposingRally} onToggle={() => setProposingRally((v) => !v)} />
            <TripMap
              members={members}
              selfId={selfId}
              selfName={selfName}
              rallyPointMode={proposingRally}
              onProposeRallyPoint={(pos) => {
                setProposingRally(false);
                setPendingRallyClick(pos);
              }}
              confirmedRally={confirmedRally}
              shoppingRoute={shoppingRoute}
              meetingRoute={meetingRoute}
            />
          </div>

          <aside className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-forest-900">
              <Users className="h-4 w-4 text-terracotta-600" />
              Crew on the map
            </h2>
            <ul className="mt-4 space-y-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-forest-800">
                    {member.hasActiveSos && <Siren className="h-3.5 w-3.5 text-red-600" />}
                    {member.name}
                    {member.id === selfId && <span className="text-forest-500"> (You)</span>}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      member.hasActiveSos
                        ? "text-red-600"
                        : member.location
                          ? member.location.mode === "simulated"
                            ? "text-terracotta-600"
                            : "text-forest-600"
                          : "text-forest-400"
                    }`}
                  >
                    {member.hasActiveSos
                      ? "Needs help"
                      : member.location
                        ? member.location.mode === "simulated"
                          ? "Simulated"
                          : "Live"
                        : "No location yet"}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-forest-900">Group feed</h2>
          <GroupFeed
            tripId={tripId}
            items={feedItems}
            onItemUpdated={handleFeedItemUpdated}
            onShowRoute={handleShowMeetingRoute}
          />
        </div>
      </div>

      <div className={activeTab === "food" ? "" : "hidden"}>
        <FoodSection tripId={tripId} />
      </div>

      <div className={activeTab === "market" ? "" : "hidden"}>
        <MarketSection tripId={tripId} onTakeMeThere={handleTakeMeThere} />
      </div>

      {pendingRallyClick && (
        <RallyPointModal
          position={pendingRallyClick}
          onCancel={() => setPendingRallyClick(null)}
          onConfirm={handleProposeRallyPoint}
        />
      )}
    </LocationProvider>
  );
}
