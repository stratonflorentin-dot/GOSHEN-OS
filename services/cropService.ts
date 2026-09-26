import { withUser, type SqlExecutor } from "@/lib/db";
import type {
  CreateSeasonInput,
  CreateCropSeasonInput,
  CreateCropActivityInput,
  CreateCropInputInput,
  CreateHarvestInput,
} from "@/lib/validation/crops";

export type Season = {
  id: string;
  organizationId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
};

export type CropSeason = {
  id: string;
  organizationId: string;
  farmId: string;
  plotId: string | null;
  seasonId: string;
  cropId: string;
  varietyId: string | null;
  name: string | null;
  areaM2: string | null;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  targetYieldKg: string | null;
  actualYieldKg: string | null;
  seedQuantity: string | null;
  seedUnit: string | null;
  seedCost: string | null;
  status: string;
  createdAt: string;
  cropName: string | null;
  varietyName: string | null;
  seasonName: string | null;
};

export type CropActivity = {
  id: string;
  organizationId: string;
  cropSeasonId: string;
  activityType: string;
  activityDate: string;
  workerId: string | null;
  quantity: string | null;
  unit: string | null;
  cost: string | null;
  notes: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: string;
};

export type CropInput = {
  id: string;
  organizationId: string;
  cropSeasonId: string;
  activityId: string | null;
  inventoryItemId: string | null;
  inputName: string;
  inputCategory: string;
  quantity: string;
  unit: string;
  unitCost: string | null;
  totalCost: string;
  applicationDate: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  notes: string | null;
  createdAt: string;
};

export type Harvest = {
  id: string;
  organizationId: string;
  cropSeasonId: string;
  harvestDate: string;
  quantity: string;
  unit: string;
  qualityGrade: string | null;
  moistureContent: string | null;
  storageLocationId: string | null;
  notes: string | null;
  createdAt: string;
  cropName: string | null;
  varietyName: string | null;
  seasonName: string | null;
  totalValue: string | null;
};

function toSeason(row: Record<string, unknown>): Season {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    status: row.status as string,
    createdAt: String(row.created_at),
  };
}

function toCropSeason(row: Record<string, unknown>): CropSeason {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    plotId: (row.plot_id as string | null) ?? null,
    seasonId: row.season_id as string,
    cropId: row.crop_id as string,
    varietyId: (row.variety_id as string | null) ?? null,
    name: (row.name as string | null) ?? null,
    areaM2: (row.area_m2 as string | null) ?? null,
    plantingDate: (row.planting_date as string | null) ?? null,
    expectedHarvestDate: (row.expected_harvest_date as string | null) ?? null,
    actualHarvestDate: (row.actual_harvest_date as string | null) ?? null,
    targetYieldKg: (row.target_yield_kg as string | null) ?? null,
    actualYieldKg: (row.actual_yield_kg as string | null) ?? null,
    seedQuantity: (row.seed_quantity as string | null) ?? null,
    seedUnit: (row.seed_unit as string | null) ?? null,
    seedCost: (row.seed_cost as string | null) ?? null,
    status: row.status as string,
    createdAt: String(row.created_at),
    cropName: (row.crop_name as string | null) ?? null,
    varietyName: (row.variety_name as string | null) ?? null,
    seasonName: (row.season_name as string | null) ?? null,
  };
}

function toCropActivity(row: Record<string, unknown>): CropActivity {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    cropSeasonId: row.crop_season_id as string,
    activityType: row.activity_type as string,
    activityDate: String(row.activity_date),
    workerId: (row.worker_id as string | null) ?? null,
    quantity: (row.quantity as string | null) ?? null,
    unit: (row.unit as string | null) ?? null,
    cost: (row.cost as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    gpsLat: (row.gps_lat as number | null) ?? null,
    gpsLng: (row.gps_lng as number | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toCropInput(row: Record<string, unknown>): CropInput {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    cropSeasonId: row.crop_season_id as string,
    activityId: (row.activity_id as string | null) ?? null,
    inventoryItemId: (row.inventory_item_id as string | null) ?? null,
    inputName: row.input_name as string,
    inputCategory: row.input_category as string,
    quantity: String(row.quantity),
    unit: row.unit as string,
    unitCost: (row.unit_cost as string | null) ?? null,
    totalCost: String(row.total_cost),
    applicationDate: (row.application_date as string | null) ?? null,
    gpsLat: (row.gps_lat as number | null) ?? null,
    gpsLng: (row.gps_lng as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toHarvest(row: Record<string, unknown>): Harvest {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    cropSeasonId: row.crop_season_id as string,
    harvestDate: String(row.harvest_date),
    quantity: String(row.quantity),
    unit: row.unit as string,
    qualityGrade: (row.quality_grade as string | null) ?? null,
    moistureContent: (row.moisture_content as string | null) ?? null,
    storageLocationId: (row.storage_location_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    cropName: (row.crop_name as string | null) ?? null,
    varietyName: (row.variety_name as string | null) ?? null,
    seasonName: (row.season_name as string | null) ?? null,
    totalValue: (row.total_value as string | null) ?? null,
  };
}

export async function createSeason(userId: string, input: CreateSeasonInput): Promise<Season> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.seasons (organization_id, name, start_date, end_date)
      values (${input.organizationId}, ${input.name}, ${input.startDate}, ${input.endDate})
      returning *
    `;
    return toSeason(rows[0]);
  });
}

export async function listSeasons(userId: string, organizationId: string): Promise<Season[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.seasons
      where organization_id = ${organizationId}
      order by start_date desc
    `;
    return rows.map(toSeason);
  });
}

export async function createCropSeason(userId: string, input: CreateCropSeasonInput): Promise<CropSeason> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.crop_seasons
        (organization_id, farm_id, plot_id, season_id, crop_id, variety_id,
         name, area_m2, planting_date, expected_harvest_date,
         target_yield_kg, seed_quantity, seed_unit, seed_cost)
      values
        (${input.organizationId}, ${input.farmId}, ${input.plotId || null}, ${input.seasonId},
         ${input.cropId}, ${input.varietyId || null},
         ${input.name || null}, ${input.areaM2 || null}, ${input.plantingDate || null},
         ${input.expectedHarvestDate || null}, ${input.targetYieldKg || null},
         ${input.seedQuantity || null}, ${input.seedUnit || null}, ${input.seedCost || null})
      returning *
    `;
    return toCropSeason(rows[0]);
  });
}

export async function listCropSeasons(
  userId: string,
  organizationId: string,
  farmId?: string,
): Promise<CropSeason[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select cs.*, c.name as crop_name, cv.name as variety_name, s.name as season_name
        from public.crop_seasons cs
        join public.crops c on c.id = cs.crop_id
        left join public.crop_varieties cv on cv.id = cs.variety_id
        join public.seasons s on s.id = cs.season_id
        where cs.organization_id = ${organizationId} and cs.farm_id = ${farmId}
        order by cs.created_at desc
      `;
    } else {
      rows = await db`
        select cs.*, c.name as crop_name, cv.name as variety_name, s.name as season_name
        from public.crop_seasons cs
        join public.crops c on c.id = cs.crop_id
        left join public.crop_varieties cv on cv.id = cs.variety_id
        join public.seasons s on s.id = cs.season_id
        where cs.organization_id = ${organizationId}
        order by cs.created_at desc
      `;
    }
    return rows.map(toCropSeason);
  });
}

export async function getCropSeason(userId: string, cropSeasonId: string): Promise<CropSeason | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.crop_seasons where id = ${cropSeasonId}`;
    return rows[0] ? toCropSeason(rows[0]) : null;
  });
}

export async function createCropActivity(userId: string, input: CreateCropActivityInput): Promise<CropActivity> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.crop_activities
        (organization_id, crop_season_id, activity_type, activity_date,
         worker_id, quantity, unit, cost, notes, gps_lat, gps_lng)
      values
        (${input.organizationId}, ${input.cropSeasonId}, ${input.activityType}, ${input.activityDate},
         ${input.workerId || null}, ${input.quantity || null}, ${input.unit || null},
         ${input.cost || null}, ${input.notes || null}, ${input.gpsLat || null}, ${input.gpsLng || null})
      returning *
    `;
    return toCropActivity(rows[0]);
  });
}

export async function listCropActivities(
  userId: string,
  cropSeasonId: string,
): Promise<CropActivity[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.crop_activities
      where crop_season_id = ${cropSeasonId}
      order by activity_date desc, created_at desc
    `;
    return rows.map(toCropActivity);
  });
}

export async function createCropInput(userId: string, input: CreateCropInputInput): Promise<CropInput> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.crop_inputs
        (organization_id, crop_season_id, activity_id, inventory_item_id,
         input_name, input_category, quantity, unit, unit_cost,
         application_date, gps_lat, gps_lng, notes)
      values
        (${input.organizationId}, ${input.cropSeasonId}, ${input.activityId || null},
         ${input.inventoryItemId || null}, ${input.inputName}, ${input.inputCategory},
         ${input.quantity}, ${input.unit}, ${input.unitCost || null},
         ${input.applicationDate || null}, ${input.gpsLat || null}, ${input.gpsLng || null},
         ${input.notes || null})
      returning *
    `;
    return toCropInput(rows[0]);
  });
}

export async function listCropInputs(
  userId: string,
  cropSeasonId: string,
): Promise<CropInput[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.crop_inputs
      where crop_season_id = ${cropSeasonId}
      order by application_date desc nulls last, created_at desc
    `;
    return rows.map(toCropInput);
  });
}

export async function createHarvest(userId: string, input: CreateHarvestInput): Promise<Harvest> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.harvests
        (organization_id, crop_season_id, harvest_date, quantity, unit,
         quality_grade, moisture_content, storage_location_id, notes)
      values
        (${input.organizationId}, ${input.cropSeasonId}, ${input.harvestDate},
         ${input.quantity}, ${input.unit}, ${input.qualityGrade || null},
         ${input.moistureContent || null}, ${input.storageLocationId || null},
         ${input.notes || null})
      returning *
    `;
    return toHarvest(rows[0]);
  });
}

export async function listHarvests(
  userId: string,
  cropSeasonId: string,
): Promise<Harvest[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select h.*, c.name as crop_name, cv.name as variety_name, s.name as season_name
      from public.harvests h
      join public.crop_seasons cs on cs.id = h.crop_season_id
      join public.crops c on c.id = cs.crop_id
      left join public.crop_varieties cv on cv.id = cs.variety_id
      join public.seasons s on s.id = cs.season_id
      where h.crop_season_id = ${cropSeasonId}
      order by h.harvest_date desc
    `;
    return rows.map(toHarvest);
  });
}

export async function listHarvestsByPlot(
  userId: string,
  organizationId: string,
  plotId: string,
): Promise<Harvest[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select h.*, c.name as crop_name, cv.name as variety_name, s.name as season_name
      from public.harvests h
      join public.crop_seasons cs on cs.id = h.crop_season_id
      join public.crops c on c.id = cs.crop_id
      left join public.crop_varieties cv on cv.id = cs.variety_id
      join public.seasons s on s.id = cs.season_id
      where cs.organization_id = ${organizationId} and cs.plot_id = ${plotId}
      order by h.harvest_date desc
    `;
    return rows.map(toHarvest);
  });
}

export async function listCrops(userId: string): Promise<{ id: string; code: string; name: string; category: string }[]> {
  return withUser(userId, async (db) => {
    const rows = await db`select id, code, name, category from public.crops order by name`;
    return rows.map((r) => ({
      id: r.id as string,
      code: r.code as string,
      name: r.name as string,
      category: r.category as string,
    }));
  });
}

export async function listCropVarieties(userId: string, cropId: string): Promise<{ id: string; name: string; code: string }[]> {
  return withUser(userId, async (db) => {
    const rows = await db`select id, name, code from public.crop_varieties where crop_id = ${cropId} order by name`;
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      code: r.code as string,
    }));
  });
}