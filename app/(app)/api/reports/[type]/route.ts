import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { generateReport, reportToCsv, REPORT_TYPES, type ReportType } from "@/services/reportService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) return new NextResponse("No organization", { status: 403 });

  const { type } = await params;
  if (!REPORT_TYPES.some((r) => r.type === type)) {
    return new NextResponse(`Unknown report type: ${type}`, { status: 400 });
  }

  const farmId = new URL(request.url).searchParams.get("farmId") || null;

  const report = await generateReport(user.id, memberships[0].organization.id, type as ReportType, {
    farmId,
  });
  const csv = reportToCsv(report);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="goshen-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
