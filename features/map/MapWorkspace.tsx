"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPinned, Layers, Eye, EyeOff, LocateFixed, Radio, RadioTower, Box, Pencil, Save, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pointInPolygon } from "@/lib/geo";
import { ringHasSelfIntersections } from "./geometry";
import type { MapLocation, MapPolygon } from "./MapLibreMap";
import { saveFarmBoundaryAction } from "@/app/(app)/map/actions";

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
  canEditBoundaries,
  initialEditableId,
}: {
  farmName: string;
  polygons: MapPolygon[];
  plotPolygons: MapPolygon[];
  pendingNote?: string;
  canEditBoundaries: boolean;
  initialEditableId?: string | null;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ farm: true, plots: false });
  const [selected, setSelected] = useState<string | null>(initialEditableId ?? null);
  const [editableId, setEditableId] = useState<string | null>(initialEditableId ?? null);
  const [editedPolygons, setEditedPolygons] = useState<MapPolygon[]>(() => {
    const polygon = polygons.find((item) => item.id === initialEditableId);
    return polygon ? [{ ...polygon, ring: polygon.ring.map((point) => [...point] as [number, number]) }] : [];
  });
  const [undoStack, setUndoStack] = useState<{ id: string; ring: [number, number][] }[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingRingNeedsRepair, setEditingRingNeedsRepair] = useState(() => {
    const polygon = polygons.find((item) => item.id === initialEditableId);
    return polygon ? ringHasSelfIntersections(polygon.ring) : false;
  });
  const [editSaved, setEditSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [location, setLocation] = useState<MapLocation>();
  const [tracking, setTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [transition, setTransition] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastFence = useRef<string | null | undefined>(undefined);
  const workingFarms = polygons.map((polygon) => editedPolygons.find((edited) => edited.id === polygon.id) ?? polygon);
  const displayedPolygons = [
    ...(visible.farm ? workingFarms : []),
    ...(visible.plots ? plotPolygons : []),
  ];
  const selectedPolygon = displayedPolygons.find((p) => p.id === selected) ?? null;
  const editingPolygon = workingFarms.find((polygon) => polygon.id === editableId) ?? null;
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

  function beginBoundaryEdit() {
    if (!selectedPolygon || !polygons.some((polygon) => polygon.id === selectedPolygon.id)) return;
    setEditedPolygons((current) => [
      ...current.filter((polygon) => polygon.id !== selectedPolygon.id),
      { ...selectedPolygon, ring: selectedPolygon.ring.map((point) => [...point] as [number, number]) },
    ]);
    setEditableId(selectedPolygon.id);
    setEditingRingNeedsRepair(ringHasSelfIntersections(selectedPolygon.ring));
    setUndoStack([]);
    setEditError(null);
    setEditSaved(false);
  }

  function cancelBoundaryEdit() {
    setEditableId(null);
    setEditingRingNeedsRepair(false);
    setEditedPolygons([]);
    setUndoStack([]);
    setEditError(null);
    if (initialEditableId) router.replace("/map", { scroll: false });
  }

  function saveBoundaryEdit() {
    if (!editingPolygon || isSaving) return;
    setEditError(null);
    setEditSaved(false);
    startSaving(async () => {
      try {
        const result = await saveFarmBoundaryAction({ farmId: editingPolygon.id, ring: editingPolygon.ring });
        if (result.error) {
          setEditError(result.error);
          return;
        }
        setEditableId(null);
        setEditingRingNeedsRepair(false);
        setEditedPolygons([]);
        setUndoStack([]);
        setEditSaved(true);
        if (initialEditableId) router.replace("/map", { scroll: false });
        router.refresh();
      } catch {
        setEditError("Could not save the farm boundary. Please check your connection and try again.");
      }
    });
  }

  function undoBoundaryMove() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setEditedPolygons((current) => {
      const original = polygons.find((polygon) => polygon.id === previous.id);
      const existing = current.find((polygon) => polygon.id === previous.id) ?? original;
      if (!existing) return current;
      return [...current.filter((polygon) => polygon.id !== previous.id), { ...existing, ring: previous.ring }];
    });
    setUndoStack((current) => current.slice(0, -1));
    setEditError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Land &amp; GIS <span className="px-1.5">/</span> {farmName}</p>
          <h1 className="page-title mt-1">Farm map</h1>
          <p className="mt-1 text-sm text-muted-foreground">Satellite imagery, farm boundaries, and live GPS geofencing.</p>
        </div>
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <Link href="/map/view3d" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Box className="h-4 w-4" /> 3D terrain
          </Link>
          {polygons.length > 0 && (
            <button
              type="button"
              onClick={toggleGeofence}
              disabled={Boolean(editableId)}
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
          {canEditBoundaries && selectedPolygon && polygons.some((polygon) => polygon.id === selectedPolygon.id) && !editableId && (
            <button type="button" onClick={beginBoundaryEdit} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
              <Pencil className="h-4 w-4" /> Edit fence
            </button>
          )}
        </div>
      </div>

      {editableId && editingPolygon && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Drag the white handles to reshape <span className="font-semibold">{editingPolygon.name}</span>. {editingRingNeedsRepair ? "This saved boundary has crossing points. Drag the handles to repair it; saving will work once the outline is valid." : "Moves that would make the fence cross itself are blocked."}</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={undoBoundaryMove} disabled={isSaving || undoStack.length === 0} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium disabled:opacity-50"><Undo2 className="h-4 w-4" /> Undo move</button>
            <button type="button" onClick={cancelBoundaryEdit} disabled={isSaving} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium disabled:opacity-60"><X className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={saveBoundaryEdit} disabled={isSaving} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-white disabled:opacity-60"><Save className="h-4 w-4" /> {isSaving ? "Saving…" : "Save fence"}</button>
          </div>
        </div>
      )}
      {editError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{editError}</p>}
      {editSaved && <p role="status" className="text-sm text-primary">Farm boundary saved.</p>}

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
                    disabled={Boolean(editableId)}
                    onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
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
                editableId={editableId}
                onEditPolygonChange={(id, ring) => setEditedPolygons((current) => {
                  const existing = current.find((polygon) => polygon.id === id) ?? polygons.find((polygon) => polygon.id === id);
                  if (!existing) return current;
                  return [...current.filter((polygon) => polygon.id !== id), { ...existing, ring }];
                })}
                onEditDragStart={(id, ring) => setUndoStack((current) => [...current.slice(-29), { id, ring }])}
                onEditValidationChange={(crossesBoundary) => {
                  setEditError(crossesBoundary
                    ? "That move would make the fence cross itself. Move the handle along the existing outline."
                    : null);
                }}
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
                {editableId ? "Drag the white fence handles to move the boundary points." : "Select a farm boundary to inspect it, then use Edit fence to adjust its points."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
