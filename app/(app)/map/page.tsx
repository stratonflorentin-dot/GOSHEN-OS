import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listPlotGeo } from "@/services/plotService";
import type { MapPolygon } from "@/features/map/MapLibreMap";
import { geoJsonRingToLatLng } from "@/features/map/geometry";
import { MapWorkspace } from "@/features/map/MapWorkspace";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const params = await searchParams;
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
        ring: geoJsonRingToLatLng(geom.coordinates[0]),
      };
    });
  const plotPolygons: MapPolygon[] = plots
    .filter((plot) => plot.boundaryGeoJson)
    .map((plot) => {
      const geom = JSON.parse(plot.boundaryGeoJson!) as { coordinates: [number, number][][] };
      return {
        id: `plot:${plot.id}`,
        name: plot.name,
        ring: geoJsonRingToLatLng(geom.coordinates[0]),
        color: "#c87924",
      };
    });

  const canEditBoundaries = ["owner", "admin", "manager"].includes(memberships[0].role);
  const initialEditableId = canEditBoundaries && params.edit && /^[0-9a-f-]{36}$/i.test(params.edit) && polygons.some((polygon) => polygon.id === params.edit)
    ? params.edit
    : null;

  return (
    <MapWorkspace
      farmName={farms.length === 1 ? farms[0].name : `${farms.length} farm locations`}
      polygons={polygons}
      plotPolygons={plotPolygons}
      canEditBoundaries={canEditBoundaries}
      initialEditableId={initialEditableId}
      pendingNote={
        polygons.length === 0
          ? "No farm boundaries captured yet. Create a farm and walk its boundary to see it here."
          : undefined
      }
    />
  );
}
