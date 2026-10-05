/**
 * Report generation (§38). Reports are built as tables of tenant data that
 * can be rendered as CSV, printed to PDF, or viewed on screen. All data
 * flows through RLS-scoped services or RLS-scoped SQL.
 */

import { withUser } from "@/lib/db";
import { reportToCsv, type ReportCell } from "@/lib/reports/csv";
import { listFarmGeo } from "@/services/farmService";
import { listPlots } from "@/services/plotService";
import { listCropSeasons } from "@/services/cropService";
import { listLivestockBatches } from "@/services/livestockService";
import { listProductionRecords } from "@/services/productionService";
import { getFinancialSummary, listExpenses, listRevenues } from "@/services/financeService";
import {
  getFarmKpis,
  getPlotPerformance,
  getCropPerformance,
  getLivestockBatchPerformance,
} from "@/services/analyticsService";

export type { ReportCell } from "@/lib/reports/csv";
export type ReportTable = { title: string; columns: string[]; rows: ReportCell[][] };
export type ReportType =
  | "farm"
  | "crops"
  | "livestock"
  | "finance"
  | "inventory"
  | "production"
  | "profitability"
  | "management";

export type GeneratedReport = {
  type: ReportType;
  title: string;
  generatedAt: string;
  farmName?: string;
  tables: ReportTable[];
};

export const REPORT_TYPES: Array<{ type: ReportType; title: string; description: string }> = [
  { type: "farm", title: "Farm report", description: "Farms, plots, land area and current status." },
  { type: "crops", title: "Crop report", description: "Crop seasons, planting dates, harvests and yields." },
  { type: "livestock", title: "Livestock report", description: "Batches, mortality, feed consumption and batch economics." },
  { type: "finance", title: "Financial report", description: "Income, expenses, profit and cash balance with recent transactions." },
  { type: "inventory", title: "Inventory report", description: "Stock on hand by item and location, with low-stock warnings." },
  { type: "production", title: "Production report", description: "Production records by product, type and destination." },
  { type: "profitability", title: "Profitability report", description: "Gross margins by plot, crop and livestock batch." },
  { type: "management", title: "Management report", description: "Executive KPI summary per farm for the last 12 months." },
];

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number | null, digits = 2): number | null {
  if (value === null) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export async function generateReport(
  userId: string,
  organizationId: string,
  type: ReportType,
  opts: { farmId?: string | null } = {},
): Promise<GeneratedReport> {
  const farms = await listFarmGeo(userId, organizationId);
  const scoped = opts.farmId ? farms.filter((f) => f.farmId === opts.farmId) : farms;
  const farmName = opts.farmId ? (scoped[0]?.name ?? undefined) : undefined;
  const generatedAt = new Date().toISOString();
  const meta = REPORT_TYPES.find((r) => r.type === type);
  const title = `${meta?.title ?? type}${farmName ? ` — ${farmName}` : ""}`;

  switch (type) {
    case "farm": {
      const plots = await listPlots(userId, organizationId, opts.farmId ?? undefined);
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Farms",
            columns: ["Farm", "Area (ha)", "Boundary recorded", "Latitude", "Longitude"],
            rows: scoped.map((f) => [
              f.name,
              round(num(f.areaM2) !== null ? num(f.areaM2)! / 10_000 : null),
              f.boundaryGeoJson ? "yes" : "no",
              round(f.centroidLat, 5),
              round(f.centroidLng, 5),
            ]),
          },
          {
            title: "Plots",
            columns: ["Plot code", "Name", "Farm", "Type", "Land use", "Area (ha)", "Status"],
            rows: plots.map((p) => {
              const farm = farms.find((f) => f.farmId === p.farmId);
              return [
                p.code,
                p.name,
                farm?.name ?? "",
                p.plotType,
                p.landUse,
                round(num(p.areaM2) !== null ? num(p.areaM2)! / 10_000 : null),
                p.status,
              ];
            }),
          },
        ],
      };
    }

    case "crops": {
      const seasons = await listCropSeasons(userId, organizationId, opts.farmId ?? undefined);
      const plots = await listPlots(userId, organizationId, opts.farmId ?? undefined);
      const plotById = new Map(plots.map((p) => [p.id, p]));
      const harvests = await withUser(userId, (db) => {
        const rows = opts.farmId
          ? db`
              select h.harvest_date, c.name as crop_name, cv.name as variety_name, s.name as season_name,
                     h.quantity, h.unit, h.total_value, h.quality_grade
              from public.harvests h
              join public.crop_seasons cs on cs.id = h.crop_season_id
              left join public.crops c on c.id = cs.crop_id
              left join public.crop_varieties cv on cv.id = cs.variety_id
              left join public.seasons s on s.id = cs.season_id
              where cs.organization_id = ${organizationId} and cs.farm_id = ${opts.farmId}
              order by h.harvest_date desc limit 200
            `
          : db`
              select h.harvest_date, c.name as crop_name, cv.name as variety_name, s.name as season_name,
                     h.quantity, h.unit, h.total_value, h.quality_grade
              from public.harvests h
              join public.crop_seasons cs on cs.id = h.crop_season_id
              left join public.crops c on c.id = cs.crop_id
              left join public.crop_varieties cv on cv.id = cs.variety_id
              left join public.seasons s on s.id = cs.season_id
              where cs.organization_id = ${organizationId}
              order by h.harvest_date desc limit 200
            `;
        return rows;
      });
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Crop seasons",
            columns: ["Crop", "Variety", "Season", "Plot", "Planted", "Expected harvest", "Actual harvest", "Target yield (kg)", "Actual yield (kg)", "Status"],
            rows: seasons.map((s) => [
              s.cropName,
              s.varietyName,
              s.seasonName,
              s.plotId ? (plotById.get(s.plotId)?.code ?? "") : "",
              s.plantingDate,
              s.expectedHarvestDate,
              s.actualHarvestDate,
              num(s.targetYieldKg),
              num(s.actualYieldKg),
              s.status,
            ]),
          },
          {
            title: "Harvests (latest 200)",
            columns: ["Date", "Crop", "Variety", "Season", "Quantity", "Unit", "Value", "Grade"],
            rows: harvests.map((h) => [
              h.harvest_date as string,
              h.crop_name as string | null,
              h.variety_name as string | null,
              h.season_name as string | null,
              num(h.quantity),
              h.unit as string | null,
              num(h.total_value),
              h.quality_grade as string | null,
            ]),
          },
        ],
      };
    }

    case "livestock": {
      const batches = await listLivestockBatches(userId, organizationId, opts.farmId ?? undefined);
      const perfRows: ReportCell[][] = [];
      for (const farm of scoped) {
        const perf = await getLivestockBatchPerformance(userId, farm.farmId);
        for (const p of perf) {
          perfRows.push([
            p.batchName,
            p.species,
            p.initialCount,
            p.currentCount,
            round(p.mortalityRate),
            round(p.feedConsumedKg),
            round(p.feedCost),
            round(p.totalCost),
            round(p.totalRevenue),
            round(p.grossMargin),
            round(p.marginPct, 1),
            round(p.fcr, 3),
          ]);
        }
      }
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Batches",
            columns: ["Batch", "Start date", "Status", "Unit", "Initial", "Current", "Mortality", "Mortality %"],
            rows: batches.map((b) => [
              b.batchCode,
              b.startDate,
              b.status,
              b.unit,
              b.initialQuantity,
              b.currentQuantity,
              b.mortalityCount,
              b.initialQuantity > 0 ? round((b.mortalityCount / b.initialQuantity) * 100, 1) : null,
            ]),
          },
          {
            title: "Batch economics",
            columns: ["Batch", "Species", "Initial", "Current", "Mortality %", "Feed (kg)", "Feed cost", "Total cost", "Revenue", "Gross margin", "Margin %", "FCR"],
            rows: perfRows,
          },
        ],
      };
    }

    case "finance": {
      const summary = await getFinancialSummary(userId, organizationId);
      const expenses = await listExpenses(userId, organizationId, opts.farmId ?? undefined, undefined, undefined, 100);
      const revenues = await listRevenues(userId, organizationId, opts.farmId ?? undefined, undefined, undefined, 100);
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Summary (all time)",
            columns: ["Total revenue", "Total expenses", "Net profit", "Cash balance"],
            rows: [[summary.totalRevenue, summary.totalExpenses, summary.netProfit, summary.cashBalance]],
          },
          {
            title: "Recent expenses (latest 100)",
            columns: ["Number", "Date", "Vendor", "Category", "Amount", "Currency", "Status", "Description"],
            rows: expenses.map((e) => [
              e.expenseNumber,
              e.expenseDate,
              e.vendorName,
              e.category,
              num(e.amount),
              e.currency,
              e.paymentStatus,
              e.description,
            ]),
          },
          {
            title: "Recent revenues (latest 100)",
            columns: ["Number", "Date", "Customer", "Category", "Amount", "Currency", "Status", "Description"],
            rows: revenues.map((r) => [
              r.revenueNumber,
              r.revenueDate,
              r.customerName,
              r.category,
              num(r.amount),
              r.currency,
              r.paymentStatus,
              r.description,
            ]),
          },
        ],
      };
    }

    case "inventory": {
      const rows = await withUser(userId, (db) => {
        const base = db`
          select i.name as item_name, ic.name as category_name, i.unit, i.reorder_point as reorder_level,
                 coalesce(sum(b.quantity), 0) as quantity,
                 nullif(string_agg(distinct l.name, ', ' order by l.name), '') as location_name
          from public.inventory_items i
          left join public.inventory_categories ic on ic.id = i.category_id
          left join public.inventory_balances b on b.item_id = i.id
          left join public.inventory_locations l on l.id = b.location_id
          where i.organization_id = ${organizationId}
          group by i.id, ic.name
          order by i.name asc
        `;
        return base;
      });
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Stock on hand",
            columns: ["Item", "Category", "Unit", "Location", "Quantity", "Reorder level", "Low stock"],
            rows: rows.map((r) => {
              const quantity = num(r.quantity) ?? 0;
              const reorder = num(r.reorder_level);
              return [
                r.item_name as string,
                r.category_name as string | null,
                r.unit as string | null,
                r.location_name as string | null,
                quantity,
                reorder,
                reorder !== null && quantity <= reorder ? "YES" : "no",
              ];
            }),
          },
        ],
      };
    }

    case "production": {
      const records = await listProductionRecords(userId, organizationId, {
        farmId: opts.farmId ?? undefined,
        limit: 300,
      });
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Production records (latest 300)",
            columns: ["Date", "Type", "Product", "Plot", "Quantity", "Unit", "Unit price", "Total value", "Destination", "Grade"],
            rows: records.map((r) => [
              r.recordDate,
              r.productionType,
              r.productName,
              r.plotCode,
              num(r.quantity),
              r.unit,
              num(r.unitPrice),
              num(r.totalValue),
              r.destination,
              r.qualityGrade,
            ]),
          },
        ],
      };
    }

    case "profitability": {
      const plotRows: ReportCell[][] = [];
      for (const farm of scoped) {
        const perf = await getPlotPerformance(userId, farm.farmId);
        for (const p of perf) {
          plotRows.push([
            farm.name,
            p.plotCode,
            p.plotName,
            round(p.areaHa, 3),
            p.cropSeasons,
            round(p.totalHarvestedKg),
            round(p.yieldKgPerHa),
            round(p.totalRevenue),
            round(p.totalCost),
            round(p.grossMargin),
            round(p.marginPct, 1),
          ]);
        }
      }
      const crops = await getCropPerformance(userId, organizationId);
      const livestockRows: ReportCell[][] = [];
      for (const farm of scoped) {
        const perf = await getLivestockBatchPerformance(userId, farm.farmId);
        for (const p of perf) {
          livestockRows.push([
            farm.name,
            p.batchName,
            p.species,
            round(p.totalCost),
            round(p.totalRevenue),
            round(p.grossMargin),
            round(p.marginPct, 1),
            round(p.fcr, 3),
          ]);
        }
      }
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Plot profitability",
            columns: ["Farm", "Plot code", "Plot", "Area (ha)", "Seasons", "Harvested (kg)", "Yield (kg/ha)", "Revenue", "Cost", "Gross margin", "Margin %"],
            rows: plotRows,
          },
          {
            title: "Crop profitability",
            columns: ["Crop", "Category", "Seasons", "Area (ha)", "Harvested (kg)", "Yield (kg/ha)", "Revenue", "Cost", "Gross margin", "Margin %"],
            rows: crops.map((c) => [
              c.cropName,
              c.cropCategory,
              c.seasons,
              round(c.totalAreaHa, 3),
              round(c.totalHarvestedKg),
              round(c.avgYieldKgPerHa),
              round(c.totalRevenue),
              round(c.totalCost),
              round(c.grossMargin),
              round(c.marginPct, 1),
            ]),
          },
          {
            title: "Livestock batch profitability",
            columns: ["Farm", "Batch", "Species", "Total cost", "Revenue", "Gross margin", "Margin %", "FCR"],
            rows: livestockRows,
          },
        ],
      };
    }

    case "management": {
      const kpiRows: ReportCell[][] = [];
      for (const farm of scoped) {
        const kpis = await getFarmKpis(userId, farm.farmId);
        kpiRows.push([
          farm.name,
          round(kpis.totalHectares, 2),
          kpis.activePlots,
          kpis.activeCropSeasons,
          round(kpis.totalHarvestedKg),
          round(kpis.avgYieldPerHa),
          round(kpis.totalCropRevenue),
          round(kpis.totalCropCost),
          round(kpis.cropGrossMargin),
          kpis.activeBatches,
          round(kpis.totalLivestockRevenue),
        ]);
      }
      const finance = await getFinancialSummary(userId, organizationId);
      return {
        type,
        title,
        generatedAt,
        farmName,
        tables: [
          {
            title: "Farm KPIs (last 12 months)",
            columns: ["Farm", "Hectares", "Active plots", "Active crop seasons", "Harvested (kg)", "Yield (kg/ha)", "Crop revenue", "Crop cost", "Crop gross margin", "Active batches", "Livestock revenue"],
            rows: kpiRows,
          },
          {
            title: "Organization finance (all time)",
            columns: ["Total revenue", "Total expenses", "Net profit", "Cash balance"],
            rows: [[finance.totalRevenue, finance.totalExpenses, finance.netProfit, finance.cashBalance]],
          },
        ],
      };
    }
  }
}

export { reportToCsv };
