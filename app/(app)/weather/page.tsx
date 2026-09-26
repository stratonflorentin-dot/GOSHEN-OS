import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { listPlots } from "@/services/plotService";
import { getFarmWeather, getWeatherIntelligence } from "@/services/weatherService";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import {
  Cloud,
  Sun,
  CloudRain,
  Droplets,
  Wind,
  AlertTriangle,
  Thermometer,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const CONDITION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  partly_cloudy: Cloud,
  cloudy: Cloud,
  light_rain: CloudRain,
  rain: CloudRain,
  thunderstorm: CloudRain,
  snow: CloudRain,
  fog: Cloud,
  mist: Cloud,
};

function conditionLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function WeatherPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const orgId = memberships[0].organization.id;
  const farms = await listFarmGeo(user.id, orgId);

  // Pick first farm with coordinates, or first farm
  const farmWithCoords = farms.find((f) => f.centroidLat && f.centroidLng) ?? farms[0];
  if (!farmWithCoords) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Weather</h1>
        <p className="mt-2 text-muted-foreground">No farms with coordinates found. Add a farm boundary first.</p>
        <Link href="/farms/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white">
          Create farm
        </Link>
      </div>
    );
  }

  // Fetch plots for weather intelligence context
  const plots = await listPlots(user.id, orgId, farmWithCoords.farmId);

  const [weather, intelligence] = await Promise.all([
    getFarmWeather(user.id, farmWithCoords.farmId),
    getWeatherIntelligence(user.id, farmWithCoords.farmId, plots.map(p => ({
      plotId: p.id,
      plotCode: p.code,
      plotName: p.name,
      areaHa: p.areaM2 ? Number(p.areaM2) / 10000 : 0,
      elevationM: p.elevationM ? Number(p.elevationM) : undefined
    }))),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Cloud className="h-6 w-6 text-primary-600" /> Weather
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {weather.farmName} · {weather.lat.toFixed(4)}°, {weather.lng.toFixed(4)}°
            · Updated {new Date(weather.fetchedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/farms"
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Switch farm
          </Link>
        </div>
      </div>

      {/* Current conditions */}
      {weather.current && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">Temperature</p>
            <p className="mt-1 flex items-baseline gap-1 font-mono text-2xl font-semibold">
              {weather.current.temperatureC}°C
              <span className="text-lg font-normal text-muted-foreground">
                (feels {weather.current.feelsLikeC}°C)
              </span>
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">Condition</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              {(() => {
                const Icon = CONDITION_ICONS[weather.current!.condition] ?? Cloud;
                return <Icon className="h-5 w-5" />;
              })()}
              {conditionLabel(weather.current.condition)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">Humidity</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{weather.current.humidityPct}%</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">Wind</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {weather.current.windKph} km/h
              <span className="text-sm font-normal text-muted-foreground"> @ {weather.current.windDirDeg}°</span>
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-muted-foreground">UV Index</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{weather.current.uvIndex}</p>
          </div>
        </div>
      )}

      {/* Intelligence recommendations */}
      <div className="card mb-6">
        <div className="border-b border-black/5 p-4">
          <h2 className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-5 w-5 text-warning" /> Operational insights
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {intelligence.recommendations.map((rec, i) => {
            const priorityClass =
              rec.priority === "high"
                ? "bg-destructive/5 border-destructive"
                : rec.priority === "medium"
                  ? "bg-warning/5 border-warning"
                  : "bg-primary/5 border-primary";
            const badgeClass =
              rec.priority === "high"
                ? "bg-destructive/10 text-destructive"
                : rec.priority === "medium"
                  ? "bg-warning/10 text-warning"
                  : "bg-primary/10 text-primary";
            return (
              <div key={i} className={`rounded-xl p-3 border-l-4 ${priorityClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{rec.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{rec.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rec.evidence.map((e, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded bg-black/5 text-muted-foreground">
                          {e}
                        </span>
                      ))}
                    </div>
                    {rec.affectedPlots && rec.affectedPlots.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Affected plots:</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.affectedPlots.map((plot, k) => (
                            <span key={k} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {plot.plotCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                      {rec.priority}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Confidence: {Math.round(rec.confidence * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {weather.alerts.length > 0 && (
        <div className="card mb-6">
          <div className="border-b border-black/5 p-4">
            <h2 className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Active alerts
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {weather.alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl bg-destructive/5 p-3 border border-destructive/10">
                <p className="font-medium">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive">{alert.severity}</span>
                  <span className="px-2 py-0.5 rounded bg-black/5 text-muted-foreground">{alert.certainty}</span>
                  <span className="px-2 py-0.5 rounded bg-black/5 text-muted-foreground">{alert.urgency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly forecast */}
      <div className="card mb-6">
        <div className="border-b border-black/5 p-4">
          <h2 className="font-medium">Hourly forecast (48h)</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left p-2 font-medium text-muted-foreground">Time</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Temp</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Feels</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Rain</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Rain %</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Wind</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Condition</th>
              </tr>
            </thead>
            <tbody>
              {weather.hourly.slice(0, 24).map((h) => (
                <tr key={h.validAt} className="border-b border-black/5">
                  <td className="p-2 text-muted-foreground">
                    {new Date(h.validAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-2 text-center font-mono">{h.temperatureC}°C</td>
                  <td className="p-2 text-center font-mono text-muted-foreground">{h.feelsLikeC}°C</td>
                  <td className="p-2 text-center font-mono">{h.precipitationMm} mm</td>
                  <td className="p-2 text-center">{h.precipitationProbabilityPct}%</td>
                  <td className="p-2 text-center font-mono">{h.windKph} km/h</td>
                  <td className="p-2 text-center capitalize">{conditionLabel(h.condition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily forecast */}
      <div className="card">
        <div className="border-b border-black/5 p-4">
          <h2 className="font-medium">7-day forecast</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Min / Max</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Rain</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Rain %</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Wind</th>
                <th className="text-center p-2 font-medium text-muted-foreground">UV</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Condition</th>
              </tr>
            </thead>
            <tbody>
              {weather.daily.map((d) => (
                <tr key={d.date} className="border-b border-black/5">
                  <td className="p-2 font-medium">{new Date(d.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</td>
                  <td className="p-2 text-center font-mono">{d.tempMinC}° / {d.tempMaxC}°C</td>
                  <td className="p-2 text-center font-mono">{d.precipitationMm} mm</td>
                  <td className="p-2 text-center">{d.precipitationProbabilityPct}%</td>
                  <td className="p-2 text-center font-mono">{d.windMaxKph} km/h</td>
                  <td className="p-2 text-center font-mono">{d.uvIndexMax}</td>
                  <td className="p-2 text-center capitalize">{conditionLabel(d.condition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}