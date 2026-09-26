import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listPlotGeo } from "@/services/plotService";
import type { MapPolygon } from "@/features/map/MapLibreMap";
import { MapWorkspace } from "@/features/map/MapWorkspace";

export default async function MapPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const [farms, plots] = await Promise.all([
    listFarmGeo(user.id, org.id),
    listPlotGeo(user.id, org.id),
  ]);

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
  const plotPolygons: MapPolygon[] = plots
    .filter((plot) => plot.boundaryGeoJson)
    .map((plot) => {
      const geom = JSON.parse(plot.boundaryGeoJson!) as { coordinates: [number, number][][] };
      return {
        id: `plot:${plot.id}`,
        name: plot.name,
        ring: geom.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]),
        color: "#c87924",
      };
    });

  return (
    <MapWorkspace
      farmName={org.name}
      polygons={polygons}
      plotPolygons={plotPolygons}
      pendingNote={
        polygons.length === 0
          ? "No farm boundaries captured yet. Create a farm and walk its boundary to see it here."
          : undefined
      }
    />
  );
}
