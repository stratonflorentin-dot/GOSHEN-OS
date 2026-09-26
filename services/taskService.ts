import { withUser } from "@/lib/db";
import type { CreateTaskInput, UpdateTaskStatusInput } from "@/lib/validation/operations";

export type Task = {
  id: string;
  organizationId: string;
  farmId: string;
  plotId: string | null;
  plotCode: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  equipmentId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  assignedWorkerId: string | null;
  assignedWorkerName: string | null;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  startedAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  currency: string;
  materialsUsed: unknown;
  completionNotes: string | null;
  photos: unknown;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  organizationId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  attachmentDocumentId: string | null;
  createdAt: string;
};

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: row.farm_id as string,
    plotId: (row.plot_id as string | null) ?? null,
    plotCode: (row.plot_code as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    equipmentId: (row.equipment_id as string | null) ?? null,
    parentTaskId: (row.parent_task_id as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    taskType: row.task_type as string,
    priority: row.priority as string,
    status: row.status as string,
    assignedTo: (row.assigned_to as string | null) ?? null,
    assignedWorkerId: (row.assigned_worker_id as string | null) ?? null,
    assignedWorkerName: (row.assigned_worker_name as string | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    scheduledStart: (row.scheduled_start as string | null) ?? null,
    scheduledEnd: (row.scheduled_end as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    completedBy: (row.completed_by as string | null) ?? null,
    estimatedHours: (row.estimated_hours as string | null) ?? null,
    actualHours: (row.actual_hours as string | null) ?? null,
    estimatedCost: (row.estimated_cost as string | null) ?? null,
    actualCost: (row.actual_cost as string | null) ?? null,
    currency: row.currency as string,
    materialsUsed: row.materials_used ?? null,
    completionNotes: (row.completion_notes as string | null) ?? null,
    photos: row.photos ?? null,
    gpsLat: row.gps_lat == null ? null : Number(row.gps_lat),
    gpsLng: row.gps_lng == null ? null : Number(row.gps_lng),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const TASK_SELECT = `
  select t.*, p.code as plot_code, w.full_name as assigned_worker_name
  from public.tasks t
  left join public.plots p on p.id = t.plot_id
  left join public.workers w on w.id = t.assigned_worker_id
`;

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.tasks
        (organization_id, farm_id, plot_id, crop_season_id, livestock_batch_id,
         equipment_id, parent_task_id, title, description, task_type, priority,
         assigned_worker_id, due_date, scheduled_start, estimated_hours,
         estimated_cost, recurrence_rule, status)
      values
        (${input.organizationId}, ${input.farmId}, ${input.plotId || null},
         ${input.cropSeasonId || null}, ${input.livestockBatchId || null},
         ${input.equipmentId || null}, ${input.parentTaskId || null},
         ${input.title}, ${input.description || null}, ${input.taskType},
         ${input.priority}, ${input.assignedWorkerId || null},
         ${input.dueDate || null}, ${input.scheduledStart || null},
         ${input.estimatedHours ?? null}, ${input.estimatedCost ?? null},
         ${input.recurrenceRule || null},
         ${input.assignedWorkerId ? "assigned" : "pending"})
      returning *
    `;
    return toTask(rows[0]);
  });
}

export async function listTasks(
  userId: string,
  organizationId: string,
  opts: {
    farmId?: string;
    plotId?: string;
    assignedWorkerId?: string;
    status?: string;
    openOnly?: boolean;
    limit?: number;
  } = {},
): Promise<Task[]> {
  return withUser(userId, async (db) => {
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
    const rows = await db.unsafe(
      `${TASK_SELECT}
       where t.organization_id = $1
         and ($2::uuid is null or t.farm_id = $2::uuid)
         and ($3::uuid is null or t.plot_id = $3::uuid)
         and ($4::uuid is null or t.assigned_worker_id = $4::uuid)
         and ($5::text is null or t.status = $5::text)
         and ($6::boolean is not true or t.status in ('pending','assigned','in_progress','blocked'))
       order by
         case t.priority when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
         t.due_date asc nulls last,
         t.created_at desc
       limit $7`,
      [
        organizationId,
        opts.farmId ?? null,
        opts.plotId ?? null,
        opts.assignedWorkerId ?? null,
        opts.status ?? null,
        opts.openOnly ?? false,
        limit,
      ],
    );
    return rows.map(toTask);
  });
}

export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  return withUser(userId, async (db) => {
    const rows = await db.unsafe(`${TASK_SELECT} where t.id = $1`, [taskId]);
    return rows[0] ? toTask(rows[0]) : null;
  });
}

export async function updateTaskStatus(
  userId: string,
  input: UpdateTaskStatusInput,
): Promise<Task> {
  return withUser(userId, async (db) => {
    const rows = await db`
      update public.tasks
      set status = ${input.status},
          completion_notes = coalesce(${input.completionNotes || null}, completion_notes),
          actual_hours = coalesce(${input.actualHours ?? null}, actual_hours),
          actual_cost = coalesce(${input.actualCost ?? null}, actual_cost),
          started_at = case
            when ${input.status} = 'in_progress' and started_at is null then now()
            else started_at end,
          completed_at = case
            when ${input.status} = 'completed' then now()
            when ${input.status} <> 'completed' then null
            else completed_at end,
          completed_by = case
            when ${input.status} = 'completed' then ${userId}::uuid
            else null end
      where id = ${input.taskId}
      returning *
    `;
    if (!rows[0]) throw new Error("Task not found or not permitted");
    return toTask(rows[0]);
  });
}

export async function addTaskComment(
  userId: string,
  taskId: string,
  body: string,
): Promise<TaskComment> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.task_comments (organization_id, task_id, author_id, body)
      select t.organization_id, t.id, ${userId}::uuid, ${body}
      from public.tasks t where t.id = ${taskId}
      returning *
    `;
    if (!rows[0]) throw new Error("Task not found or not permitted");
    const r = rows[0];
    return {
      id: r.id as string,
      taskId: r.task_id as string,
      organizationId: r.organization_id as string,
      authorId: (r.author_id as string | null) ?? null,
      authorName: null,
      body: r.body as string,
      attachmentDocumentId: (r.attachment_document_id as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });
}

export async function listTaskComments(userId: string, taskId: string): Promise<TaskComment[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select tc.*, pr.full_name as author_name
      from public.task_comments tc
      left join public.profiles pr on pr.id = tc.author_id
      where tc.task_id = ${taskId}
      order by tc.created_at asc
    `;
    return rows.map((r) => ({
      id: r.id as string,
      taskId: r.task_id as string,
      organizationId: r.organization_id as string,
      authorId: (r.author_id as string | null) ?? null,
      authorName: (r.author_name as string | null) ?? null,
      body: r.body as string,
      attachmentDocumentId: (r.attachment_document_id as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
  });
}

export async function getTaskSummary(
  userId: string,
  organizationId: string,
): Promise<{ open: number; overdue: number; dueToday: number; completedThisWeek: number; urgent: number }> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select
        count(*) filter (where status in ('pending','assigned','in_progress','blocked'))::int as open,
        count(*) filter (where status in ('pending','assigned','in_progress','blocked')
                          and due_date is not null and due_date < current_date)::int as overdue,
        count(*) filter (where status in ('pending','assigned','in_progress','blocked')
                          and due_date = current_date)::int as due_today,
        count(*) filter (where status = 'completed'
                          and completed_at >= date_trunc('week', now()))::int as completed_this_week,
        count(*) filter (where priority = 'urgent'
                          and status in ('pending','assigned','in_progress','blocked'))::int as urgent
      from public.tasks
      where organization_id = ${organizationId}
    `;
    const r = rows[0] ?? {};
    return {
      open: Number(r.open ?? 0),
      overdue: Number(r.overdue ?? 0),
      dueToday: Number(r.due_today ?? 0),
      completedThisWeek: Number(r.completed_this_week ?? 0),
      urgent: Number(r.urgent ?? 0),
    };
  });
}
