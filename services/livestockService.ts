import { withUser, type SqlExecutor } from "@/lib/db";
import type {
  CreateLivestockGroupInput,
  CreateLivestockBatchInput,
  CreateLivestockEventInput,
  CreateLivestockHealthInput,
  CreateLivestockFeedInput,
  CreateLivestockSaleInput,
} from "@/lib/validation/crops";

export type LivestockGroup = {
  id: string;
  organizationId: string;
  speciesId: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type LivestockBatch = {
  id: string;
  organizationId: string;
  farmId: string;
  groupId: string;
  batchCode: string;
  status: string;
  startDate: string;
  endDate: string | null;
  initialQuantity: number;
  currentQuantity: number;
  mortalityCount: number;
  unit: string;
  avgStartWeightKg: string | null;
  avgCurrentWeightKg: string | null;
  targetWeightKg: string | null;
  notes: string | null;
  createdAt: string;
};

export type LivestockEvent = {
  id: string;
  organizationId: string;
  batchId: string;
  eventType: string;
  eventDate: string;
  quantity: number;
  unit: string | null;
  weightKg: string | null;
  cost: string | null;
  productName: string | null;
  notes: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: string;
};

export type LivestockHealth = {
  id: string;
  organizationId: string;
  batchId: string;
  eventId: string | null;
  recordDate: string;
  symptom: string | null;
  diagnosis: string | null;
  treatment: string | null;
  medication: string | null;
  dosage: string | null;
  withdrawalDays: number | null;
  vetName: string | null;
  vetContact: string | null;
  cost: string | null;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
};

export type LivestockFeed = {
  id: string;
  organizationId: string;
  batchId: string;
  eventId: string | null;
  inventoryItemId: string | null;
  feedName: string;
  feedType: string | null;
  quantityKg: string;
  unitCost: string | null;
  totalCost: string;
  feedDate: string;
  notes: string | null;
  createdAt: string;
};

export type LivestockSale = {
  id: string;
  organizationId: string;
  batchId: string;
  eventId: string | null;
  saleDate: string;
  quantity: number;
  unit: string;
  weightKg: string | null;
  unitPrice: string;
  totalRevenue: string;
  customerName: string | null;
  customerContact: string | null;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
};

function toLivestockGroup(row: Record<string, unknown>): LivestockGroup {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    speciesId: row.species_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLivestockBatch(row: Record<string, unknown>): LivestockBatch {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    groupId: row.group_id as string,
    batchCode: row.batch_code as string,
    status: row.status as string,
    startDate: String(row.start_date),
    endDate: (row.end_date as string | null) ?? null,
    initialQuantity: row.initial_quantity as number,
    currentQuantity: row.current_quantity as number,
    mortalityCount: row.mortality_count as number,
    unit: row.unit as string,
    avgStartWeightKg: (row.avg_start_weight_kg as string | null) ?? null,
    avgCurrentWeightKg: (row.avg_current_weight_kg as string | null) ?? null,
    targetWeightKg: (row.target_weight_kg as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLivestockEvent(row: Record<string, unknown>): LivestockEvent {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    batchId: row.batch_id as string,
    eventType: row.event_type as string,
    eventDate: String(row.event_date),
    quantity: row.quantity as number,
    unit: (row.unit as string | null) ?? null,
    weightKg: (row.weight_kg as string | null) ?? null,
    cost: (row.cost as string | null) ?? null,
    productName: (row.product_name as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    gpsLat: (row.gps_lat as number | null) ?? null,
    gpsLng: (row.gps_lng as number | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLivestockHealth(row: Record<string, unknown>): LivestockHealth {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    batchId: row.batch_id as string,
    eventId: (row.event_id as string | null) ?? null,
    recordDate: String(row.record_date),
    symptom: (row.symptom as string | null) ?? null,
    diagnosis: (row.diagnosis as string | null) ?? null,
    treatment: (row.treatment as string | null) ?? null,
    medication: (row.medication as string | null) ?? null,
    dosage: (row.dosage as string | null) ?? null,
    withdrawalDays: (row.withdrawal_days as number | null) ?? null,
    vetName: (row.vet_name as string | null) ?? null,
    vetContact: (row.vet_contact as string | null) ?? null,
    cost: (row.cost as string | null) ?? null,
    followUpDate: (row.follow_up_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLivestockFeed(row: Record<string, unknown>): LivestockFeed {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    batchId: row.batch_id as string,
    eventId: (row.event_id as string | null) ?? null,
    inventoryItemId: (row.inventory_item_id as string | null) ?? null,
    feedName: row.feed_name as string,
    feedType: (row.feed_type as string | null) ?? null,
    quantityKg: String(row.quantity_kg),
    unitCost: (row.unit_cost as string | null) ?? null,
    totalCost: String(row.total_cost),
    feedDate: String(row.feed_date),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLivestockSale(row: Record<string, unknown>): LivestockSale {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    batchId: row.batch_id as string,
    eventId: (row.event_id as string | null) ?? null,
    saleDate: String(row.sale_date),
    quantity: row.quantity as number,
    unit: row.unit as string,
    weightKg: (row.weight_kg as string | null) ?? null,
    unitPrice: String(row.unit_price),
    totalRevenue: String(row.total_revenue),
    customerName: (row.customer_name as string | null) ?? null,
    customerContact: (row.customer_contact as string | null) ?? null,
    paymentStatus: row.payment_status as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function createLivestockGroup(userId: string, input: CreateLivestockGroupInput): Promise<LivestockGroup> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.livestock_groups (organization_id, species_id, name, description)
      values (${input.organizationId}, ${input.speciesId}, ${input.name}, ${input.description || null})
      returning *
    `;
    return toLivestockGroup(rows[0]);
  });
}

export async function listLivestockGroups(userId: string, organizationId: string): Promise<LivestockGroup[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select lg.*, ls.name as species_name
      from public.livestock_groups lg
      join public.livestock_species ls on ls.id = lg.species_id
      where lg.organization_id = ${organizationId}
      order by lg.created_at desc
    `;
    return rows.map(toLivestockGroup);
  });
}

export async function createLivestockBatch(userId: string, input: CreateLivestockBatchInput): Promise<LivestockBatch> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.livestock_batches
        (organization_id, farm_id, group_id, batch_code, start_date,
         initial_quantity, current_quantity, unit, avg_start_weight_kg, target_weight_kg, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.groupId}, ${input.batchCode}, ${input.startDate},
         ${input.initialQuantity}, ${input.initialQuantity}, ${input.unit}, ${input.avgStartWeightKg || null}, ${input.targetWeightKg || null}, ${input.notes || null})
      returning *
    `;
    return toLivestockBatch(rows[0]);
  });
}

export async function listLivestockBatches(
  userId: string,
  organizationId: string,
  farmId?: string,
): Promise<LivestockBatch[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select lb.*, lg.name as group_name, ls.name as species_name
        from public.livestock_batches lb
        join public.livestock_groups lg on lg.id = lb.group_id
        join public.livestock_species ls on ls.id = lg.species_id
        where lb.organization_id = ${organizationId} and lb.farm_id = ${farmId}
        order by lb.created_at desc
      `;
    } else {
      rows = await db`
        select lb.*, lg.name as group_name, ls.name as species_name
        from public.livestock_batches lb
        join public.livestock_groups lg on lg.id = lb.group_id
        join public.livestock_species ls on ls.id = lg.species_id
        where lb.organization_id = ${organizationId}
        order by lb.created_at desc
      `;
    }
    return rows.map(toLivestockBatch);
  });
}

export async function getLivestockBatch(userId: string, batchId: string): Promise<LivestockBatch | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.livestock_batches where id = ${batchId}`;
    return rows[0] ? toLivestockBatch(rows[0]) : null;
  });
}

export async function createLivestockEvent(userId: string, input: CreateLivestockEventInput): Promise<LivestockEvent> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.livestock_events
        (organization_id, batch_id, event_type, event_date, quantity, unit,
         weight_kg, cost, product_name, notes, gps_lat, gps_lng)
      values
        (${input.organizationId}, ${input.batchId}, ${input.eventType}, ${input.eventDate},
         ${input.quantity}, ${input.unit || null}, ${input.weightKg || null},
         ${input.cost || null}, ${input.productName || null}, ${input.notes || null},
         ${input.gpsLat || null}, ${input.gpsLng || null})
      returning *
    `;
    return toLivestockEvent(rows[0]);
  });
}

export async function listLivestockEvents(
  userId: string,
  batchId: string,
): Promise<LivestockEvent[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.livestock_events
      where batch_id = ${batchId}
      order by event_date desc, created_at desc
    `;
    return rows.map(toLivestockEvent);
  });
}

export async function createLivestockHealth(userId: string, input: CreateLivestockHealthInput): Promise<LivestockHealth> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.livestock_health
        (organization_id, batch_id, event_id, record_date, symptom, diagnosis,
         treatment, medication, dosage, withdrawal_days, vet_name, vet_contact,
         cost, follow_up_date, notes)
      values
        (${input.organizationId}, ${input.batchId}, ${input.eventId || null}, ${input.recordDate},
         ${input.symptom || null}, ${input.diagnosis || null}, ${input.treatment || null},
         ${input.medication || null}, ${input.dosage || null}, ${input.withdrawalDays || null},
         ${input.vetName || null}, ${input.vetContact || null}, ${input.cost || null},
         ${input.followUpDate || null}, ${input.notes || null})
      returning *
    `;
    return toLivestockHealth(rows[0]);
  });
}

export async function listLivestockHealth(
  userId: string,
  batchId: string,
): Promise<LivestockHealth[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.livestock_health
      where batch_id = ${batchId}
      order by record_date desc
    `;
    return rows.map(toLivestockHealth);
  });
}

export async function createLivestockFeed(userId: string, input: CreateLivestockFeedInput): Promise<LivestockFeed> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.livestock_feed
        (organization_id, batch_id, event_id, inventory_item_id, feed_name, feed_type,
         quantity_kg, unit_cost, feed_date, notes)
      values
        (${input.organizationId}, ${input.batchId}, ${input.eventId || null},
         ${input.inventoryItemId || null}, ${input.feedName}, ${input.feedType || null},
         ${input.quantityKg}, ${input.unitCost || null}, ${input.feedDate}, ${input.notes || null})
      returning *
    `;
    return toLivestockFeed(rows[0]);
  });
}

export async function listLivestockFeed(
  userId: string,
  batchId: string,
): Promise<LivestockFeed[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.livestock_feed
      where batch_id = ${batchId}
      order by feed_date desc
    `;
    return rows.map(toLivestockFeed);
  });
}

export async function createLivestockSale(userId: string, input: CreateLivestockSaleInput): Promise<LivestockSale> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.livestock_sales
        (organization_id, batch_id, event_id, sale_date, quantity, unit,
         weight_kg, unit_price, customer_name, customer_contact, payment_status, notes)
      values
        (${input.organizationId}, ${input.batchId}, ${input.eventId || null}, ${input.saleDate},
         ${input.quantity}, ${input.unit}, ${input.weightKg || null}, ${input.unitPrice},
         ${input.customerName || null}, ${input.customerContact || null}, ${input.paymentStatus},
         ${input.notes || null})
      returning *
    `;
    return toLivestockSale(rows[0]);
  });
}

export async function listLivestockSales(
  userId: string,
  batchId: string,
): Promise<LivestockSale[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.livestock_sales
      where batch_id = ${batchId}
      order by sale_date desc
    `;
    return rows.map(toLivestockSale);
  });
}

export async function listLivestockSpecies(userId: string): Promise<{ id: string; code: string; name: string; category: string }[]> {
  return withUser(userId, async (db) => {
    const rows = await db`select id, code, name, category from public.livestock_species order by name`;
    return rows.map((r) => ({
      id: r.id as string,
      code: r.code as string,
      name: r.name as string,
      category: r.category as string,
    }));
  });
}

/** Batch financial summary for dashboard */
export async function getBatchFinancials(userId: string, batchId: string): Promise<{
  totalFeedCost: number;
  totalMedicineCost: number;
  totalVaccinationCost: number;
  totalOtherCost: number;
  totalRevenue: number;
  mortalityRate: number;
  fcr: number | null; // Feed Conversion Ratio
}> {
  return withUser(userId, async (db) => {
    const [feed, events, sales] = await Promise.all([
      db`select sum(total_cost)::numeric as total from public.livestock_feed where batch_id = ${batchId}`,
      db`select event_type, sum(cost)::numeric as total from public.livestock_events where batch_id = ${batchId} group by event_type`,
      db`select sum(total_revenue)::numeric as total from public.livestock_sales where batch_id = ${batchId}`,
    ]);

    const batch = await db`select initial_quantity, current_quantity, mortality_count from public.livestock_batches where id = ${batchId}`;
    const b = batch[0];

    const feedCost = Number(feed[0]?.total ?? 0);
    const medCost = Number(events.find((e) => e.event_type === "treatment")?.total ?? 0);
    const vaccCost = Number(events.find((e) => e.event_type === "vaccination")?.total ?? 0);
    const otherCost = Number(events.find((e) => e.event_type === "other")?.total ?? 0);
    const revenue = Number(sales[0]?.total ?? 0);

    const initial = b?.initial_quantity ?? 0;
    const mortality = b?.mortality_count ?? 0;
    const mortalityRate = initial > 0 ? (mortality / initial) * 100 : 0;

    // FCR = total feed kg / weight gain kg
    let fcr: number | null = null;
    const totalFeedKg = await db`select sum(quantity_kg)::numeric as total from public.livestock_feed where batch_id = ${batchId}`;
    const feedKg = Number(totalFeedKg[0]?.total ?? 0);
    const weightGain = await db`
      select (max(weight_kg) - min(weight_kg))::numeric as gain
      from public.livestock_events
      where batch_id = ${batchId} and event_type = 'weighing' and weight_kg is not null
    `;
    const gain = Number(weightGain[0]?.gain ?? 0);
    if (feedKg > 0 && gain > 0) fcr = feedKg / gain;

    return {
      totalFeedCost: feedCost,
      totalMedicineCost: medCost,
      totalVaccinationCost: vaccCost,
      totalOtherCost: otherCost,
      totalRevenue: revenue,
      mortalityRate,
      fcr,
    };
  });
}