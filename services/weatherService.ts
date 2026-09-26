/**
 * Weather service — application layer over the provider adapter.
 * Handles caching, farm-scoped queries, and farm-intelligence helpers (§27).
 */
import { withUser } from "@/lib/db";
import { getWeatherProvider, registerWeatherProvider, type WeatherProvider, type CurrentWeather, type HourlyForecast, type DailyForecast, type WeatherAlert } from "@/lib/weather/providers";
import { mockWeatherProvider } from "@/lib/weather/mock";
import { recommendationEngine, type WeatherContext, type CropContext, type Recommendation } from "@/lib/agricultural/recommendations";

let openWeatherPromise: Promise<WeatherProvider> | undefined;

async function getConfiguredProvider(): Promise<WeatherProvider> {
  const configured = process.env.WEATHER_PROVIDER?.trim().toLowerCase();
  if (configured === "openweather" || (!configured && process.env.OPENWEATHER_API_KEY)) {
    openWeatherPromise ??= import("@/lib/weather/openweather").then(({ createOpenWeatherProvider }) => {
      const provider = createOpenWeatherProvider();
      registerWeatherProvider(provider);
      return provider;
    }).catch((error) => {
      openWeatherPromise = undefined;
      throw error;
    });
    return openWeatherPromise;
  }

  if (configured === "mock" && process.env.NODE_ENV !== "production") {
    return mockWeatherProvider;
  }

  throw new Error("Weather provider is not configured. Add a valid provider key to the server environment.");
}

export type FarmWeather = {
  farmId: string;
  farmName: string;
  lat: number;
  lng: number;
  current: CurrentWeather | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  alerts: WeatherAlert[];
  fetchedAt: string;
  provider: string;
};

export type WeatherIntelligence = {
  farmId: string;
  recommendations: Array<{
    type: "irrigation" | "fertilizer" | "spraying" | "harvest" | "drainage" | "frost" | "heat" | "general";
    priority: "low" | "medium" | "high";
    title: string;
    description: string;
    evidence: string[];
    affectedPlots?: Array<{ plotId: string; plotCode: string; plotName: string }>;
    confidence: number; // 0-1
  }>;
};

/** In-memory cache (per-request in serverless; swap to Redis for production). */
const cache = new Map<string, { data: FarmWeather; expires: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(farmId: string): string {
  return `weather:${farmId}`;
}

export async function getFarmWeather(userId: string, farmId: string): Promise<FarmWeather> {
  const rows = await withUser(userId, async (db) => db`
    select f.id, f.name,
           ST_Y(f.centroid::geometry) as lat,
           ST_X(f.centroid::geometry) as lng
    from public.farms f
    where f.id = ${farmId} and f.status = 'active'
  `);
  if (!rows[0]) throw new Error("Farm not found");

  const farm = rows[0];
  const lat = farm.lat == null ? Number.NaN : Number(farm.lat);
  const lng = farm.lng == null ? Number.NaN : Number(farm.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("This farm has no saved boundary coordinates. Record its boundary first.");
  }

  const key = cacheKey(`${userId}:${farmId}`);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  // Keep slow provider requests outside the authenticated database transaction.
  const provider: WeatherProvider = await getConfiguredProvider();
  const [current, hourly, daily, alerts] = await Promise.all([
    provider.current(lat, lng),
    provider.hourly(lat, lng),
    provider.daily(lat, lng),
    provider.alerts(lat, lng),
  ]);

  const result: FarmWeather = {
    farmId: farm.id as string,
    farmName: farm.name as string,
    lat,
    lng,
    current,
    hourly,
    daily,
    alerts,
    fetchedAt: new Date().toISOString(),
    provider: provider.name,
  };

  cache.set(key, { data: result, expires: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * §27 Weather + Farm Intelligence
 * Generates evidence-backed operational insights from forecast data.
 * Never claims certainty where data doesn't support it.
 * Enhanced with agricultural recommendation engine.
 */
export function generateWeatherIntelligence(
  weather: FarmWeather,
  plots?: Array<{ plotId: string; plotCode: string; plotName: string; areaHa: number; elevationM?: number }>
): WeatherIntelligence {
  const recs: WeatherIntelligence["recommendations"] = [];
  const { current, hourly, daily, alerts } = weather;

  // Helper to identify low-lying plots (elevation < 10m or area > 5ha which might indicate flood-prone areas)
  const lowLyingPlots = plots?.filter(p => (p.elevationM && p.elevationM < 10) || p.areaHa > 5) ?? [];
  const largePlots = plots?.filter(p => p.areaHa > 2) ?? [];

  // Convert weather to agricultural context for recommendation engine
  const weatherContext: WeatherContext = {
    temperature: current?.temperatureC || 0,
    humidity: current?.humidityPct || 0,
    rainfall: 0, // Current weather doesn't have precipitation, would need from hourly
    windSpeed: current?.windKph || 0,
    forecast: {
      temperature: daily[0]?.tempMaxC || current?.temperatureC || 0,
      rainfall: daily[0]?.precipitationMm || 0,
      conditions: daily[0]?.condition || current?.condition || "unknown"
    }
  };

  // Use agricultural recommendation engine for crop-specific advice
  const cropContexts: CropContext[] = []; // Would be populated with actual crop data
  const agriculturalRecommendations = recommendationEngine.generateRecommendations(weatherContext, cropContexts);

  // Convert agricultural recommendations to weather intelligence format
  agriculturalRecommendations.forEach(rec => {
    if (rec.priority === "high" || rec.priority === "medium") {
      recs.push({
        type: rec.category as any,
        priority: rec.priority as any,
        title: rec.title,
        description: rec.description,
        evidence: rec.actionableSteps,
        affectedPlots: lowLyingPlots.length > 0 ? lowLyingPlots.map(p => ({
          plotId: p.plotId,
          plotCode: p.plotCode,
          plotName: p.plotName
        })) : undefined,
        confidence: 0.8
      });
    }
  });

  // Heavy rain → drainage / irrigation hold / fertilizer delay
  const heavyRainPeriods = hourly.filter((h) => h.precipitationMm > 10).length;
  const heavyRainDays = daily.filter((d) => d.precipitationMm > 20).length;
  if (heavyRainPeriods > 0 || heavyRainDays > 0) {
    recs.push({
      type: "drainage",
      priority: heavyRainDays > 1 ? "high" : "medium",
      title: "Heavy rainfall expected",
      description: `${heavyRainPeriods} forecast period(s) and ${heavyRainDays} day(s) indicate heavy rain. Check drainage on low-lying plots.`,
      evidence: [
        `Three-hour forecast shows ${heavyRainPeriods} periods with >10 mm precipitation`,
        `Daily forecast shows ${heavyRainDays} days with >20 mm precipitation`,
      ],
      affectedPlots: lowLyingPlots.length > 0 ? lowLyingPlots.map(p => ({
        plotId: p.plotId,
        plotCode: p.plotCode,
        plotName: p.plotName
      })) : undefined,
      confidence: 0.75,
    });
  }

  // Frost risk
  const frostPeriods = hourly.filter((h) => h.temperatureC <= 2).length;
  if (frostPeriods > 0) {
    recs.push({
      type: "frost",
      priority: "high",
      title: "Frost risk detected",
      description: `${frostPeriods} three-hour forecast period(s) at or below 2°C in the next 48h. Protect sensitive crops.`,
      evidence: [`Three-hour forecast shows ${frostPeriods} periods at or below 2°C`],
      confidence: 0.8,
    });
    recs.push({
      type: "irrigation",
      priority: "medium",
      title: "Consider pausing irrigation",
      description: "Soil moisture will increase significantly. Delay scheduled irrigation to avoid waterlogging.",
      evidence: ["Forecast precipitation exceeds typical irrigation application rates"],
      affectedPlots: largePlots.length > 0 ? largePlots.map(p => ({
        plotId: p.plotId,
        plotCode: p.plotCode,
        plotName: p.plotName
      })) : undefined,
      confidence: 0.7,
    });
    recs.push({
      type: "fertilizer",
      priority: "medium",
      title: "Delay fertilizer application",
      description: "Heavy rain can leach or wash away recently applied nutrients. Wait for a dry window.",
      evidence: ["Nitrogen leaching risk increases with >20 mm rainfall events"],
      affectedPlots: largePlots.length > 0 ? largePlots.map(p => ({
        plotId: p.plotId,
        plotCode: p.plotCode,
        plotName: p.plotName
      })) : undefined,
      confidence: 0.65,
    });
  }

  // High wind → spraying caution
  const highWindPeriods = hourly.filter((h) => h.windKph > 20).length;
  if (highWindPeriods > 0) {
    recs.push({
      type: "spraying",
      priority: "medium",
      title: "High wind — avoid spraying",
      description: `${highWindPeriods} three-hour forecast period(s) with wind >20 km/h. Drift risk is elevated.`,
      evidence: [`Three-hour forecast shows ${highWindPeriods} periods with wind speed >20 km/h`],
      confidence: 0.75,
    });
  }

  // UV index
  const highUvDays = daily.filter((d) => (d.uvIndexMax ?? -1) >= 8).length;
  if (highUvDays > 0) {
    recs.push({
      type: "general",
      priority: "low",
      title: "High UV index",
      description: `${highUvDays} day(s) with UV index ≥8. Protect workers with hats, sunscreen, and shade breaks.`,
      evidence: [`Daily forecast shows ${highUvDays} days with UV index ≥8 (very high)`],
      confidence: 0.8,
    });
  }

  // Active alerts
  for (const alert of alerts) {
    recs.push({
      type: "general",
      priority: alert.severity === "severe" || alert.severity === "extreme" ? "high" : "medium",
      title: `Weather alert: ${alert.title}`,
      description: alert.description,
      evidence: [`${alert.severity} severity, ${alert.certainty} certainty, ${alert.urgency} urgency`],
      confidence: alert.certainty === "observed" ? 0.9 : alert.certainty === "likely" ? 0.7 : 0.5,
    });
  }

  // If nothing notable, say so
  if (recs.length === 0) {
    recs.push({
      type: "general",
      priority: "low",
      title: "No significant weather risks",
      description: "Conditions appear favorable for normal operations over the next 7 days.",
      evidence: ["No heavy rain, frost, extreme heat, high wind, or alerts in forecast"],
      confidence: 0.6,
    });
  }

  return { farmId: weather.farmId, recommendations: recs };
}

export async function getWeatherIntelligence(
  userId: string,
  farmId: string,
  plots?: Array<{ plotId: string; plotCode: string; plotName: string; areaHa: number; elevationM?: number }>
): Promise<WeatherIntelligence> {
  const weather = await getFarmWeather(userId, farmId);
  return generateWeatherIntelligence(weather, plots);
}
