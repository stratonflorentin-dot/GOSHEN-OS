/**
 * 3D Scene Provider Interface (Phase 8)
 * Provider pattern for 3D visualization - CesiumJS primary, MapLibre extrusion fallback
 */

export type Scene3DModel = {
  farmId: string;
  farmName: string;
  farms?: Array<{
    farmId: string;
    farmName: string;
    boundary: number[][];
    centroid: { lat: number; lng: number };
  }>;
  boundary: {
    coordinates: number[][]; // GeoJSON Polygon coordinates
    centroid: { lat: number; lng: number };
  };
  plots: Array<{
    plotId: string;
    plotCode: string;
    plotName: string;
    boundary: number[][];
    color: string;
    height?: number; // Extrusion height in meters
    elevation?: number; // Ground elevation in meters
  }>;
  features: Array<{
    id: string;
    type: string;
    boundary: number[][];
    height?: number;
    color: string;
  }>;
  imagery: {
    type: "satellite" | "streets";
    url: string;
  };
};

export type Scene3DHandle = {
  destroy: () => void;
  resize: () => void;
  setCamera: (position: { lat: number; lng: number; height: number }) => void;
  flyTo: (target: { lat: number; lng: number; duration?: number }) => void;
  zoomBy: (delta: number) => void;
  fitBoundary: (ring: number[][]) => void;
  highlightPlot: (plotId: string | null) => void;
};

export interface Scene3DProvider {
  readonly name: string;
  readonly status: "active" | "pending";
  mount(container: HTMLElement, scene: Scene3DModel): Promise<Scene3DHandle>;
}
