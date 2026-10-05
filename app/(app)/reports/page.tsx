import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { REPORT_TYPES } from "@/services/reportService";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ farmId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const farms = await listFarmGeo(user.id, memberships[0].organization.id);
  const { farmId } = await searchParams;
  const selectedFarm = farmId && farms.some((f) => f.farmId === farmId) ? farmId : null;
  const query = selectedFarm ? `?farmId=${selectedFarm}` : "";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Professional reports from your farm records. Download as CSV (opens in Excel) or open the print
          view to save as PDF.
        </p>
      </header>

      <nav aria-label="Farm filter" className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/reports"
          aria-current={!selectedFarm ? "true" : undefined}
          className={`rounded-full border px-3 py-1.5 text-sm ${!selectedFarm ? "border-primary bg-primary-50 font-semibold text-primary-800 dark:bg-primary/15 dark:text-primary-200" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          All farms
        </Link>
        {farms.map((farm) => (
          <Link
            key={farm.farmId}
            href={`/reports?farmId=${farm.farmId}`}
            aria-current={selectedFarm === farm.farmId ? "true" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${selectedFarm === farm.farmId ? "border-primary bg-primary-50 font-semibold text-primary-800 dark:bg-primary/15 dark:text-primary-200" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {farm.name}
          </Link>
        ))}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2">
        {REPORT_TYPES.map((report) => (
          <section key={report.type} className="card flex flex-col p-4">
            <h2 className="text-sm font-semibold">{report.title}</h2>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{report.description}</p>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/reports/print/${report.type}${query}`}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-white"
              >
                <Printer className="h-3.5 w-3.5" /> View / Print
              </Link>
              <a
                href={`/api/reports/${report.type}${query}`}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </a>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
