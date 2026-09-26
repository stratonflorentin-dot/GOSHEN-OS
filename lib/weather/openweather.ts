/** OpenWeather Current Weather + 5 day / 3-hour forecast API adapter. */
import type { WeatherProvider, CurrentWeather, HourlyForecast, DailyForecast, WeatherAlert } from "./providers";

const BASE = "https://api.openweathermap.org/data/2.5";
type Json = Record<string, any>;
const responseCache = new Map<string, { expiresAt: number; request: Promise<Json> }>();
const TEN_MINUTES = 10 * 60 * 1000;

function weatherFields(data: Json) {
  const weather = data.weather?.[0] ?? {};
  return {
    condition: String(weather.description ?? weather.main ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    conditionCode: String(weather.id ?? "0"),
    iconUrl: weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : undefined,
  };
}

function toCurrent(data: Json): CurrentWeather {
  const fields = weatherFields(data);
  return {
    observedAt: new Date(Number(data.dt) * 1000).toISOString(),
    temperatureC: Number(data.main.temp),
    feelsLikeC: Number(data.main.feels_like),
    humidityPct: Number(data.main.humidity),
    windKph: Math.round(Number(data.wind?.speed ?? 0) * 36) / 10,
    windDirDeg: Number(data.wind?.deg ?? 0),
    pressureHpa: Number(data.main.pressure ?? 0),
    visibilityKm: Math.round(Number(data.visibility ?? 10000) / 100) / 10,
    ...fields,
    raw: data,
  };
}

function toHourly(data: Json): HourlyForecast {
  const fields = weatherFields(data);
  const rain = data.rain ?? {};
  const snow = data.snow ?? {};
  return {
    validAt: new Date(Number(data.dt) * 1000).toISOString(),
    temperatureC: Number(data.main.temp),
    feelsLikeC: Number(data.main.feels_like),
    humidityPct: Number(data.main.humidity),
    windKph: Math.round(Number(data.wind?.speed ?? 0) * 36) / 10,
    windDirDeg: Number(data.wind?.deg ?? 0),
    precipitationMm: Number(rain["3h"] ?? snow["3h"] ?? 0),
    precipitationProbabilityPct: Math.round(Number(data.pop ?? 0) * 100),
    ...fields,
    raw: data,
  };
}

function toDaily(data: Json, date: string): DailyForecast {
  const entries: Json[] = data.entries;
  const temps = entries.map((entry) => Number(entry.main.temp));
  const conditions = new Map<string, { count: number; entry: Json }>();
  for (const entry of entries) {
    const id = String(entry.weather?.[0]?.id ?? "0");
    const item = conditions.get(id) ?? { count: 0, entry };
    item.count += 1;
    conditions.set(id, item);
  }
  const representative = [...conditions.values()].sort((a, b) => b.count - a.count)[0]?.entry ?? entries[0];
  const fields = weatherFields(representative);
  return {
    date,
    tempMinC: Math.min(...temps),
    tempMaxC: Math.max(...temps),
    humidityAvgPct: Math.round(entries.reduce((sum, entry) => sum + Number(entry.main.humidity), 0) / entries.length),
    windMaxKph: Math.round(Math.max(...entries.map((entry) => Number(entry.wind?.speed ?? 0))) * 36) / 10,
    precipitationMm: Math.round(entries.reduce((sum, entry) => sum + Number(entry.rain?.["3h"] ?? entry.snow?.["3h"] ?? 0), 0) * 10) / 10,
    precipitationProbabilityPct: Math.round(Math.max(...entries.map((entry) => Number(entry.pop ?? 0))) * 100),
    ...fields,
    raw: { entries },
  };
}

export function createOpenWeatherProvider(): WeatherProvider {
  const apiKey = process.env.OPENWEATHER_API_KEY ?? "";
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set");

  function request(kind: "weather" | "forecast", lat: number, lng: number): Promise<Json> {
    const key = `${kind}:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.request;

    const url = new URL(`${BASE}/${kind}`);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");
    const pending = fetch(url, { signal: AbortSignal.timeout(12_000) }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`OpenWeather request failed (${response.status}). Check the provider key and access.`);
      }
      return response.json() as Promise<Json>;
    }).catch((error) => {
      responseCache.delete(key);
      throw error;
    });
    responseCache.set(key, { expiresAt: Date.now() + TEN_MINUTES, request: pending });
    return pending;
  }

  async function forecast(lat: number, lng: number): Promise<Json> {
    return request("forecast", lat, lng);
  }

  return {
    name: "openweather",
    async current(lat, lng) {
      return toCurrent(await request("weather", lat, lng));
    },
    async hourly(lat, lng) {
      const data = await forecast(lat, lng);
      return (data.list ?? []).slice(0, 16).map(toHourly);
    },
    async daily(lat, lng) {
      const data = await forecast(lat, lng);
      const timezoneOffset = Number(data.city?.timezone ?? 0);
      const grouped = new Map<string, Json[]>();
      for (const entry of data.list ?? []) {
        const date = new Date((Number(entry.dt) + timezoneOffset) * 1000).toISOString().slice(0, 10);
        const items = grouped.get(date) ?? [];
        items.push(entry);
        grouped.set(date, items);
      }
      return [...grouped].slice(0, 5).map(([date, entries]) => toDaily({ entries }, date));
    },
    async alerts(): Promise<WeatherAlert[]> {
      // The basic current + 5 day endpoints do not include government alerts.
      return [];
    },
  };
}
