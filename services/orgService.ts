import { withUser, type SqlExecutor } from "@/lib/db";
import type { CreateOrganizationInput } from "@/lib/validation/org";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  country: string;
  defaultCurrency: string;
  timezone: string;
  status: string;
};

export type MembershipRole =
  | "owner"
  | "admin"
  | "manager"
  | "accountant"
  | "agronomist"
  | "veterinarian"
  | "inventory_manager"
  | "worker"
  | "viewer";

export type Membership = { organization: Organization; role: MembershipRole };

function toOrganization(row: Record<string, unknown>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    country: row.country as string,
    defaultCurrency: row.default_currency as string,
    timezone: row.timezone as string,
    status: row.status as string,
  };
}

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput,
): Promise<Organization> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select public.create_organization(${input.name}, ${input.country}::char,
                                        ${input.currency}::char, ${input.timezone}) as id
    `;
    const id = rows[0].id as string;
    const org = await db`select * from public.organizations where id = ${id}`;
    return toOrganization(org[0]);
  });
}

export async function listMemberships(userId: string): Promise<Membership[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select o.*, m.role
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = ${userId} and m.status = 'active'
      order by o.created_at asc
    `;
    return rows.map((r) => ({
      organization: toOrganization(r),
      role: r.role as MembershipRole,
    }));
  });
}

export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<Membership | null> {
  const memberships = await listMemberships(userId);
  return memberships.find((m) => m.organization.id === organizationId) ?? null;
}

/** Asserts the caller belongs to the org and returns their role. Throws 403-ish otherwise. */
export async function requireOrgRole(
  db: SqlExecutor,
  userId: string,
  organizationId: string,
  allowed: MembershipRole[],
): Promise<MembershipRole> {
  const rows = await db`
    select role from public.organization_members
    where organization_id = ${organizationId} and user_id = ${userId} and status = 'active'
  `;
  const role = rows[0]?.role as MembershipRole | undefined;
  if (!role || !allowed.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return role;
}
