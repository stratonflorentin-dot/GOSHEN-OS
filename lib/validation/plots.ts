import { z } from "zod";

export const PLOT_TYPES = ["block", "plot", "subplot"] as const;
export const LAND_USES = [
  "cropland", "pasture", "orchard", "greenhouse", "aquaculture", "fallow",
  "infrastructure", "water", "forest", "other",
] as const;
export const IRRIGATION_METHODS = [
  "rainfed", "drip", "sprinkler", "furrow", "flood", "pivot", "manual", "hose", "other",
] as const;
export const SOIL_TEXTURES = [
  "sand", "loamy_sand", "sandy_loam", "loam", "silt_loam", "silt", "silt_clay",
  "clay_loam", "sandy_clay_loam", "silty_clay_loam", "sandy_clay", "silty_clay", "clay", "rock",
] as const;
export const BOUNDARY_SOURCES = [
  "gps_walk", "manual_draw", "geojson_import", "kml_import", "survey", "derived",
] as const;

const optionalNumber = z.number().finite().optional();
const optionalText = (max = 2000) => z.string().trim().max(max).optional();

export const createPlotSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  parentPlotId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  plotType: z.enum(PLOT_TYPES).default("plot"),
  /** GeoJSON Polygon geometry string, or omitted for a plot with no boundary yet. */
  boundaryGeoJson: z.string().trim().optional(),
  boundarySource: z.enum(BOUNDARY_SOURCES).optional(),
  rawGpsPoints: z.string().optional(),
  landUse: z.enum(LAND_USES).default("cropland"),
  irrigationType: z.enum(IRRIGATION_METHODS).optional(),
  soilTexture: z.enum(SOIL_TEXTURES).optional(),
  slopePercent: optionalNumber,
  elevationM: optionalNumber,
  ownershipType: z.enum(["owned", "leased", "customary", "shared", "managed"]).optional(),
  notes: optionalText(),
});
export type CreatePlotInput = z.infer<typeof createPlotSchema>;

export const updatePlotBoundarySchema = z.object({
  plotId: z.string().uuid(),
  boundaryGeoJson: z.string().trim().min(1),
  boundarySource: z.enum(BOUNDARY_SOURCES).default("manual_draw"),
  rawGpsPoints: z.string().optional(),
  validation: z.string().optional(),
});
export type UpdatePlotBoundaryInput = z.infer<typeof updatePlotBoundarySchema>;
