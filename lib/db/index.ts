import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __goshenSql: postgres.Sql | undefined;
}

/**
 * Service-role SQL client (bypasses RLS — the connecting role is table owner).
 * For user-scoped queries use withUser(), which sets `app.user_id` per
 * transaction so RLS policies evaluate against the signed-in user.
 */
export const sql: postgres.Sql =
  globalThis.__goshenSql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // pooled (pgbouncer) safe
  });

if (process.env.NODE_ENV !== "production") globalThis.__goshenSql = sql;

/** Transaction-scoped executor passed to service functions (RLS applies). */
export type SqlExecutor = postgres.TransactionSql<Record<string, unknown>>;

/**
 * Runs `fn` inside a transaction with `app.user_id` set (transaction-local),
 * enabling RLS policies keyed on app_uid().
 */
export async function withUser<T>(userId: string, fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
  const result = await sql.begin(async (tx) => {
    await tx.unsafe(`select set_config('app.user_id', $1, true)`, [userId]);
    return fn(tx as SqlExecutor);
  });
  return result as T;
}
