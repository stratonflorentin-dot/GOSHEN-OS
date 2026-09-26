"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon, Circle, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPolygon = {
  id: string;
  name: string;
  /** [lat, lng][] ring */
  ring: [number, number][];
  color?: string;
};

export type MapLocation = { point: [number, number]; accuracy: number };

/** Fixes the default marker icon path bundling issue. */
function FitBounds({ polygons }: { polygons: MapPolygon[] }) {
  const map = useMap();
  useEffect(() => {
    if (polygons.length === 0) return;
    const bounds = L.latLngBounds(polygons.flatMap((p) => p.ring));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, polygons]);
  return null;
}

function MapResizeObserver() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    const timer = window.setTimeout(() => map.invalidateSize({ pan: false }), 120);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

function FollowLocation({ location }: { location?: MapLocation }) {
  const map = useMap();
  const centered = useRef(false);
  useEffect(() => {
    if (!location) {
      centered.current = false;
      return;
    }
    if (!centered.current) {
      map.flyTo(location.point, Math.max(map.getZoom(), 16), { duration: 0.5 });
      centered.current = true;
    }
  }, [location, map]);
  return null;
}

function Basemap({ onError }: { onError: () => void }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark ? (
    <TileLayer
      key="dark-basemap"
      attribution='&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      eventHandlers={{ tileerror: onError }}
    />
  ) : (
    <TileLayer
      key="light-basemap"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      eventHandlers={{ tileerror: onError }}
    />
  );
}

export default function LeafletMap({
  polygons,
  center,
  zoom = 15,
  className,
  selectedId,
  onSelect,
  showZoomControls = true,
  currentLocation,
}: {
  polygons: MapPolygon[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showZoomControls?: boolean;
  currentLocation?: MapLocation;
}) {
  const [tileError, setTileError] = useState(false);

  const first = polygons[0];
  const fallbackCenter: [number, number] = center ?? first?.ring[0] ?? [-6.443, 38.9];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={fallbackCenter}
        zoom={zoom}
        className={className}
        zoomControl={showZoomControls}
        style={{ height: "100%", width: "100%" }}
      >
      <Basemap onError={() => setTileError(true)} />
      <MapResizeObserver />
      <FollowLocation location={currentLocation} />
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
      {currentLocation && (
        <>
          <Circle
            center={currentLocation.point}
            radius={Math.max(currentLocation.accuracy, 5)}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 1 }}
          />
          <CircleMarker
            center={currentLocation.point}
            radius={7}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}
          />
        </>
      )}
      {polygons.length > 0 && <FitBounds polygons={polygons} />}
      </MapContainer>
      {tileError && (
        <div role="status" className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow">
          Map tiles are unavailable. Check your internet connection and try again.
        </div>
      )}
    </div>
  );
}
