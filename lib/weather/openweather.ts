/**
 * OpenWeatherMap provider (https://openweathermap.org/api).
 * Requires OPENWEATHER_API_KEY in environment.
 */
import { WeatherProvider, CurrentWeather, HourlyForecast, DailyForecast, WeatherAlert } from "./providers";

const BASE = "https://api.openweathermap.org/data/3.0/onecall";

function toCurrent(data: Record<string, unknown>): CurrentWeather {
  const w = (data.weather as Array<Record<string, unknown>>)?.[0] ?? {};
  return {
    observedAt: new Date((data.dt as number) * 1000).toISOString(),
    temperatureC: Math.round(((data.temp as number) - 273.15) * 10) / 10,
    feelsLikeC: Math.round(((data.feels_like as number) - 273.15) * 10) / 10,
    humidityPct: data.humidity as number,
    windKph: Math.round(((data.wind_speed as number) * 3.6) * 10) / 10,
    windDirDeg: data.wind_deg as number,
    pressureHpa: data.pressure as number,
    visibilityKm: Math.round(((data.visibility as number) ?? 10000) / 1000),
    uvIndex: data.uvi as number,
    condition: (w.main as string)?.toLowerCase() ?? "unknown",
    conditionCode: (w.id as number)?.toString() ?? "0",
    iconUrl: w.icon ? `https://openweathermap.org/img/wn/${w.icon}@2x.png` : undefined,
    raw: data,
  };
}

function toHourly(data: Record<string, unknown>): HourlyForecast {
  const w = (data.weather as Array<Record<string, unknown>>)?.[0] ?? {};
  const rain = (data.rain as Record<string, number>) ?? {};
  const snow = (data.snow as Record<string, number>) ?? {};
  return {
    validAt: new Date((data.dt as number) * 1000).toISOString(),
    temperatureC: Math.round(((data.temp as number) - 273.15) * 10) / 10,
    feelsLikeC: Math.round(((data.feels_like as number) - 273.15) * 10) / 10,
    humidityPct: data.humidity as number,
    windKph: Math.round(((data.wind_speed as number) * 3.6) * 10) / 10,
    windDirDeg: data.wind_deg as number,
    precipitationMm: Math.round(((rain["1h"] ?? snow["1h"] ?? 0) * 10)) / 10,
    precipitationProbabilityPct: Math.round((data.pop as number) * 100),
    condition: (w.main as string)?.toLowerCase() ?? "unknown",
    conditionCode: (w.id as number)?.toString() ?? "0",
    iconUrl: w.icon ? `https://openweathermap.org/img/wn/${w.icon}@2x.png` : undefined,
    raw: data,
  };
}

function toDaily(data: Record<string, unknown>): DailyForecast {
  const w = (data.weather as Array<Record<string, unknown>>)?.[0] ?? {};
  const temp = data.temp as Record<string, number>;
  return {
    date: new Date((data.dt as number) * 1000).toISOString().slice(0, 10),
    tempMinC: Math.round(((temp.min ?? 273.15) - 273.15) * 10) / 10,
    tempMaxC: Math.round(((temp.max ?? 273.15) - 273.15) * 10) / 10,
    humidityAvgPct: data.humidity as number,
    windMaxKph: Math.round(((data.wind_speed as number) * 3.6) * 10) / 10,
    precipitationMm: Math.round(((data.rain as number) ?? (data.snow as number) ?? 0) * 10) / 10,
    precipitationProbabilityPct: Math.round((data.pop as number) * 100),
    condition: (w.main as string)?.toLowerCase() ?? "unknown",
    conditionCode: (w.id as number)?.toString() ?? "0",
    iconUrl: w.icon ? `https://openweathermap.org/img/wn/${w.icon}@2x.png` : undefined,
    sunrise: data.sunrise ? new Date((data.sunrise as number) * 1000).toISOString().slice(11, 16) : undefined,
    sunset: data.sunset ? new Date((data.sunset as number) * 1000).toISOString().slice(11, 16) : undefined,
    uvIndexMax: data.uvi as number,
    raw: data,
  };
}

function toAlert(data: Record<string, unknown>): WeatherAlert {
  return {
    id: `owm-${data.event}-${data.start}`,
    title: data.event as string,
    description: data.description as string,
    severity: "moderate",
    certainty: "likely",
    urgency: "expected",
    effectiveAt: new Date((data.start as number) * 1000).toISOString(),
    expiresAt: new Date((data.end as number) * 1000).toISOString(),
    areas: [],
    raw: data,
  };
}

export function createOpenWeatherProvider(): WeatherProvider {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set");

  async function fetchOneCall(lat: number, lng: number) {
    const url = `${BASE}?lat=${lat}&lon=${lng}&exclude=minutely&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenWeather error ${res.status}: ${txt}`);
    }
    return res.json();
  }

  return {
    name: "openweather",

    async current(lat: number, lng: number): Promise<CurrentWeather> {
      const data = await fetchOneCall(lat, lng);
      return toCurrent(data.current);
    },

    async hourly(lat: number, lng: number): Promise<HourlyForecast[]> {
      const data = await fetchOneCall(lat, lng);
      return (data.hourly ?? []).slice(0, 48).map(toHourly);
    },

    async daily(lat: number, lng: number): Promise<DailyForecast[]> {
      const data = await fetchOneCall(lat, lng);
      return (data.daily ?? []).slice(0, 7).map(toDaily);
    },

    async alerts(lat: number, lng: number): Promise<WeatherAlert[]> {
      const data = await fetchOneCall(lat, lng);
      return (data.alerts ?? []).map(toAlert);
    },
  };
}