"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const DEFAULT_CENTER: [number, number] = [22.9734, 78.6569];

function HeatLayer({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const heatLayer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, 0.6]),
      { radius: 28, blur: 22, maxZoom: 16 }
    );
    heatLayer.addTo(map);

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

    return () => {
      heatLayer.remove();
    };
  }, [points, map]);

  return null;
}

export default function DigestHeatMapInner({ points }: { points: { lat: number; lng: number }[] }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 0 && <HeatLayer points={points} />}
    </MapContainer>
  );
}
