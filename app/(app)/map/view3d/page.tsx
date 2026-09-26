import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listPlotGeo } from "@/services/plotService";
import View3DClient from "./View3DClient";

export default async function View3DPage() {
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
        <h1 className="text-2xl font-semibold">3D View</h1>
        <p className="mt-2 text-muted-foreground">No farms with coordinates found. Add a farm boundary first.</p>
      </div>
    );
  }

  const plots = await listPlotGeo(user.id, orgId);
  const farmPlots = plots.filter(p => p.farmId === farmWithCoords.farmId);

  return (
    <View3DClient
      farm={{
        farmId: farmWithCoords.farmId,
        farmName: farmWithCoords.name,
        centroidLat: farmWithCoords.centroidLat || 0,
        centroidLng: farmWithCoords.centroidLng || 0,
        boundary: farmWithCoords.boundaryGeoJson,
      }}
      plots={farmPlots.map(p => ({
        plotId: p.id,
        plotCode: p.code,
        plotName: p.name,
        boundary: p.boundaryGeoJson,
        areaHa: p.areaM2 ? Number(p.areaM2) / 10000 : 0,
        elevationM: p.elevationM ? Number(p.elevationM) : undefined,
      }))}
    />
  );
}