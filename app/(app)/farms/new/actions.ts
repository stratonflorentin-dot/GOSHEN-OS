"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { createFarmSchema } from "@/lib/validation/farm";
import { createFarm } from "@/services/farmService";

export async function createFarmAction(input: {
  name: string;
  description?: string;
  farmType?: string;
  region?: string;
  district?: string;
  ward?: string;
  village?: string;
  boundary?: [number, number][];
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const parsed = createFarmSchema.safeParse({
    ...input,
    organizationId: memberships[0].organization.id,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid farm details" };
  }

  const farm = await createFarm(user.id, parsed.data);
  revalidatePath("/farms");
  revalidatePath("/dashboard");
  return { farmId: farm.id };
}
