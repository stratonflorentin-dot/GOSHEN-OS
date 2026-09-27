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
  const [farmGeo, plotGeo] = await Promise.all([
    listFarmGeo(user.id, orgId),
    listPlotGeo(user.id, orgId),
  ]);
  const farms = farmGeo.flatMap((farm) => {
    if (!farm.boundaryGeoJson || farm.centroidLat == null || farm.centroidLng == null) return [];
    try {
      const geometry = JSON.parse(farm.boundaryGeoJson) as { type?: string; coordinates?: number[][][] };
      if (geometry.type !== "Polygon" || !geometry.coordinates?.[0] || geometry.coordinates[0].length < 4) return [];
      return [{
        farmId: farm.farmId,
        farmName: farm.name,
        centroidLat: farm.centroidLat,
        centroidLng: farm.centroidLng,
        boundary: geometry.coordinates[0],
      }];
    } catch {
      return [];
    }
  });

  if (farms.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">3D View</h1>
        <p className="mt-2 text-muted-foreground">No mapped farm boundaries found. Add or record a farm boundary to see it here.</p>
      </div>
    );
  }

  const plots = plotGeo.flatMap((plot) => {
    if (!plot.boundaryGeoJson) return [];
    try {
      const geometry = JSON.parse(plot.boundaryGeoJson) as { type?: string; coordinates?: number[][][] };
      const boundary = geometry.type === "Polygon" ? geometry.coordinates?.[0] : undefined;
      if (!boundary || boundary.length < 4) return [];
      return [{
        plotId: plot.id,
        farmId: plot.farmId,
        plotCode: plot.code,
        plotName: plot.name,
        boundary,
        areaHa: plot.areaM2 ? Number(plot.areaM2) / 10000 : 0,
        elevationM: plot.elevationM ? Number(plot.elevationM) : undefined,
      }];
    } catch {
      return [];
    }
  });

  return (
    <View3DClient
      farms={farms}
      plots={plots}
      canEditBoundaries={["owner", "admin", "manager"].includes(memberships[0].role)}
    />
  );
}
