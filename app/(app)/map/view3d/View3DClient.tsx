"use client";

import { useEffect, useRef, useState } from "react";
import { registerScene3DProvider, getDefaultScene3DProvider, createExtrusionProvider } from "@/lib/geo/providers";
import type { Scene3DModel, Scene3DHandle } from "@/lib/geo/scene3d";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box, Layers, ArrowLeft, ZoomIn, ZoomOut, MapPinned, Pencil, LocateFixed } from "lucide-react";
import Link from "next/link";

type FarmData = {
  farmId: string;
  farmName: string;
  centroidLat: number;
  centroidLng: number;
  boundary: number[][];
};

type PlotData = {
  plotId: string;
  farmId: string;
  plotCode: string;
  plotName: string;
  boundary: number[][];
  areaHa: number;
  elevationM?: number;
};

export default function View3DClient({
  farms,
  plots,
  canEditBoundaries,
}: {
  farms: FarmData[];
  plots: PlotData[];
  canEditBoundaries: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneHandle, setSceneHandle] = useState<Scene3DHandle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.farmId ?? null);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

  useEffect(() => {
    registerScene3DProvider(createExtrusionProvider());
    let mounted = true;
    let handle: Scene3DHandle | null = null;

    async function init3D() {
      if (!containerRef.current || farms.length === 0) return;
      try {
        setIsLoading(true);
        setError(null);
        const firstFarm = farms[0];
        const scene: Scene3DModel = {
          farmId: firstFarm.farmId,
          farmName: firstFarm.farmName,
          farms: farms.map((farm) => ({
            farmId: farm.farmId,
            farmName: farm.farmName,
            boundary: farm.boundary,
            centroid: { lat: farm.centroidLat, lng: farm.centroidLng },
          })),
          boundary: {
            coordinates: firstFarm.boundary,
            centroid: { lat: firstFarm.centroidLat, lng: firstFarm.centroidLng },
          },
          plots: plots.map((plot) => ({
            plotId: plot.plotId,
            plotCode: plot.plotCode,
            plotName: plot.plotName,
            boundary: plot.boundary,
            color: getPlotColor(plot.areaHa),
            height: 3,
            elevation: plot.elevationM,
          })),
          features: [],
          imagery: {
            type: "satellite",
            url: process.env.NEXT_PUBLIC_MAPTILER_API_KEY
              ? `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${encodeURIComponent(process.env.NEXT_PUBLIC_MAPTILER_API_KEY)}`
              : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          },
        };

        handle = await getDefaultScene3DProvider().mount(containerRef.current, scene);
        if (!mounted) {
          handle.destroy();
          return;
        }
        setSceneHandle(handle);
      } catch (err) {
        console.error("Failed to initialize 3D scene:", err);
        if (mounted) setError("The 3D satellite map could not load. Check your connection and map service key, then try again.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void init3D();
    return () => {
      mounted = false;
      handle?.destroy();
    };
  }, [farms, plots]);

  useEffect(() => {
    sceneHandle?.highlightPlot(selectedPlot);
  }, [selectedPlot, sceneHandle]);

  function getPlotColor(areaHa: number): string {
    if (areaHa < 1) return "#22c55e";
    if (areaHa < 5) return "#3b82f6";
    if (areaHa < 10) return "#f59e0b";
    return "#ef4444";
  }

  function selectFarm(farm: FarmData) {
    setSelectedFarmId(farm.farmId);
    setSelectedPlot(null);
    sceneHandle?.fitBoundary(farm.boundary);
  }

  function handlePlotClick(plot: PlotData) {
    setSelectedPlot(plot.plotId);
    setSelectedFarmId(plot.farmId);
    sceneHandle?.fitBoundary(plot.boundary);
  }

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/map" className="rounded-lg p-2 hover:bg-muted" aria-label="Back to farm map"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold"><Box className="h-5 w-5 text-primary" /> 3D farm map</h1>
            <p className="text-sm text-muted-foreground">Satellite imagery, terrain, farm geofences, and plots</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPinned className="h-4 w-4 text-primary" /> {farms.length} mapped {farms.length === 1 ? "farm" : "farms"}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="relative min-h-[60svh] bg-muted lg:min-h-[calc(100svh-8rem)]">
          <div
            ref={containerRef}
            id="scene3d-container"
            className="absolute inset-0 h-full w-full"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          {isLoading && <div className="absolute inset-0 z-10 grid place-items-center bg-background/70 text-sm text-muted-foreground">Loading satellite and terrain layers…</div>}
          {error && (
            <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-background/90 p-6 text-center">
              <div className="max-w-md"><p className="font-medium text-destructive">{error}</p><Link href="/map" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Open standard farm map</Link></div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur">
              <button type="button" onClick={() => sceneHandle?.zoomBy(1)} aria-label="Zoom in" title="Zoom in" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted"><ZoomIn className="h-5 w-5" /></button>
              <button type="button" onClick={() => sceneHandle?.zoomBy(-1)} aria-label="Zoom out" title="Zoom out" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted"><ZoomOut className="h-5 w-5" /></button>
              <button type="button" onClick={() => { const farm = farms.find((entry) => entry.farmId === selectedFarmId) ?? farms[0]; if (farm) sceneHandle?.fitBoundary(farm.boundary); }} aria-label="Center selected farm" title="Center selected farm" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted"><LocateFixed className="h-5 w-5" /></button>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow backdrop-blur">
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm border-2 border-emerald-400 bg-emerald-500/30" /> My farm geofence</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm border-2 border-sky-400 bg-sky-400/40" /> Plot boundary</span>
          </div>
        </main>

        <aside className="max-h-[42svh] overflow-y-auto border-t border-border bg-card lg:max-h-none lg:border-l lg:border-t-0">
          <section className="border-b border-border p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><MapPinned className="h-4 w-4 text-primary" /> My farms</h2>
            <ul className="space-y-2">
              {farms.map((farm) => (
                <li key={farm.farmId} className={`rounded-xl border p-3 ${selectedFarmId === farm.farmId ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                  <button type="button" onClick={() => selectFarm(farm)} className="w-full text-left">
                    <span className="flex items-center gap-2 font-medium"><i className="h-3 w-3 rounded-full border-2 border-emerald-400 bg-emerald-500/50" />{farm.farmName}</span>
                    <span className="mt-1 block pl-5 text-xs text-muted-foreground">{farm.centroidLat.toFixed(5)}, {farm.centroidLng.toFixed(5)}</span>
                  </button>
                  {canEditBoundaries && <Link href={`/map?edit=${encodeURIComponent(farm.farmId)}`} className="mt-2 inline-flex items-center gap-1.5 pl-5 text-xs font-medium text-primary hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit geofence</Link>}
                </li>
              ))}
            </ul>
          </section>

          <section className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Layers className="h-4 w-4" /> Plots ({plots.length})</h2>
            {plots.length ? <ul className="space-y-2">
              {plots.map((plot) => (
                <li key={plot.plotId}>
                  <button type="button" onClick={() => handlePlotClick(plot)} className={`w-full rounded-xl border p-3 text-left ${selectedPlot === plot.plotId ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <span className="flex items-center justify-between gap-2"><span className="font-medium">{plot.plotCode}</span><span className="text-xs text-muted-foreground">{plot.areaHa.toFixed(2)} ha</span></span>
                    <span className="mt-1 block text-sm text-muted-foreground">{plot.plotName}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{farms.find((farm) => farm.farmId === plot.farmId)?.farmName}</span>
                  </button>
                </li>
              ))}
            </ul> : <p className="text-sm text-muted-foreground">No mapped plots yet. Farm geofences are still shown above.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
