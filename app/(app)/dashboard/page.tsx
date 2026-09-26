import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LandPlot,
  Sprout,
  Beef,
  TrendingUp,
  CloudRain,
  Thermometer,
  Wind,
  ChevronRight,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo, type FarmGeo } from "@/services/farmService";
import { formatHa } from "@/lib/format";
import type { MapPolygon } from "@/features/map/MapLibreMap";
import { MiniMap } from "@/features/map/MiniMap";

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function toPolygons(farms: FarmGeo[]): MapPolygon[] {
  return farms
    .filter((f) => f.boundaryGeoJson)
    .map((f) => {
      const geom = JSON.parse(f.boundaryGeoJson!) as {
        coordinates: [number, number][][];
      };
      const ring = geom.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );
      return { id: f.farmId, name: f.name, ring };
    });
}

function Kpi({
  icon: Icon,
  value,
  label,
  pending,
  href,
}: {
  icon: typeof LandPlot;
  value: string;
  label: string;
  pending?: boolean;
  href?: string;
}) {
  const body = (
    <div className="card flex items-center gap-3.5 p-4.5 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className={pending ? "text-lg font-semibold text-muted-foreground/50" : "stat-value"}>
          {value}
        </div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const farms = await listFarmGeo(user.id, org.id);
  const polygons = toPolygons(farms);
  const landM2 = farms.reduce((sum, f) => sum + Number(f.areaM2 ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {greet()}, {user.name || "Farmer"}
        </h1>
        <p className="text-sm text-muted-foreground">{org.name}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi icon={LandPlot} value={landM2 > 0 ? formatHa(landM2) : "—"} label="Land" href="/farms" />
        <Kpi icon={Sprout} value="—" label="Crops active (Phase 3)" pending />
        <Kpi icon={Beef} value="—" label="Livestock (Phase 3)" pending />
        <Kpi icon={TrendingUp} value="—" label="Profit (Phase 5)" pending />
      </div>

      {/* Farm map + weather */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Farm Map
            </h2>
            <Link href="/farms" className="text-xs font-medium text-primary-700 hover:underline">
              View farms
            </Link>
          </div>
          <MiniMap polygons={polygons} />
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Weather
          </h2>
          <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
            <CloudRain className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Weather integration pending</p>
            <p className="text-xs text-muted-foreground/70">
              Forecasts arrive with the weather provider adapter (Phase 7). No forecast is
              shown until a provider is connected.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground/60">
              <span className="inline-flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5" /> —
              </span>
              <span className="inline-flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5" /> —
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind className="h-3.5 w-3.5" /> —
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs cost + activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Revenue vs Cost
          </h2>
          <div className="grid h-48 place-items-center text-center">
            <div>
              <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Financial data arrives with finance (Phase 5)
              </p>
              <p className="text-xs text-muted-foreground/70">
                Income, expenses, and profitability will chart here.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Farm Activities
          </h2>
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <CircleCheck className="h-4 w-4 text-success" />
              {farms.length > 0
                ? `${farms.length} farm${farms.length === 1 ? "" : "s"} recorded`
                : "No activity yet"}
            </p>
            {farms.length === 0 && (
              <Link
                href="/farms/new"
                className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
              >
                Record your first farm boundary <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <TriangleAlert className="h-4 w-4 text-warning" />
              Crop activities arrive in Phase 3
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <TriangleAlert className="h-4 w-4 text-warning" />
              Low-inventory alerts arrive in Phase 4
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
