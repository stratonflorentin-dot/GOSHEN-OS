"use client";

import { useEffect, useRef, useState } from "react";
import { registerScene3DProvider, getDefaultScene3DProvider, createExtrusionProvider } from "@/lib/geo/providers";
import type { Scene3DModel, Scene3DHandle } from "@/lib/geo/scene3d";
import { Box, RotateCw, Layers, ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";

type FarmData = {
  farmId: string;
  farmName: string;
  centroidLat: number;
  centroidLng: number;
  boundary: string | null;
};

type PlotData = {
  plotId: string;
  plotCode: string;
  plotName: string;
  boundary: string | null;
  areaHa: number;
  elevationM?: number;
};

export default function View3DClient({ farm, plots }: { farm: FarmData; plots: PlotData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneHandle, setSceneHandle] = useState<Scene3DHandle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

  useEffect(() => {
    // Register extrusion provider (fallback)
    registerScene3DProvider(createExtrusionProvider());

    async function init3D() {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Parse farm boundary
        let boundaryCoords: number[][] = [];
        if (farm.boundary) {
          const geoJson = JSON.parse(farm.boundary);
          if (geoJson.type === "Polygon" && geoJson.coordinates) {
            boundaryCoords = geoJson.coordinates[0];
          }
        }

        // Build scene model
        const scene: Scene3DModel = {
          farmId: farm.farmId,
          farmName: farm.farmName,
          boundary: {
            coordinates: boundaryCoords,
            centroid: { lat: farm.centroidLat, lng: farm.centroidLng },
          },
          plots: plots
            .filter(p => p.boundary)
            .map(p => {
              const geoJson = JSON.parse(p.boundary!);
              const coords = geoJson.type === "Polygon" ? geoJson.coordinates[0] : [];
              return {
                plotId: p.plotId,
                plotCode: p.plotCode,
                plotName: p.plotName,
                boundary: coords,
                color: getPlotColor(p.areaHa),
                height: Math.max(5, Math.round(p.areaHa * 2)), // Height based on area
                elevation: p.elevationM,
              };
            }),
          features: [], // Add map features when available
          imagery: {
            type: "satellite",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          },
        };

        // Get provider and mount scene
        const provider = getDefaultScene3DProvider();
        const handle = await provider.mount(containerRef.current, scene);
        setSceneHandle(handle);
      } catch (err) {
        console.error("Failed to initialize 3D scene:", err);
        setError(err instanceof Error ? err.message : "Failed to load 3D view");
      } finally {
        setIsLoading(false);
      }
    }

    init3D();

    return () => {
      sceneHandle?.destroy();
    };
  }, [farm, plots]);

  // Handle plot selection
  useEffect(() => {
    if (sceneHandle) {
      sceneHandle.highlightPlot(selectedPlot);
    }
  }, [selectedPlot, sceneHandle]);

  function getPlotColor(areaHa: number): string {
    // Color based on plot size
    if (areaHa < 1) return "#22c55e"; // Small - green
    if (areaHa < 5) return "#3b82f6"; // Medium - blue
    if (areaHa < 10) return "#f59e0b"; // Large - orange
    return "#ef4444"; // Very large - red
  }

  function handlePlotClick(plotId: string) {
    setSelectedPlot(plotId);
    // Fly to plot location
    const plot = plots.find(p => p.plotId === plotId);
    if (plot && sceneHandle) {
      try {
        const geoJson = JSON.parse(plot.boundary!);
        if (geoJson.type === "Polygon" && geoJson.coordinates) {
          const coords = geoJson.coordinates[0];
          // Calculate center of plot
          const lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          const lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
          sceneHandle.flyTo({ lng, lat, duration: 1000 });
        }
      } catch (err) {
        console.error("Failed to parse plot boundary:", err);
      }
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/map" className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Box className="h-5 w-5 text-primary-600" /> 3D View
            </h1>
            <p className="text-sm text-muted-foreground">{farm.farmName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${plots.length} plots`}
          </div>
          <button
            onClick={() => sceneHandle?.resize()}
            className="p-2 rounded-lg hover:bg-muted"
            title="Refresh view"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D View */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Box className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading 3D scene...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
              <div className="text-center max-w-md">
                <p className="text-destructive font-medium">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  3D view requires additional setup. Using 2D map instead.
                </p>
                <Link href="/map" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
                  Go to 2D Map
                </Link>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            id="scene3d-container"
            className="w-full h-full"
            style={{ minHeight: "400px" }}
          />
          {/* 3D Controls */}
          {!isLoading && !error && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => sceneHandle?.setCamera({
                  lat: farm.centroidLat,
                  lng: farm.centroidLng,
                  height: 500
                })}
                className="p-2 bg-white rounded-lg shadow-md hover:bg-muted"
                title="Reset camera"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedPlot(null)}
                className="p-2 bg-white rounded-lg shadow-md hover:bg-muted"
                title="Clear selection"
              >
                <Layers className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Plot list sidebar */}
        <div className="w-80 border-l border-black/5 bg-white overflow-y-auto">
          <div className="p-4 border-b border-black/5">
            <h2 className="font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" /> Plots
            </h2>
          </div>
          <div className="p-2">
            {plots.map((plot) => (
              <button
                key={plot.plotId}
                onClick={() => handlePlotClick(plot.plotId)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedPlot === plot.plotId
                    ? "bg-primary text-white"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{plot.plotCode}</span>
                  <span className="text-xs opacity-75">{plot.areaHa.toFixed(1)} ha</span>
                </div>
                <p className="text-sm opacity-75 mt-1">{plot.plotName}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}