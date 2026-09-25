import { redirect } from "next/navigation";
import { Sprout, CalendarDays, Plus, ArrowLeft, MapPin, TrendingUp, Wheat } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listCropSeasons } from "@/services/cropService";

export default async function CropsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const cropSeasons = await listCropSeasons(user.id, org.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary-600" /> Crops
          </h1>
          <p className="text-sm text-muted-foreground">{org.name}</p>
        </div>
        <a
          href="/crops/plan"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" /> Plan crop
        </a>
      </div>

      {cropSeasons.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center">
          <div>
            <Sprout className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="mt-3 text-base font-semibold">No crop seasons yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan your first crop season — select farm, crop, variety, and planting dates.
            </p>
            <a
              href="/crops/plan"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" /> Plan your first crop
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cropSeasons.map((cs) => (
            <a
              key={cs.id}
              href={`/crops/${cs.id}`}
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center hover:bg-black/[0.02] transition"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700">
                  <Wheat className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-semibold">{cs.name || "Unnamed crop season"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {cs.cropId} · {cs.seasonId} · {cs.status}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground sm:ml-auto">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {cs.plantingDate ? `Planted ${cs.plantingDate}` : "Not planted"}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {cs.targetYieldKg ? `${Number(cs.targetYieldKg).toLocaleString()} kg target` : "No target"}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}