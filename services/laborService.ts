import { withUser } from "@/lib/db";
import type { CreateWorkerInput, CreateLaborRecordInput } from "@/lib/validation/operations";

export type Worker = {
  id: string;
  organizationId: string;
  farmId: string | null;
  userId: string | null;
  fullName: string;
  code: string | null;
  workerType: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  village: string | null;
  roleTitle: string | null;
  skills: string[] | null;
  defaultRateType: string;
  defaultRate: string | null;
  currency: string;
  paymentMethod: string | null;
  mobileMoneyNumber: string | null;
  hireDate: string | null;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
};

export type LaborRecord = {
  id: string;
  organizationId: string;
  farmId: string;
  plotId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  cropActivityId: string | null;
  taskId: string | null;
  workerId: string;
  workerName: string | null;
  workDate: string;
  taskDescription: string;
  rateType: string;
  hoursWorked: string | null;
  daysWorked: string | null;
  quantity: string | null;
  unit: string | null;
  rate: string;
  currency: string;
  totalCost: string;
  paymentStatus: string;
  amountPaid: string;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
};

function toWorker(row: Record<string, unknown>): Worker {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: (row.farm_id as string | null) ?? null,
    userId: (row.user_id as string | null) ?? null,
    fullName: row.full_name as string,
    code: (row.code as string | null) ?? null,
    workerType: row.worker_type as string,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    nationalId: (row.national_id as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    dateOfBirth: (row.date_of_birth as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    village: (row.village as string | null) ?? null,
    roleTitle: (row.role_title as string | null) ?? null,
    skills: (row.skills as string[] | null) ?? null,
    defaultRateType: row.default_rate_type as string,
    defaultRate: (row.default_rate as string | null) ?? null,
    currency: row.currency as string,
    paymentMethod: (row.payment_method as string | null) ?? null,
    mobileMoneyNumber: (row.mobile_money_number as string | null) ?? null,
    hireDate: (row.hire_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    isActive: row.is_active as boolean,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLaborRecord(row: Record<string, unknown>): LaborRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    plotId: (row.plot_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    cropActivityId: (row.crop_activity_id as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    workerId: row.worker_id as string,
    workerName: (row.worker_name as string | null) ?? null,
    workDate: String(row.work_date),
    taskDescription: row.task_description as string,
    rateType: row.rate_type as string,
    hoursWorked: (row.hours_worked as string | null) ?? null,
    daysWorked: (row.days_worked as string | null) ?? null,
    quantity: (row.quantity as string | null) ?? null,
    unit: (row.unit as string | null) ?? null,
    rate: String(row.rate),
    currency: row.currency as string,
    totalCost: String(row.total_cost),
    paymentStatus: row.payment_status as string,
    amountPaid: String(row.amount_paid),
    paidDate: (row.paid_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------
export async function createWorker(userId: string, input: CreateWorkerInput): Promise<Worker> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.workers
        (organization_id, farm_id, full_name, code, worker_type, phone, email,
         national_id, gender, date_of_birth, address, village, role_title, skills,
         default_rate_type, default_rate, payment_method, mobile_money_number,
         hire_date, notes)
      values
        (${input.organizationId}, ${input.farmId || null}, ${input.fullName},
         ${input.code || null}, ${input.workerType}, ${input.phone || null},
         ${input.email || null}, ${input.nationalId || null}, ${input.gender || null},
         ${input.dateOfBirth || null}, ${input.address || null}, ${input.village || null},
         ${input.roleTitle || null}, ${input.skills ?? null},
         ${input.defaultRateType}, ${input.defaultRate ?? null},
         ${input.paymentMethod || null}, ${input.mobileMoneyNumber || null},
         ${input.hireDate || null}, ${input.notes || null})
      returning *
    `;
    return toWorker(rows[0]);
  });
}

export async function listWorkers(
  userId: string,
  organizationId: string,
  activeOnly = true,
): Promise<Worker[]> {
  return withUser(userId, async (db) => {
    const rows = activeOnly
      ? await db`
          select * from public.workers
          where organization_id = ${organizationId} and is_active = true
          order by full_name
        `
      : await db`
          select * from public.workers
          where organization_id = ${organizationId}
          order by is_active desc, full_name
        `;
    return rows.map(toWorker);
  });
}

export async function getWorker(userId: string, workerId: string): Promise<Worker | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.workers where id = ${workerId}`;
    return rows[0] ? toWorker(rows[0]) : null;
  });
}

export async function setWorkerActive(
  userId: string,
  workerId: string,
  isActive: boolean,
): Promise<void> {
  await withUser(userId, async (db) => {
    await db`update public.workers set is_active = ${isActive} where id = ${workerId}`;
  });
}

// ---------------------------------------------------------------------------
// Labor records
// ---------------------------------------------------------------------------
export async function createLaborRecord(
  userId: string,
  input: CreateLaborRecordInput,
): Promise<LaborRecord> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.labor_records
        (organization_id, farm_id, plot_id, crop_season_id, livestock_batch_id,
         crop_activity_id, task_id, worker_id, work_date, task_description,
         rate_type, hours_worked, days_worked, quantity, unit, rate,
         payment_status, amount_paid, gps_lat, gps_lng, notes)
      values
        (${input.organizationId}, ${input.farmId}, ${input.plotId || null},
         ${input.cropSeasonId || null}, ${input.livestockBatchId || null},
         ${input.cropActivityId || null}, ${input.taskId || null},
         ${input.workerId}, ${input.workDate}, ${input.taskDescription},
         ${input.rateType}, ${input.hoursWorked ?? null}, ${input.daysWorked ?? null},
         ${input.quantity ?? null}, ${input.unit || null}, ${input.rate},
         ${input.paymentStatus}, ${input.amountPaid},
         ${input.gpsLat ?? null}, ${input.gpsLng ?? null}, ${input.notes || null})
      returning *
    `;
    const record = toLaborRecord(rows[0]);
    const worker = await db`select full_name from public.workers where id = ${input.workerId}`;
    return { ...record, workerName: (worker[0]?.full_name as string | null) ?? null };
  });
}

export async function listLaborRecords(
  userId: string,
  organizationId: string,
  opts: { farmId?: string; workerId?: string; plotId?: string; from?: string; to?: string; limit?: number } = {},
): Promise<LaborRecord[]> {
  return withUser(userId, async (db) => {
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
    const rows = await db`
      select lr.*, w.full_name as worker_name
      from public.labor_records lr
      join public.workers w on w.id = lr.worker_id
      where lr.organization_id = ${organizationId}
        and (${opts.farmId ?? null}::uuid is null or lr.farm_id = ${opts.farmId ?? null}::uuid)
        and (${opts.workerId ?? null}::uuid is null or lr.worker_id = ${opts.workerId ?? null}::uuid)
        and (${opts.plotId ?? null}::uuid is null or lr.plot_id = ${opts.plotId ?? null}::uuid)
        and (${opts.from ?? null}::date is null or lr.work_date >= ${opts.from ?? null}::date)
        and (${opts.to ?? null}::date is null or lr.work_date <= ${opts.to ?? null}::date)
      order by lr.work_date desc, lr.created_at desc
      limit ${limit}
    `;
    return rows.map(toLaborRecord);
  });
}

export async function markLaborPaid(
  userId: string,
  laborRecordId: string,
  amountPaid: number,
  paidDate: string,
): Promise<void> {
  await withUser(userId, async (db) => {
    await db`
      update public.labor_records
      set amount_paid = ${amountPaid},
          paid_date = ${paidDate},
          payment_status = case
            when ${amountPaid} >= total_cost then 'paid'
            when ${amountPaid} > 0 then 'partial'
            else 'unpaid'
          end
      where id = ${laborRecordId}
    `;
  });
}

export async function getLaborSummary(
  userId: string,
  organizationId: string,
  from?: string,
  to?: string,
): Promise<{ totalCost: number; unpaid: number; totalHours: number; workerCount: number; recordCount: number }> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        coalesce(sum(total_cost), 0)::numeric                                   as total_cost,
        coalesce(sum(case when payment_status <> 'paid' then total_cost - amount_paid else 0 end), 0)::numeric as unpaid,
        coalesce(sum(hours_worked), 0)::numeric                                 as total_hours,
        count(distinct worker_id)::int                                          as worker_count,
        count(*)::int                                                           as record_count
      from public.labor_records
      where organization_id = ${organizationId}
        and (${from ?? null}::date is null or work_date >= ${from ?? null}::date)
        and (${to ?? null}::date is null or work_date <= ${to ?? null}::date)
    `;
    const r = rows[0] ?? {};
    return {
      totalCost: Number(r.total_cost ?? 0),
      unpaid: Number(r.unpaid ?? 0),
      totalHours: Number(r.total_hours ?? 0),
      workerCount: Number(r.worker_count ?? 0),
      recordCount: Number(r.record_count ?? 0),
    };
  });
}
