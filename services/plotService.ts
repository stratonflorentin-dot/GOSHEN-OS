import { withUser } from "@/lib/db";
import type { CreatePlotInput, UpdatePlotBoundaryInput } from "@/lib/validation/plots";

export type Plot = {
  id: string;
  organizationId: string;
  farmId: string;
  parentPlotId: string | null;
  name: string;
  code: string;
  plotType: string;
  boundarySource: string | null;
  areaM2: string | null;
  perimeterM: string | null;
  landUse: string;
  irrigationType: string | null;
  soilTexture: string | null;
  slopePercent: string | null;
  elevationM: string | null;
  ownershipType: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type PlotGeo = Plot & {
  boundaryGeoJson: string | null;
  lat: number | null;
  lng: number | null;
};

export type PlotRotationRow = {
  plotId: string | null;
  plotCode: string | null;
  plotName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  startDate: string | null;
  endDate: string | null;
  cropId: string | null;
  cropName: string | null;
  cropCategory: string | null;
  varietyName: string | null;
  areaM2: string | null;
  targetYieldKg: string | null;
  harvestedKg: string;
  status: string;
};

function toPlot(row: Record<string, unknown>): Plot {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    parentPlotId: (row.parent_plot_id as string | null) ?? null,
    name: row.name as string,
    code: row.code as string,
    plotType: row.plot_type as string,
    boundarySource: (row.boundary_source as string | null) ?? null,
    areaM2: (row.area_m2 as string | null) ?? null,
    perimeterM: (row.perimeter_m as string | null) ?? null,
    landUse: row.land_use as string,
    irrigationType: (row.irrigation_type as string | null) ?? null,
    soilTexture: (row.soil_texture as string | null) ?? null,
    slopePercent: (row.slope_percent as string | null) ?? null,
    elevationM: (row.elevation_m as string | null) ?? null,
    ownershipType: (row.ownership_type as string | null) ?? null,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toPlotGeo(row: Record<string, unknown>): PlotGeo {
  return {
    ...toPlot(row),
    boundaryGeoJson: (row.boundary_geojson as string | null) ?? null,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
  };
}

export async function createPlot(userId: string, input: CreatePlotInput): Promise<Plot> {
  return withUser(userId, async (db) => {
    const geometry = input.boundaryGeoJson || null;
    const rows = geometry
      ? await db`
          insert into public.plots
            (organization_id, farm_id, parent_plot_id, name, code, plot_type,
             geometry, boundary_source, land_use, irrigation_type, soil_texture,
             slope_percent, elevation_m, ownership_type, notes)
          values
            (${input.organizationId}, ${input.farmId}, ${input.parentPlotId || null},
             ${input.name}, ${input.code}, ${input.plotType},
             ST_GeomFromGeoJSON(${geometry}, 4326),
             ${input.boundarySource || "manual_draw"},
             ${input.landUse}, ${input.irrigationType || null}, ${input.soilTexture || null},
             ${input.slopePercent ?? null}, ${input.elevationM ?? null},
             ${input.ownershipType || null}, ${input.notes || null})
          returning *
        `
      : await db`
          insert into public.plots
            (organization_id, farm_id, parent_plot_id, name, code, plot_type,
             land_use, irrigation_type, soil_texture,
             slope_percent, elevation_m, ownership_type, notes)
          values
            (${input.organizationId}, ${input.farmId}, ${input.parentPlotId || null},
             ${input.name}, ${input.code}, ${input.plotType},
             ${input.landUse}, ${input.irrigationType || null}, ${input.soilTexture || null},
             ${input.slopePercent ?? null}, ${input.elevationM ?? null},
             ${input.ownershipType || null}, ${input.notes || null})
          returning *
        `;
    const plot = toPlot(rows[0]);
    if (geometry) {
      await recordPlotBoundaryVersion(db, userId, {
        plotId: plot.id,
        organizationId: input.organizationId,
        geometry,
        source: input.boundarySource || "manual_draw",
        rawGpsPoints: input.rawGpsPoints ?? null,
      });
    }
    return plot;
  });
}

type Tx = Parameters<Parameters<typeof withUser>[1]>[0];

async function recordPlotBoundaryVersion(
  db: Tx,
  userId: string,
  args: {
    plotId: string;
    organizationId: string;
    geometry: string;
    source: string;
    rawGpsPoints: string | null;
  },
) {
  await db`
    insert into public.plot_boundary_versions
      (plot_id, organization_id, geometry, source, raw_gps_points, point_count,
       area_m2, perimeter_m, created_by)
    select
      ${args.plotId}, ${args.organizationId},
      ST_GeomFromGeoJSON(${args.geometry}, 4326),
      ${args.source},
      ${args.rawGpsPoints}::jsonb,
      case
        when ${args.rawGpsPoints}::jsonb is null then null
        else jsonb_array_length(${args.rawGpsPoints}::jsonb)
      end,
      ST_Area(ST_GeomFromGeoJSON(${args.geometry}, 4326)::geography),
      ST_Perimeter(ST_GeomFromGeoJSON(${args.geometry}, 4326)::geography),
      ${userId}
  `;
}

export async function updatePlotBoundary(
  userId: string,
  input: UpdatePlotBoundaryInput,
): Promise<Plot> {
  return withUser(userId, async (db) => {
    const rows = await db`
      update public.plots
      set geometry = ST_GeomFromGeoJSON(${input.boundaryGeoJson}, 4326),
          boundary_source = ${input.boundarySource}
      where id = ${input.plotId}
      returning *
    `;
    if (!rows[0]) throw new Error("Plot not found or not permitted");
    const plot = toPlot(rows[0]);
    await recordPlotBoundaryVersion(db, userId, {
      plotId: plot.id,
      organizationId: plot.organizationId,
      geometry: input.boundaryGeoJson,
      source: input.boundarySource,
      rawGpsPoints: input.rawGpsPoints ?? null,
    });
    return plot;
  });
}

export async function listPlots(
  userId: string,
  organizationId: string,
  farmId?: string,
): Promise<Plot[]> {
  return withUser(userId, async (db) => {
    const rows = farmId
      ? await db`
          select * from public.plots
          where organization_id = ${organizationId} and farm_id = ${farmId} and status <> 'archived'
          order by code
        `
      : await db`
          select * from public.plots
          where organization_id = ${organizationId} and status <> 'archived'
          order by farm_id, code
        `;
    return rows.map(toPlot);
  });
}

export async function listPlotGeo(userId: string, organizationId: string): Promise<PlotGeo[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        p.*,
        ST_AsGeoJSON(p.geometry) as boundary_geojson,
        ST_Y(ST_Centroid(p.geometry)::geometry) as lat,
        ST_X(ST_Centroid(p.geometry)::geometry) as lng
      from public.plots p
      where p.organization_id = ${organizationId} and p.status <> 'archived'
      order by p.code
    `;
    return rows.map(toPlotGeo);
  });
}

export async function getPlot(userId: string, plotId: string): Promise<PlotGeo | null> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        p.*,
        ST_AsGeoJSON(p.geometry) as boundary_geojson,
        ST_Y(ST_Centroid(p.geometry)::geometry) as lat,
        ST_X(ST_Centroid(p.geometry)::geometry) as lng
      from public.plots p
      where p.id = ${plotId}
    `;
    return rows[0] ? toPlotGeo(rows[0]) : null;
  });
}

/** §10 crop-rotation history for one plot, newest season first. */
export async function getPlotRotationHistory(
  userId: string,
  plotId: string,
): Promise<PlotRotationRow[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.plot_rotation_history
      where plot_id = ${plotId}
      order by start_date desc nulls last
    `;
    return rows.map((r) => ({
      plotId: (r.plot_id as string | null) ?? null,
      plotCode: (r.plot_code as string | null) ?? null,
      plotName: (r.plot_name as string | null) ?? null,
      seasonId: (r.season_id as string | null) ?? null,
      seasonName: (r.season_name as string | null) ?? null,
      startDate: (r.start_date as string | null) ?? null,
      endDate: (r.end_date as string | null) ?? null,
      cropId: (r.crop_id as string | null) ?? null,
      cropName: (r.crop_name as string | null) ?? null,
      cropCategory: (r.crop_category as string | null) ?? null,
      varietyName: (r.variety_name as string | null) ?? null,
      areaM2: (r.area_m2 as string | null) ?? null,
      targetYieldKg: (r.target_yield_kg as string | null) ?? null,
      harvestedKg: String(r.harvested_kg ?? 0),
      status: r.status as string,
    }));
  });
}

/** Aggregated plot economics used by the plot detail panel. */
export async function getPlotEconomics(userId: string, plotId: string): Promise<{
  laborCost: number;
  equipmentCost: number;
  irrigationCost: number;
  harvestedKg: number;
  areaM2: number | null;
}> {
  return withUser(userId, async (db) => {
    const [labor, equip, irrigation, harvest, plot] = await Promise.all([
      db`select coalesce(sum(total_cost), 0)::numeric as total from public.labor_records where plot_id = ${plotId}`,
      db`select coalesce(sum(total_cost), 0)::numeric as total from public.equipment_usage where plot_id = ${plotId}`,
      db`select coalesce(sum(total_cost), 0)::numeric as total from public.irrigation_records where plot_id = ${plotId}`,
      db`select coalesce(sum(h.quantity), 0)::numeric as total
         from public.harvests h
         join public.crop_seasons cs on cs.id = h.crop_season_id
         where cs.plot_id = ${plotId}`,
      db`select area_m2 from public.plots where id = ${plotId}`,
    ]);
    return {
      laborCost: Number(labor[0]?.total ?? 0),
      equipmentCost: Number(equip[0]?.total ?? 0),
      irrigationCost: Number(irrigation[0]?.total ?? 0),
      harvestedKg: Number(harvest[0]?.total ?? 0),
      areaM2: plot[0]?.area_m2 == null ? null : Number(plot[0].area_m2),
    };
  });
}
