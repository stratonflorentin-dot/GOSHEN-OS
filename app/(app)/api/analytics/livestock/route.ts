import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { getLivestockBatchPerformance } from "@/services/analyticsService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId");

  if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });

  const data = await getLivestockBatchPerformance(user.id, farmId);
  return NextResponse.json(data);
}