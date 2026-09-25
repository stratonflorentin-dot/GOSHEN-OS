"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listAccounts, createJournalEntry } from "@/services/financeService";
import { createJournalEntrySchema } from "@/lib/validation/finance";

export async function createJournalEntryAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const lines = [];
  let index = 0;
  while (formData.get(`lines[${index}].accountId`)) {
    lines.push({
      accountId: formData.get(`lines[${index}].accountId`),
      description: formData.get(`lines[${index}].description`) || undefined,
      debit: Number(formData.get(`lines[${index}].debit`) || 0),
      credit: Number(formData.get(`lines[${index}].credit`) || 0),
      currency: formData.get(`lines[${index}].currency`) || "TZS",
      exchangeRate: Number(formData.get(`lines[${index}].exchangeRate`) || 1),
      farmId: formData.get(`lines[${index}].farmId`) || undefined,
      plotId: formData.get(`lines[${index}].plotId`) || undefined,
      cropSeasonId: formData.get(`lines[${index}].cropSeasonId`) || undefined,
      livestockBatchId: formData.get(`lines[${index}].livestockBatchId`) || undefined,
      costCenterId: formData.get(`lines[${index}].costCenterId`) || undefined,
    });
    index++;
  }

  const parsed = createJournalEntrySchema.safeParse({
    organizationId: memberships[0].organization.id,
    entryNumber: formData.get("entryNumber"),
    entryDate: formData.get("entryDate"),
    referenceType: formData.get("referenceType") || undefined,
    referenceId: formData.get("referenceId") || undefined,
    description: formData.get("description"),
    lines,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid journal entry";
    redirect(`/finance/journal/new?error=${encodeURIComponent(msg)}`);
  }

  await createJournalEntry(user.id, parsed.data);
  revalidatePath("/finance");
  redirect("/finance");
}