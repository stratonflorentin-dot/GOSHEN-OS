import { redirect } from "next/navigation";
import { Beef, Plus, ArrowLeft, MapPin, TrendingUp, CircleCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listLivestockBatches, listLivestockGroups, listLivestockSpecies } from "@/services/livestockService";

export default async function LivestockPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const batches = await listLivestockBatches(user.id, org.id);
  const groups = await listLivestockGroups(user.id, org.id);
  const species = await listLivestockSpecies(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl flex items-center gap-2">
            <Beef className="h-5 w-5 text-primary-600" /> Livestock
          </h1>
          <p className="text-sm text-muted-foreground">{org.name}</p>
        </div>
        <a
          href="/livestock/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" /> New batch
        </a>
      </div>

      {batches.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center">
          <div>
            <Beef className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="mt-3 text-base font-semibold">No livestock batches yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first batch — select species, group, and starting quantity.
            </p>
            <a
              href="/livestock/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" /> Create batch
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <a
              key={b.id}
              href={`/livestock/${b.id}`}
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center hover:bg-black/[0.02] transition"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700">
                  <Beef className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-semibold">{b.batchCode} — {b.groupId}</h2>
                  <p className="text-sm text-muted-foreground">
                    {b.groupId} · {b.status} · {b.currentQuantity} {b.unit}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm sm:ml-auto">
                <span className={cn(b.mortalityCount > 0 ? "text-destructive" : "text-success", "flex items-center gap-1")}>
                  {b.mortalityCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
                  Mortality: {b.mortalityCount} ({(b.initialQuantity > 0 ? (b.mortalityCount / b.initialQuantity) * 100 : 0).toFixed(1)}%)
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {b.avgCurrentWeightKg ? `${Number(b.avgCurrentWeightKg).toFixed(1)} kg avg` : "No weight data"}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}