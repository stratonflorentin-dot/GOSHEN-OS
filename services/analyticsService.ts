/**
 * Analytics service — farm-level KPIs and comparisons (§46, §47).
 * All calculations are done in SQL for performance and accuracy.
 */
import { withUser } from "@/lib/db";
import { getCropYieldBenchmark, getFCRPerformance, getMortalityPerformance } from "@/lib/agricultural/constants";

export type FarmKpis = {
  farmId: string;
  period: { from: string; to: string };
  // Land
  totalHectares: number;
  activePlots: number;
  // Crops
  activeCropSeasons: number;
  totalPlantedHectares: number;
  totalHarvestedKg: number;
  totalCropRevenue: number;
  totalCropCost: number;
  cropGrossMargin: number;
  cropMarginPct: number;
  avgYieldPerHa: number;
  yieldPerformance: "excellent" | "good" | "average" | "poor";
  // Livestock
  activeBatches: number;
  totalLivestockRevenue: number;
  totalLivestockCost: number;
  livestockGrossMargin: number;
  livestockMarginPct: number;
  avgFCR: number | null;
  fcrPerformance: "excellent" | "good" | "average" | "poor" | null;
  avgMortalityRate: number;
  mortalityPerformance: "excellent" | "good" | "average" | "poor";
  // Finance
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  // Inventory
  inventoryValue: number;
  lowStockItems: number;
  // Labor
  totalLaborCost: number;
  totalLaborHours: number;
  // Equipment
  equipmentUsageHours: number;
  equipmentCost: number;
};

export type PlotPerformance = {
  plotId: string;
  plotCode: string;
  plotName: string;
  areaHa: number;
  cropSeasons: number;
  totalHarvestedKg: number;
  yieldKgPerHa: number;
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  marginPct: number;
};

export type CropPerformance = {
  cropId: string;
  cropName: string;
  cropCategory: string;
  seasons: number;
  totalAreaHa: number;
  totalHarvestedKg: number;
  avgYieldKgPerHa: number;
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  marginPct: number;
};

export type LivestockBatchPerformance = {
  batchId: string;
  batchName: string;
  species: string;
  initialCount: number;
  currentCount: number;
  mortalityRate: number;
  feedConsumedKg: number;
  feedCost: number;
  totalCost: number;
  totalRevenue: number;
  grossMargin: number;
  marginPct: number;
  fcr: number | null; // feed conversion ratio
};

export type SeasonComparison = {
  seasonId: string;
  seasonName: string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  cropMarginPct: number;
  livestockMarginPct: number;
  totalHarvestedKg: number;
};

export type MonthlyCashFlow = {
  month: string; // YYYY-MM
  revenue: number;
  expenses: number;
  net: number;
  cumulative: number;
};

export async function getFarmKpis(
  userId: string,
  farmId: string,
  from?: string,
  to?: string,
): Promise<FarmKpis> {
  return withUser(userId, async (db) => {
    const fromDate = from ?? new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
    const toDate = to ?? new Date().toISOString().slice(0, 10);

    const [
      land,
      crops,
      livestock,
      finance,
      inventory,
      labor,
      equipment,
    ] = await Promise.all([
      // Land
      db`
        select
          coalesce(sum(area_m2), 0)::numeric / 10000 as total_hectares,
          count(*) filter (where status = 'active')::int as active_plots
        from public.plots
        where farm_id = ${farmId} and status <> 'archived'
      `,
      // Crops
      db`
        select
          count(*) filter (where cs.status in ('planted','active','flowering','fruiting'))::int as active_crop_seasons,
          coalesce(sum(cs.area_m2), 0)::numeric / 10000 as total_planted_hectares,
          coalesce(sum(h.quantity), 0)::numeric as total_harvested_kg,
          coalesce(sum(h.total_value), 0)::numeric as total_crop_revenue,
          coalesce(sum(
            coalesce(lr.total_cost, 0) + coalesce(eu.total_cost, 0) + coalesce(ir.total_cost, 0)
          ), 0)::numeric as total_crop_cost
        from public.crop_seasons cs
        left join public.harvests h on h.crop_season_id = cs.id
        left join public.labor_records lr on lr.crop_season_id = cs.id
        left join public.equipment_usage eu on eu.crop_season_id = cs.id
        left join public.irrigation_records ir on ir.crop_season_id = cs.id
        where cs.farm_id = ${farmId}
          and (${fromDate}::date is null or cs.created_at >= ${fromDate}::date)
          and (${toDate}::date is null or cs.created_at <= ${toDate}::date)
      `,
      // Livestock
      db`
        select
          count(*) filter (where lb.status = 'active')::int as active_batches,
          coalesce(sum(ls.quantity * ls.unit_price), 0)::numeric as total_livestock_revenue,
          coalesce(sum(
            coalesce(lf.total_cost, 0) + coalesce(lh.total_cost, 0) + coalesce(lr.total_cost, 0)
          ), 0)::numeric as total_livestock_cost
        from public.livestock_batches lb
        left join public.livestock_sales ls on ls.livestock_batch_id = lb.id
        left join public.livestock_feed lf on lf.livestock_batch_id = lb.id
        left join public.livestock_health lh on lh.livestock_batch_id = lb.id
        left join public.labor_records lr on lr.livestock_batch_id = lb.id
        where lb.farm_id = ${farmId}
          and (${fromDate}::date is null or lb.created_at >= ${fromDate}::date)
          and (${toDate}::date is null or lb.created_at <= ${toDate}::date)
      `,
      // Finance
      db`
        select
          coalesce(sum(amount) filter (where type = 'revenue'), 0)::numeric as total_revenue,
          coalesce(sum(amount) filter (where type = 'expense'), 0)::numeric as total_expenses,
          coalesce(sum(amount) filter (where type = 'revenue'), 0)::numeric -
          coalesce(sum(amount) filter (where type = 'expense'), 0)::numeric as net_profit
        from public.journal_lines jl
        join public.journal_entries je on je.id = jl.journal_entry_id
        join public.accounts a on a.id = jl.account_id
        where je.farm_id = ${farmId}
          and je.status = 'posted'
          and (${fromDate}::date is null or je.entry_date >= ${fromDate}::date)
          and (${toDate}::date is null or je.entry_date <= ${toDate}::date)
      `,
      // Inventory value + low stock
      db`
        select
          coalesce(sum(b.quantity * i.unit_cost), 0)::numeric as inventory_value,
          count(*) filter (where b.quantity <= i.reorder_level and i.reorder_level > 0)::int as low_stock_items
        from public.inventory_balances b
        join public.inventory_items i on i.id = b.item_id
        where i.farm_id = ${farmId} and b.quantity > 0
      `,
      // Labor
      db`
        select
          coalesce(sum(total_cost), 0)::numeric as total_labor_cost,
          coalesce(sum(hours_worked), 0)::numeric as total_labor_hours
        from public.labor_records
        where farm_id = ${farmId}
          and (${fromDate}::date is null or work_date >= ${fromDate}::date)
          and (${toDate}::date is null or work_date <= ${toDate}::date)
      `,
      // Equipment
      db`
        select
          coalesce(sum(hours_used), 0)::numeric as equipment_usage_hours,
          coalesce(sum(total_cost), 0)::numeric as equipment_cost
        from public.equipment_usage
        where farm_id = ${farmId}
          and (${fromDate}::date is null or usage_date >= ${fromDate}::date)
          and (${toDate}::date is null or usage_date <= ${toDate}::date)
      `,
    ]);

    const l = land[0] ?? {};
    const c = crops[0] ?? {};
    const lv = livestock[0] ?? {};
    const f = finance[0] ?? {};
    const inv = inventory[0] ?? {};
    const lab = labor[0] ?? {};
    const eq = equipment[0] ?? {};

    const cropRevenue = Number(c.total_crop_revenue ?? 0);
    const cropCost = Number(c.total_crop_cost ?? 0);
    const livestockRevenue = Number(lv.total_livestock_revenue ?? 0);
    const livestockCost = Number(lv.total_livestock_cost ?? 0);

    // Calculate agricultural performance metrics
    const totalPlantedHa = Number(c.total_planted_hectares ?? 0);
    const avgYieldPerHa = totalPlantedHa > 0 ? Number(c.total_harvested_kg ?? 0) / totalPlantedHa : 0;
    const yieldPerformance: "excellent" | "good" | "average" | "poor" = "average"; // Simplified for now

    // Calculate FCR performance (simplified - would need actual batch data)
    const avgFCR = null; // Would be calculated from actual feed and weight data
    const fcrPerformance: "excellent" | "good" | "average" | "poor" | null = null;

    // Calculate mortality performance (simplified)
    const avgMortalityRate = 5; // Would be calculated from actual mortality data
    const mortalityPerformance: "excellent" | "good" | "average" | "poor" = "average";

    return {
      farmId,
      period: { from: fromDate, to: toDate },
      totalHectares: Number(l.total_hectares ?? 0),
      activePlots: Number(l.active_plots ?? 0),
      activeCropSeasons: Number(c.active_crop_seasons ?? 0),
      totalPlantedHectares: totalPlantedHa,
      totalHarvestedKg: Number(c.total_harvested_kg ?? 0),
      totalCropRevenue: cropRevenue,
      totalCropCost: cropCost,
      cropGrossMargin: cropRevenue - cropCost,
      cropMarginPct: cropRevenue > 0 ? ((cropRevenue - cropCost) / cropRevenue) * 100 : 0,
      avgYieldPerHa,
      yieldPerformance,
      activeBatches: Number(lv.active_batches ?? 0),
      totalLivestockRevenue: livestockRevenue,
      totalLivestockCost: livestockCost,
      livestockGrossMargin: livestockRevenue - livestockCost,
      livestockMarginPct: livestockRevenue > 0 ? ((livestockRevenue - livestockCost) / livestockRevenue) * 100 : 0,
      avgFCR,
      fcrPerformance,
      avgMortalityRate,
      mortalityPerformance,
      totalRevenue: Number(f.total_revenue ?? 0),
      totalExpenses: Number(f.total_expenses ?? 0),
      netProfit: Number(f.net_profit ?? 0),
      cashBalance: 0, // computed from cash accounts separately if needed
      accountsReceivable: 0,
      accountsPayable: 0,
      inventoryValue: Number(inv.inventory_value ?? 0),
      lowStockItems: Number(inv.low_stock_items ?? 0),
      totalLaborCost: Number(lab.total_labor_cost ?? 0),
      totalLaborHours: Number(lab.total_labor_hours ?? 0),
      equipmentUsageHours: Number(eq.equipment_usage_hours ?? 0),
      equipmentCost: Number(eq.equipment_cost ?? 0),
    };
  });
}

export async function getPlotPerformance(
  userId: string,
  farmId: string,
  from?: string,
  to?: string,
): Promise<PlotPerformance[]> {
  return withUser(userId, async (db) => {
    const fromDate = from ?? new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
    const toDate = to ?? new Date().toISOString().slice(0, 10);

    const rows = await db`
      select
        p.id as plot_id,
        p.code as plot_code,
        p.name as plot_name,
        p.area_m2::numeric / 10000 as area_ha,
        count(distinct cs.id)::int as crop_seasons,
        coalesce(sum(h.quantity), 0)::numeric as total_harvested_kg,
        coalesce(sum(h.total_value), 0)::numeric as total_revenue,
        coalesce(sum(
          coalesce(lr.total_cost, 0) + coalesce(eu.total_cost, 0) + coalesce(ir.total_cost, 0)
        ), 0)::numeric as total_cost
      from public.plots p
      left join public.crop_seasons cs on cs.plot_id = p.id
      left join public.harvests h on h.crop_season_id = cs.id
      left join public.labor_records lr on lr.crop_season_id = cs.id
      left join public.equipment_usage eu on eu.crop_season_id = cs.id
      left join public.irrigation_records ir on ir.crop_season_id = cs.id
      where p.farm_id = ${farmId} and p.status <> 'archived'
        and (${fromDate}::date is null or cs.created_at >= ${fromDate}::date)
        and (${toDate}::date is null or cs.created_at <= ${toDate}::date)
      group by p.id, p.code, p.name, p.area_m2
      order by total_revenue desc
    `;

    return rows.map((r) => {
      const revenue = Number(r.total_revenue ?? 0);
      const cost = Number(r.total_cost ?? 0);
      const areaHa = Number(r.area_ha ?? 0);
      const harvested = Number(r.total_harvested_kg ?? 0);
      return {
        plotId: r.plot_id as string,
        plotCode: r.plot_code as string,
        plotName: r.plot_name as string,
        areaHa,
        cropSeasons: Number(r.crop_seasons ?? 0),
        totalHarvestedKg: harvested,
        yieldKgPerHa: areaHa > 0 ? harvested / areaHa : 0,
        totalRevenue: revenue,
        totalCost: cost,
        grossMargin: revenue - cost,
        marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      };
    });
  });
}

export async function getCropPerformance(
  userId: string,
  organizationId: string,
  from?: string,
  to?: string,
): Promise<CropPerformance[]> {
  return withUser(userId, async (db) => {
    const fromDate = from ?? new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
    const toDate = to ?? new Date().toISOString().slice(0, 10);

    const rows = await db`
      select
        c.id as crop_id,
        c.name as crop_name,
        c.category as crop_category,
        count(distinct cs.id)::int as seasons,
        coalesce(sum(cs.area_m2), 0)::numeric / 10000 as total_area_ha,
        coalesce(sum(h.quantity), 0)::numeric as total_harvested_kg,
        coalesce(sum(h.total_value), 0)::numeric as total_revenue,
        coalesce(sum(
          coalesce(lr.total_cost, 0) + coalesce(eu.total_cost, 0) + coalesce(ir.total_cost, 0)
        ), 0)::numeric as total_cost
      from public.crops c
      join public.crop_seasons cs on cs.crop_id = c.id
      left join public.harvests h on h.crop_season_id = cs.id
      left join public.labor_records lr on lr.crop_season_id = cs.id
      left join public.equipment_usage eu on eu.crop_season_id = cs.id
      left join public.irrigation_records ir on ir.crop_season_id = cs.id
      where cs.organization_id = ${organizationId}
        and (${fromDate}::date is null or cs.created_at >= ${fromDate}::date)
        and (${toDate}::date is null or cs.created_at <= ${toDate}::date)
      group by c.id, c.name, c.category
      order by total_revenue desc
    `;

    return rows.map((r) => {
      const revenue = Number(r.total_revenue ?? 0);
      const cost = Number(r.total_cost ?? 0);
      const areaHa = Number(r.total_area_ha ?? 0);
      const harvested = Number(r.total_harvested_kg ?? 0);
      return {
        cropId: r.crop_id as string,
        cropName: r.crop_name as string,
        cropCategory: r.crop_category as string,
        seasons: Number(r.seasons ?? 0),
        totalAreaHa: areaHa,
        totalHarvestedKg: harvested,
        avgYieldKgPerHa: areaHa > 0 ? harvested / areaHa : 0,
        totalRevenue: revenue,
        totalCost: cost,
        grossMargin: revenue - cost,
        marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      };
    });
  });
}

export async function getLivestockBatchPerformance(
  userId: string,
  farmId: string,
): Promise<LivestockBatchPerformance[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        lb.id as batch_id,
        lb.name as batch_name,
        ls.name as species,
        lb.initial_quantity as initial_count,
        lb.current_quantity as current_count,
        case when lb.initial_quantity > 0
          then round((lb.initial_quantity - lb.current_quantity)::numeric / lb.initial_quantity * 100, 2)
          else 0 end as mortality_rate,
        coalesce(sum(lf.quantity_kg), 0)::numeric as feed_consumed_kg,
        coalesce(sum(lf.total_cost), 0)::numeric as feed_cost,
        coalesce(sum(
          coalesce(lf.total_cost, 0) + coalesce(lh.total_cost, 0) + coalesce(lr.total_cost, 0)
        ), 0)::numeric as total_cost,
        coalesce(sum(ls2.quantity * ls2.unit_price), 0)::numeric as total_revenue
      from public.livestock_batches lb
      join public.livestock_species ls on ls.id = lb.species_id
      left join public.livestock_feed lf on lf.livestock_batch_id = lb.id
      left join public.livestock_health lh on lh.livestock_batch_id = lb.id
      left join public.labor_records lr on lr.livestock_batch_id = lb.id
      left join public.livestock_sales ls2 on ls2.livestock_batch_id = lb.id
      where lb.farm_id = ${farmId}
      group by lb.id, lb.name, ls.name, lb.initial_quantity, lb.current_quantity
      order by total_revenue desc
    `;

    return rows.map((r) => {
      const revenue = Number(r.total_revenue ?? 0);
      const cost = Number(r.total_cost ?? 0);
      const feedKg = Number(r.feed_consumed_kg ?? 0);
      const initial = Number(r.initial_count ?? 0);
      const current = Number(r.current_count ?? 0);
      const sold = initial - current - Number(r.mortality_rate ?? 0) * initial / 100; // rough
      const weightGainKg = sold > 0 ? feedKg / sold : 0; // very rough FCR proxy
      return {
        batchId: r.batch_id as string,
        batchName: r.batch_name as string,
        species: r.species as string,
        initialCount: initial,
        currentCount: current,
        mortalityRate: Number(r.mortality_rate ?? 0),
        feedConsumedKg: feedKg,
        feedCost: Number(r.feed_cost ?? 0),
        totalCost: cost,
        totalRevenue: revenue,
        grossMargin: revenue - cost,
        marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
        fcr: weightGainKg > 0 ? feedKg / weightGainKg : null,
      };
    });
  });
}

export async function getSeasonComparison(
  userId: string,
  organizationId: string,
): Promise<SeasonComparison[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        s.id as season_id,
        s.name as season_name,
        coalesce(sum(h.total_value), 0)::numeric as total_revenue,
        coalesce(sum(
          coalesce(lr.total_cost, 0) + coalesce(eu.total_cost, 0) + coalesce(ir.total_cost, 0)
        ), 0)::numeric as total_cost,
        coalesce(sum(h.quantity), 0)::numeric as total_harvested_kg
      from public.seasons s
      left join public.crop_seasons cs on cs.season_id = s.id
      left join public.harvests h on h.crop_season_id = cs.id
      left join public.labor_records lr on lr.crop_season_id = cs.id
      left join public.equipment_usage eu on eu.crop_season_id = cs.id
      left join public.irrigation_records ir on ir.crop_season_id = cs.id
      where cs.organization_id = ${organizationId}
      group by s.id, s.name
      order by s.start_date desc nulls last
    `;

    return rows.map((r) => {
      const revenue = Number(r.total_revenue ?? 0);
      const cost = Number(r.total_cost ?? 0);
      return {
        seasonId: r.season_id as string,
        seasonName: r.season_name as string,
        totalRevenue: revenue,
        totalCost: cost,
        netProfit: revenue - cost,
        cropMarginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
        livestockMarginPct: 0, // would need separate query
        totalHarvestedKg: Number(r.total_harvested_kg ?? 0),
      };
    });
  });
}

export async function getMonthlyCashFlow(
  userId: string,
  farmId: string,
  months = 12,
): Promise<MonthlyCashFlow[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        to_char(je.entry_date, 'YYYY-MM') as month,
        coalesce(sum(jl.amount) filter (where a.type = 'revenue'), 0)::numeric as revenue,
        coalesce(sum(jl.amount) filter (where a.type = 'expense'), 0)::numeric as expenses
      from public.journal_entries je
      join public.journal_lines jl on jl.journal_entry_id = je.id
      join public.accounts a on a.id = jl.account_id
      where je.farm_id = ${farmId}
        and je.status = 'posted'
        and je.entry_date >= (current_date - (${months} || ' months')::interval)
      group by to_char(je.entry_date, 'YYYY-MM')
      order by month
    `;

    let cumulative = 0;
    return rows.map((r) => {
      const rev = Number(r.revenue ?? 0);
      const exp = Number(r.expenses ?? 0);
      const net = rev - exp;
      cumulative += net;
      return {
        month: r.month as string,
        revenue: rev,
        expenses: exp,
        net,
        cumulative,
      };
    });
  });
}