import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { getPlot, getPlotRotationHistory, getPlotEconomics } from "@/services/plotService";
import { listCropSeasons } from "@/services/cropService";
import { listHarvestsByPlot } from "@/services/cropService";
import { listLaborRecords } from "@/services/laborService";
import { listEquipmentUsage } from "@/services/equipmentService";
import { listIrrigationRecords } from "@/services/irrigationService";
import { listSoilRecords } from "@/services/soilService";
import { listDocuments } from "@/services/documentService";
import { listTasks } from "@/services/taskService";
import Link from "next/link";
import {
  Grid2x2,
  ArrowLeft,
  MapPin,
  CalendarDays,
  DollarSign,
  Tractor,
  Droplets,
  Layers,
  FileText,
  ListTodo,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { formatAreaTriple, formatCurrency } from "@/lib/format";

export default async function PlotDetailPage({ params }: { params: Promise<{ plotId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { plotId } = await params;
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const orgId = memberships[0].organization.id;

  const [plot, rotation, economics, cropSeasons, harvests, labor, equipment, irrigation, soil, documents, tasks] =
    await Promise.all([
      getPlot(user.id, plotId),
      getPlotRotationHistory(user.id, plotId),
      getPlotEconomics(user.id, plotId),
      listCropSeasons(user.id, orgId, undefined),
      listHarvestsByPlot(user.id, orgId, plotId),
      listLaborRecords(user.id, orgId, { plotId, limit: 10 }),
      listEquipmentUsage(user.id, orgId, undefined, 10),
      listIrrigationRecords(user.id, orgId, { plotId, limit: 10 }),
      listSoilRecords(user.id, orgId, { plotId, limit: 5 }),
      listDocuments(user.id, orgId, { plotId, limit: 10 }),
      listTasks(user.id, orgId, { plotId, openOnly: true, limit: 10 }),
    ]);

  if (!plot) redirect("/plots");

  const currentSeason = cropSeasons.find((cs) => cs.status === "active" || cs.status === "planted");
  const totalHarvested = harvests.reduce((sum, h) => sum + Number(h.quantity), 0);
  const totalRevenue = harvests.reduce((sum, h) => sum + Number(h.totalValue ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href="/plots"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plots
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Grid2x2 className="h-6 w-6 text-primary-600" /> {plot.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Code: {plot.code} · {plot.plotType} · {plot.landUse.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/plots/${plotId}/edit`}
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Header cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Area</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {plot.areaM2 ? formatAreaTriple(Number(plot.areaM2)) : "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Current season</p>
          <p className="mt-1 font-medium">
            {currentSeason
              ? `${currentSeason.cropName} ${currentSeason.varietyName ? `(${currentSeason.varietyName})` : ""}`
              : "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Total harvested</p>
          <p className="mt-1 font-mono text-lg font-semibold">{totalHarvested.toLocaleString()} kg</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="mt-1 font-mono text-lg font-semibold">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-black/5">
          <nav className="flex gap-1 p-1" aria-label="Plot sections">
            {[
              { id: "overview", label: "Overview", icon: Grid2x2 },
              { id: "rotation", label: "Rotation", icon: TrendingUp },
              { id: "crops", label: "Crops", icon: CalendarDays },
              { id: "harvests", label: "Harvests", icon: MapPin },
              { id: "economics", label: "Economics", icon: DollarSign },
              { id: "labor", label: "Labor", icon: ListTodo },
              { id: "equipment", label: "Equipment", icon: Tractor },
              { id: "irrigation", label: "Irrigation", icon: Droplets },
              { id: "soil", label: "Soil", icon: Layers },
              { id: "documents", label: "Documents", icon: FileText },
              { id: "tasks", label: "Tasks", icon: ListTodo },
            ].map((tab) => (
              <button
                key={tab.id}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {/* Overview */}
          <section id="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="font-medium">Boundary</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plot.boundarySource
                    ? `Captured via ${plot.boundarySource.replace("_", " ")}`
                    : "No boundary recorded yet"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Irrigation</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plot.irrigationType ? plot.irrigationType : "Not set"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Soil texture</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plot.soilTexture ? plot.soilTexture.replace("_", " ") : "Not surveyed"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Slope / Elevation</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plot.slopePercent ? `${plot.slopePercent}%` : "—"} /
                  {plot.elevationM ? `${plot.elevationM} m` : "—"}
                </p>
              </div>
            </div>

            {plot.notes && (
              <div className="rounded-xl bg-muted/30 p-3 text-sm">
                <p className="font-medium">Notes</p>
                <p className="mt-1 text-muted-foreground">{plot.notes}</p>
              </div>
            )}
          </section>

          {/* Rotation history */}
          <section id="rotation" className="space-y-4">
            <h3 className="font-medium">Crop rotation history</h3>
            {rotation.length === 0 ? (
              <p className="text-sm text-muted-foreground">No crop seasons recorded for this plot yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Season</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Crop</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Variety</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Area</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Target</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Harvested</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rotation.map((r) => (
                      <tr key={r.seasonId ?? r.cropId} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">{r.seasonName ?? "—"}</td>
                        <td className="p-2">{r.cropName ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{r.varietyName ?? "—"}</td>
                        <td className="p-2 text-right font-mono">
                          {r.areaM2 ? formatAreaTriple(Number(r.areaM2)) : "—"}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {r.targetYieldKg ? Number(r.targetYieldKg).toLocaleString() : "—"}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {Number(r.harvestedKg).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "harvested"
                                ? "bg-success/10 text-success"
                                : r.status === "active"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted/10 text-muted-foreground"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Crops */}
          <section id="crops" className="space-y-4">
            <h3 className="font-medium">Crop seasons on this plot</h3>
            {cropSeasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No crop seasons yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Season</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Crop</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Variety</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Planted</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Expected harvest</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cropSeasons.map((cs) => (
                      <tr key={cs.id} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">{cs.seasonName ?? "—"}</td>
                        <td className="p-2">{cs.cropName}</td>
                        <td className="p-2 text-muted-foreground">{cs.varietyName ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">
                          {cs.plantingDate ? new Date(cs.plantingDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {cs.expectedHarvestDate
                            ? new Date(cs.expectedHarvestDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="p-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              cs.status === "harvested"
                                ? "bg-success/10 text-success"
                                : cs.status === "active"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted/10 text-muted-foreground"
                            }`}
                          >
                            {cs.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Harvests */}
          <section id="harvests" className="space-y-4">
            <h3 className="font-medium">Harvest records</h3>
            {harvests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No harvests recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Crop</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Variety</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Season</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Quantity</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Unit</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Value</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harvests.map((h) => (
                      <tr key={h.id} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">
                          {new Date(h.harvestDate).toLocaleDateString()}
                        </td>
                        <td className="p-2">{h.cropName ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{h.varietyName ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{h.seasonName ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{Number(h.quantity).toLocaleString()}</td>
                        <td className="p-2 text-right text-muted-foreground">{h.unit}</td>
                        <td className="p-2 text-right font-mono">
                          {h.totalValue ? formatCurrency(Number(h.totalValue)) : "—"}
                        </td>
                        <td className="p-2 text-muted-foreground capitalize">{h.qualityGrade ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Economics */}
          <section id="economics" className="space-y-4">
            <h3 className="font-medium">Cost allocation</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="card p-4">
                <p className="text-sm text-muted-foreground">Labor</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatCurrency(economics.laborCost)}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-muted-foreground">Equipment</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatCurrency(economics.equipmentCost)}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-muted-foreground">Irrigation</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatCurrency(economics.irrigationCost)}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-muted-foreground">Total cost</p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {formatCurrency(economics.laborCost + economics.equipmentCost + economics.irrigationCost)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Revenue: {formatCurrency(totalRevenue)} · Harvested: {totalHarvested.toLocaleString()} kg
            </p>
          </section>

          {/* Labor */}
          <section id="labor" className="space-y-4">
            <h3 className="font-medium">Recent labor records</h3>
            {labor.length === 0 ? (
              <p className="text-sm text-muted-foreground">No labor records for this plot.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Worker</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Task</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Hours</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Cost</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labor.map((l) => (
                      <tr key={l.id} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">{new Date(l.workDate).toLocaleDateString()}</td>
                        <td className="p-2">{l.workerName ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{l.taskDescription}</td>
                        <td className="p-2 text-right font-mono">{l.hoursWorked ?? l.daysWorked ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(Number(l.totalCost))}</td>
                        <td className="p-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              l.paymentStatus === "paid"
                                ? "bg-success/10 text-success"
                                : l.paymentStatus === "partial"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {l.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Equipment */}
          <section id="equipment" className="space-y-4">
            <h3 className="font-medium">Recent equipment usage</h3>
            {equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment usage for this plot.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Equipment</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Hours</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Fuel cost</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Total cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((e) => (
                      <tr key={e.id} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">{new Date(e.usageDate).toLocaleDateString()}</td>
                        <td className="p-2">{e.equipmentName ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{e.hoursUsed ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(Number(e.fuelCost))}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(Number(e.totalCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Irrigation */}
          <section id="irrigation" className="space-y-4">
            <h3 className="font-medium">Recent irrigation events</h3>
            {irrigation.length === 0 ? (
              <p className="text-sm text-muted-foreground">No irrigation records for this plot.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Method</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Volume (m³)</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Duration (min)</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {irrigation.map((i) => (
                      <tr key={i.id} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">{new Date(i.irrigationDate).toLocaleDateString()}</td>
                        <td className="p-2 capitalize">{i.method}</td>
                        <td className="p-2 text-right font-mono">{i.waterVolumeM3 ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{i.durationMinutes ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(Number(i.totalCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Soil */}
          <section id="soil" className="space-y-4">
            <h3 className="font-medium">Soil records</h3>
            {soil.length === 0 ? (
              <p className="text-sm text-muted-foreground">No soil samples for this plot.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left p-2 font-medium text-muted-foreground">Sample date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">pH</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">OM %</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">P (ppm)</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">K (ppm)</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Texture</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Lab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soil.map((s) => (
                      <tr key={s.id} className="border-b border-black/5">
                        <td className="p-2 text-muted-foreground">{new Date(s.sampleDate).toLocaleDateString()}</td>
                        <td className="p-2 font-mono">{s.ph ?? "—"}</td>
                        <td className="p-2 font-mono">{s.organicMatterPct ?? "—"}</td>
                        <td className="p-2 font-mono">{s.availablePhosphorusPpm ?? "—"}</td>
                        <td className="p-2 font-mono">{s.exchangeablePotassiumPpm ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{s.texture?.replace("_", " ") ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{s.labName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Documents */}
          <section id="documents" className="space-y-4">
            <h3 className="font-medium">Documents</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents attached to this plot.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-xl border border-black/5 p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.documentType} · {d.fileSizeBytes ? `${Number(d.fileSizeBytes) / 1024} KB` : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {d.documentDate ? new Date(d.documentDate).toLocaleDateString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Tasks */}
          <section id="tasks" className="space-y-4">
            <h3 className="font-medium">Open tasks</h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks for this plot.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-xl border border-black/5 p-3">
                    <div className="flex items-center gap-3">
                      <ListTodo className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.taskType.replace("_", " ")} · {t.priority}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {t.dueDate && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            new Date(t.dueDate) < new Date()
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <Link
                        href={`/tasks/${t.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}