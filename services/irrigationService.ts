import { withUser } from "@/lib/db";
import type {
  CreateWaterSourceInput,
  CreateIrrigationZoneInput,
  CreateIrrigationRecordInput,
} from "@/lib/validation/operations";

export type WaterSource = {
  id: string;
  organizationId: string;
  farmId: string;
  name: string;
  code: string;
  sourceType: string;
  gpsLat: number | null;
  gpsLng: number | null;
  depthM: string | null;
  capacityM3: string | null;
  yieldLpm: string | null;
  pumpEquipmentId: string | null;
  waterQuality: string | null;
  reliability: string | null;
  permitNumber: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
};

export type IrrigationZone = {
  id: string;
  organizationId: string;
  farmId: string;
  waterSourceId: string | null;
  name: string;
  code: string;
  areaM2: string | null;
  irrigationType: string;
  emitterRateLph: string | null;
  designFlowM3h: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type IrrigationRecord = {
  id: string;
  organizationId: string;
  farmId: string;
  plotId: string | null;
  zoneId: string | null;
  waterSourceId: string | null;
  cropSeasonId: string | null;
  equipmentId: string | null;
  taskId: string | null;
  irrigationDate: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  waterVolumeM3: string | null;
  method: string;
  energySource: string | null;
  fuelConsumed: string | null;
  energyCost: string;
  laborCost: string;
  otherCost: string;
  currency: string;
  totalCost: string;
  soilMoistureBeforePct: string | null;
  soilMoistureAfterPct: string | null;
  notes: string | null;
  createdAt: string;
};

function toWaterSource(row: Record<string, unknown>): WaterSource {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    name: row.name as string,
    code: row.code as string,
    sourceType: row.source_type as string,
    gpsLat: row.gps_lat == null ? null : Number(row.gps_lat),
    gpsLng: row.gps_lng == null ? null : Number(row.gps_lng),
    depthM: (row.depth_m as string | null) ?? null,
    capacityM3: (row.capacity_m3 as string | null) ?? null,
    yieldLpm: (row.yield_lpm as string | null) ?? null,
    pumpEquipmentId: (row.pump_equipment_id as string | null) ?? null,
    waterQuality: (row.water_quality as string | null) ?? null,
    reliability: (row.reliability as string | null) ?? null,
    permitNumber: (row.permit_number as string | null) ?? null,
    isActive: row.is_active as boolean,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toZone(row: Record<string, unknown>): IrrigationZone {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    waterSourceId: (row.water_source_id as string | null) ?? null,
    name: row.name as string,
    code: row.code as string,
    areaM2: (row.area_m2 as string | null) ?? null,
    irrigationType: row.irrigation_type as string,
    emitterRateLph: (row.emitter_rate_lph as string | null) ?? null,
    designFlowM3h: (row.design_flow_m3h as string | null) ?? null,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toRecord(row: Record<string, unknown>): IrrigationRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    plotId: (row.plot_id as string | null) ?? null,
    zoneId: (row.zone_id as string | null) ?? null,
    waterSourceId: (row.water_source_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    equipmentId: (row.equipment_id as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    irrigationDate: String(row.irrigation_date),
    startTime: (row.start_time as string | null) ?? null,
    endTime: (row.end_time as string | null) ?? null,
    durationMinutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
    waterVolumeM3: (row.water_volume_m3 as string | null) ?? null,
    method: row.method as string,
    energySource: (row.energy_source as string | null) ?? null,
    fuelConsumed: (row.fuel_consumed as string | null) ?? null,
    energyCost: String(row.energy_cost),
    laborCost: String(row.labor_cost),
    otherCost: String(row.other_cost),
    currency: row.currency as string,
    totalCost: String(row.total_cost),
    soilMoistureBeforePct: (row.soil_moisture_before_pct as string | null) ?? null,
    soilMoistureAfterPct: (row.soil_moisture_after_pct as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Water sources
// ---------------------------------------------------------------------------
export async function createWaterSource(
  userId: string,
  input: CreateWaterSourceInput,
): Promise<WaterSource> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.water_sources
        (organization_id, farm_id, name, code, source_type, geometry,
         gps_lat, gps_lng, depth_m, capacity_m3, yield_lpm, pump_equipment_id,
         water_quality, reliability, permit_number, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.name}, ${input.code},
         ${input.sourceType},
         case when ${input.gpsLat ?? null}::numeric is null then null
              else ST_SetSRID(ST_MakePoint(${input.gpsLng ?? null}::float8, ${input.gpsLat ?? null}::float8), 4326)
         end,
         ${input.gpsLat ?? null}, ${input.gpsLng ?? null},
         ${input.depthM ?? null}, ${input.capacityM3 ?? null}, ${input.yieldLpm ?? null},
         ${input.pumpEquipmentId || null}, ${input.waterQuality || null},
         ${input.reliability || null}, ${input.permitNumber || null}, ${input.notes || null})
      returning *
    `;
    return toWaterSource(rows[0]);
  });
}

export async function listWaterSources(
  userId: string,
  organizationId: string,
  farmId?: string,
): Promise<WaterSource[]> {
  return withUser(userId, async (db) => {
    const rows = farmId
      ? await db`
          select * from public.water_sources
          where organization_id = ${organizationId} and farm_id = ${farmId}
          order by name
        `
      : await db`
          select * from public.water_sources
          where organization_id = ${organizationId}
          order by farm_id, name
        `;
    return rows.map(toWaterSource);
  });
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------
export async function createIrrigationZone(
  userId: string,
  input: CreateIrrigationZoneInput,
): Promise<IrrigationZone> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.irrigation_zones
        (organization_id, farm_id, water_source_id, name, code, irrigation_type,
         emitter_rate_lph, design_flow_m3h, status, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.waterSourceId || null},
         ${input.name}, ${input.code}, ${input.irrigationType},
         ${input.emitterRateLph ?? null}, ${input.designFlowM3h ?? null},
         ${input.status}, ${input.notes || null})
      returning *
    `;
    return toZone(rows[0]);
  });
}

export async function listIrrigationZones(
  userId: string,
  organizationId: string,
  farmId?: string,
): Promise<IrrigationZone[]> {
  return withUser(userId, async (db) => {
    const rows = farmId
      ? await db`
          select * from public.irrigation_zones
          where organization_id = ${organizationId} and farm_id = ${farmId}
          order by name
        `
      : await db`
          select * from public.irrigation_zones
          where organization_id = ${organizationId}
          order by farm_id, name
        `;
    return rows.map(toZone);
  });
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------
export async function createIrrigationRecord(
  userId: string,
  input: CreateIrrigationRecordInput,
): Promise<IrrigationRecord> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.irrigation_records
        (organization_id, farm_id, plot_id, zone_id, water_source_id, crop_season_id,
         equipment_id, task_id, irrigation_date, start_time, end_time, duration_minutes,
         water_volume_m3, method, energy_source, fuel_consumed, energy_cost, labor_cost,
         other_cost, soil_moisture_before_pct, soil_moisture_after_pct, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.plotId || null},
         ${input.zoneId || null}, ${input.waterSourceId || null},
         ${input.cropSeasonId || null}, ${input.equipmentId || null},
         ${input.taskId || null}, ${input.irrigationDate},
         ${input.startTime || null}, ${input.endTime || null},
         ${input.durationMinutes ?? null}, ${input.waterVolumeM3 ?? null},
         ${input.method}, ${input.energySource || null}, ${input.fuelConsumed ?? null},
         ${input.energyCost}, ${input.laborCost}, ${input.otherCost},
         ${input.soilMoistureBeforePct ?? null}, ${input.soilMoistureAfterPct ?? null},
         ${input.notes || null})
      returning *
    `;
    return toRecord(rows[0]);
  });
}

export async function listIrrigationRecords(
  userId: string,
  organizationId: string,
  opts: { farmId?: string; plotId?: string; limit?: number } = {},
): Promise<IrrigationRecord[]> {
  return withUser(userId, async (db) => {
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
    const rows = await db`
      select * from public.irrigation_records
      where organization_id = ${organizationId}
        and (${opts.farmId ?? null}::uuid is null or farm_id = ${opts.farmId ?? null}::uuid)
        and (${opts.plotId ?? null}::uuid is null or plot_id = ${opts.plotId ?? null}::uuid)
      order by irrigation_date desc, created_at desc
      limit ${limit}
    `;
    return rows.map(toRecord);
  });
}

export async function getIrrigationSummary(
  userId: string,
  organizationId: string,
  from?: string,
  to?: string,
): Promise<{
  eventCount: number;
  totalCost: number;
  totalWaterM3: number;
  totalMinutes: number;
  sourceCount: number;
  zoneCount: number;
}> {
  return withUser(userId, async (db) => {
    // Sequential on purpose: parallel tagged queries inside a postgres.js
    // transaction can deadlock the client (observed against pooled Neon).
    const agg = await db`
      select
        count(*)::int                                              as event_count,
        coalesce(sum(total_cost), 0)::numeric                       as total_cost,
        coalesce(sum(water_volume_m3), 0)::numeric                  as total_water,
        coalesce(sum(duration_minutes), 0)::int                     as total_minutes
      from public.irrigation_records
      where organization_id = ${organizationId}
        and (${from ?? null}::date is null or irrigation_date >= ${from ?? null}::date)
        and (${to ?? null}::date is null or irrigation_date <= ${to ?? null}::date)
    `;
    const sources = await db`select count(*)::int as n from public.water_sources where organization_id = ${organizationId} and is_active = true`;
    const zones = await db`select count(*)::int as n from public.irrigation_zones where organization_id = ${organizationId} and status = 'active'`;
    const a = agg[0] ?? {};
    return {
      eventCount: Number(a.event_count ?? 0),
      totalCost: Number(a.total_cost ?? 0),
      totalWaterM3: Number(a.total_water ?? 0),
      totalMinutes: Number(a.total_minutes ?? 0),
      sourceCount: Number(sources[0]?.n ?? 0),
      zoneCount: Number(zones[0]?.n ?? 0),
    };
  });
}
