# 15 — Weather Integration Architecture

## 1. Provider Adapter Pattern

```ts
interface WeatherProvider {
  readonly name: string; readonly status: 'active' | 'pending';
  getForecast(loc: FarmLocationRef, days: number): Promise<ForecastDay[]>;
  getObservations(loc: FarmLocationRef, range: DateRange): Promise<WeatherObservation[]>;
  getAlerts?(loc: FarmLocationRef): Promise<WeatherAlert[]>;
}
```

- One interface, swappable implementations (`services/adapters/weather/`).
  First implementation: OpenWeatherMap (or equivalent) — final vendor chosen at
  Phase 7 kickoff; switching later is a config change, not a refactor.
- **No provider connected ⇒ status `pending`**: UI shows "Weather data not
  connected yet" with setup guidance. **No placeholder forecasts, ever.**
- Provider pulls run as scheduled Supabase Edge Functions (every 3 h forecast
  refresh; daily observations), per active farm with a centroid, writing
  normalized rows (`weather_forecasts`, `weather_observations`) — the app
  never calls the vendor synchronously from the browser.

## 2. Data Storage & Association

- Weather is associated with **farm coordinates** (`farms.centroid`, stored on
  boundary creation/import). Storage retains `raw` provider payload (auditable,
  re-parseable) alongside normalized columns.
- Unique constraints per (farm, provider, date/issued_at) make refreshes
  idempotent; forecasts keep issuance history (newest wins for display).
- Retention: observations kept indefinitely (trend value); superseded forecast
  issuances pruned after 90 days.

## 3. Display

- Farm weather page + dashboard widget: Today / Tomorrow / 7-day (from
  provider capability), with **data freshness timestamps** and provider label.
- Longer-term trends only when the provider supplies reliable historical data;
  otherwise the section is hidden — not approximated.
- Alerts (`weather_alerts`): provider-issued alerts mapped to normalized
  types (heavy_rain, drought_risk, frost, wind) + severity; acknowledgeable.

## 4. Weather → Farm Intelligence (insight rules)

A deterministic **rule engine** (`weatherService.insights`) maps forecast data
to operational review-actions. Rules are evidence-backed and phrased as
*investigation prompts*, not certainties:

| Condition (forecast) | Insight shown | Suggested reviews |
|---|---|---|
| Rainfall ≥ 20 mm/day within 48 h | "Heavy rainfall expected on <date>" | Review irrigation schedule (pause zones), postpone fertilizer/chemical application, check drainage on flagged low-lying plots |
| Rainfall probability ≥ 70% on spraying-planned day (task context) | Task-level caution on spray/weeding tasks | Reschedule suggestion to task assignee |
| No rainfall ≥ 7 days + high temp | "Dry spell conditions" | Check irrigation coverage, monitor stressed plots |
| Provider alert (frost/wind) | Forwarded alert with severity | Per-alert guidance from approved sources (linked, cited) |

Rules:
- Each insight links its **evidence** (the forecast rows) and, where
  guidance references agronomy, cites the knowledge base (RAG) — never free
  invention.
- Insights never claim outcomes ("this WILL flood"); they state conditions and
  reviews.
- Rules are config-driven (jsonb rule definitions) so thresholds can be tuned
  per region without code changes.

## 5. Extension Points

- **Satellite/remote sensing** (`satellite_scenes`, NDVI etc.): separate
  `SatelliteProvider` adapter, `pending` until a provider is contracted.
  NDVI statistics stored only when actually computed by a provider
  (`satellite_scenes.ndvi_stats`); UI hides the module otherwise.
- **Market data**: analogous `MarketDataProvider` (pending); manual market
  price entry (`market_prices`, `source='manual'`) always available —
  system never invents prices.
