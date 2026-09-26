import { withUser } from "@/lib/db";
import type { CreateSoilRecordInput } from "@/lib/validation/operations";

export type SoilRecord = {
  id: string;
  organizationId: string;
  farmId: string;
  plotId: string | null;
  plotCode: string | null;
  sampleCode: string | null;
  sampleDate: string;
  sampleDepthCm: string | null;
  samplingMethod: string | null;
  labName: string | null;
  labReference: string | null;
  labReportDocumentId: string | null;
  ph: string | null;
  organicMatterPct: string | null;
  organicCarbonPct: string | null;
  totalNitrogenPct: string | null;
  availablePhosphorusPpm: string | null;
  exchangeablePotassiumPpm: string | null;
  calciumPpm: string | null;
  magnesiumPpm: string | null;
  sulfurPpm: string | null;
  cecMeq100g: string | null;
  electricalConductivityDsM: string | null;
  moisturePct: string | null;
  texture: string | null;
  bulkDensityGCm3: string | null;
  waterHoldingCapacityPct: string | null;
  micronutrients: Record<string, unknown> | null;
  interpretation: string | null;
  recommendations: string | null;
  notes: string | null;
  createdAt: string;
};

function num(v: unknown): string | null {
  return v == null ? null : String(v);
}

function toSoilRecord(row: Record<string, unknown>): SoilRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    plotId: (row.plot_id as string | null) ?? null,
    plotCode: (row.plot_code as string | null) ?? null,
    sampleCode: (row.sample_code as string | null) ?? null,
    sampleDate: String(row.sample_date),
    sampleDepthCm: num(row.sample_depth_cm),
    samplingMethod: (row.sampling_method as string | null) ?? null,
    labName: (row.lab_name as string | null) ?? null,
    labReference: (row.lab_reference as string | null) ?? null,
    labReportDocumentId: (row.lab_report_document_id as string | null) ?? null,
    ph: num(row.ph),
    organicMatterPct: num(row.organic_matter_pct),
    organicCarbonPct: num(row.organic_carbon_pct),
    totalNitrogenPct: num(row.total_nitrogen_pct),
    availablePhosphorusPpm: num(row.available_phosphorus_ppm),
    exchangeablePotassiumPpm: num(row.exchangeable_potassium_ppm),
    calciumPpm: num(row.calcium_ppm),
    magnesiumPpm: num(row.magnesium_ppm),
    sulfurPpm: num(row.sulfur_ppm),
    cecMeq100g: num(row.cec_meq_100g),
    electricalConductivityDsM: num(row.electrical_conductivity_ds_m),
    moisturePct: num(row.moisture_pct),
    texture: (row.texture as string | null) ?? null,
    bulkDensityGCm3: num(row.bulk_density_g_cm3),
    waterHoldingCapacityPct: num(row.water_holding_capacity_pct),
    micronutrients: (row.micronutrients as Record<string, unknown> | null) ?? null,
    interpretation: (row.interpretation as string | null) ?? null,
    recommendations: (row.recommendations as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function createSoilRecord(
  userId: string,
  input: CreateSoilRecordInput,
): Promise<SoilRecord> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.soil_records
        (organization_id, farm_id, plot_id, sample_code, sample_date, sample_depth_cm,
         sampling_method, lab_name, lab_reference,
         ph, organic_matter_pct, organic_carbon_pct, total_nitrogen_pct,
         available_phosphorus_ppm, exchangeable_potassium_ppm, calcium_ppm,
         magnesium_ppm, sulfur_ppm, cec_meq_100g, electrical_conductivity_ds_m,
         moisture_pct, texture, bulk_density_g_cm3, water_holding_capacity_pct,
         micronutrients, interpretation, recommendations, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.plotId || null},
         ${input.sampleCode || null}, ${input.sampleDate}, ${input.sampleDepthCm ?? null},
         ${input.samplingMethod || null}, ${input.labName || null},
         ${input.labReference || null},
         ${input.ph ?? null}, ${input.organicMatterPct ?? null},
         ${input.organicCarbonPct ?? null}, ${input.totalNitrogenPct ?? null},
         ${input.availablePhosphorusPpm ?? null},
         ${input.exchangeablePotassiumPpm ?? null}, ${input.calciumPpm ?? null},
         ${input.magnesiumPpm ?? null}, ${input.sulfurPpm ?? null},
         ${input.cecMeq100g ?? null}, ${input.electricalConductivityDsM ?? null},
         ${input.moisturePct ?? null}, ${input.texture || null},
         ${input.bulkDensityGCm3 ?? null}, ${input.waterHoldingCapacityPct ?? null},
         ${input.micronutrientsJson || null}::jsonb,
         ${input.interpretation || null}, ${input.recommendations || null},
         ${input.notes || null})
      returning *
    `;
    return toSoilRecord(rows[0]);
  });
}

export async function listSoilRecords(
  userId: string,
  organizationId: string,
  opts: { farmId?: string; plotId?: string; limit?: number } = {},
): Promise<SoilRecord[]> {
  return withUser(userId, async (db) => {
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
    const rows = await db`
      select sr.*, p.code as plot_code
      from public.soil_records sr
      left join public.plots p on p.id = sr.plot_id
      where sr.organization_id = ${organizationId}
        and (${opts.farmId ?? null}::uuid is null or sr.farm_id = ${opts.farmId ?? null}::uuid)
        and (${opts.plotId ?? null}::uuid is null or sr.plot_id = ${opts.plotId ?? null}::uuid)
      order by sr.sample_date desc, sr.created_at desc
      limit ${limit}
    `;
    return rows.map(toSoilRecord);
  });
}

export async function getSoilRecord(userId: string, soilRecordId: string): Promise<SoilRecord | null> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select sr.*, p.code as plot_code
      from public.soil_records sr
      left join public.plots p on p.id = sr.plot_id
      where sr.id = ${soilRecordId}
    `;
    return rows[0] ? toSoilRecord(rows[0]) : null;
  });
}

/**
 * Latest measured value per plot for a given analyte. Plots with no measured
 * value are reported as `null` — never as zero (§25: do not fabricate soil data).
 */
export async function getPlotSoilSnapshot(
  userId: string,
  organizationId: string,
): Promise<Array<{ plotId: string | null; plotCode: string | null; latestSampleDate: string; ph: string | null; organicMatterPct: string | null; availablePhosphorusPpm: string | null; exchangeablePotassiumPpm: string | null; texture: string | null; sampleCount: number }>> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select distinct on (sr.plot_id)
        sr.plot_id, p.code as plot_code, sr.sample_date as latest_sample_date,
        sr.ph, sr.organic_matter_pct, sr.available_phosphorus_ppm,
        sr.exchangeable_potassium_ppm, sr.texture,
        (select count(*)::int from public.soil_records s2
          where s2.organization_id = sr.organization_id
            and s2.plot_id is not distinct from sr.plot_id) as sample_count
      from public.soil_records sr
      left join public.plots p on p.id = sr.plot_id
      where sr.organization_id = ${organizationId}
      order by sr.plot_id, sr.sample_date desc
    `;
    return rows.map((r) => ({
      plotId: (r.plot_id as string | null) ?? null,
      plotCode: (r.plot_code as string | null) ?? null,
      latestSampleDate: String(r.latest_sample_date),
      ph: num(r.ph),
      organicMatterPct: num(r.organic_matter_pct),
      availablePhosphorusPpm: num(r.available_phosphorus_ppm),
      exchangeablePotassiumPpm: num(r.exchangeable_potassium_ppm),
      texture: (r.texture as string | null) ?? null,
      sampleCount: Number(r.sample_count ?? 0),
    }));
  });
}
