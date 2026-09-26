import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Beef, Boxes, Cloud, Coins, Map, MapPinned, Plus, Sprout, Wallet } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo, type FarmGeo } from "@/services/farmService";
import { getFarmKpis } from "@/services/analyticsService";
import { formatHa } from "@/lib/format";
import type { MapPolygon } from "@/features/map/MapLibreMap";
import { geoJsonRingToLatLng } from "@/features/map/geometry";
import { MiniMap } from "@/features/map/MiniMap";

function toPolygons(farms: FarmGeo[]): MapPolygon[] {
  return farms.flatMap((farm) => {
    if (!farm.boundaryGeoJson) return [];
    try {
      const geom = JSON.parse(farm.boundaryGeoJson) as { coordinates: [number, number][][] };
      return [{ id: farm.farmId, name: farm.name, ring: geoJsonRingToLatLng(geom.coordinates[0]) }];
    } catch { return []; }
  });
}

function Metric({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return <Link href={href} className="group block border-l-2 border-border pl-3 transition hover:border-primary">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">{value}</p>
    <p className="mt-0.5 text-[11px] text-muted-foreground group-hover:text-primary">{note}</p>
  </Link>;
}

const actions = [
  { label: "Create farm", href: "/farms/new", icon: MapPinned },
  { label: "Map a plot", href: "/plots/new", icon: Map },
  { label: "Plan crops", href: "/crops/plan", icon: Sprout },
  { label: "Add livestock", href: "/livestock/new", icon: Beef },
  { label: "Add inventory", href: "/inventory/new", icon: Boxes },
  { label: "Record expense", href: "/finance/journal/new", icon: Wallet },
];

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (!memberships.length) redirect("/onboarding");
  const org = memberships[0].organization;
  const farms = await listFarmGeo(user.id, org.id);
  const farmKpis = await Promise.all(farms.map((farm) => getFarmKpis(user.id, farm.farmId)));
  const polygons = toPolygons(farms);
  const landM2 = farms.reduce((sum, farm) => sum + Number(farm.areaM2 ?? 0), 0);
  const mapped = farms.filter((farm) => farm.boundaryGeoJson).length;
  const totals = farmKpis.reduce((sum, kpi) => ({
    hectares: sum.hectares + kpi.totalPlantedHectares,
    crops: sum.crops + kpi.activeCropSeasons,
    batches: sum.batches + kpi.activeBatches,
    revenue: sum.revenue + kpi.totalRevenue,
    expenses: sum.expenses + kpi.totalExpenses,
    profit: sum.profit + kpi.netProfit,
  }), { hectares: 0, crops: 0, batches: 0, revenue: 0, expenses: 0, profit: 0 });
  const money = (amount: number) => new Intl.NumberFormat("en-TZ", {
    style: "currency", currency: org.defaultCurrency, notation: "compact", maximumFractionDigits: 1,
  }).format(amount);
  const greeting = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">{org.name} <span className="px-1.5">/</span> Operations</p><h1 className="page-title mt-1.5">Overview</h1><p className="mt-1 text-sm text-muted-foreground">A current view of your farm portfolio and field locations.</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-muted-foreground">{greeting}</span><Link href="/map" className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"><Map className="h-4 w-4" />Open map</Link><Link href="/farms/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-700"><Plus className="h-4 w-4" />Create farm</Link></div>
    </div>

    <section aria-label="Operational indicators" className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-border pb-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-0">
      <Metric label="Active farms" value={String(farms.length)} note="Farm portfolio" href="/farms" />
      <Metric label="Mapped area" value={landM2 > 0 ? formatHa(landM2) : "—"} note={`${mapped} of ${farms.length} mapped`} href="/map" />
      <Metric label="Active crop seasons" value={String(totals.crops)} note={`${totals.hectares.toLocaleString("en-TZ", { maximumFractionDigits: 1 })} ha planted`} href="/crops" />
      <Metric label="Livestock batches" value={String(totals.batches)} note="Active batches" href="/livestock" />
      <Metric label="Revenue · 12 months" value={money(totals.revenue)} note="Posted farm transactions" href="/finance" />
      <Metric label="Profit · 12 months" value={money(totals.profit)} note={`${money(totals.expenses)} expenses`} href="/analytics" />
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5"><div><h2 className="section-title">Farm locations</h2><p className="mt-0.5 text-xs text-muted-foreground">Satellite view of recorded boundaries</p></div><Link href="/map" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">GIS workspace <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        <div className="p-2 sm:p-3"><MiniMap polygons={polygons} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground"><span>{mapped} boundary{mapped === 1 ? "" : "ies"} on map</span><Link href="/farms" className="font-medium text-foreground hover:text-primary">Manage farms</Link></div>
      </section>
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div><h2 className="section-title">Weather by farm</h2><p className="mt-0.5 text-xs text-muted-foreground">Saved boundary center coordinates</p></div><Cloud className="h-4 w-4 text-muted-foreground" /></div>
        {farms.length ? <div className="divide-y divide-border">{farms.slice(0, 6).map((farm) => <Link key={farm.farmId} href={`/weather?farmId=${farm.farmId}`} className="flex min-h-[58px] items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50"><span className="min-w-0"><span className="block truncate text-sm font-medium">{farm.name}</span><span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{farm.centroidLat !== null && farm.centroidLng !== null ? `${farm.centroidLat.toFixed(4)}, ${farm.centroidLng.toFixed(4)}` : "Coordinates not available"}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</div> : <div className="px-4 py-8 text-center"><p className="text-sm font-medium">No farm locations</p><p className="mt-1 text-xs text-muted-foreground">Create a farm and record its boundary to see coordinates and local weather.</p><Link href="/farms/new" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Create farm <ArrowRight className="h-3.5 w-3.5" /></Link></div>}
        {farms.length > 6 && <Link href="/weather" className="block border-t border-border px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50">View all {farms.length} farm forecasts</Link>}
      </section>
    </div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div><h2 className="section-title">Production & finance</h2><p className="mt-0.5 text-xs text-muted-foreground">Live records from your organization</p></div><Coins className="h-4 w-4 text-muted-foreground" /></div>
        <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4"><Link href="/crops" className="p-4 hover:bg-muted/50"><Sprout className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Crop plans</p><p className="mt-1 text-xs text-muted-foreground">View crop activity</p></Link><Link href="/livestock" className="p-4 hover:bg-muted/50"><Beef className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Livestock</p><p className="mt-1 text-xs text-muted-foreground">View herd records</p></Link><Link href="/inventory" className="p-4 hover:bg-muted/50"><Boxes className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Inventory</p><p className="mt-1 text-xs text-muted-foreground">Review stock</p></Link><Link href="/finance" className="p-4 hover:bg-muted/50"><Wallet className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Finance</p><p className="mt-1 text-xs text-muted-foreground">Review transactions</p></Link></div>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">Financial and production totals appear when records are available.</p>
      </section>
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3.5"><h2 className="section-title">Create a record</h2><p className="mt-0.5 text-xs text-muted-foreground">Start a common farm workflow</p></div>
        <div className="grid grid-cols-2 gap-2 p-3">{actions.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="flex min-h-10 items-center gap-2 rounded-md border border-border px-2.5 text-xs font-medium hover:border-primary/50 hover:bg-muted/50"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{label}</span></Link>)}</div>
      </section>
    </div>
  </div>;
}
