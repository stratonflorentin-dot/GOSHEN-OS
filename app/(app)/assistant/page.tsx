import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listAiHistory } from "@/services/aiService";
import { AssistantClient } from "./AssistantClient";

export default async function AssistantPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const orgId = memberships[0].organization.id;
  const [farms, history] = await Promise.all([
    listFarmGeo(user.id, orgId),
    listAiHistory(user.id, orgId, 15),
  ]);

  return <AssistantClient farms={farms.map((f) => ({ farmId: f.farmId, name: f.name }))} history={history} />;
}
