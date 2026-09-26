/**
 * Weather provider adapter pattern (§26, §51).
 * Allows swapping providers (OpenWeather, WeatherAPI, Tomorrow.io, etc.)
 * without changing application code.
 */

export type WeatherProviderName = "openweather" | "weatherapi" | "tomorrow" | "mock";

export interface WeatherProvider {
  readonly name: WeatherProviderName;
  /** Current conditions at lat/lng. */
  current(lat: number, lng: number): Promise<CurrentWeather>;
  /** Forecast samples across the next 48 hours (provider resolution may vary). */
  hourly(lat: number, lng: number): Promise<HourlyForecast[]>;
  /** Daily forecast for the period available from this provider. */
  daily(lat: number, lng: number): Promise<DailyForecast[]>;
  /** Alerts for the area. */
  alerts(lat: number, lng: number): Promise<WeatherAlert[]>;
  /** Historical observations (optional). */
  historical?(lat: number, lng: number, date: string): Promise<HistoricalWeather | null>;
}

export interface CurrentWeather {
  observedAt: string; // ISO timestamp
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKph: number;
  windDirDeg: number;
  pressureHpa: number;
  visibilityKm: number;
  uvIndex?: number;
  condition: string; // e.g. "clear", "rain", "cloudy"
  conditionCode: string; // provider-specific code
  iconUrl?: string;
  raw: Record<string, unknown>;
}

export interface HourlyForecast {
  validAt: string; // ISO timestamp
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKph: number;
  windDirDeg: number;
  precipitationMm: number;
  precipitationProbabilityPct: number;
  condition: string;
  conditionCode: string;
  iconUrl?: string;
  raw: Record<string, unknown>;
}

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  tempMinC: number;
  tempMaxC: number;
  humidityAvgPct: number;
  windMaxKph: number;
  precipitationMm: number;
  precipitationProbabilityPct: number;
  condition: string;
  conditionCode: string;
  iconUrl?: string;
  sunrise?: string;
  sunset?: string;
  uvIndexMax?: number;
  raw: Record<string, unknown>;
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: "minor" | "moderate" | "severe" | "extreme";
  certainty: "observed" | "likely" | "possible" | "unlikely";
  urgency: "immediate" | "expected" | "future" | "past";
  effectiveAt: string;
  expiresAt: string;
  areas: string[];
  raw: Record<string, unknown>;
}

export interface HistoricalWeather {
  date: string; // YYYY-MM-DD
  tempMinC: number;
  tempMaxC: number;
  tempAvgC: number;
  precipitationMm: number;
  humidityAvgPct: number;
  windAvgKph: number;
  raw: Record<string, unknown>;
}

/** Registry of available providers. */
const providers = new Map<WeatherProviderName, WeatherProvider>();

export function registerWeatherProvider(provider: WeatherProvider): void {
  providers.set(provider.name, provider);
}

export function getWeatherProvider(name: WeatherProviderName): WeatherProvider {
  const p = providers.get(name);
  if (!p) throw new Error(`Weather provider "${name}" not registered`);
  return p;
}

export function getDefaultWeatherProvider(): WeatherProvider {
  const name = (process.env.WEATHER_PROVIDER as WeatherProviderName) ?? "mock";
  return getWeatherProvider(name);
}
