/**
 * Mock weather provider for development and testing.
 * Returns deterministic data based on coordinates.
 */
import { WeatherProvider, CurrentWeather, HourlyForecast, DailyForecast, WeatherAlert } from "./providers";

function hashCoords(lat: number, lng: number): number {
  let h = 0;
  for (const c of `${lat.toFixed(4)},${lng.toFixed(4)}`) {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  return h;
}

function seededRandom(seed: number, max = 1): number {
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x)) * max;
}

export const mockWeatherProvider: WeatherProvider = {
  name: "mock",

  async current(lat: number, lng: number): Promise<CurrentWeather> {
    const seed = hashCoords(lat, lng);
    const baseTemp = 20 + seededRandom(seed, 15); // 20-35°C
    return {
      observedAt: new Date().toISOString(),
      temperatureC: Math.round(baseTemp * 10) / 10,
      feelsLikeC: Math.round((baseTemp + seededRandom(seed + 1, 3) - 1.5) * 10) / 10,
      humidityPct: Math.round(40 + seededRandom(seed + 2, 40)),
      windKph: Math.round(seededRandom(seed + 3, 25)),
      windDirDeg: Math.round(seededRandom(seed + 4, 360)),
      pressureHpa: Math.round(1000 + seededRandom(seed + 5, 30)),
      visibilityKm: Math.round(5 + seededRandom(seed + 6, 15)),
      uvIndex: Math.round(seededRandom(seed + 7, 11)),
      condition: ["clear", "partly_cloudy", "cloudy", "light_rain"][Math.floor(seededRandom(seed + 8, 4))],
      conditionCode: "mock",
      iconUrl: undefined,
      raw: { provider: "mock", seed },
    };
  },

  async hourly(lat: number, lng: number): Promise<HourlyForecast[]> {
    const seed = hashCoords(lat, lng);
    const out: HourlyForecast[] = [];
    const now = new Date();
    for (let i = 0; i < 48; i++) {
      const t = new Date(now.getTime() + i * 3600_000);
      const hourSeed = seed + i * 7;
      const temp = 18 + seededRandom(hourSeed, 12);
      out.push({
        validAt: t.toISOString(),
        temperatureC: Math.round(temp * 10) / 10,
        feelsLikeC: Math.round((temp + seededRandom(hourSeed + 1, 2) - 1) * 10) / 10,
        humidityPct: Math.round(50 + seededRandom(hourSeed + 2, 30)),
        windKph: Math.round(seededRandom(hourSeed + 3, 20)),
        windDirDeg: Math.round(seededRandom(hourSeed + 4, 360)),
        precipitationMm: Math.round(seededRandom(hourSeed + 5, 5) * 10) / 10,
        precipitationProbabilityPct: Math.round(seededRandom(hourSeed + 6, 100)),
        condition: ["clear", "partly_cloudy", "cloudy", "light_rain"][Math.floor(seededRandom(hourSeed + 7, 4))],
        conditionCode: "mock",
        iconUrl: undefined,
        raw: { provider: "mock", hourSeed },
      });
    }
    return out;
  },

  async daily(lat: number, lng: number): Promise<DailyForecast[]> {
    const seed = hashCoords(lat, lng);
    const out: DailyForecast[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 86400_000);
      const daySeed = seed + i * 13;
      const min = 15 + seededRandom(daySeed, 8);
      const max = min + 5 + seededRandom(daySeed + 1, 10);
      out.push({
        date: d.toISOString().slice(0, 10),
        tempMinC: Math.round(min * 10) / 10,
        tempMaxC: Math.round(max * 10) / 10,
        humidityAvgPct: Math.round(55 + seededRandom(daySeed + 2, 25)),
        windMaxKph: Math.round(10 + seededRandom(daySeed + 3, 25)),
        precipitationMm: Math.round(seededRandom(daySeed + 4, 15) * 10) / 10,
        precipitationProbabilityPct: Math.round(seededRandom(daySeed + 5, 100)),
        condition: ["clear", "partly_cloudy", "cloudy", "light_rain", "thunderstorm"][Math.floor(seededRandom(daySeed + 6, 5))],
        conditionCode: "mock",
        iconUrl: undefined,
        sunrise: "06:15",
        sunset: "18:45",
        uvIndexMax: Math.round(seededRandom(daySeed + 7, 11)),
        raw: { provider: "mock", daySeed },
      });
    }
    return out;
  },

  async alerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    const seed = hashCoords(lat, lng);
    if (seededRandom(seed + 100, 1) > 0.7) return [];
    return [
      {
        id: `mock-alert-${seed}`,
        title: "Heavy Rain Warning",
        description: "Localized heavy rainfall expected. Risk of flash flooding in low-lying areas.",
        severity: "moderate",
        certainty: "likely",
        urgency: "expected",
        effectiveAt: new Date(Date.now() + 3600_000).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        areas: ["farm area"],
        raw: { provider: "mock" },
      },
    ];
  },
};