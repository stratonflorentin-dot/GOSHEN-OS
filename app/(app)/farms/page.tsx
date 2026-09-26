import Link from "next/link";
import { redirect } from "next/navigation";
import { LandPlot, MapPinned, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { formatHa } from "@/lib/format";
import type { MapPolygon } from "@/features/map/MapLibreMap";
import { MiniMap } from "@/features/map/MiniMap";

export default async function FarmsPage() {
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Farms</h1>
          <p className="text-sm text-muted-foreground">{org.name}</p>
        </div>
        <Link
          href="/farms/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" /> Add farm
        </Link>
      </div>

      {farms.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center">
          <div>
            <MapPinned className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="mt-3 text-base font-semibold">No farms yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first farm, then walk its boundary with your phone to measure
              area and perimeter.
            </p>
            <Link
              href="/farms/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" /> Create your first farm
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {farms.map((f) => (
            <div key={f.farmId} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700">
                <LandPlot className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold">{f.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {f.areaM2 ? formatHa(Number(f.areaM2)) : "No boundary captured yet"}
                  {f.boundaryGeoJson ? " · Boundary recorded by GPS walk" : ""}
                </p>
              </div>
              {f.boundaryGeoJson && (
                <div className="h-24 w-full overflow-hidden rounded-xl border border-black/5 sm:w-40">
                  <MiniMap polygons={[polygons.find((p) => p.id === f.farmId)!]} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
