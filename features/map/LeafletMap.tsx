"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPolygon = {
  id: string;
  name: string;
  /** [lat, lng][] ring */
  ring: [number, number][];
  color?: string;
};

/** Fixes the default marker icon path bundling issue. */
function useLeafletMarkerFix() {
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);
}

function FitBounds({ polygons }: { polygons: MapPolygon[] }) {
  const map = useMap();
  useEffect(() => {
    if (polygons.length === 0) return;
    const bounds = L.latLngBounds(polygons.flatMap((p) => p.ring));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, polygons]);
  return null;
}

export default function LeafletMap({
  polygons,
  center,
  zoom = 15,
  className,
  selectedId,
  onSelect,
  showZoomControls = true,
}: {
  polygons: MapPolygon[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showZoomControls?: boolean;
}) {
  useLeafletMarkerFix();

  const first = polygons[0];
  const fallbackCenter: [number, number] = center ?? first?.ring[0] ?? [-6.443, 38.9];

  return (
    <MapContainer
      center={fallbackCenter}
      zoom={zoom}
      className={className}
      zoomControl={showZoomControls}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {polygons.map((p) => (
        <Polygon
          key={p.id}
          positions={p.ring}
          pathOptions={{
            color: p.color ?? (p.id === selectedId ? "#1B7A43" : "#156635"),
            fillColor: p.id === selectedId ? "#1B7A43" : "#2FA05C",
            fillOpacity: p.id === selectedId ? 0.35 : 0.2,
            weight: p.id === selectedId ? 2.5 : 1.5,
          }}
          eventHandlers={
            onSelect
              ? {
                  click: () => onSelect(p.id),
                }
              : undefined
          }
        />
      ))}
      {polygons.length > 0 && <FitBounds polygons={polygons} />}
    </MapContainer>
  );
}
