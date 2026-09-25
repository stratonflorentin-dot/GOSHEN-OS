"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPinned, Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapPolygon } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
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
  { key: "plots", label: "Plots", ready: false, phase: 2 },
];

export function MapWorkspace({
  farmName,
  polygons,
  pendingNote,
}: {
  farmName: string;
  polygons: MapPolygon[];
  pendingNote?: string;
}) {
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ farm: true, plots: false });
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPolygon = polygons.find((p) => p.id === selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Farm Map</h1>
          <p className="text-sm text-muted-foreground">{farmName}</p>
        </div>
        <Link
          href="/farms/new"
          className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 sm:inline-flex"
        >
          <MapPinned className="h-4 w-4" /> Record boundary
        </Link>
      </div>

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
          <p className="mt-3 border-t border-black/5 pt-3 text-xs text-muted-foreground/70">
            Buildings, roads, water, irrigation, soil, and satellite layers arrive with
            Phase 2 GIS.
          </p>
        </div>

        {/* Map */}
        <div className="card overflow-hidden p-0">
          <div className="h-[420px] w-full sm:h-[560px]">
            {polygons.length > 0 && visible.farm ? (
              <LeafletMap
                polygons={polygons}
                selectedId={selected}
                onSelect={setSelected}
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
                Select a farm boundary on the map to inspect it. Plot details, costs, and
                profitability arrive with Phase 2+.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
