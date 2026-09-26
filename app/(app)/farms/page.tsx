import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Cloud, Map, MapPinned, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { formatHa } from "@/lib/format";
import type { MapPolygon } from "@/features/map/MapLibreMap";
import { geoJsonRingToLatLng } from "@/features/map/geometry";
import { MiniMap } from "@/features/map/MiniMap";

export default async function FarmsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (!memberships.length) redirect("/onboarding");
  const org = memberships[0].organization;
  const farms = await listFarmGeo(user.id, org.id);
  const polygons: MapPolygon[] = farms.flatMap((farm) => {
    if (!farm.boundaryGeoJson) return [];
    try {
      const geom = JSON.parse(farm.boundaryGeoJson) as { coordinates: [number, number][][] };
      return [{ id: farm.farmId, name: farm.name, ring: geoJsonRingToLatLng(geom.coordinates[0]) }];
    } catch { return []; }
  });
  const mappedCount = farms.filter((farm) => farm.boundaryGeoJson).length;
  const totalArea = farms.reduce((sum, farm) => sum + Number(farm.areaM2 ?? 0), 0);

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{org.name} <span className="px-1.5">/</span> Portfolio</p><h1 className="page-title mt-1.5">Farms</h1><p className="mt-1 text-sm text-muted-foreground">Manage properties, mapped boundaries, and farm locations.</p></div><div className="flex gap-2"><Link href="/map" className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"><Map className="h-4 w-4" />GIS workspace</Link><Link href="/farms/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-700"><Plus className="h-4 w-4" />Create farm</Link></div></div>

    <section className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card"><div className="p-3.5 sm:p-4"><p className="text-xs text-muted-foreground">Active farms</p><p className="mt-1 text-xl font-semibold tabular-nums">{farms.length}</p></div><div className="p-3.5 sm:p-4"><p className="text-xs text-muted-foreground">Mapped boundaries</p><p className="mt-1 text-xl font-semibold tabular-nums">{mappedCount}</p></div><div className="p-3.5 sm:p-4"><p className="text-xs text-muted-foreground">Measured area</p><p className="mt-1 text-xl font-semibold tabular-nums">{totalArea ? formatHa(totalArea) : "—"}</p></div></section>

    {farms.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center"><div className="max-w-sm"><MapPinned className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 text-base font-semibold">No farms yet</h2><p className="mt-1.5 text-sm text-muted-foreground">Create your first farm to map land, add plots, and connect weather forecasts to its coordinates.</p><Link href="/farms/new" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-700"><Plus className="h-4 w-4" />Create your first farm</Link></div></section> : <>
      <section className="hidden overflow-hidden rounded-lg border border-border bg-card md:block"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Farm</th><th>Boundary status</th><th>Coordinates</th><th className="text-right">Area</th><th className="w-28 text-right">Open</th></tr></thead><tbody>{farms.map((farm) => <tr key={farm.farmId}><td><Link href={`/weather?farmId=${farm.farmId}`} className="font-medium hover:text-primary">{farm.name}</Link></td><td><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${farm.boundaryGeoJson ? "bg-emerald-600" : "bg-amber-500"}`} />{farm.boundaryGeoJson ? "Boundary recorded" : "Boundary needed"}</span></td><td className="font-mono text-xs text-muted-foreground">{farm.centroidLat !== null && farm.centroidLng !== null ? `${farm.centroidLat.toFixed(5)}, ${farm.centroidLng.toFixed(5)}` : "—"}</td><td className="text-right font-mono tabular-nums">{farm.areaM2 && Number(farm.areaM2) > 0 ? formatHa(Number(farm.areaM2)) : "—"}</td><td className="text-right"><Link href={`/weather?farmId=${farm.farmId}`} aria-label={`Open ${farm.name} weather`} className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary-50"><Cloud className="h-3.5 w-3.5" />Weather</Link></td></tr>)}</tbody></table></div></section>
      <section aria-label="Farm cards" className="grid gap-3 md:hidden">{farms.map((farm) => <article key={farm.farmId} className="overflow-hidden rounded-lg border border-border bg-card"><div className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{farm.name}</h2><p className="mt-1 text-xs text-muted-foreground">{farm.areaM2 && Number(farm.areaM2) > 0 ? formatHa(Number(farm.areaM2)) : "Area not measured"}</p></div><span className="shrink-0 rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">{farm.boundaryGeoJson ? "Mapped" : "Needs boundary"}</span></div>{farm.boundaryGeoJson && <div className="h-36 border-y border-border"><MiniMap polygons={[polygons.find((polygon) => polygon.id === farm.farmId)!]} /></div>}<div className="flex items-center justify-between gap-2 px-4 py-3"><span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{farm.centroidLat !== null && farm.centroidLng !== null ? `${farm.centroidLat.toFixed(5)}, ${farm.centroidLng.toFixed(5)}` : "Coordinates not recorded"}</span><Link href={`/weather?farmId=${farm.farmId}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">Forecast <ArrowRight className="h-3.5 w-3.5" /></Link></div></article>)}</section>
    </>}
  </div>;
}
