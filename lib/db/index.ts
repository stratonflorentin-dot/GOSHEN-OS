import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __goshenSql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __goshenAppSql: postgres.Sql | undefined;
}

/**
 * Owner-role client. Bypasses RLS (table owner). Reserved for migrations,
 * seed data and trusted platform jobs. Never use for tenant data.
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

/**
 * Least-privilege application role (`goshen_app`, provisioned by
 * scripts/migrate.ts). Non-owner, so Row Level Security is fully enforced.
 * Falls back to the owner URL only when DATABASE_URL_APP is not configured,
 * which logs a loud warning because it silently disables tenant isolation.
 */
function createAppSql(): postgres.Sql {
  const appUrl = process.env.DATABASE_URL_APP;
  if (!appUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATABASE_URL_APP is not set. Refusing to serve tenant data over the " +
          "owner connection — Row Level Security would be bypassed.",
      );
    }
    console.warn(
      "[goshen] DATABASE_URL_APP is not set — falling back to DATABASE_URL. " +
        "Row Level Security will NOT be enforced. Run `npm run db:migrate` to provision the app role.",
    );
  }
  return postgres(appUrl ?? process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export const appSql: postgres.Sql = globalThis.__goshenAppSql ?? createAppSql();

if (process.env.NODE_ENV !== "production") globalThis.__goshenAppSql = appSql;

/** Transaction-scoped executor passed to service functions (RLS applies). */
export type SqlExecutor = postgres.TransactionSql<Record<string, unknown>>;

/**
 * Runs `fn` inside a transaction as the least-privilege app role with
 * `app.user_id` set (transaction-local), so RLS policies keyed on app_uid()
 * decide what this tenant may read and write.
 */
export async function withUser<T>(userId: string, fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
  const result = await appSql.begin(async (tx) => {
    await tx.unsafe(`select set_config('app.user_id', $1, true)`, [userId]);
    return fn(tx as SqlExecutor);
  });
  return result as T;
}
