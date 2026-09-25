"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listInventoryCategories, createInventoryItem } from "@/services/inventoryService";
import { createInventoryItemSchema } from "@/lib/validation/inventory";

export async function createInventoryItemAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const parsed = createInventoryItemSchema.safeParse({
    organizationId: memberships[0].organization.id,
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description") || undefined,
    unit: formData.get("unit"),
    conversionFactor: formData.get("conversionFactor") ? Number(formData.get("conversionFactor")) : 1,
    baseUnit: formData.get("baseUnit"),
    minStockLevel: formData.get("minStockLevel") ? Number(formData.get("minStockLevel")) : 0,
    maxStockLevel: formData.get("maxStockLevel") ? Number(formData.get("maxStockLevel")) : undefined,
    reorderPoint: formData.get("reorderPoint") ? Number(formData.get("reorderPoint")) : undefined,
    defaultSupplierId: formData.get("defaultSupplierId") || undefined,
    costMethod: formData.get("costMethod") || "fifo",
    standardCost: formData.get("standardCost") ? Number(formData.get("standardCost")) : undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid item details";
    redirect(`/inventory/new?error=${encodeURIComponent(msg)}`);
  }

  await createInventoryItem(user.id, parsed.data);
  revalidatePath("/inventory");
  redirect("/inventory");
}