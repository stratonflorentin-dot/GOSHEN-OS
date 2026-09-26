import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { getFarmKpis } from "@/services/analyticsService";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const orgId = memberships[0].organization.id;
  const farms = await listFarmGeo(user.id, orgId);
  const farmWithCoords = farms.find((f) => f.centroidLat && f.centroidLng) ?? farms[0];

  if (!farmWithCoords) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-2 text-muted-foreground">No farms found. Create a farm first.</p>
      </div>
    );
  }

  const kpis = await getFarmKpis(user.id, farmWithCoords.farmId);
  return <AnalyticsClient initialKpis={kpis} farmId={farmWithCoords.farmId} />;
}
