import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { getSeasonComparison } from "@/services/analyticsService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const orgId = memberships[0].organization.id;
  const data = await getSeasonComparison(user.id, orgId);
  return NextResponse.json(data);
}