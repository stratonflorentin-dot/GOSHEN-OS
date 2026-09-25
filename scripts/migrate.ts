/**
 * Migration runner — applies db/migrations/*.sql in order as the owner role.
 * Usage: npm run db:migrate
 */
import postgres from "postgres";
import { readdirSync, readFileSync, existsSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const url = env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing — run `neon link` / `neon env pull` first.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

await sql`
  create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`;

const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const applied = new Set(
  (await sql`select filename from public.schema_migrations`).map((r) => r.filename),
);

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip  ${file} (already applied)`);
    continue;
  }
  const statements = readFileSync(join(dir, file), "utf8");
  process.stdout.write(`apply ${file} … `);
  await sql.begin(async (tx) => {
    await tx.unsafe(statements);
    await tx`insert into public.schema_migrations (filename) values (${file})`;
  });
  console.log("ok");
  ran++;
}

console.log(ran === 0 ? "No pending migrations." : `Applied ${ran} migration(s).`);

// Provision the least-privilege application role and write its URL to .env.local.
const appRole = "goshen_app";
const appPassword =
  env.GOSHEN_APP_DB_PASSWORD ??
  Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");

await sql`select set_config('app.migrating', 'true', true)`;
await sql.unsafe(
  `do $$ begin
     if not exists (select 1 from pg_roles where rolname = '${appRole}') then
       create role ${appRole} login password '${appPassword}';
     else
       alter role ${appRole} login password '${appPassword}';
     end if;
   end $$;`,
);

await sql.unsafe(`
  grant usage on schema public to ${appRole};
  grant select, insert, update, delete on all tables in schema public to ${appRole};
  alter default privileges in schema public
    grant select, insert, update, delete on tables to ${appRole};
  revoke update, delete on public.audit_logs from ${appRole};
  revoke insert, update, delete on public.schema_migrations from ${appRole};
  grant insert on public.audit_logs to ${appRole};
`);

// Parse the owner URL to build the app-role URL (same host/db, pooled).
const u = new URL(url);
u.username = appRole;
u.password = appPassword;
const appUrl = u.toString();

const envPath = join(process.cwd(), ".env.local");
let envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (!/^DATABASE_URL_APP=/m.test(envText)) {
  envText += `\nDATABASE_URL_APP=${appUrl}\nGOSHEN_APP_DB_PASSWORD=${appPassword}\n`;
  appendFileSync(envPath, `\nDATABASE_URL_APP=${appUrl}\nGOSHEN_APP_DB_PASSWORD=${appPassword}\n`);
} else {
  envText = envText.replace(/^DATABASE_URL_APP=.*$/m, `DATABASE_URL_APP=${appUrl}`);
  writeFileSync(envPath, envText);
}

console.log(`App role ready — DATABASE_URL_APP written to .env.local`);
await sql.end();
