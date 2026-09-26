import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listPlots } from "@/services/plotService";
import { listFarmGeo } from "@/services/farmService";
import Link from "next/link";
import { Plus, Grid2x2, MapPin, ChevronRight, AlertTriangle } from "lucide-react";
import { formatAreaTriple } from "@/lib/format";

export default async function PlotsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const orgId = memberships[0].organization.id;
  const [plots, farms] = await Promise.all([
    listPlots(user.id, orgId),
    listFarmGeo(user.id, orgId),
  ]);

  const farmMap = new Map(farms.map((f) => [f.farmId, f.name]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Grid2x2 className="h-6 w-6 text-primary-600" /> Plots
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plots.length} plot{plots.length !== 1 ? "s" : ""} across {farms.length} farm{farms.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/plots/new"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" /> Add plot
        </Link>
      </div>

      {plots.length === 0 && (
        <div className="card p-12 text-center">
          <Grid2x2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">No plots yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first plot to start tracking crops, inputs, and yields per field.
          </p>
          <Link
            href="/plots/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> Add plot
          </Link>
        </div>
      )}

      {plots.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Plot</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Farm</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Land use</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Area</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {plots.map((p) => (
                <tr key={p.id} className="border-b border-black/5 hover:bg-muted/30">
                  <td className="p-3">
                    <Link
                      href={`/plots/${p.id}`}
                      className="font-medium hover:text-primary transition"
                    >
                      {p.name} <span className="text-muted-foreground">({p.code})</span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {farmMap.get(p.farmId) ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground capitalize">{p.plotType}</td>
                  <td className="p-3 text-muted-foreground capitalize">{p.landUse.replace("_", " ")}</td>
                  <td className="p-3 text-right font-mono">
                    {p.areaM2 ? formatAreaTriple(Number(p.areaM2)) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "active"
                          ? "bg-success/10 text-success"
                          : p.status === "fallow"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted/10 text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/plots/${p.id}`}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      View <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}