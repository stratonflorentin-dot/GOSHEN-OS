import { withUser } from "@/lib/db";

export type ChickProductionOverview = {
  incubators: { id: string; farmName: string; name: string; capacity: number; status: string; location: string | null; manufacturer: string | null; model: string | null; monitorsTemperature: boolean; monitorsHumidity: boolean }[];
  hatcheryOrders: { id: string; farmName: string; supplier: string; reference: string | null; orderNumber: string | null; vaccinationInfo: string | null; documents: string[]; ordered: number; delivered: number; doa: number; available: number; totalCost: number; costPerHealthy: number | null; deliveryDate: string | null; breed: string | null }[];
  incubationBatches: { id: string; farmName: string; incubatorName: string; code: string; startDate: string; hatchDate: string | null; expectedDate: string | null; eggSource: string; eggSourceDetails: string | null; documents: string[]; eggsLoaded: number; fertile: number; infertile: number; cracked: number; losses: number; hatched: number; healthy: number; weak: number; dead: number; hatchRate: number; totalCost: number; costPerHealthy: number | null; breed: string | null; strain: string | null; events: { type: string; at: string; temperature: number | null; humidity: number | null; quantity: number | null; notes: string | null }[]; costs: { category: string; amount: number; date: string }[] }[];
  poultryBatches: { id: string; farmName: string; seasonName: string | null; code: string; date: string; sourceType: string | null; sourceDetails: string | null; quantity: number; breed: string | null; strain: string | null; sourceCost: number; costPerBird: number }[];
};

export type ChickBatchFilters = { farmId?: string; seasonId?: string; sourceType?: string; breed?: string; batch?: string; dateFrom?: string; dateTo?: string };

export async function getChickProductionOverview(userId: string, organizationId: string, filters: ChickBatchFilters = {}): Promise<ChickProductionOverview> {
  return withUser(userId, async (db) => {
    // Sequential on purpose: parallel tagged queries inside a postgres.js
    // transaction can deadlock the client (observed against pooled Neon).
    const incubators = await db`select i.id, f.name as farm_name, i.name, i.capacity, i.status, i.location, i.manufacturer, i.model, i.monitors_temperature, i.monitors_humidity from public.incubators i join public.farms f on f.id=i.farm_id where i.organization_id=${organizationId} order by f.name, i.name`;
    const orders = await db`select ho.id, f.name as farm_name, ho.supplier_name, ho.batch_reference as reference, ho.order_number, ho.vaccination_info, ho.document_urls,
      ho.quantity_ordered, ho.quantity_delivered, ho.dead_on_arrival, ho.price_per_chick, ho.transport_cost, ho.other_cost, ho.delivery_date, ho.breed,
      (ho.quantity_delivered - ho.dead_on_arrival - (select coalesce(sum(lb.initial_quantity),0)::int from public.livestock_batches lb where lb.source_type='external_hatchery' and lb.source_id=ho.id)) as available
      from public.hatchery_orders ho join public.farms f on f.id=ho.farm_id where ho.organization_id=${organizationId} order by ho.order_date desc, ho.created_at desc`;
    const batches = await db`select ib.id, f.name as farm_name, i.name as incubator_name, ib.batch_code, ib.start_date, ib.expected_hatch_date, ib.actual_hatch_date, ib.egg_source, ib.egg_source_details, ib.document_urls, ib.eggs_loaded, ib.fertile_eggs, ib.infertile_eggs, ib.cracked_or_damaged, ib.embryonic_losses, ib.hatched, ib.healthy_chicks, ib.weak_chicks, ib.dead_at_hatch, ib.egg_cost, ib.operating_cost, ib.breed, ib.strain,
      (ib.healthy_chicks::numeric / nullif(ib.eggs_loaded,0) * 100) as hatch_rate,
      (ib.egg_cost + ib.operating_cost + (select coalesce(sum(ic.amount),0) from public.incubation_costs ic where ic.incubation_batch_id=ib.id)) as total_cost
      from public.incubation_batches ib join public.farms f on f.id=ib.farm_id join public.incubators i on i.id=ib.incubator_id
      where ib.organization_id=${organizationId} order by ib.start_date desc, ib.created_at desc`;
    const events = await db`select e.incubation_batch_id, e.event_type, e.event_at, e.temperature_c, e.humidity_percent, e.quantity, e.notes from public.incubation_events e where e.organization_id=${organizationId} order by e.event_at desc`;
    const costs = await db`select c.incubation_batch_id, c.category, c.amount, c.incurred_on from public.incubation_costs c where c.organization_id=${organizationId} order by c.incurred_on desc`;
    const poultryBatches = await db`select lb.id, f.name as farm_name, s.name as season_name, lb.batch_code, lb.start_date, lb.source_type, lb.source_details, lb.initial_quantity, lb.breed, lb.strain, coalesce(lb.source_cost,0)::numeric as source_cost,
      (coalesce(lb.source_cost,0) / nullif(lb.initial_quantity,0))::numeric as cost_per_bird
      from public.livestock_batches lb join public.farms f on f.id=lb.farm_id join public.livestock_groups lg on lg.id=lb.group_id join public.livestock_species ls on ls.id=lg.species_id left join public.seasons s on s.id=lb.season_id
      where lb.organization_id=${organizationId} and ls.category='poultry'
        and (${filters.farmId ?? null}::uuid is null or lb.farm_id=${filters.farmId ?? null}::uuid)
        and (${filters.seasonId ?? null}::uuid is null or lb.season_id=${filters.seasonId ?? null}::uuid)
        and (${filters.sourceType == null || filters.sourceType === "all" || filters.sourceType === "legacy_unrecorded"} or lb.source_type=${filters.sourceType ?? "all"})
        and (${filters.sourceType !== "legacy_unrecorded"} or lb.source_type is null)
        and (${filters.breed ? `%${filters.breed}%` : null}::text is null or lb.breed ilike ${filters.breed ? `%${filters.breed}%` : null}::text or lb.strain ilike ${filters.breed ? `%${filters.breed}%` : null}::text)
        and (${filters.batch ? `%${filters.batch}%` : null}::text is null or lb.batch_code ilike ${filters.batch ? `%${filters.batch}%` : null}::text)
        and (${filters.dateFrom ?? null}::date is null or lb.start_date>=${filters.dateFrom ?? null}::date)
        and (${filters.dateTo ?? null}::date is null or lb.start_date<=${filters.dateTo ?? null}::date)
      order by lb.start_date desc, lb.created_at desc`;
    return {
      incubators: incubators.map((r) => ({ id: String(r.id), farmName: String(r.farm_name), name: String(r.name), capacity: Number(r.capacity), status: String(r.status), location:(r.location as string | null)??null, manufacturer:(r.manufacturer as string | null)??null, model:(r.model as string | null)??null, monitorsTemperature:Boolean(r.monitors_temperature), monitorsHumidity:Boolean(r.monitors_humidity) })),
      hatcheryOrders: orders.map((r) => {
        const healthy = Number(r.quantity_delivered) - Number(r.dead_on_arrival);
        const total = Number(r.quantity_delivered) * Number(r.price_per_chick) + Number(r.transport_cost) + Number(r.other_cost);
        return { id: String(r.id), farmName: String(r.farm_name), supplier: String(r.supplier_name), reference: (r.reference as string | null) ?? null, orderNumber:(r.order_number as string | null)??null, vaccinationInfo:(r.vaccination_info as string | null)??null, documents:Array.isArray(r.document_urls)?r.document_urls.map(String):[],
          ordered: Number(r.quantity_ordered), delivered: Number(r.quantity_delivered), doa: Number(r.dead_on_arrival), available: Number(r.available), totalCost: total,
          costPerHealthy: healthy > 0 ? total / healthy : null, deliveryDate: (r.delivery_date as string | null) ?? null, breed: (r.breed as string | null) ?? null };
      }),
      incubationBatches: batches.map((r) => {
        const healthy = Number(r.healthy_chicks); const totalCost = Number(r.total_cost);
        return { id: String(r.id), farmName: String(r.farm_name), incubatorName: String(r.incubator_name), code: String(r.batch_code),
          startDate: String(r.start_date), expectedDate:(r.expected_hatch_date as string | null)??null, hatchDate: (r.actual_hatch_date as string | null) ?? null,
          eggSource:String(r.egg_source), eggSourceDetails:(r.egg_source_details as string | null)??null, documents:Array.isArray(r.document_urls)?r.document_urls.map(String):[], eggsLoaded: Number(r.eggs_loaded), fertile:Number(r.fertile_eggs), infertile:Number(r.infertile_eggs), cracked:Number(r.cracked_or_damaged), losses:Number(r.embryonic_losses), hatched:Number(r.hatched), healthy, weak: Number(r.weak_chicks), dead: Number(r.dead_at_hatch),
          hatchRate: Number(r.hatch_rate ?? 0), totalCost, costPerHealthy: healthy > 0 ? totalCost / healthy : null,
          breed: (r.breed as string | null) ?? null, strain: (r.strain as string | null) ?? null,
          events: events.filter((e) => e.incubation_batch_id === r.id).map((e) => ({ type: String(e.event_type), at: String(e.event_at), temperature: e.temperature_c === null ? null : Number(e.temperature_c), humidity: e.humidity_percent === null ? null : Number(e.humidity_percent), quantity: e.quantity === null ? null : Number(e.quantity), notes: (e.notes as string | null) ?? null })),
          costs: costs.filter((c)=>c.incubation_batch_id===r.id).map((c)=>({category:String(c.category),amount:Number(c.amount),date:String(c.incurred_on)})) };
      }),
      poultryBatches: poultryBatches.map((r)=>({id:String(r.id),farmName:String(r.farm_name),seasonName:(r.season_name as string | null)??null,code:String(r.batch_code),date:String(r.start_date),sourceType:(r.source_type as string | null)??null,sourceDetails:(r.source_details as string | null)??null,quantity:Number(r.initial_quantity),breed:(r.breed as string | null)??null,strain:(r.strain as string | null)??null,sourceCost:Number(r.source_cost),costPerBird:Number(r.cost_per_bird??0)})),
    };
  });
}

export async function recordIncubationEvent(userId: string, input: { organizationId: string; batchId: string; eventType: string; eventAt: string; temperature?: number; humidity?: number; quantity?: number; notes?: string }) {
  return withUser(userId, async (db) => {
    const batch = await db`select id from public.incubation_batches where id=${input.batchId} and organization_id=${input.organizationId}`;
    if (!batch[0]) throw new Error("Incubation batch not found in this organization.");
    await db`insert into public.incubation_events (organization_id,incubation_batch_id,event_type,event_at,temperature_c,humidity_percent,quantity,notes)
      values (${input.organizationId},${input.batchId},${input.eventType},${input.eventAt},${input.temperature ?? null},${input.humidity ?? null},${input.quantity ?? null},${input.notes || null})`;
  });
}

export async function createIncubator(userId: string, input: { organizationId: string; farmId: string; name: string; capacity: number; location?: string; manufacturer?: string; model?: string; monitorsTemperature: boolean; monitorsHumidity: boolean; notes?: string }) {
  return withUser(userId, async (db) => {
    const farm = await db`select id from public.farms where id=${input.farmId} and organization_id=${input.organizationId}`;
    if (!farm[0]) throw new Error("Select a farm in your current organization.");
    const rows = await db`insert into public.incubators (organization_id, farm_id, name, capacity, location, manufacturer, model, monitors_temperature, monitors_humidity, notes)
      values (${input.organizationId},${input.farmId},${input.name},${input.capacity},${input.location || null},${input.manufacturer || null},${input.model || null},${input.monitorsTemperature},${input.monitorsHumidity},${input.notes || null}) returning id`;
    return rows[0];
  });
}

export async function createHatcheryOrder(userId: string, input: { organizationId: string; farmId: string; supplier: string; orderNumber?: string; reference?: string; orderDate: string; deliveryDate?: string; breed?: string; strain?: string; ordered: number; delivered: number; doa: number; pricePerChick: number; transportCost: number; otherCost: number; vaccinationInfo?: string; documentUrl?: string; notes?: string }) {
  return withUser(userId, async (db) => {
    const farm = await db`select id from public.farms where id=${input.farmId} and organization_id=${input.organizationId}`;
    if (!farm[0]) throw new Error("Select a farm in your current organization.");
    let vendor = await db`insert into public.hatcheries (organization_id, name) values (${input.organizationId},${input.supplier})
      on conflict (organization_id,name) do nothing returning id`;
    if (!vendor[0]) vendor = await db`select id from public.hatcheries where organization_id=${input.organizationId} and name=${input.supplier}`;
    const rows = await db`insert into public.hatchery_orders (organization_id,farm_id,hatchery_id,supplier_name,order_number,batch_reference,order_date,delivery_date,breed,strain,quantity_ordered,quantity_delivered,dead_on_arrival,price_per_chick,transport_cost,other_cost,vaccination_info,document_urls,notes)
      values (${input.organizationId},${input.farmId},${vendor[0].id},${input.supplier},${input.orderNumber || null},${input.reference || null},${input.orderDate},${input.deliveryDate || null},${input.breed || null},${input.strain || null},${input.ordered},${input.delivered},${input.doa},${input.pricePerChick},${input.transportCost},${input.otherCost},${input.vaccinationInfo || null},${JSON.stringify(input.documentUrl ? [input.documentUrl] : [])}::jsonb,${input.notes || null}) returning id`;
    return rows[0];
  });
}

export async function createIncubationBatch(userId: string, input: { organizationId: string; farmId: string; incubatorId: string; code: string; startDate: string; expectedDate?: string; eggSource: string; eggSourceDetails?: string; documentUrl?: string; breed?: string; strain?: string; eggsLoaded: number; eggCost: number; notes?: string }) {
  return withUser(userId, async (db) => {
    const incubator = await db`select capacity from public.incubators where id=${input.incubatorId} and organization_id=${input.organizationId} and farm_id=${input.farmId} and status='active'`;
    if (!incubator[0]) throw new Error("Choose an active incubator belonging to the selected farm.");
    if (input.eggsLoaded > Number(incubator[0].capacity)) throw new Error(`This incubator can hold up to ${Number(incubator[0].capacity).toLocaleString()} eggs.`);
    const rows = await db`insert into public.incubation_batches (organization_id,farm_id,incubator_id,batch_code,start_date,expected_hatch_date,egg_source,egg_source_details,document_urls,breed,strain,eggs_loaded,egg_cost,notes)
      values (${input.organizationId},${input.farmId},${input.incubatorId},${input.code},${input.startDate},${input.expectedDate || null},${input.eggSource},${input.eggSourceDetails || null},${JSON.stringify(input.documentUrl ? [input.documentUrl] : [])}::jsonb,${input.breed || null},${input.strain || null},${input.eggsLoaded},${input.eggCost},${input.notes || null}) returning id`;
    await db`insert into public.incubation_events (organization_id,incubation_batch_id,event_type,quantity,notes) values (${input.organizationId},${rows[0].id},'eggs_loaded',${input.eggsLoaded},'Eggs loaded; incubation started')`;
    return rows[0];
  });
}

export async function recordIncubationOutcome(userId: string, input: { organizationId: string; batchId: string; fertile: number; infertile: number; cracked: number; embryonicLosses: number; hatched: number; weak: number; dead: number; healthy: number; hatchDate: string; notes?: string }) {
  return withUser(userId, async (db) => {
    const batch = await db`select eggs_loaded from public.incubation_batches where id=${input.batchId} and organization_id=${input.organizationId} for update`;
    if (!batch[0]) throw new Error("Incubation batch not found.");
    if (input.fertile + input.infertile > Number(batch[0].eggs_loaded)) throw new Error("Fertile and infertile egg counts cannot exceed eggs loaded.");
    if (input.healthy + input.weak + input.dead > input.hatched) throw new Error("Healthy, weak, and dead-at-hatch counts cannot exceed the hatched count.");
    const assigned = await db`select coalesce(sum(initial_quantity),0)::int as quantity from public.livestock_batches where source_type='farm_incubator' and source_id=${input.batchId}`;
    if (input.healthy < Number(assigned[0]?.quantity ?? 0)) throw new Error("Healthy chick count cannot be lower than the number already assigned to poultry batches.");
    await db`update public.incubation_batches set actual_hatch_date=${input.hatchDate}, fertile_eggs=${input.fertile}, infertile_eggs=${input.infertile}, cracked_or_damaged=${input.cracked}, embryonic_losses=${input.embryonicLosses}, hatched=${input.hatched}, weak_chicks=${input.weak}, dead_at_hatch=${input.dead}, healthy_chicks=${input.healthy}, notes=coalesce(${input.notes || null},notes) where id=${input.batchId}`;
    await db`update public.livestock_batches lb set source_cost = case when ib.healthy_chicks > 0 then round((ib.egg_cost + ib.operating_cost + (select coalesce(sum(c.amount),0) from public.incubation_costs c where c.incubation_batch_id=ib.id)) * lb.initial_quantity / ib.healthy_chicks, 2) else 0 end
      from public.incubation_batches ib where lb.source_type='farm_incubator' and lb.source_id=ib.id and ib.id=${input.batchId}`;
    await db`insert into public.incubation_events (organization_id,incubation_batch_id,event_type,quantity,notes) values (${input.organizationId},${input.batchId},'hatch_completed',${input.hatched},${input.notes || 'Hatch outcome recorded'})`;
  });
}

export async function addIncubationCost(userId: string, input: { organizationId: string; batchId: string; category: string; amount: number; date: string; notes?: string }) {
  return withUser(userId, async (db) => {
    const batch = await db`select id from public.incubation_batches where id=${input.batchId} and organization_id=${input.organizationId}`;
    if (!batch[0]) throw new Error("Incubation batch not found in this organization.");
    await db`insert into public.incubation_costs (organization_id,incubation_batch_id,category,amount,incurred_on,notes)
      values (${input.organizationId},${input.batchId},${input.category},${input.amount},${input.date},${input.notes || null})`;
    await db`update public.livestock_batches lb set source_cost = case when ib.healthy_chicks > 0 then round((ib.egg_cost + ib.operating_cost + (select coalesce(sum(c.amount),0) from public.incubation_costs c where c.incubation_batch_id=ib.id)) * lb.initial_quantity / ib.healthy_chicks, 2) else 0 end
      from public.incubation_batches ib where lb.source_type='farm_incubator' and lb.source_id=ib.id and ib.id=${input.batchId}`;
  });
}
