"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreInstance, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapIcon, Satellite, Rotate3D } from "lucide-react";
import { openRing, vertexMoveKeepsRingValid } from "./geometry";

export type MapPolygon = {
  id: string;
  name: string;
  /** [latitude, longitude][] ring */
  ring: [number, number][];
  color?: string;
};

export type MapLocation = { point: [number, number]; accuracy: number };

type Props = {
  polygons: MapPolygon[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showZoomControls?: boolean;
  initialView?: "streets" | "satellite";
  currentLocation?: MapLocation;
  editableId?: string | null;
  onEditPolygonChange?: (id: string, ring: [number, number][]) => void;
  onEditDragStart?: (id: string, ring: [number, number][]) => void;
  onEditValidationChange?: (crossesBoundary: boolean) => void;
};

const SOURCE_ID = "goshen-farm-boundaries";
const SATELLITE_SOURCE_ID = "goshen-satellite";
const LABEL_SOURCE_ID = "goshen-satellite-labels";
const LOCATION_SOURCE_ID = "goshen-current-location";
const TERRAIN_SOURCE_ID = "goshen-terrain-dem";
const EDIT_VERTICES_SOURCE_ID = "goshen-edit-vertices";
const EDIT_VERTICES_LAYER_ID = "goshen-edit-vertices-layer";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim();

function satelliteStyle(): StyleSpecification | string {
  if (MAPTILER_KEY) {
    // MapTiler Hybrid combines high-resolution satellite imagery with place
    // names and road/boundary labels in one style.
    return `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`;
  }

  // Keep a usable map when a deployment has not been given a MapTiler key.
  return {
    version: 8,
    sources: {
      [SATELLITE_SOURCE_ID]: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
      [LABEL_SOURCE_ID]: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "",
      },
    },
    layers: [
      { id: "goshen-satellite", type: "raster", source: SATELLITE_SOURCE_ID },
      { id: "goshen-satellite-labels", type: "raster", source: LABEL_SOURCE_ID },
    ],
  };
}

function streetStyle(dark: boolean): StyleSpecification {
  if (!dark) {
    return {
      version: 8,
      sources: {
        streets: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        },
      },
      layers: [{ id: "streets", type: "raster", source: "streets" }],
    };
  }
  return {
    version: 8,
    sources: {
      dark: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Tiles &copy; Esri — Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community",
      },
    },
    layers: [{ id: "streets-dark", type: "raster", source: "dark" }],
  };
}

function emptyCollection() {
  return { type: "FeatureCollection" as const, features: [] };
}

function boundaryCollection(polygons: MapPolygon[]) {
  return {
    type: "FeatureCollection" as const,
    features: polygons
      .map((polygon) => ({ polygon, ring: openRing(polygon.ring) }))
      .filter(({ ring }) => ring.length >= 2)
      .map(({ polygon, ring }) => ({
        type: "Feature" as const,
        id: polygon.id,
        properties: { id: polygon.id, name: polygon.name, color: polygon.color ?? "#22a65a" },
        geometry: ring.length >= 3
          ? { type: "Polygon" as const, coordinates: [[...ring, ring[0]].map(([lat, lng]) => [lng, lat])] }
          : { type: "LineString" as const, coordinates: ring.map(([lat, lng]) => [lng, lat]) },
      })),
  };
}

function editableVertexCollection(polygon?: MapPolygon) {
  return {
    type: "FeatureCollection" as const,
    features: openRing(polygon?.ring ?? []).map(([lat, lng], vertexIndex) => ({
      type: "Feature" as const,
      properties: { vertexIndex },
      geometry: { type: "Point" as const, coordinates: [lng, lat] },
    })),
  };
}

function locationCollection(location?: MapLocation) {
  if (!location) return emptyCollection();
  const [lat, lng] = location.point;
  const radius = Math.max(location.accuracy, 5);
  const points = Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * 2 * Math.PI;
    const dx = (radius * Math.cos(angle)) / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
    const dy = (radius * Math.sin(angle)) / 110_574;
    return [lng + dx, lat + dy];
  });
  points.push(points[0]);
  return {
    type: "FeatureCollection" as const,
    features: [
      { type: "Feature" as const, properties: { kind: "accuracy" }, geometry: { type: "Polygon" as const, coordinates: [points] } },
      { type: "Feature" as const, properties: { kind: "position" }, geometry: { type: "Point" as const, coordinates: [lng, lat] } },
    ],
  };
}

function addOperationalLayers(map: MapLibreInstance) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: "geojson", data: emptyCollection() });
    map.addLayer({
      id: "goshen-boundary-fill",
      type: "fill",
      source: SOURCE_ID,
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.2 },
    });
    map.addLayer({
      id: "goshen-boundary-line",
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": ["get", "color"], "line-width": 2.5 },
    });
  }

  if (!map.getSource(LOCATION_SOURCE_ID)) {
    map.addSource(LOCATION_SOURCE_ID, { type: "geojson", data: emptyCollection() });
    map.addLayer({
      id: "goshen-location-accuracy",
      type: "fill",
      source: LOCATION_SOURCE_ID,
      filter: ["==", ["get", "kind"], "accuracy"],
      paint: { "fill-color": "#1685f8", "fill-opacity": 0.12 },
    });
    map.addLayer({
      id: "goshen-location-dot",
      type: "circle",
      source: LOCATION_SOURCE_ID,
      filter: ["==", ["get", "kind"], "position"],
      paint: { "circle-radius": 7, "circle-color": "#1685f8", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
    });
  }

  if (!map.getSource(EDIT_VERTICES_SOURCE_ID)) {
    map.addSource(EDIT_VERTICES_SOURCE_ID, { type: "geojson", data: editableVertexCollection() });
    map.addLayer({
      id: EDIT_VERTICES_LAYER_ID,
      type: "circle",
      source: EDIT_VERTICES_SOURCE_ID,
      paint: {
        "circle-radius": 8,
        "circle-color": "#ffffff",
        "circle-stroke-color": "#087f48",
        "circle-stroke-width": 3,
      },
    });
  }
}

function addSatelliteTerrain(map: MapLibreInstance) {
  if (!MAPTILER_KEY || map.getSource(TERRAIN_SOURCE_ID)) return;
  map.addSource(TERRAIN_SOURCE_ID, {
    type: "raster-dem",
    url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${encodeURIComponent(MAPTILER_KEY)}`,
    tileSize: 512,
    maxzoom: 14,
  });
  map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.25 });
}

function fitBoundaries(map: MapLibreInstance, polygons: MapPolygon[]) {
  const coordinates = polygons.flatMap((polygon) => polygon.ring);
  if (coordinates.length === 0) return;
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach(([lat, lng]) => bounds.extend([lng, lat]));
  map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 500 });
}

export default function MapLibreMap({
  polygons,
  center,
  zoom = 15,
  className,
  selectedId,
  onSelect,
  showZoomControls = true,
  initialView = "streets",
  currentLocation,
  editableId = null,
  onEditPolygonChange,
  onEditDragStart,
  onEditValidationChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);
  const centeredOnLocation = useRef(false);
  const userMovedMapRef = useRef(false);
  const polygonsRef = useRef(polygons);
  const currentLocationRef = useRef(currentLocation);
  const editableIdRef = useRef(editableId);
  const onEditPolygonChangeRef = useRef(onEditPolygonChange);
  const onEditDragStartRef = useRef(onEditDragStart);
  const onEditValidationChangeRef = useRef(onEditValidationChange);
  const activeVertexDragRef = useRef<{ pointerId: number; polygonId: string; vertexIndex: number } | null>(null);
  const satelliteModeRef = useRef(initialView === "satellite");
  polygonsRef.current = polygons;
  currentLocationRef.current = currentLocation;
  editableIdRef.current = editableId;
  onEditPolygonChangeRef.current = onEditPolygonChange;
  onEditDragStartRef.current = onEditDragStart;
  onEditValidationChangeRef.current = onEditValidationChange;
  const [view3d, setView3d] = useState(initialView === "satellite");
  const [tileError, setTileError] = useState(false);
  const firstPolygon = polygons[0];
  const startCenter: [number, number] = center ?? firstPolygon?.ring[0] ?? [-6.443, 38.9];

  useEffect(() => {
    if (!containerRef.current) return;
    const dark = document.documentElement.classList.contains("dark");
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteModeRef.current ? satelliteStyle() : streetStyle(dark),
      center: [startCenter[1], startCenter[0]],
      zoom,
      maxZoom: 22,
      pitch: satelliteModeRef.current ? 58 : 0,
      bearing: satelliteModeRef.current ? -18 : 0,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    if (showZoomControls) map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");

    const onUserMove = () => { userMovedMapRef.current = true; };
    const onMapError = (event: { error?: Error }) => {
      if (event.error) setTileError(true);
    };
    const installData = () => {
      const latestLocation = currentLocationRef.current;
      const latestPolygons = polygonsRef.current;
      addOperationalLayers(map);
      const editablePolygon = latestPolygons.find((polygon) => polygon.id === editableIdRef.current);
      (map.getSource(EDIT_VERTICES_SOURCE_ID) as GeoJSONSource).setData(editableVertexCollection(editablePolygon));
      if (satelliteModeRef.current) addSatelliteTerrain(map);
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(boundaryCollection(latestPolygons));
      (map.getSource(LOCATION_SOURCE_ID) as GeoJSONSource).setData(locationCollection(latestLocation));
      if (latestLocation && !centeredOnLocation.current) {
        map.easeTo({ center: [latestLocation.point[1], latestLocation.point[0]], zoom: Math.max(map.getZoom(), 16), duration: 0 });
        centeredOnLocation.current = true;
      } else if (!latestLocation && !userMovedMapRef.current) {
        fitBoundaries(map, latestPolygons);
      }
    };
    const onBoundaryClick = (event: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelect?.(id);
    };
    const updateTheme = () => {
      if (satelliteModeRef.current || !map.isStyleLoaded()) return;
      const nextDark = document.documentElement.classList.contains("dark");
      map.setStyle(streetStyle(nextDark));
      map.once("style.load", installData);
    };
    const themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    map.on("load", installData);
    map.on("error", onMapError);
    map.on("dragstart", onUserMove);
    map.on("zoomstart", onUserMove);
    map.on("click", "goshen-boundary-fill", onBoundaryClick);
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    const canvas = map.getCanvas();
    const onPointerDown = (event: PointerEvent) => {
      const polygonId = editableIdRef.current;
      if (!polygonId) return;
      const bounds = canvas.getBoundingClientRect();
      const point: [number, number] = [event.clientX - bounds.left, event.clientY - bounds.top];
      const vertex = map.queryRenderedFeatures(point, { layers: [EDIT_VERTICES_LAYER_ID] })[0];
      if (!vertex) return;
      const vertexIndex = Number(vertex.properties?.vertexIndex);
      if (!Number.isInteger(vertexIndex)) return;
      const polygon = polygonsRef.current.find((candidate) => candidate.id === polygonId);
      if (!polygon) return;
      onEditDragStartRef.current?.(polygonId, polygon.ring.map((point) => [...point] as [number, number]));
      activeVertexDragRef.current = { pointerId: event.pointerId, polygonId, vertexIndex };
      event.preventDefault();
      event.stopPropagation();
      canvas.setPointerCapture(event.pointerId);
      map.dragPan.disable();
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      const drag = activeVertexDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const bounds = canvas.getBoundingClientRect();
      const [lng, lat] = map.unproject([event.clientX - bounds.left, event.clientY - bounds.top]).toArray();
      const sourcePolygon = polygonsRef.current.find((polygon) => polygon.id === drag.polygonId);
      if (!sourcePolygon || !vertexMoveKeepsRingValid(sourcePolygon.ring, drag.vertexIndex, [lat, lng])) {
        onEditValidationChangeRef.current?.(true);
        return;
      }
      onEditValidationChangeRef.current?.(false);
      const nextPolygons = polygonsRef.current.map((polygon) => {
        if (polygon.id !== drag.polygonId || !polygon.ring[drag.vertexIndex]) return polygon;
        const nextRing = polygon.ring.map((vertexPoint, index) =>
          index === drag.vertexIndex ? [lat, lng] as [number, number] : vertexPoint,
        );
        onEditPolygonChangeRef.current?.(polygon.id, nextRing);
        return { ...polygon, ring: nextRing };
      });
      polygonsRef.current = nextPolygons;
      (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(boundaryCollection(nextPolygons));
      const editedPolygon = nextPolygons.find((polygon) => polygon.id === drag.polygonId);
      (map.getSource(EDIT_VERTICES_SOURCE_ID) as GeoJSONSource | undefined)?.setData(editableVertexCollection(editedPolygon));
    };
    const finishPointerDrag = (event: PointerEvent) => {
      const drag = activeVertexDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      activeVertexDragRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      map.dragPan.enable();
      canvas.style.cursor = editableIdRef.current ? "grab" : "";
    };
    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("pointermove", onPointerMove, true);
    canvas.addEventListener("pointerup", finishPointerDrag, true);
    canvas.addEventListener("pointercancel", finishPointerDrag, true);

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown, true);
      canvas.removeEventListener("pointermove", onPointerMove, true);
      canvas.removeEventListener("pointerup", finishPointerDrag, true);
      canvas.removeEventListener("pointercancel", finishPointerDrag, true);
      map.remove();
      mapRef.current = null;
    };
    // Map setup is intentionally one-time; the sources are updated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource(EDIT_VERTICES_SOURCE_ID)) return;
    const editablePolygon = polygons.find((polygon) => polygon.id === editableId);
    (map.getSource(EDIT_VERTICES_SOURCE_ID) as GeoJSONSource).setData(editableVertexCollection(editablePolygon));
    map.getCanvas().style.cursor = editableId ? "grab" : "";
    map.getCanvas().style.touchAction = editableId ? "none" : "";
  }, [editableId, polygons]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource(SOURCE_ID)) return;
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData(boundaryCollection(polygons));
    if (currentLocation && !centeredOnLocation.current) {
      map.easeTo({ center: [currentLocation.point[1], currentLocation.point[0]], zoom: Math.max(map.getZoom(), 16), duration: 500 });
      centeredOnLocation.current = true;
    } else if (currentLocation && !userMovedMapRef.current) {
      map.easeTo({ center: [currentLocation.point[1], currentLocation.point[0]], duration: 250 });
    }
  }, [polygons, currentLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource(LOCATION_SOURCE_ID)) return;
    (map.getSource(LOCATION_SOURCE_ID) as GeoJSONSource).setData(locationCollection(currentLocation));
  }, [currentLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getLayer("goshen-boundary-line")) return;
    map.setPaintProperty("goshen-boundary-line", "line-width", ["case", ["==", ["get", "id"], selectedId ?? ""], 4, 2.5]);
    map.setPaintProperty("goshen-boundary-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedId ?? ""], 0.38, 0.2]);
  }, [selectedId]);

  function toggle3dSatellite() {
    const map = mapRef.current;
    if (!map) return;
    const next = !view3d;
    const dark = document.documentElement.classList.contains("dark");
    satelliteModeRef.current = next;
    map.setStyle(next ? satelliteStyle() : streetStyle(dark));
    map.once("style.load", () => {
      addOperationalLayers(map);
      if (next) addSatelliteTerrain(map);
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(boundaryCollection(polygons));
      (map.getSource(LOCATION_SOURCE_ID) as GeoJSONSource).setData(locationCollection(currentLocation));
      const editablePolygon = polygons.find((polygon) => polygon.id === editableIdRef.current);
      (map.getSource(EDIT_VERTICES_SOURCE_ID) as GeoJSONSource).setData(editableVertexCollection(editablePolygon));
      if (next) {
        // Use a pitched MapLibre camera over satellite imagery, with hybrid
        // labels when MapTiler is configured.
        map.easeTo({ pitch: 58, bearing: -18, duration: 700 });
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      }
    });
    setTileError(false);
    setView3d(next);
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-muted">
      <div ref={containerRef} className={className ?? "h-full w-full"} />
      {showZoomControls && !editableId && <div className="absolute left-3 top-3 z-10 inline-flex rounded-xl border border-border/70 bg-card/95 p-1 shadow-md backdrop-blur">
        <button
          type="button"
          onClick={view3d ? toggle3dSatellite : undefined}
          aria-pressed={!view3d}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${!view3d ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
        >
          <MapIcon className="h-4 w-4" /> 2D map
        </button>
        <button
          type="button"
          onClick={toggle3dSatellite}
          aria-pressed={view3d}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${view3d ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
        >
          {view3d ? <Rotate3D className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}
          3D satellite
        </button>
      </div>}
      {tileError && (
        <div role="status" className="absolute bottom-3 left-3 z-10 max-w-[min(90%,28rem)] rounded-lg bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow">
          Map imagery is temporarily unavailable. Check your connection and try again.
        </div>
      )}
    </div>
  );
}
