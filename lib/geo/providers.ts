/**
 * 3D Scene Providers - CesiumJS (primary) and MapLibre Extrusion (fallback)
 */

import type { Scene3DProvider, Scene3DModel, Scene3DHandle } from "./scene3d";

// Provider registry
const providers = new Map<string, Scene3DProvider>();

export function registerScene3DProvider(provider: Scene3DProvider): void {
  providers.set(provider.name, provider);
}

export function getScene3DProvider(name: string): Scene3DProvider | undefined {
  return providers.get(name);
}

export function getDefaultScene3DProvider(): Scene3DProvider {
  // Try Cesium first, fallback to MapLibre extrusion
  const cesium = providers.get("cesium");
  if (cesium?.status === "active") return cesium;

  const extrusion = providers.get("extrusion");
  if (extrusion?.status === "active") return extrusion;

  // Default to extrusion (always available as fallback)
  return providers.get("extrusion")!;
}

/**
 * MapLibre Fill-Extrusion Provider (Fallback)
 * Ships with Phase 2, provides basic 3D visualization without external dependencies
 */
export function createExtrusionProvider(): Scene3DProvider {
  return {
    name: "extrusion",
    status: "active",

    async mount(container: HTMLElement, scene: Scene3DModel): Promise<Scene3DHandle> {
      // Lazy load MapLibre
      const mapLibre = await import("maplibre-gl");

      // Initialize MapLibre with satellite basemap
      const map = new mapLibre.Map({
        container: container.id,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: "satellite",
              type: "raster",
              source: "satellite",
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        },
        center: [scene.boundary.centroid.lng, scene.boundary.centroid.lat],
        zoom: 14,
        pitch: 45, // 3D perspective
        bearing: 0,
      });

      // Wait for map to load before adding layers
      await new Promise<void>((resolve) => {
        map.on("load", () => resolve());
      });

      // Add extruded plots
      scene.plots.forEach((plot) => {
        if (plot.boundary.length > 0) {
          map.addSource(`plot-${plot.plotId}`, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [plot.boundary],
              },
            },
          });

          map.addLayer({
            id: `plot-extrusion-${plot.plotId}`,
            type: "fill-extrusion",
            source: `plot-${plot.plotId}`,
            paint: {
              "fill-extrusion-color": plot.color,
              "fill-extrusion-height": plot.height || 5, // Default 5m height
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.8,
            },
          });
        }
      });

      // Add extruded features (buildings, etc.)
      scene.features.forEach((feature) => {
        if (feature.height && feature.height > 0 && feature.boundary.length > 0) {
          map.addSource(`feature-${feature.id}`, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [feature.boundary],
              },
            },
          });

          map.addLayer({
            id: `feature-extrusion-${feature.id}`,
            type: "fill-extrusion",
            source: `feature-${feature.id}`,
            paint: {
              "fill-extrusion-color": feature.color,
              "fill-extrusion-height": feature.height,
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.7,
            },
          });
        }
      });

      let highlightedPlotId: string | null = null;

      return {
        destroy: () => {
          map.remove();
        },
        resize: () => {
          map.resize();
        },
        setCamera: (position) => {
          map.flyTo({
            center: [position.lng, position.lat],
            zoom: 15,
            pitch: 60,
            duration: 1000,
          });
        },
        flyTo: (target) => {
          map.flyTo({
            center: [target.lng, target.lat],
            duration: target.duration || 1000,
          });
        },
        highlightPlot: (plotId) => {
          // Remove previous highlight
          if (highlightedPlotId) {
            const prevLayer = map.getLayer(`plot-highlight-${highlightedPlotId}`);
            if (prevLayer) map.removeLayer(`plot-highlight-${highlightedPlotId}`);
            const prevSource = map.getSource(`plot-highlight-${highlightedPlotId}`);
            if (prevSource) map.removeSource(`plot-highlight-${highlightedPlotId}`);
          }

          highlightedPlotId = plotId;

          if (plotId) {
            const plot = scene.plots.find((p) => p.plotId === plotId);
            if (plot && plot.boundary.length > 0) {
              map.addSource(`plot-highlight-${plotId}`, {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "Polygon",
                    coordinates: [plot.boundary],
                  },
                },
              });

              map.addLayer({
                id: `plot-highlight-${plotId}`,
                type: "line",
                source: `plot-highlight-${plotId}`,
                paint: {
                  "line-color": "#ffffff",
                  "line-width": 3,
                },
              });
            }
          }
        },
      };
    },
  };
}

/**
 * CesiumJS Provider (Primary, High Quality)
 * Requires Cesium ion tokens for terrain and satellite imagery
 * Falls back to extrusion provider if tokens not available
 * NOTE: Currently disabled due to TypeScript compatibility issues with Resium
 * Will be enabled when proper Cesium types are available
 */
export function createCesiumProvider(): Scene3DProvider {
  const ionToken = process.env.CESIUM_ION_TOKEN;
  const terrainToken = process.env.CESIUM_TERRAIN_TOKEN;

  if (!ionToken || !terrainToken) {
    return {
      name: "cesium",
      status: "pending",
      async mount() {
        throw new Error("Cesium ion tokens not configured. Falling back to extrusion provider.");
      },
    };
  }

  return {
    name: "cesium",
    status: "pending", // Temporarily set to pending due to TypeScript issues
    async mount() {
      throw new Error("Cesium provider currently disabled due to TypeScript compatibility. Using MapLibre extrusion fallback.");
    },
  };
}

// Register providers
registerScene3DProvider(createExtrusionProvider());
if (process.env.CESIUM_ION_TOKEN && process.env.CESIUM_TERRAIN_TOKEN) {
  registerScene3DProvider(createCesiumProvider());
}