# 11 — GIS, GPS Boundary Capture & 3D Architecture

PostGIS is the **spatial source of truth**. The browser is a view/editor; every
geometry write goes through `gisService` validation. 2D first (MapLibre,
satellite basemap primary); 3D is a high-quality visualization layer (CesiumJS,
Phase 8) that never stores geometry.

## 1. GIS Architecture

### 1.1 Stack
- **Client**: MapLibre GL JS + Turf.js (client-side preview/snap only) +
  `components/maps/` wrappers (MapContainer, LayerSwitcher, PlotPopup,
  GeometryEditor).
- **Basemap**: **satellite imagery primary** (ESRI World Imagery or MapTiler
  satellite raster; Google satellite tiles only via the official Google Maps
  SDK if contracted), with a streets basemap toggle. Basemap token in env.
- **Server**: PostGIS (geometry 4326, GiST indexes), SQL RPCs for heavy ops
  (intersects, MVT tiles, nearest features).
- **Tiles**: farm data rendered as GeoJSON for small farms; `ST_AsMVT` RPC
  endpoint (`/api/v1/gis/tiles/...`) when a farm exceeds ~2,000 features.

### 1.2 Layer System
`MAP_LAYERS` registry (code, label-key, geometry kind, default visibility,
feature_type): farm_boundary, plots, blocks, buildings, roads, water_sources,
wells, irrigation_lines, storage, animal_housing, greenhouses, tree_stands,
fields, drainage, fences, electric. Layers map to `map_features.feature_type`
(§03 schema). Toggle state persists per user in `farm_settings`/localStorage.

### 1.3 Interactions
- Click plot → side panel (info from `plotService.getPlotSummary()`): code,
  area (ha/acres), current crop + season + dates, cost/revenue/profit (from
  profitability view), health status, weather risk badge.
- Editing tools (manager+): move/add/delete vertex (Turf → server re-validate),
  split polygon (line draw → `ST_Split` validation → two plots), merge (union of
  adjacent polygons), snap to vertices/boundary (tolerance in meters).
- Every geometry change creates a new version row (boundary versions /
  feature history via `audit_logs`) — old geometry never silently lost.

## 2. GPS Boundary Capture ("Walk the Farm Boundary")

Phone-only. Uses the browser **Geolocation API** (`watchPosition`,
`enableHighAccuracy: true`). No dedicated hardware.

### 2.1 Workflow States
`idle → recording ⇄ paused → reviewing → saving`

- **START RECORDING** requests permission; denied → clear guidance, offer
  manual draw/import instead.
- **HUD (large, thumb-reachable)**: GPS accuracy (m, color-coded
  green<5 / amber<15 / red≥15), current coordinates, distance walked, elapsed
  time, point count.
- Controls: Pause / Resume / Undo last point / Restart / Finish.
- Live path drawn on map; points appended to a local trace buffer.

### 2.2 Point Recording & Filtering (client, `lib/domain/geo.ts` + capture hook)
- Sample interval: every **3 s** or **2 m** moved, whichever first; accuracy
  gate: discard points with `accuracy > 25 m`; keep best of a 1 s burst.
- Jump filter: reject point implying speed > 15 m/s from previous accepted
  point (teleport/GPS glitch); duplicate filter: drop points < 0.5 m apart.
- All raw points retained in the trace buffer (for `raw_gps_points`), only
  accepted points form the working polygon.

### 2.3 Finish → Validation Pipeline (server, `gisService.validateBoundary`)
1. **Min points**: ≥ 4 accepted vertices (polygon) — else ask for more walking.
2. **Self-intersection / invalid geometry**: `ST_IsValid` +
   `ST_IsValidReason`; auto-repair attempt via `ST_MakeValid` shown as
   diff for approval; never auto-save a repaired polygon.
3. **Unrealistic jumps**: re-check vertex spacing/speed server-side.
4. **Accuracy report**: median/max accuracy of kept points (stored in
   `validation`); poor accuracy → prominent warning with "improve" vs "accept".
5. **Duplicate/collinear point removal**: tolerance-based; Douglas-Peucker
   simplify (≤ 1 m) for storage; raw trace preserved.
6. **Metrics**: `ST_Area(geography)` → m², **hectares, acres** (displayed
   all three); `ST_Perimeter(geography)`.
7. On accept: write `farm_boundary_versions` + set `farms.boundary`
   (+ regenerated centroid). Manual-edit screen opens (vertex tools) before
   or after accept.

### 2.4 Alternative Creation Methods (never GPS-only)
- **Draw manually** on map (tap vertices, drag handles).
- **Import GeoJSON / KML** (client parse → same validation pipeline; KML via
  `@tmcw/togeojson`).
- Import requires a valid polygon; same validation messages apply.

### 2.5 Offline
Recorder runs fully offline (trace in IndexedDB); submission queues through
the sync outbox (see `12-offline-sync-architecture.md`). Validation runs at
sync time; failures return to the device with reasons.

## 3. 3D Architecture (Phase 8) — high quality

### 3.1 Provider Pattern
```ts
interface Scene3DProvider {
  readonly name: string; readonly status: 'active' | 'pending';
  mount(container: HTMLElement, scene: Scene3DModel): Promise<Scene3DHandle>;
}
```
- **`cesiumProvider` (primary, high quality)**: CesiumJS with Cesium ion
  terrain + satellite imagery (ion-hosted or SDK-based satellite tiles). Full
  terrain, draped imagery, orbit/tilt/zoom. Requires ion/token config; if
  tokens are absent at runtime it degrades to the fallback below — never a
  broken globe.
- **`extrusionProvider` (fallback, ships in Phase 2)**: MapLibre
  `fill-extrusion` — plots/buildings extruded by height/elevation over the
  satellite basemap; no terrain. Gives an early "3D feel" at zero cost.

### 3.2 Scene Model
`Scene3DModel` built server-side from PostGIS: farm boundary, plots (+ crop
season color/status), map_features with height hints (properties.height_m),
water polygons, roads (draped). Elevation sampled from the terrain provider at
load (display-only cache; `elevation_m` persisted on farms when available).
Imagery: satellite tiles aligned with the 2D basemap choice for visual
consistency.

### 3.3 Controls & Rules
- Zoom / rotate / tilt / orbit; layer toggles mirror 2D registry; click plot →
  same info panel component as 2D (single source).
- 3D is **read/visualize only** in v1 (no geometry edits in 3D). All spatial
  writes remain in the 2D editor + PostGIS.
- Performance: frustum culling, LOD (simplify polygons > zoom), lazy scene
  load only when the 3D tab opens.

## Open Questions

RESOLVED (2026-09-25):

1. Basemap: satellite imagery primary, streets toggle (provider account chosen
   at Phase 2 kickoff; ESRI World Imagery / MapTiler as defaults).
2. 3D: high-quality CesiumJS primary (ion terrain + satellite imagery);
   MapLibre fill-extrusion fallback. The owner's reference repo
   `stratonflorentin-dot/Calvary-connect` is user-owned and may be consulted
   for map/3D integration patterns; GOSHEN OS code is written fresh since the
   domains differ (fleet logistics vs. agriculture).
