"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import type { MapPolygon } from "./MapLibreMap";

const FarmMap = dynamic(() => import("./MapLibreMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted/50 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function MiniMap({ polygons }: { polygons: MapPolygon[] }) {
  if (polygons.length === 0) {
    return (
      <div className="grid h-56 w-full place-items-center rounded-2xl border border-dashed border-black/10 bg-muted/40 text-center">
        <div>
          <MapPinned className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No farm boundary yet</p>
          <p className="text-xs text-muted-foreground/70">
            Create a farm and walk its boundary with your phone.
          </p>
        </div>
      </div>
    );
  }
  return <FarmMap polygons={polygons} className="h-56 w-full rounded-2xl" showZoomControls={false} />;
}
