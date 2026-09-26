import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { getFarmKpis, getPlotPerformance, getCropPerformance, getLivestockBatchPerformance, getSeasonComparison, getMonthlyCashFlow } from "@/services/analyticsService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const orgId = memberships[0].organization.id;
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId");
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });

  const kpis = await getFarmKpis(user.id, farmId, from, to);
  return NextResponse.json(kpis);
}