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

  try {
    await createOrganization(user.id, parsed.data);
  } catch {
    redirect("/onboarding?error=We%20couldn%E2%80%99t%20create%20your%20organization.%20Check%20the%20details%20and%20try%20again.");
  }
  revalidatePath("/dashboard", "layout");
  redirect("/farms/new");
}
