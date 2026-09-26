import { withUser } from "@/lib/db";
import type { CreateProductionRecordInput } from "@/lib/validation/operations";

export type ProductionRecord = {
  id: string;
  organizationId: string;
  farmId: string;
  plotId: string | null;
  plotCode: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  harvestId: string | null;
  productionType: string;
  recordDate: string;
  productName: string;
  quantity: string;
  unit: string;
  qualityGrade: string | null;
  unitPrice: string | null;
  currency: string;
  totalValue: string | null;
  destination: string;
  storageLocationId: string | null;
  inventoryItemId: string | null;
  notes: string | null;
  createdAt: string;
};

function toProductionRecord(row: Record<string, unknown>): ProductionRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    plotId: (row.plot_id as string | null) ?? null,
    plotCode: (row.plot_code as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    harvestId: (row.harvest_id as string | null) ?? null,
    productionType: row.production_type as string,
    recordDate: String(row.record_date),
    productName: row.product_name as string,
    quantity: String(row.quantity),
    unit: row.unit as string,
    qualityGrade: (row.quality_grade as string | null) ?? null,
    unitPrice: (row.unit_price as string | null) ?? null,
    currency: row.currency as string,
    totalValue: (row.total_value as string | null) ?? null,
    destination: row.destination as string,
    storageLocationId: (row.storage_location_id as string | null) ?? null,
    inventoryItemId: (row.inventory_item_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function createProductionRecord(
  userId: string,
  input: CreateProductionRecordInput,
): Promise<ProductionRecord> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.production_records
        (organization_id, farm_id, plot_id, crop_season_id, livestock_batch_id,
         production_type, record_date, product_name, quantity, unit, quality_grade,
         unit_price, destination, storage_location_id, inventory_item_id, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.plotId || null},
         ${input.cropSeasonId || null}, ${input.livestockBatchId || null},
         ${input.productionType}, ${input.recordDate}, ${input.productName},
         ${input.quantity}, ${input.unit}, ${input.qualityGrade || null},
         ${input.unitPrice ?? null}, ${input.destination},
         ${input.storageLocationId || null}, ${input.inventoryItemId || null},
         ${input.notes || null})
      returning *
    `;
    return toProductionRecord(rows[0]);
  });
}

export async function listProductionRecords(
  userId: string,
  organizationId: string,
  opts: { farmId?: string; plotId?: string; productionType?: string; from?: string; to?: string; limit?: number } = {},
): Promise<ProductionRecord[]> {
  return withUser(userId, async (db) => {
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
    const rows = await db`
      select pr.*, p.code as plot_code
      from public.production_records pr
      left join public.plots p on p.id = pr.plot_id
      where pr.organization_id = ${organizationId}
        and (${opts.farmId ?? null}::uuid is null or pr.farm_id = ${opts.farmId ?? null}::uuid)
        and (${opts.plotId ?? null}::uuid is null or pr.plot_id = ${opts.plotId ?? null}::uuid)
        and (${opts.productionType ?? null}::text is null or pr.production_type = ${opts.productionType ?? null}::text)
        and (${opts.from ?? null}::date is null or pr.record_date >= ${opts.from ?? null}::date)
        and (${opts.to ?? null}::date is null or pr.record_date <= ${opts.to ?? null}::date)
      order by pr.record_date desc, pr.created_at desc
      limit ${limit}
    `;
    return rows.map(toProductionRecord);
  });
}

/**
 * §19/§20 production totals by product. `valued` counts only records that carry
 * a price, so the UI can show how much of the tonnage is still unvalued.
 */
export async function getProductionSummary(
  userId: string,
  organizationId: string,
  from?: string,
  to?: string,
): Promise<Array<{ productionType: string; productName: string; unit: string; quantity: number; valued: number; value: number; recordCount: number }>> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        production_type, product_name, unit,
        coalesce(sum(quantity), 0)::numeric                                        as quantity,
        coalesce(sum(quantity) filter (where unit_price is not null), 0)::numeric  as valued,
        coalesce(sum(total_value), 0)::numeric                                     as value,
        count(*)::int                                                              as record_count
      from public.production_records
      where organization_id = ${organizationId}
        and (${from ?? null}::date is null or record_date >= ${from ?? null}::date)
        and (${to ?? null}::date is null or record_date <= ${to ?? null}::date)
      group by production_type, product_name, unit
      order by value desc, quantity desc
    `;
    return rows.map((r) => ({
      productionType: r.production_type as string,
      productName: r.product_name as string,
      unit: r.unit as string,
      quantity: Number(r.quantity ?? 0),
      valued: Number(r.valued ?? 0),
      value: Number(r.value ?? 0),
      recordCount: Number(r.record_count ?? 0),
    }));
  });
}
