import { withUser } from "@/lib/db";
import type {
  CreateEquipmentInput,
  CreateEquipmentUsageInput,
  CreateMaintenanceInput,
} from "@/lib/validation/operations";

export type Equipment = {
  id: string;
  organizationId: string;
  farmId: string | null;
  name: string;
  code: string;
  category: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  yearManufactured: number | null;
  ownershipType: string;
  purchaseDate: string | null;
  purchaseCost: string | null;
  currency: string;
  currentValue: string | null;
  fuelType: string | null;
  fuelCapacity: string | null;
  meterType: string;
  currentMeter: string;
  capacityNote: string | null;
  status: string;
  assetId: string | null;
  notes: string | null;
  createdAt: string;
};

export type EquipmentUsage = {
  id: string;
  organizationId: string;
  farmId: string;
  equipmentId: string;
  equipmentName: string | null;
  plotId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  taskId: string | null;
  operatorWorkerId: string | null;
  usageDate: string;
  startMeter: string | null;
  endMeter: string | null;
  hoursUsed: string | null;
  distanceKm: string | null;
  fuelConsumed: string | null;
  fuelUnit: string | null;
  fuelCost: string;
  operatorCost: string;
  otherCost: string;
  currency: string;
  totalCost: string;
  notes: string | null;
  createdAt: string;
};

export type MaintenanceRecord = {
  id: string;
  organizationId: string;
  farmId: string | null;
  equipmentId: string;
  equipmentName: string | null;
  maintenanceType: string;
  maintenanceDate: string;
  description: string;
  performedBy: string | null;
  vendorName: string | null;
  meterReading: string | null;
  partsCost: string;
  laborCost: string;
  otherCost: string;
  currency: string;
  totalCost: string;
  downtimeHours: string | null;
  nextServiceDate: string | null;
  nextServiceMeter: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

function toEquipment(row: Record<string, unknown>): Equipment {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: (row.farm_id as string | null) ?? null,
    name: row.name as string,
    code: row.code as string,
    category: row.category as string,
    make: (row.make as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    serialNumber: (row.serial_number as string | null) ?? null,
    yearManufactured: row.year_manufactured == null ? null : Number(row.year_manufactured),
    ownershipType: row.ownership_type as string,
    purchaseDate: (row.purchase_date as string | null) ?? null,
    purchaseCost: (row.purchase_cost as string | null) ?? null,
    currency: row.currency as string,
    currentValue: (row.current_value as string | null) ?? null,
    fuelType: (row.fuel_type as string | null) ?? null,
    fuelCapacity: (row.fuel_capacity as string | null) ?? null,
    meterType: row.meter_type as string,
    currentMeter: String(row.current_meter),
    capacityNote: (row.capacity_note as string | null) ?? null,
    status: row.status as string,
    assetId: (row.asset_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toUsage(row: Record<string, unknown>): EquipmentUsage {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    equipmentId: row.equipment_id as string,
    equipmentName: (row.equipment_name as string | null) ?? null,
    plotId: (row.plot_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    operatorWorkerId: (row.operator_worker_id as string | null) ?? null,
    usageDate: String(row.usage_date),
    startMeter: (row.start_meter as string | null) ?? null,
    endMeter: (row.end_meter as string | null) ?? null,
    hoursUsed: (row.hours_used as string | null) ?? null,
    distanceKm: (row.distance_km as string | null) ?? null,
    fuelConsumed: (row.fuel_consumed as string | null) ?? null,
    fuelUnit: (row.fuel_unit as string | null) ?? null,
    fuelCost: String(row.fuel_cost),
    operatorCost: String(row.operator_cost),
    otherCost: String(row.other_cost),
    currency: row.currency as string,
    totalCost: String(row.total_cost),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toMaintenance(row: Record<string, unknown>): MaintenanceRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: (row.farm_id as string | null) ?? null,
    equipmentId: row.equipment_id as string,
    equipmentName: (row.equipment_name as string | null) ?? null,
    maintenanceType: row.maintenance_type as string,
    maintenanceDate: String(row.maintenance_date),
    description: row.description as string,
    performedBy: (row.performed_by as string | null) ?? null,
    vendorName: (row.vendor_name as string | null) ?? null,
    meterReading: (row.meter_reading as string | null) ?? null,
    partsCost: String(row.parts_cost),
    laborCost: String(row.labor_cost),
    otherCost: String(row.other_cost),
    currency: row.currency as string,
    totalCost: String(row.total_cost),
    downtimeHours: (row.downtime_hours as string | null) ?? null,
    nextServiceDate: (row.next_service_date as string | null) ?? null,
    nextServiceMeter: (row.next_service_meter as string | null) ?? null,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------
export async function createEquipment(
  userId: string,
  input: CreateEquipmentInput,
): Promise<Equipment> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.equipment
        (organization_id, farm_id, name, code, category, make, model, serial_number,
         year_manufactured, ownership_type, purchase_date, purchase_cost, current_value,
         fuel_type, fuel_capacity, meter_type, current_meter, capacity_note, status, notes)
      values
        (${input.organizationId}, ${input.farmId || null}, ${input.name}, ${input.code},
         ${input.category}, ${input.make || null}, ${input.model || null},
         ${input.serialNumber || null}, ${input.yearManufactured ?? null},
         ${input.ownershipType}, ${input.purchaseDate || null},
         ${input.purchaseCost ?? null}, ${input.currentValue ?? null},
         ${input.fuelType || null}, ${input.fuelCapacity ?? null},
         ${input.meterType}, ${input.currentMeter}, ${input.capacityNote || null},
         ${input.status}, ${input.notes || null})
      returning *
    `;
    return toEquipment(rows[0]);
  });
}

export async function listEquipment(
  userId: string,
  organizationId: string,
  farmId?: string,
): Promise<Equipment[]> {
  return withUser(userId, async (db) => {
    const rows = farmId
      ? await db`
          select * from public.equipment
          where organization_id = ${organizationId} and farm_id = ${farmId}
          order by category, name
        `
      : await db`
          select * from public.equipment
          where organization_id = ${organizationId}
          order by category, name
        `;
    return rows.map(toEquipment);
  });
}

export async function getEquipment(userId: string, equipmentId: string): Promise<Equipment | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.equipment where id = ${equipmentId}`;
    return rows[0] ? toEquipment(rows[0]) : null;
  });
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------
export async function createEquipmentUsage(
  userId: string,
  input: CreateEquipmentUsageInput,
): Promise<EquipmentUsage> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.equipment_usage
        (organization_id, farm_id, equipment_id, plot_id, crop_season_id,
         livestock_batch_id, task_id, operator_worker_id, usage_date,
         start_meter, end_meter, hours_used, distance_km, fuel_consumed, fuel_unit,
         fuel_cost, operator_cost, other_cost, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.equipmentId},
         ${input.plotId || null}, ${input.cropSeasonId || null},
         ${input.livestockBatchId || null}, ${input.taskId || null},
         ${input.operatorWorkerId || null}, ${input.usageDate},
         ${input.startMeter ?? null}, ${input.endMeter ?? null},
         ${input.hoursUsed ?? null}, ${input.distanceKm ?? null},
         ${input.fuelConsumed ?? null}, ${input.fuelUnit || null},
         ${input.fuelCost}, ${input.operatorCost}, ${input.otherCost},
         ${input.notes || null})
      returning *
    `;
    // Roll the equipment meter forward so the fleet view stays truthful.
    if (input.endMeter != null) {
      await db`
        update public.equipment
        set current_meter = greatest(current_meter, ${input.endMeter})
        where id = ${input.equipmentId}
      `;
    }
    const usage = toUsage(rows[0]);
    const eq = await db`select name from public.equipment where id = ${input.equipmentId}`;
    return { ...usage, equipmentName: (eq[0]?.name as string | null) ?? null };
  });
}

export async function listEquipmentUsage(
  userId: string,
  organizationId: string,
  equipmentId?: string,
  limit = 200,
): Promise<EquipmentUsage[]> {
  return withUser(userId, async (db) => {
    const capped = Math.min(Math.max(limit, 1), 1000);
    const rows = await db`
      select eu.*, e.name as equipment_name
      from public.equipment_usage eu
      join public.equipment e on e.id = eu.equipment_id
      where eu.organization_id = ${organizationId}
        and (${equipmentId ?? null}::uuid is null or eu.equipment_id = ${equipmentId ?? null}::uuid)
      order by eu.usage_date desc, eu.created_at desc
      limit ${capped}
    `;
    return rows.map(toUsage);
  });
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------
export async function createMaintenance(
  userId: string,
  input: CreateMaintenanceInput,
): Promise<MaintenanceRecord> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.maintenance_records
        (organization_id, farm_id, equipment_id, maintenance_type, maintenance_date,
         description, performed_by, vendor_name, meter_reading, parts_cost, labor_cost,
         other_cost, downtime_hours, next_service_date, next_service_meter, status, notes)
      values
        (${input.organizationId}, ${input.farmId || null}, ${input.equipmentId},
         ${input.maintenanceType}, ${input.maintenanceDate}, ${input.description},
         ${input.performedBy || null}, ${input.vendorName || null},
         ${input.meterReading ?? null}, ${input.partsCost}, ${input.laborCost},
         ${input.otherCost}, ${input.downtimeHours ?? null},
         ${input.nextServiceDate || null}, ${input.nextServiceMeter ?? null},
         ${input.status}, ${input.notes || null})
      returning *
    `;
    const rec = toMaintenance(rows[0]);
    const eq = await db`select name from public.equipment where id = ${input.equipmentId}`;
    return { ...rec, equipmentName: (eq[0]?.name as string | null) ?? null };
  });
}

export async function listMaintenance(
  userId: string,
  organizationId: string,
  equipmentId?: string,
  limit = 200,
): Promise<MaintenanceRecord[]> {
  return withUser(userId, async (db) => {
    const capped = Math.min(Math.max(limit, 1), 1000);
    const rows = await db`
      select mr.*, e.name as equipment_name
      from public.maintenance_records mr
      join public.equipment e on e.id = mr.equipment_id
      where mr.organization_id = ${organizationId}
        and (${equipmentId ?? null}::uuid is null or mr.equipment_id = ${equipmentId ?? null}::uuid)
      order by mr.maintenance_date desc, mr.created_at desc
      limit ${capped}
    `;
    return rows.map(toMaintenance);
  });
}

// ---------------------------------------------------------------------------
// Fleet economics
// ---------------------------------------------------------------------------
export async function getEquipmentSummary(
  userId: string,
  organizationId: string,
): Promise<{
  fleetCount: number;
  operational: number;
  inMaintenance: number;
  breakdown: number;
  usageCost: number;
  maintenanceCost: number;
  fuelCost: number;
  totalHours: number;
  upcomingService: number;
}> {
  return withUser(userId, async (db) => {
    // Sequential on purpose: parallel tagged queries inside a postgres.js
    // transaction can deadlock the client (observed against pooled Neon).
    const fleet = await db`
      select
        count(*)::int                                                        as fleet_count,
        count(*) filter (where status = 'operational')::int                   as operational,
        count(*) filter (where status = 'maintenance')::int                   as in_maintenance,
        count(*) filter (where status = 'breakdown')::int                     as breakdown
      from public.equipment where organization_id = ${organizationId}
    `;
    const usage = await db`
      select
        coalesce(sum(total_cost), 0)::numeric as usage_cost,
        coalesce(sum(fuel_cost), 0)::numeric  as fuel_cost,
        coalesce(sum(hours_used), 0)::numeric as total_hours
      from public.equipment_usage where organization_id = ${organizationId}
    `;
    const maint = await db`
      select coalesce(sum(total_cost), 0)::numeric as maintenance_cost
      from public.maintenance_records where organization_id = ${organizationId}
    `;
    const upcoming = await db`
      select count(*)::int as n
      from public.maintenance_records
      where organization_id = ${organizationId}
        and next_service_date is not null
        and next_service_date <= current_date + interval '30 days'
    `;
    const f = fleet[0] ?? {};
    const u = usage[0] ?? {};
    return {
      fleetCount: Number(f.fleet_count ?? 0),
      operational: Number(f.operational ?? 0),
      inMaintenance: Number(f.in_maintenance ?? 0),
      breakdown: Number(f.breakdown ?? 0),
      usageCost: Number(u.usage_cost ?? 0),
      fuelCost: Number(u.fuel_cost ?? 0),
      totalHours: Number(u.total_hours ?? 0),
      maintenanceCost: Number(maint[0]?.maintenance_cost ?? 0),
      upcomingService: Number(upcoming[0]?.n ?? 0),
    };
  });
}
