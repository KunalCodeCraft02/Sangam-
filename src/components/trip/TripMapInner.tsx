"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocation, type LatLng } from "./LocationProvider";
import type { RallyFeedItem } from "./coordination/types";
import type { ShoppingRoute } from "./market/types";

export interface TripMember {
  id: string;
  name: string;
  location: { lat: number; lng: number; mode: "real" | "simulated"; updatedAt: string } | null;
  hasActiveSos?: boolean;
}

const AVATAR_COLORS = [
  "#2f6b4f",
  "#e0752c",
  "#0f766e",
  "#b45309",
  "#3f6212",
  "#7c2d12",
  "#a16207",
  "#1d4ed8",
];

const ROUTE_COLORS = ["#c2410c", "#1d4ed8", "#0f766e", "#a16207", "#7c2d12", "#2f6b4f", "#b45309"];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarIcon({
  label,
  color,
  isSelf,
  hasActiveSos,
}: {
  label: string;
  color: string;
  isSelf?: boolean;
  hasActiveSos?: boolean;
}) {
  const ringClass = hasActiveSos ? "sos-pulse-ring" : "";
  return L.divIcon({
    className: "",
    html: `<div class="${ringClass}" style="
        width: 38px; height: 38px; border-radius: 9999px;
        background: ${hasActiveSos ? "#dc2626" : color}; color: white; display: flex; align-items: center;
        justify-content: center; font-weight: 700; font-size: 13px; font-family: inherit;
        border: 3px solid ${isSelf ? "#facc15" : "rgba(255,255,255,0.9)"};
        box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      ">${label || "?"}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

function rallyPointIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
        width: 34px; height: 34px; border-radius: 9999px 9999px 9999px 2px;
        background: #1b4332; color: white; display: flex; align-items: center;
        justify-content: center; transform: rotate(45deg);
        border: 3px solid #ffd98d; box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      "><span style="transform: rotate(-45deg); font-size: 16px;">📍</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function shoppingIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
        width: 34px; height: 34px; border-radius: 9999px 9999px 9999px 2px;
        background: #1d4ed8; color: white; display: flex; align-items: center;
        justify-content: center; transform: rotate(45deg);
        border: 3px solid #bfdbfe; box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      "><span style="transform: rotate(-45deg); font-size: 16px;">🛍️</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function ClickToSpoof({ disabled }: { disabled: boolean }) {
  const { mode, setSimulatedPosition } = useLocation();
  useMapEvents({
    click(e) {
      if (disabled) return;
      if (mode !== "simulated") return;
      setSimulatedPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RallyPointPicker({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (pos: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RecenterOnFirstFix({ position }: { position: LatLng | null }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (position && !hasCentered.current) {
      hasCentered.current = true;
      map.setView([position.lat, position.lng], 13);
    }
  }, [position, map]);

  return null;
}

function FitBoundsOnShoppingRoute({ route }: { route: ShoppingRoute | null | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (!route || route.routeGeoJson.length === 0) return;
    map.fitBounds(L.latLngBounds(route.routeGeoJson), { padding: [48, 48] });
  }, [route, map]);

  return null;
}

const DEFAULT_CENTER: [number, number] = [22.9734, 78.6569];

export default function TripMapInner({
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
  const { currentPosition, mode } = useLocation();

  const otherMembers = useMemo(
    () => members.filter((member) => member.id !== selfId && member.location),
    [members, selfId]
  );

  const selfHasActiveSos = members.find((m) => m.id === selfId)?.hasActiveSos ?? false;

  return (
    <MapContainer
      center={currentPosition ? [currentPosition.lat, currentPosition.lng] : DEFAULT_CENTER}
      zoom={currentPosition ? 13 : 5}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToSpoof disabled={rallyPointMode} />
      <RallyPointPicker active={rallyPointMode} onPick={onProposeRallyPoint} />
      <RecenterOnFirstFix position={currentPosition} />
      <FitBoundsOnShoppingRoute route={shoppingRoute} />

      {currentPosition && (
        <Marker
          position={[currentPosition.lat, currentPosition.lng]}
          icon={avatarIcon({
            label: initials(selfName),
            color: "#c2410c",
            isSelf: true,
            hasActiveSos: selfHasActiveSos,
          })}
          zIndexOffset={1000}
        >
          <Popup>
            <strong>{selfName} (You)</strong>
            <br />
            {mode === "simulated" ? "Simulated location" : "Real GPS location"}
            {selfHasActiveSos && (
              <>
                <br />
                <span style={{ color: "#dc2626", fontWeight: 700 }}>🚨 Your SOS is active</span>
              </>
            )}
          </Popup>
        </Marker>
      )}

      {otherMembers.map((member) => (
        <Marker
          key={member.id}
          position={[member.location!.lat, member.location!.lng]}
          icon={avatarIcon({
            label: initials(member.name),
            color: colorForId(member.id),
            hasActiveSos: member.hasActiveSos,
          })}
        >
          <Popup>
            <strong>{member.name}</strong>
            <br />
            {member.location!.mode === "simulated" ? "Simulated location" : "Real GPS location"}
            {member.hasActiveSos && (
              <>
                <br />
                <span style={{ color: "#dc2626", fontWeight: 700 }}>🚨 Needs help</span>
              </>
            )}
          </Popup>
        </Marker>
      ))}

      {confirmedRally && (
        <>
          <Marker position={[confirmedRally.lat, confirmedRally.lng]} icon={rallyPointIcon()}>
            <Popup>
              <strong>Meeting point</strong>
              <br />
              {confirmedRally.meetTimeLabel}
            </Popup>
          </Marker>
          {confirmedRally.etas.map((eta, i) => (
            <Polyline
              key={eta.userId}
              positions={eta.routeGeoJson}
              pathOptions={{ color: ROUTE_COLORS[i % ROUTE_COLORS.length], weight: 4, opacity: 0.8 }}
            />
          ))}
        </>
      )}

      {shoppingRoute && (
        <>
          <Marker position={[shoppingRoute.lat, shoppingRoute.lng]} icon={shoppingIcon()}>
            <Popup>
              <strong>{shoppingRoute.itemName}</strong>
              <br />
              {Math.round(shoppingRoute.durationSeconds / 60)} min walk (
              {(shoppingRoute.distanceMeters / 1000).toFixed(1)} km)
            </Popup>
          </Marker>
          <Polyline
            positions={shoppingRoute.routeGeoJson}
            pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.85, dashArray: "6 8" }}
          />
        </>
      )}
    </MapContainer>
  );
}
