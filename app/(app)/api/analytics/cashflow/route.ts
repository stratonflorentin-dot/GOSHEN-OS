import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { getMonthlyCashFlow } from "@/services/analyticsService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get("farmId");
  const requestedMonths = searchParams.get("months");
  const months = requestedMonths ? Number.parseInt(requestedMonths, 10) : 12;

  if (!farmId) return NextResponse.json({ error: "farmId required" }, { status: 400 });
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    return NextResponse.json({ error: "months must be an integer between 1 and 120" }, { status: 400 });
  }

  const data = await getMonthlyCashFlow(user.id, farmId, months);
  return NextResponse.json(data);
}
