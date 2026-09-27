"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listLivestockGroups, createLivestockBatch } from "@/services/livestockService";
import { createLivestockBatchSchema } from "@/lib/validation/crops";

export async function createLivestockBatchAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const parsed = createLivestockBatchSchema.safeParse({
    organizationId: memberships[0].organization.id,
    farmId: formData.get("farmId"),
    groupId: formData.get("groupId"),
    seasonId: formData.get("seasonId") || undefined,
    batchCode: formData.get("batchCode"),
    startDate: formData.get("startDate"),
    initialQuantity: Number(formData.get("initialQuantity")),
    unit: formData.get("unit") || "head",
    avgStartWeightKg: formData.get("avgStartWeightKg") ? Number(formData.get("avgStartWeightKg")) : undefined,
    targetWeightKg: formData.get("targetWeightKg") ? Number(formData.get("targetWeightKg")) : undefined,
    sourceType: formData.get("sourceType"),
    sourceId: formData.get("sourceId") || undefined,
    sourceDetails: formData.get("sourceDetails") || undefined,
    sourceCost: formData.get("sourceCost") ? Number(formData.get("sourceCost")) : undefined,
    breed: formData.get("breed") || undefined,
    strain: formData.get("strain") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid batch details";
    redirect(`/livestock/new?error=${encodeURIComponent(msg)}`);
  }

  try {
    await createLivestockBatch(user.id, parsed.data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not create livestock batch";
    redirect(`/livestock/new?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/livestock");
  redirect("/livestock");
}
