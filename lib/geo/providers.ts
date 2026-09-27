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
      const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim();
      const satelliteStyle = mapTilerKey
        ? `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${encodeURIComponent(mapTilerKey)}`
        : {
            version: 8 as const,
            sources: {
              imagery: {
                type: "raster" as const,
                tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                tileSize: 256,
                maxzoom: 19,
                attribution: "Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
              },
            },
            layers: [{ id: "imagery", type: "raster" as const, source: "imagery" }],
          };
      const farms = scene.farms?.length ? scene.farms : [{
        farmId: scene.farmId,
        farmName: scene.farmName,
        boundary: scene.boundary.coordinates,
        centroid: scene.boundary.centroid,
      }];
      const initialFarm = farms.find((farm) => farm.farmId === scene.farmId) ?? farms[0];

      // Initialize MapLibre with satellite basemap
      const map = new mapLibre.Map({
        container,
        style: satelliteStyle,
        center: [initialFarm.centroid.lng, initialFarm.centroid.lat],
        zoom: 17,
        minZoom: 2,
        maxZoom: 21,
        pitch: 52,
        bearing: -12,
        scrollZoom: true,
      });

      // Wait for map to load before adding layers
      await new Promise<void>((resolve) => {
        map.on("load", () => resolve());
      });

      if (mapTilerKey) {
        map.addSource("goshen-3d-terrain", {
          type: "raster-dem",
          url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${encodeURIComponent(mapTilerKey)}`,
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "goshen-3d-terrain", exaggeration: 1.15 });
      }

      const farmFeatures = farms.filter((farm) => farm.boundary.length >= 4).map((farm) => ({
        type: "Feature" as const,
        properties: { id: farm.farmId, name: farm.farmName },
        geometry: { type: "Polygon" as const, coordinates: [farm.boundary] },
      }));
      map.addSource("goshen-3d-farms", {
        type: "geojson",
        data: { type: "FeatureCollection", features: farmFeatures },
      });
      map.addLayer({
        id: "goshen-3d-farm-fill",
        type: "fill",
        source: "goshen-3d-farms",
        paint: { "fill-color": "#16a765", "fill-opacity": 0.24 },
      });
      map.addLayer({
        id: "goshen-3d-farm-outline",
        type: "line",
        source: "goshen-3d-farms",
        paint: { "line-color": "#35f28b", "line-width": 4, "line-opacity": 1 },
      });
      const fitFarm = (farmId: string, duration = 500) => {
        const farm = farms.find((candidate) => candidate.farmId === farmId);
        if (!farm) return;
        if (farm.boundary.length >= 4) {
          const bounds = new mapLibre.LngLatBounds();
          farm.boundary.forEach(([lng, lat]) => bounds.extend([lng, lat] as [number, number]));
          map.fitBounds(bounds, { padding: { top: 80, right: 80, bottom: 80, left: 80 }, maxZoom: 19, duration, pitch: 52 });
        } else {
          map.flyTo({ center: [farm.centroid.lng, farm.centroid.lat], zoom: 18, pitch: 52, duration });
        }
      };
      fitFarm(initialFarm.farmId, 0);

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

          map.addLayer({
            id: `plot-outline-${plot.plotId}`,
            type: "line",
            source: `plot-${plot.plotId}`,
            paint: { "line-color": "#38bdf8", "line-width": 2.5, "line-opacity": 1 },
          });
        }
      });

      map.addLayer({
        id: "goshen-3d-farm-labels",
        type: "symbol",
        source: "goshen-3d-farms",
        layout: { "symbol-placement": "point", "text-field": ["get", "name"], "text-size": 13, "text-allow-overlap": true },
        paint: { "text-color": "#ffffff", "text-halo-color": "#06351f", "text-halo-width": 2 },
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
            zoom: 18,
            pitch: 60,
            duration: 1000,
          });
        },
        flyTo: (target) => {
          map.flyTo({
            center: [target.lng, target.lat],
            zoom: 19,
            pitch: 52,
            duration: target.duration || 1000,
          });
        },
        zoomBy: (delta) => map.zoomTo(Math.max(2, Math.min(21, map.getZoom() + delta)), { duration: 250 }),
        fitBoundary: (ring) => {
          if (ring.length < 4) return;
          const bounds = new mapLibre.LngLatBounds();
          ring.forEach(([lng, lat]) => bounds.extend([lng, lat] as [number, number]));
          map.fitBounds(bounds, { padding: 100, maxZoom: 19, duration: 700, pitch: 52 });
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
