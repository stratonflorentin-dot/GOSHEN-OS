/**
 * RLS tenant-isolation verification (§52 security tests, §68 data privacy).
 *
 * Creates two throwaway organizations owned by two throwaway users, then
 * proves through the least-privilege application role (`goshen_app`) that:
 *   - an unauthenticated connection sees nothing;
 *   - a member sees only their own organization's rows;
 *   - a cross-tenant write is rejected by the WITH CHECK clause;
 *   - a member can still write inside their own organization;
 *   - append-only ledgers expose no update/delete policy.
 * All fixtures are removed at the end (also on failure).
 *
 * Usage: node --experimental-strip-types scripts/verify-rls.ts
 * Exits non-zero on the first failed assertion.
 */
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

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
const ownerUrl: string | undefined = env.DATABASE_URL;
if (!ownerUrl) {
  console.error("DATABASE_URL missing.");
  process.exit(1);
}
const appUrl: string = env.DATABASE_URL_APP ?? ownerUrl;

const owner = postgres(ownerUrl, { max: 1, prepare: false });
const app = postgres(appUrl, { max: 1, prepare: false });

type Tx = postgres.TransactionSql<Record<string, unknown>>;

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const out = await app.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${userId}, true)`;
    return fn(tx as Tx);
  });
  return out as T;
}

const stamp = Date.now();
const u1 = randomUUID();
const u2 = randomUUID();
const o1 = randomUUID();
const o2 = randomUUID();
const f1 = randomUUID();
const f2 = randomUUID();

async function cleanup() {
  await owner`delete from public.farms where organization_id in (${o1}, ${o2})`;
  await owner`delete from public.organization_members where organization_id in (${o1}, ${o2})`;
  await owner`delete from public.organizations where id in (${o1}, ${o2})`;
  await owner`delete from public.profiles where id in (${u1}, ${u2})`;
  await owner`delete from neon_auth."user" where id in (${u1}, ${u2})`;
}

try {
  console.log(`owner role : ${new URL(ownerUrl).username}`);
  console.log(`app   role : ${new URL(appUrl).username}`);
  console.log("");

  check(
    "app role is not the table owner",
    new URL(appUrl).username !== new URL(ownerUrl).username,
    new URL(appUrl).username === new URL(ownerUrl).username
      ? "RLS is bypassed — DATABASE_URL_APP is unset or points at the owner"
      : "",
  );

  // ---------------------------------------------------------------- fixtures
  await owner`
    insert into neon_auth."user" (id, name, email, "emailVerified")
    values
      (${u1}, 'RLS Probe One', ${`rls-probe-1-${stamp}@example.invalid`}, true),
      (${u2}, 'RLS Probe Two', ${`rls-probe-2-${stamp}@example.invalid`}, true)
  `;
  await owner`
    insert into public.profiles (id, full_name)
    values (${u1}, 'RLS Probe One'), (${u2}, 'RLS Probe Two')
  `;
  await owner`
    insert into public.organizations (id, name, slug, country, created_by)
    values
      (${o1}, ${`RLS Probe Org One ${stamp}`}, ${`rls-probe-1-${stamp}`}, 'TZ', ${u1}),
      (${o2}, ${`RLS Probe Org Two ${stamp}`}, ${`rls-probe-2-${stamp}`}, 'TZ', ${u2})
  `;
  await owner`
    insert into public.organization_members (organization_id, user_id, role, status)
    values (${o1}, ${u1}, 'owner', 'active'), (${o2}, ${u2}, 'owner', 'active')
  `;
  await owner`
    insert into public.farms (id, organization_id, name, country, created_by)
    values
      (${f1}, ${o1}, ${`Probe Farm One ${stamp}`}, 'TZ', ${u1}),
      (${f2}, ${o2}, ${`Probe Farm Two ${stamp}`}, 'TZ', ${u2})
  `;

  // ------------------------------------------------- 1. anonymous sees none
  const anonOrgs = await app<{ count: string }[]>`select count(*)::text as count from public.organizations`;
  check("anonymous sees 0 organizations", Number(anonOrgs[0].count) === 0, `saw ${anonOrgs[0].count}`);

  const anonFarms = await app<{ count: string }[]>`select count(*)::text as count from public.farms`;
  check("anonymous sees 0 farms", Number(anonFarms[0].count) === 0, `saw ${anonFarms[0].count}`);

  const anonPlots = await app<{ count: string }[]>`select count(*)::text as count from public.plots`;
  check("anonymous sees 0 plots", Number(anonPlots[0].count) === 0, `saw ${anonPlots[0].count}`);

  // ------------------------------------------------ 2. member sees own only
  const ownOrg = await asUser(u1, (tx) =>
    tx<{ count: string }[]>`select count(*)::text as count from public.organizations where id = ${o1}`,
  );
  check("member sees own organization", Number(ownOrg[0].count) === 1);

  const ownFarm = await asUser(u1, (tx) =>
    tx<{ count: string }[]>`select count(*)::text as count from public.farms where id = ${f1}`,
  );
  check("member sees own farm", Number(ownFarm[0].count) === 1);

  const foreignOrg = await asUser(u1, (tx) =>
    tx<{ count: string }[]>`select count(*)::text as count from public.organizations where id = ${o2}`,
  );
  check("member cannot see the other organization", Number(foreignOrg[0].count) === 0, `saw ${foreignOrg[0].count}`);

  const foreignFarm = await asUser(u1, (tx) =>
    tx<{ count: string }[]>`select count(*)::text as count from public.farms where id = ${f2}`,
  );
  check("member cannot see the other farm", Number(foreignFarm[0].count) === 0, `saw ${foreignFarm[0].count}`);

  const foreignById = await asUser(u1, (tx) =>
    tx<{ name: string }[]>`select name from public.farms where id = ${f2}`,
  );
  check("direct-id lookup of another tenant returns no row", foreignById.length === 0, `got ${foreignById.length}`);

  // ------------------------------------- 3. cross-tenant write is rejected
  let blocked = false;
  let blockError = "";
  try {
    await asUser(u1, (tx) =>
      tx`insert into public.farms (organization_id, name, country)
         values (${o2}, ${`rls-probe-foreign-${stamp}`}, 'TZ')`,
    );
  } catch (err) {
    blocked = true;
    blockError = (err as Error).message.split("\n")[0];
  }
  check("cross-tenant farm insert is rejected", blocked, blockError);

  // ------------------------------------------ 4. own-tenant write succeeds
  let ownWriteOk = false;
  let ownWriteError = "";
  try {
    await asUser(u1, (tx) =>
      tx`insert into public.farms (organization_id, name, country)
         values (${o1}, ${`rls-probe-own-${stamp}`}, 'TZ')`,
    );
    ownWriteOk = true;
  } catch (err) {
    ownWriteError = (err as Error).message.split("\n")[0];
  }
  check("member can write inside own organization", ownWriteOk, ownWriteError);

  // ------------------------------ 5. escalation: promote self to platform admin
  let escalated = false;
  let escalateError = "";
  try {
    await asUser(u1, (tx) =>
      tx`insert into public.platform_admins (user_id) values (${u1})`,
    );
    escalated = true;
  } catch (err) {
    escalateError = (err as Error).message.split("\n")[0];
  }
  check("member cannot self-promote to platform admin", !escalated, escalated ? "ESCALATION SUCCEEDED" : escalateError);

  // --------------------------- 6. append-only ledger has no mutating policy
  const movPolicy = await owner<{ cmd: string }[]>`
    select cmd from pg_policies
    where schemaname = 'public' and tablename = 'inventory_movements'
  `;
  const cmds = movPolicy.map((p) => p.cmd).sort();
  check(
    "inventory_movements exposes only INSERT + SELECT policies",
    cmds.length === 2 && cmds.includes("INSERT") && cmds.includes("SELECT"),
    cmds.join(",") || "none",
  );

  const auditPolicy = await owner<{ cmd: string }[]>`
    select cmd from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs'
  `;
  const auditCmds = auditPolicy.map((p) => p.cmd).sort();
  check(
    "audit_logs exposes no UPDATE or DELETE policy",
    !auditCmds.includes("UPDATE") && !auditCmds.includes("DELETE"),
    auditCmds.join(",") || "none",
  );
} finally {
  await cleanup();
  await owner.end();
  await app.end();
}

console.log("");
if (failures > 0) {
  console.error(`${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("All RLS assertions passed.");
