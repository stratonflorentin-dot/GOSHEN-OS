import { redirect } from "next/navigation";
import { Beef, ArrowLeft, Plus, MapPin, CalendarDays, Scale } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listLivestockGroups, listLivestockSpecies } from "@/services/livestockService";
import { createLivestockBatchAction } from "./actions";

export default async function NewLivestockBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const { error } = await searchParams;
  const farms = await listFarmGeo(user.id, org.id);
  const groups = await listLivestockGroups(user.id, org.id);
  const species = await listLivestockSpecies(user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <a href="/livestock" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to livestock
      </a>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Beef className="h-5 w-5 text-primary-600" />
          Create livestock batch
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define a new batch of animals. Select species, group, farm, and starting details.
        </p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <span className="h-4 w-4" /> {error}
        </p>
      )}

      <form action={createLivestockBatchAction} className="card space-y-4 p-6">
        <div>
          <label htmlFor="farmId" className="field-label">Farm</label>
          <select id="farmId" name="farmId" required className="field-input">
            <option value="">Select a farm</option>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="speciesId" className="field-label">Species</label>
          <select id="speciesId" name="speciesId" required className="field-input">
            <option value="">Select a species</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="groupId" className="field-label">Group</label>
          <select id="groupId" name="groupId" required className="field-input">
            <option value="">Select a group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="batchCode" className="field-label">Batch code</label>
          <input
            id="batchCode"
            name="batchCode"
            required
            maxLength={60}
            placeholder="e.g. BROILER-001"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="startDate" className="field-label">Start date</label>
          <input id="startDate" name="startDate" type="date" required className="field-input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="initialQuantity" className="field-label">Initial quantity</label>
            <input id="initialQuantity" name="initialQuantity" type="number" min="1" required className="field-input" />
          </div>
          <div>
            <label htmlFor="unit" className="field-label">Unit</label>
            <input id="unit" name="unit" defaultValue="head" className="field-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="avgStartWeightKg" className="field-label">Avg start weight (kg)</label>
            <input id="avgStartWeightKg" name="avgStartWeightKg" type="number" min="0" step="0.01" className="field-input" />
          </div>
          <div>
            <label htmlFor="targetWeightKg" className="field-label">Target weight (kg)</label>
            <input id="targetWeightKg" name="targetWeightKg" type="number" min="0" step="0.01" className="field-input" />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="field-label">Notes (optional)</label>
          <textarea id="notes" name="notes" rows={3} maxLength={2000} className="field-input" />
        </div>

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
          <Plus className="h-4 w-4" /> Create batch
        </button>
      </form>
    </div>
  );
}