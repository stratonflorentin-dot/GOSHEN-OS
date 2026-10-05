import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { generateReport, REPORT_TYPES, type ReportType } from "@/services/reportService";
import { PrintButton } from "./PrintButton";

export default async function PrintReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ farmId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const { type } = await params;
  if (!REPORT_TYPES.some((r) => r.type === type)) notFound();

  const { farmId } = await searchParams;
  const report = await generateReport(user.id, memberships[0].organization.id, type as ReportType, {
    farmId: farmId || null,
  });

  return (
    <div className="mx-auto max-w-5xl print:max-w-none">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="/reports" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; All reports
        </a>
        <PrintButton />
      </div>

      <header className="border-b-2 border-foreground/20 pb-3">
        <h1 className="text-xl font-bold tracking-tight">{report.title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          GOSHEN OS — generated {new Date(report.generatedAt).toLocaleString()}
          {report.farmName ? ` — ${report.farmName}` : ""}
        </p>
      </header>

      {report.tables.map((table) => (
        <section key={table.title} className="mt-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">{table.title}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {table.columns.map((col) => (
                    <th
                      key={col}
                      className="border-b border-foreground/30 px-2 py-1.5 text-left font-semibold"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.columns.length} className="px-2 py-2 text-muted-foreground">
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, i) => (
                    <tr key={i} className={i % 2 ? "bg-muted/50" : ""}>
                      {row.map((cell, j) => (
                        <td key={j} className="border-b border-border px-2 py-1.5">
                          {cell === null ? "" : typeof cell === "number" ? cell.toLocaleString() : cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
