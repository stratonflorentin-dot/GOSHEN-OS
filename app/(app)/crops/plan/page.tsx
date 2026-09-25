import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf, Sprout, CalendarDays, MapPin, ArrowLeft, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listCrops, listCropVarieties, listSeasons } from "@/services/cropService";
import { createCropSeasonAction } from "./actions";

export default async function CropPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; farmId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const { error, farmId } = await searchParams;
  const farms = await listFarmGeo(user.id, org.id);
  const crops = await listCrops(user.id);
  const seasons = await listSeasons(user.id, org.id);

  // Preload varieties for first crop
  const firstCropVarieties = crops.length > 0 ? await listCropVarieties(user.id, crops[0].id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/crops" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to crops
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Sprout className="h-5 w-5 text-primary-600" />
          Plan a crop season
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the farm, plot, crop, and season. Varieties load based on crop selection.
        </p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <span className="h-4 w-4" /> {error}
        </p>
      )}

      <form action={createCropSeasonAction} className="card space-y-4 p-6">
        <div>
          <label htmlFor="farmId" className="field-label">Farm</label>
          <select id="farmId" name="farmId" required className="field-input">
            <option value="">Select a farm</option>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId} selected={f.farmId === farmId}>
                {f.name} {f.areaM2 ? `(${Number(f.areaM2) / 10000} ha)` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="seasonId" className="field-label">Season</label>
          <select id="seasonId" name="seasonId" required className="field-input">
            <option value="">Select a season</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startDate} – {s.endDate})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cropId" className="field-label">Crop</label>
          <select id="cropId" name="cropId" required className="field-input">
            <option value="">Select a crop</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="varietyId" className="field-label">Variety (optional)</label>
          <select id="varietyId" name="varietyId" className="field-input">
            <option value="">Select a variety</option>
            {firstCropVarieties.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="plantingDate" className="field-label">Planting date</label>
            <input id="plantingDate" name="plantingDate" type="date" className="field-input" />
          </div>
          <div>
            <label htmlFor="expectedHarvestDate" className="field-label">Expected harvest</label>
            <input id="expectedHarvestDate" name="expectedHarvestDate" type="date" className="field-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="areaM2" className="field-label">Area (m²)</label>
            <input id="areaM2" name="areaM2" type="number" min="1" step="1" className="field-input" />
          </div>
          <div>
            <label htmlFor="targetYieldKg" className="field-label">Target yield (kg)</label>
            <input id="targetYieldKg" name="targetYieldKg" type="number" min="1" step="1" className="field-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="seedQuantity" className="field-label">Seed quantity</label>
            <input id="seedQuantity" name="seedQuantity" type="number" min="0" step="0.001" className="field-input" />
          </div>
          <div>
            <label htmlFor="seedUnit" className="field-label">Seed unit</label>
            <input id="seedUnit" name="seedUnit" value="kg" className="field-input" />
          </div>
        </div>

        <div>
          <label htmlFor="seedCost" className="field-label">Seed cost</label>
          <input id="seedCost" name="seedCost" type="number" min="0" step="0.01" className="field-input" />
        </div>

        <div>
          <label htmlFor="name" className="field-label">Name (optional)</label>
          <input id="name" name="name" maxLength={160} placeholder="e.g. Maize Main Season 2026 - Plot A01" className="field-input" />
        </div>

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
          <Plus className="h-4 w-4" /> Create crop season
        </button>
      </form>
    </div>
  );
}