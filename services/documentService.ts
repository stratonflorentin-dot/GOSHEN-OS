import { withUser } from "@/lib/db";
import type { CreateDocumentInput } from "@/lib/validation/operations";

export type FarmDocument = {
  id: string;
  organizationId: string;
  farmId: string | null;
  plotId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  title: string;
  documentType: string;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  documentDate: string | null;
  expiryDate: string | null;
  issuingAuthority: string | null;
  referenceNumber: string | null;
  visibility: string;
  tags: string[] | null;
  description: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

function toDocument(row: Record<string, unknown>): FarmDocument {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: (row.farm_id as string | null) ?? null,
    plotId: (row.plot_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    title: row.title as string,
    documentType: row.document_type as string,
    storageBucket: row.storage_bucket as string,
    storagePath: row.storage_path as string,
    fileName: row.file_name as string,
    mimeType: (row.mime_type as string | null) ?? null,
    fileSizeBytes: row.file_size_bytes == null ? null : String(row.file_size_bytes),
    documentDate: (row.document_date as string | null) ?? null,
    expiryDate: (row.expiry_date as string | null) ?? null,
    issuingAuthority: (row.issuing_authority as string | null) ?? null,
    referenceNumber: (row.reference_number as string | null) ?? null,
    visibility: row.visibility as string,
    tags: (row.tags as string[] | null) ?? null,
    description: (row.description as string | null) ?? null,
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function createDocument(
  userId: string,
  input: CreateDocumentInput,
): Promise<FarmDocument> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.documents
        (organization_id, farm_id, plot_id, crop_season_id, livestock_batch_id,
         title, document_type, storage_bucket, storage_path, file_name, mime_type,
         file_size_bytes, document_date, expiry_date, issuing_authority,
         reference_number, visibility, tags, description, uploaded_by)
      values
        (${input.organizationId}, ${input.farmId || null}, ${input.plotId || null},
         ${input.cropSeasonId || null}, ${input.livestockBatchId || null},
         ${input.title}, ${input.documentType}, ${input.storageBucket},
         ${input.storagePath}, ${input.fileName}, ${input.mimeType || null},
         ${input.fileSizeBytes ?? null}, ${input.documentDate || null},
         ${input.expiryDate || null}, ${input.issuingAuthority || null},
         ${input.referenceNumber || null}, ${input.visibility},
         ${input.tags ?? null}, ${input.description || null}, ${userId})
      returning *
    `;
    return toDocument(rows[0]);
  });
}

export async function listDocuments(
  userId: string,
  organizationId: string,
  opts: { farmId?: string; plotId?: string; documentType?: string; search?: string; limit?: number } = {},
): Promise<FarmDocument[]> {
  return withUser(userId, async (db) => {
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
    const rows = await db`
      select * from public.documents
      where organization_id = ${organizationId}
        and deleted_at is null
        and (${opts.farmId ?? null}::uuid is null or farm_id = ${opts.farmId ?? null}::uuid)
        and (${opts.plotId ?? null}::uuid is null or plot_id = ${opts.plotId ?? null}::uuid)
        and (${opts.documentType ?? null}::text is null or document_type = ${opts.documentType ?? null}::text)
        and (${opts.search ?? null}::text is null
             or title ilike '%' || ${opts.search ?? null}::text || '%'
             or coalesce(reference_number, '') ilike '%' || ${opts.search ?? null}::text || '%')
      order by coalesce(document_date, created_at::date) desc, created_at desc
      limit ${limit}
    `;
    return rows.map(toDocument);
  });
}

export async function getDocument(userId: string, documentId: string): Promise<FarmDocument | null> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.documents where id = ${documentId} and deleted_at is null
    `;
    return rows[0] ? toDocument(rows[0]) : null;
  });
}

/** Soft delete — documents are never hard-deleted so audit trails stay intact. */
export async function softDeleteDocument(userId: string, documentId: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      update public.documents set deleted_at = now()
      where id = ${documentId} and deleted_at is null
    `;
  });
}

export async function listExpiringDocuments(
  userId: string,
  organizationId: string,
  withinDays = 90,
): Promise<FarmDocument[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.documents
      where organization_id = ${organizationId}
        and deleted_at is null
        and expiry_date is not null
        and expiry_date <= current_date + (${withinDays}::int || ' days')::interval
      order by expiry_date asc
    `;
    return rows.map(toDocument);
  });
}

export async function getDocumentSummary(
  userId: string,
  organizationId: string,
): Promise<{ total: number; expiringSoon: number; expired: number; storageBytes: number }> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        count(*)::int as total,
        count(*) filter (where expiry_date is not null
                           and expiry_date between current_date and current_date + 90)::int as expiring_soon,
        count(*) filter (where expiry_date is not null and expiry_date < current_date)::int as expired,
        coalesce(sum(file_size_bytes), 0)::bigint as storage_bytes
      from public.documents
      where organization_id = ${organizationId} and deleted_at is null
    `;
    const r = rows[0] ?? {};
    return {
      total: Number(r.total ?? 0),
      expiringSoon: Number(r.expiring_soon ?? 0),
      expired: Number(r.expired ?? 0),
      storageBytes: Number(r.storage_bytes ?? 0),
    };
  });
}
