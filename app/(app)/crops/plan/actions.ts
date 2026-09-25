"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listCrops, listCropVarieties, listSeasons, createCropSeason } from "@/services/cropService";
import { createCropSeasonSchema } from "@/lib/validation/crops";

export async function createCropSeasonAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const parsed = createCropSeasonSchema.safeParse({
    organizationId: memberships[0].organization.id,
    farmId: formData.get("farmId"),
    plotId: formData.get("plotId") || undefined,
    seasonId: formData.get("seasonId"),
    cropId: formData.get("cropId"),
    varietyId: formData.get("varietyId") || undefined,
    name: formData.get("name") || undefined,
    areaM2: formData.get("areaM2") ? Number(formData.get("areaM2")) : undefined,
    plantingDate: formData.get("plantingDate") || undefined,
    expectedHarvestDate: formData.get("expectedHarvestDate") || undefined,
    targetYieldKg: formData.get("targetYieldKg") ? Number(formData.get("targetYieldKg")) : undefined,
    seedQuantity: formData.get("seedQuantity") ? Number(formData.get("seedQuantity")) : undefined,
    seedUnit: formData.get("seedUnit") || undefined,
    seedCost: formData.get("seedCost") ? Number(formData.get("seedCost")) : undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid crop season details";
    redirect(`/crops/plan?error=${encodeURIComponent(msg)}`);
  }

  await createCropSeason(user.id, parsed.data);
  revalidatePath("/crops");
  redirect("/crops");
}