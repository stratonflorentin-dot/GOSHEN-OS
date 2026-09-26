import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import PlotCaptureForm from "./PlotCaptureForm";

export default async function NewPlotPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const farms = await listFarmGeo(user.id, memberships[0].organization.id);
  return <PlotCaptureForm farms={farms.map((f) => ({ farmId: f.farmId, name: f.name }))} />;
}