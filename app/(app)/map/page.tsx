import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import type { MapPolygon } from "@/features/map/LeafletMap";
import { MapWorkspace } from "@/features/map/MapWorkspace";

export default async function MapPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const farms = await listFarmGeo(user.id, org.id);

  const polygons: MapPolygon[] = farms
    .filter((f) => f.boundaryGeoJson)
    .map((f) => {
      const geom = JSON.parse(f.boundaryGeoJson!) as {
        coordinates: [number, number][][];
      };
      return {
        id: f.farmId,
        name: f.name,
        ring: geom.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]),
      };
    });

  return (
    <MapWorkspace
      farmName={org.name}
      polygons={polygons}
      pendingNote={
        polygons.length === 0
          ? "No farm boundaries captured yet. Create a farm and walk its boundary to see it here."
          : undefined
      }
    />
  );
}
