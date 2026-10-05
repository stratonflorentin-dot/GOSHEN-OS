"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { askAssistant } from "@/services/aiService";

export type AskResult = { error: string } | { ok: true };

export async function askAssistantAction(input: {
  farmId?: string;
  question: string;
}): Promise<AskResult> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  if (!input.question.trim()) return { error: "Ask a question first." };
  if (input.question.length > 2000) return { error: "Question is too long (max 2000 characters)." };

  try {
    await askAssistant(user.id, {
      organizationId: memberships[0].organization.id,
      farmId: input.farmId || null,
      question: input.question,
    });
    revalidatePath("/assistant");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The assistant could not answer right now." };
  }
}
