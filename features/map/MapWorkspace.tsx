"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPinned, Layers, Eye, EyeOff, LocateFixed, Radio, RadioTower, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { pointInPolygon } from "@/lib/geo";
import type { MapLocation, MapPolygon } from "./MapLibreMap";

const FarmMap = dynamic(() => import("./MapLibreMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted/50 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type LayerKey = "farm" | "plots";

const LAYERS: { key: LayerKey; label: string; ready: boolean; phase?: number }[] = [
  { key: "farm", label: "Farm boundaries", ready: true },
  { key: "plots", label: "Plot boundaries", ready: true },
];

export function MapWorkspace({
  farmName,
  polygons,
  plotPolygons,
  pendingNote,
}: {
  farmName: string;
  polygons: MapPolygon[];
  plotPolygons: MapPolygon[];
  pendingNote?: string;
}) {
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ farm: true, plots: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [location, setLocation] = useState<MapLocation>();
  const [tracking, setTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [transition, setTransition] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastFence = useRef<string | null | undefined>(undefined);
  const displayedPolygons = [
    ...(visible.farm ? polygons : []),
    ...(visible.plots ? plotPolygons : []),
  ];
  const selectedPolygon = displayedPolygons.find((p) => p.id === selected) ?? null;
  const currentFence = location
    ? polygons.find((polygon) => pointInPolygon(location.point, polygon.ring)) ?? null
    : null;

  useEffect(() => () => {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
    }
  }, []);

  function toggleGeofence() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setTracking(false);
      setTransition(null);
      lastFence.current = undefined;
      return;
    }
    if (!navigator.geolocation) {
      setGpsError("Location is unavailable in this browser.");
      return;
    }

    setGpsError(null);
    setTransition(null);
    lastFence.current = undefined;
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation: MapLocation = {
          point: [position.coords.latitude, position.coords.longitude],
          accuracy: position.coords.accuracy,
        };
        const fence = polygons.find((polygon) => pointInPolygon(nextLocation.point, polygon.ring)) ?? null;
        const previousId = lastFence.current;
        if (previousId !== undefined && previousId !== (fence?.id ?? null)) {
          setTransition(fence ? `Entered ${fence.name}` : "Outside recorded farm boundaries");
          navigator.vibrate?.(80);
        }
        lastFence.current = fence?.id ?? null;
        setLocation(nextLocation);
      },
      (error) => {
        watchId.current = null;
        setTracking(false);
        setGpsError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser to use geofencing."
            : error.code === error.TIMEOUT
              ? "GPS is taking too long. Move to an open area and try again."
              : "Could not read your location. Check your device location settings.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Land &amp; GIS <span className="px-1.5">/</span> {farmName}</p>
          <h1 className="page-title mt-1">Farm map</h1>
          <p className="mt-1 text-sm text-muted-foreground">Satellite imagery, farm boundaries, and live GPS geofencing.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/map/view3d" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Box className="h-4 w-4" /> 3D terrain
          </Link>
          {polygons.length > 0 && (
            <button
              type="button"
              onClick={toggleGeofence}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted",
                tracking && "border-primary bg-primary-50 text-primary-800 dark:bg-primary-800 dark:text-white",
              )}
              aria-pressed={tracking}
            >
              {tracking ? <RadioTower className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />}
              {tracking ? "Stop geofence" : "Start geofence"}
            </button>
          )}
          <Link href="/farms/new" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 sm:px-4">
            <MapPinned className="h-4 w-4" /> Record boundary
          </Link>
        </div>
      </div>

      {(tracking || gpsError || transition) && (
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          {tracking && <Radio className={cn("h-4 w-4", currentFence ? "text-emerald-600" : "text-amber-600")} />}
          <span className="font-medium">
            {gpsError ?? (location
              ? currentFence ? `Inside ${currentFence.name}` : "Outside recorded farm boundaries"
              : "Waiting for GPS fix…")}
          </span>
          {location && <span className="text-xs text-muted-foreground">Accuracy ±{Math.round(location.accuracy)} m</span>}
          {transition && <span className="text-xs text-muted-foreground">{transition}</span>}
          <span className="text-xs text-muted-foreground">Geofencing runs while this page is open.</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Layers panel */}
        <div className="card p-4">
          <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Map layers
          </h2>
          <ul className="space-y-1.5">
            {LAYERS.map(({ key, label, ready, phase }) => (
              <li key={key}>
                {ready ? (
                  <button
                    onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-black/[0.04]"
                  >
                    {label}
                    {visible[key] ? (
                      <Eye className="h-4 w-4 text-primary-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </button>
                ) : (
                  <span
                    className="flex cursor-default items-center justify-between rounded-lg px-2.5 py-2 text-sm text-muted-foreground/50"
                    title={`Coming in Phase ${phase}`}
                  >
                    {label}
                    <EyeOff className="h-4 w-4" />
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            Satellite basemap and terrain are available. Additional overlays appear when their organization data is connected.
          </p>
        </div>

        {/* Map */}
        <div className="card overflow-hidden p-0">
          <div className="h-[420px] w-full sm:h-[560px]">
            {displayedPolygons.length > 0 ? (
              <FarmMap
                polygons={displayedPolygons}
                selectedId={selected}
                onSelect={setSelected}
                currentLocation={location}
                initialView="satellite"
                className="h-full w-full"
              />
            ) : (
              <div className="grid h-full place-items-center bg-muted/40 p-6 text-center">
                <div>
                  <MapPinned className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    {pendingNote ?? "Toggle the farm layer to see boundaries."}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-black/5 px-5 py-3.5 text-sm">
            {selectedPolygon ? (
              <p>
                Selected: <span className="font-semibold">{selectedPolygon.name}</span>
              </p>
            ) : (
                <p className="text-muted-foreground">
                Select a recorded farm or plot boundary to inspect its mapped area.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
