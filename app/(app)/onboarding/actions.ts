"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { createOrganizationSchema } from "@/lib/validation/org";
import { createOrganization } from "@/services/orgService";

export async function createOrganizationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country") || undefined,
    currency: formData.get("currency") || undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid organization details";
    redirect(`/onboarding?error=${encodeURIComponent(msg)}`);
  }

  await createOrganization(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  redirect("/farms/new");
}
