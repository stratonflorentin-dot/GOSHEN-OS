import { redirect } from "next/navigation";
import { Egg, Factory, Plus, Thermometer, TrendingUp, Wheat } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listFarmGeo } from "@/services/farmService";
import { getChickProductionOverview } from "@/services/chickProductionService";
import { listSeasons } from "@/services/cropService";
import { addIncubationCostAction, createHatcheryOrderAction, createIncubationBatchAction, createIncubatorAction, recordIncubationEventAction, recordIncubationOutcomeAction } from "./actions";

const field = "field-input";
const label = "field-label";
const submit = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600";
const panel = "card overflow-hidden";
const sectionTitle = "flex items-center gap-2 text-base font-semibold";

export default async function ChickProductionPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; farmId?: string; seasonId?: string; sourceType?: string; breed?: string; batch?: string; dateFrom?: string; dateTo?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (!memberships.length) redirect("/onboarding");
  const org = memberships[0].organization;
  const [{ error, saved, farmId: requestedFarm, seasonId: requestedSeason, sourceType: requestedSource, breed: requestedBreed, batch: requestedBatch, dateFrom: requestedFrom, dateTo: requestedTo }, farms, seasons] = await Promise.all([
    searchParams,
    listFarmGeo(user.id, org.id),
    listSeasons(user.id, org.id),
  ]);
  const sourceOptions = ["all","external_hatchery","farm_incubator","purchased_fertile_eggs","farm_eggs","farm_transfer","other","legacy_unrecorded"];
  const dateValue = (date?: string) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? date : undefined;
  const filters = { farmId:farms.some(f=>f.farmId===requestedFarm)?requestedFarm:undefined, seasonId:seasons.some(s=>s.id===requestedSeason)?requestedSeason:undefined, sourceType:sourceOptions.includes(requestedSource ?? "")?requestedSource:"all", breed:requestedBreed?.slice(0,100).trim()||undefined, batch:requestedBatch?.slice(0,100).trim()||undefined, dateFrom:dateValue(requestedFrom), dateTo:dateValue(requestedTo) };
  const overview = await getChickProductionOverview(user.id, org.id, filters);
  const today = new Date().toISOString().slice(0, 10);
  const nowLocal = new Date().toISOString().slice(0, 16);

  return <main className="mx-auto max-w-6xl space-y-6 pb-10">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Livestock · Poultry</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Chick origins & incubation</h1><p className="mt-1 text-sm text-muted-foreground">Record where chicks came from and carry their real acquisition or production cost into each livestock batch.</p></div>
      <a className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted" href="/livestock">View livestock batches</a>
    </header>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">Record saved successfully.</p>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chick production summary">
      <div className="card p-4"><p className="text-sm text-muted-foreground">Incubators</p><p className="mt-1 text-2xl font-semibold">{overview.incubators.length}</p><p className="text-xs text-muted-foreground">Across registered farms</p></div>
      <div className="card p-4"><p className="text-sm text-muted-foreground">External healthy chicks</p><p className="mt-1 text-2xl font-semibold">{overview.hatcheryOrders.reduce((n,o)=>n+o.delivered-o.doa,0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Delivered less dead on arrival</p></div>
      <div className="card p-4"><p className="text-sm text-muted-foreground">Farm-incubated healthy chicks</p><p className="mt-1 text-2xl font-semibold">{overview.incubationBatches.reduce((n,b)=>n+b.healthy,0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Healthy hatch records</p></div>
      <div className="card p-4"><p className="text-sm text-muted-foreground">Incubation runs</p><p className="mt-1 text-2xl font-semibold">{overview.incubationBatches.length}</p><p className="text-xs text-muted-foreground">Hatch rate uses eggs loaded</p></div>
    </section>

    <section className={panel}>
      <form method="get" className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><label className={label} htmlFor="filterFarm">Farm</label><select id="filterFarm" name="farmId" defaultValue={filters.farmId ?? ""} className={field}><option value="">All farms</option>{farms.map(f=><option key={f.farmId} value={f.farmId}>{f.name}</option>)}</select></div>
        <div><label className={label} htmlFor="filterSeason">Season</label><select id="filterSeason" name="seasonId" defaultValue={filters.seasonId ?? ""} className={field}><option value="">All seasons</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className={label} htmlFor="filterSource">Chick origin</label><select id="filterSource" name="sourceType" defaultValue={filters.sourceType} className={field}><option value="all">All origins</option><option value="external_hatchery">External hatchery</option><option value="farm_incubator">Farm incubator</option><option value="purchased_fertile_eggs">Purchased fertile eggs</option><option value="farm_eggs">Farm eggs</option><option value="farm_transfer">Farm transfer</option><option value="other">Other</option><option value="legacy_unrecorded">Origin not recorded</option></select></div>
        <div><label className={label} htmlFor="filterBreed">Breed / strain</label><input id="filterBreed" name="breed" defaultValue={filters.breed} maxLength={100} className={field}/></div>
        <div><label className={label} htmlFor="filterBatch">Batch code</label><input id="filterBatch" name="batch" defaultValue={filters.batch} maxLength={100} className={field}/></div>
        <div><label className={label} htmlFor="filterFrom">Start date from</label><input id="filterFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom} className={field}/></div>
        <div><label className={label} htmlFor="filterTo">Start date to</label><input id="filterTo" name="dateTo" type="date" defaultValue={filters.dateTo} className={field}/></div>
        <div className="flex items-end gap-2"><button className={submit}>Filter batches</button><a className="rounded-lg border border-border px-4 py-2 text-sm" href="/livestock/chicks">Reset</a></div>
      </form>
      <div className="border-t border-border p-4"><h2 className={sectionTitle}>Poultry batch source overview</h2><p className="mt-1 text-sm text-muted-foreground">Filter poultry cohorts by farm, season, date, breed, batch code, and origin.</p>
        <div className="mt-3 divide-y divide-border">{overview.poultryBatches.length ? overview.poultryBatches.map(b=><div key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{b.code} <span className="text-xs font-normal text-muted-foreground">· {b.farmName}{b.seasonName ? ` · ${b.seasonName}` : ""} · {b.date.slice(0,10)}</span></p><p className="text-sm text-muted-foreground">{b.sourceType?.replaceAll("_"," ") ?? "origin not recorded"}{b.sourceDetails ? ` · ${b.sourceDetails}` : ""}{b.breed ? ` · ${b.breed}` : ""}{b.strain ? ` / ${b.strain}` : ""}</p></div><div className="text-sm sm:text-right"><p>{b.quantity.toLocaleString()} birds</p><p className="text-muted-foreground">Source cost {b.sourceCost.toLocaleString(undefined,{maximumFractionDigits:2})} · {b.costPerBird.toLocaleString(undefined,{maximumFractionDigits:2})} / bird</p></div></div>) : <p className="py-4 text-sm text-muted-foreground">No poultry batches match these filters.</p>}</div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <details className={`${panel} group`} open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden"><span className={sectionTitle}><Factory className="h-5 w-5 text-primary"/>Record hatchery delivery</span><Plus className="h-4 w-4 text-muted-foreground transition group-open:rotate-45"/></summary>
        <form action={createHatcheryOrderAction} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="orderFarm">Receiving farm</label><select id="orderFarm" name="farmId" required className={field}><option value="">Select farm</option>{farms.map(f=><option key={f.farmId} value={f.farmId}>{f.name}</option>)}</select></div>
          <div><label className={label} htmlFor="supplier">Hatchery / supplier</label><input id="supplier" name="supplier" required maxLength={160} className={field} placeholder="Supplier name"/></div>
          <div><label className={label} htmlFor="orderNumber">Order number</label><input id="orderNumber" name="orderNumber" maxLength={120} className={field}/></div>
          <div><label className={label} htmlFor="orderReference">Delivery batch reference</label><input id="orderReference" name="reference" maxLength={120} className={field}/></div>
          <div><label className={label} htmlFor="orderDate">Order date</label><input id="orderDate" name="orderDate" type="date" required defaultValue={today} className={field}/></div>
          <div><label className={label} htmlFor="deliveryDate">Delivery date</label><input id="deliveryDate" name="deliveryDate" type="date" className={field}/></div>
          <div><label className={label} htmlFor="ordered">Quantity ordered</label><input id="ordered" name="ordered" type="number" min="1" required className={field}/></div>
          <div><label className={label} htmlFor="delivered">Quantity delivered</label><input id="delivered" name="delivered" type="number" min="0" required defaultValue="0" className={field}/></div>
          <div><label className={label} htmlFor="doa">Dead on arrival</label><input id="doa" name="doa" type="number" min="0" required defaultValue="0" className={field}/></div>
          <div><label className={label} htmlFor="pricePerChick">Price per chick</label><input id="pricePerChick" name="pricePerChick" type="number" min="0" step="0.01" required defaultValue="0" className={field}/></div>
          <div><label className={label} htmlFor="transportCost">Transport cost</label><input id="transportCost" name="transportCost" type="number" min="0" step="0.01" defaultValue="0" className={field}/></div>
          <div><label className={label} htmlFor="otherCost">Other costs</label><input id="otherCost" name="otherCost" type="number" min="0" step="0.01" defaultValue="0" className={field}/></div>
          <div><label className={label} htmlFor="orderBreed">Breed</label><input id="orderBreed" name="breed" maxLength={120} className={field}/></div>
          <div><label className={label} htmlFor="orderStrain">Strain</label><input id="orderStrain" name="strain" maxLength={120} className={field}/></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="vaccinationInfo">Vaccination information</label><input id="vaccinationInfo" name="vaccinationInfo" maxLength={1000} className={field}/></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="orderDocument">Document link</label><input id="orderDocument" name="documentUrl" type="url" maxLength={1000} placeholder="https://…" className={field}/><p className="mt-1 text-xs text-muted-foreground">Add a link to the invoice or delivery document.</p></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="orderNotes">Notes</label><textarea id="orderNotes" name="notes" rows={2} maxLength={2000} className={field}/></div>
          <button className={`${submit} sm:col-span-2`}><Plus className="h-4 w-4"/>Save delivery</button>
        </form>
      </details>

      <details className={panel}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden"><span className={sectionTitle}><Thermometer className="h-5 w-5 text-primary"/>Register incubator</span><Plus className="h-4 w-4 text-muted-foreground"/></summary>
        <form action={createIncubatorAction} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={label} htmlFor="incFarm">Farm</label><select id="incFarm" name="farmId" required className={field}><option value="">Select farm</option>{farms.map(f=><option key={f.farmId} value={f.farmId}>{f.name}</option>)}</select></div>
          <div><label className={label} htmlFor="incName">Incubator name</label><input id="incName" name="name" required maxLength={120} placeholder="Incubator 01" className={field}/></div>
          <div><label className={label} htmlFor="capacity">Capacity (eggs)</label><input id="capacity" name="capacity" type="number" min="1" required className={field}/></div>
          <div><label className={label} htmlFor="incLocation">Location</label><input id="incLocation" name="location" maxLength={200} className={field}/></div>
          <div><label className={label} htmlFor="manufacturer">Manufacturer</label><input id="manufacturer" name="manufacturer" maxLength={160} className={field}/></div>
          <div><label className={label} htmlFor="model">Model</label><input id="model" name="model" maxLength={120} className={field}/></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="monitorsTemperature"/> Has temperature monitoring</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="monitorsHumidity"/> Has humidity monitoring</label>
          <div><label className={label} htmlFor="incNotes">Notes</label><input id="incNotes" name="notes" maxLength={2000} className={field}/></div>
          <button className={`${submit} sm:col-span-2`}><Plus className="h-4 w-4"/>Save incubator</button>
        </form>
      </details>

      <details className={panel}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden"><span className={sectionTitle}><Egg className="h-5 w-5 text-primary"/>Start incubation batch</span><Plus className="h-4 w-4 text-muted-foreground"/></summary>
        {overview.incubators.length ? <form action={createIncubationBatchAction} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="batchFarm">Farm</label><select id="batchFarm" name="farmId" required className={field}><option value="">Select farm</option>{farms.map(f=><option key={f.farmId} value={f.farmId}>{f.name}</option>)}</select></div>
          <div><label className={label} htmlFor="incubatorId">Incubator</label><select id="incubatorId" name="incubatorId" required className={field}><option value="">Select incubator (use the selected farm)</option>{overview.incubators.filter(i=>i.status==="active").map(i=><option key={i.id} value={i.id}>{i.farmName} — {i.name} · {i.capacity.toLocaleString()} eggs</option>)}</select></div>
          <div><label className={label} htmlFor="incCode">Batch code</label><input id="incCode" name="code" required maxLength={60} placeholder="HATCH-001" className={field}/></div>
          <div><label className={label} htmlFor="eggsLoaded">Eggs loaded</label><input id="eggsLoaded" name="eggsLoaded" type="number" min="1" required className={field}/></div>
          <div><label className={label} htmlFor="startDate">Start date</label><input id="startDate" name="startDate" type="date" required defaultValue={today} className={field}/></div>
          <div><label className={label} htmlFor="expectedDate">Expected hatch date</label><input id="expectedDate" name="expectedDate" type="date" className={field}/></div>
          <div><label className={label} htmlFor="eggSource">Egg source</label><select id="eggSource" name="eggSource" required className={field}><option value="farm_breeders">Farm-owned breeders</option><option value="purchased_fertile_eggs">Purchased fertile eggs</option><option value="another_farm">Another farm</option><option value="other">Other documented source</option></select></div>
          <div><label className={label} htmlFor="eggSourceDetails">Supplier / source details</label><input id="eggSourceDetails" name="eggSourceDetails" maxLength={300} className={field}/></div>
          <div><label className={label} htmlFor="incBatchBreed">Breed</label><input id="incBatchBreed" name="breed" maxLength={120} className={field}/></div>
          <div><label className={label} htmlFor="incBatchStrain">Strain</label><input id="incBatchStrain" name="strain" maxLength={120} className={field}/></div>
          <div><label className={label} htmlFor="eggCost">Fertile egg cost</label><input id="eggCost" name="eggCost" type="number" min="0" step="0.01" defaultValue="0" className={field}/></div>
          <div><label className={label} htmlFor="eggDocument">Egg source document link</label><input id="eggDocument" name="documentUrl" type="url" maxLength={1000} placeholder="https://…" className={field}/></div>
          <div><label className={label} htmlFor="incBatchNotes">Notes</label><input id="incBatchNotes" name="notes" maxLength={2000} className={field}/></div>
          <p className="text-xs text-muted-foreground sm:col-span-2">The recorded egg quantity must fit the chosen incubator capacity. A timeline entry is created when eggs are loaded.</p>
          <button className={`${submit} sm:col-span-2`}><Egg className="h-4 w-4"/>Start incubation</button>
        </form> : <p className="border-t border-border p-4 text-sm text-muted-foreground">Register an incubator before starting an incubation batch.</p>}
      </details>

      <section className={`${panel} p-4`}>
        <h2 className={sectionTitle}><Factory className="h-5 w-5 text-primary"/>Hatchery deliveries</h2>
        <div className="mt-4 space-y-3">{overview.hatcheryOrders.length ? overview.hatcheryOrders.map(o=><article key={o.id} className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{o.supplier}{o.reference ? ` · ${o.reference}` : ""}</h3><p className="text-xs text-muted-foreground">{o.farmName}{o.deliveryDate ? ` · Delivered ${o.deliveryDate.slice(0,10)}` : " · Delivery pending"}{o.breed ? ` · ${o.breed}` : ""}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{o.available.toLocaleString()} healthy unassigned</span></div>
          <p className="mt-2 text-sm">Ordered {o.ordered.toLocaleString()} · delivered {o.delivered.toLocaleString()} · DOA {o.doa.toLocaleString()} ({o.delivered > 0 ? (o.doa / o.delivered * 100).toFixed(1) : "0.0"}%) · total acquisition cost {o.totalCost.toLocaleString(undefined,{maximumFractionDigits:2})} · actual cost / healthy chick {o.costPerHealthy === null ? "—" : o.costPerHealthy.toLocaleString(undefined,{maximumFractionDigits:2})}</p>
          {(o.orderNumber || o.vaccinationInfo || o.documents.length > 0) && <p className="mt-1 text-xs text-muted-foreground">{o.orderNumber ? `Order ${o.orderNumber}. ` : ""}{o.vaccinationInfo ? `Vaccination: ${o.vaccinationInfo}. ` : ""}{o.documents.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer" className="text-primary underline">Delivery document{index > 0 ? ` ${index + 1}` : ""}</a>)}</p>}
        </article>) : <p className="text-sm text-muted-foreground">No hatchery deliveries recorded yet.</p>}</div>
      </section>
    </div>

    <section className={panel}>
      <div className="border-b border-border p-4"><h2 className={sectionTitle}><Egg className="h-5 w-5 text-primary"/>Incubation batches</h2><p className="mt-1 text-sm text-muted-foreground">Hatch rate = healthy chicks ÷ eggs loaded. Production cost includes fertile eggs and recorded operating costs.</p></div>
      <div className="divide-y divide-border">{overview.incubationBatches.length ? overview.incubationBatches.map(b=><article key={b.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1.4fr]">
        <div><div className="flex items-center gap-2"><h3 className="font-semibold">{b.code}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{b.farmName} · {b.incubatorName}</span></div><p className="mt-1 text-sm text-muted-foreground">Started {b.startDate.slice(0,10)}{b.expectedDate ? ` · Expected ${b.expectedDate.slice(0,10)}` : ""}{b.hatchDate ? ` · Hatched ${b.hatchDate.slice(0,10)}` : " · Hatch not recorded"}{b.breed ? ` · ${b.breed}` : ""}{b.strain ? ` / ${b.strain}` : ""}</p><p className="mt-2 text-sm">Egg source: {b.eggSource.replaceAll("_"," ")}{b.eggSourceDetails ? ` · ${b.eggSourceDetails}` : ""}</p>{b.documents.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer" className="mr-2 text-xs text-primary underline">Egg source document{index > 0 ? ` ${index + 1}` : ""}</a>)}<p className="mt-2 text-sm">{b.eggsLoaded.toLocaleString()} eggs loaded · {b.fertile.toLocaleString()} fertile · {b.infertile.toLocaleString()} infertile · {b.cracked.toLocaleString()} damaged · {b.losses.toLocaleString()} embryonic losses</p><p className="mt-1 text-sm">{b.hatched.toLocaleString()} hatched · {b.healthy.toLocaleString()} healthy · {b.weak.toLocaleString()} weak · {b.dead.toLocaleString()} dead at hatch</p><p className="mt-1 text-sm"><TrendingUp className="mr-1 inline h-4 w-4"/>Hatch rate: {b.hatchDate ? `${b.hatchRate.toFixed(1)}%` : "Pending hatch"} · Total cost: {b.totalCost.toLocaleString(undefined,{maximumFractionDigits:2})} · Cost / hatched chick: {b.hatched > 0 ? (b.totalCost / b.hatched).toLocaleString(undefined,{maximumFractionDigits:2}) : "—"} · Cost / healthy chick: {b.costPerHealthy === null ? "—" : b.costPerHealthy.toLocaleString(undefined,{maximumFractionDigits:2})}</p><p className="mt-1 text-xs text-muted-foreground">Cost per chick calculations use recorded costs only.</p><ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">{b.costs.map((cost,index)=><li key={`${cost.category}-${cost.date}-${index}`}>{cost.date.slice(0,10)} · {cost.category.replaceAll("_"," ")} · {cost.amount.toLocaleString(undefined,{maximumFractionDigits:2})}</li>)}</ul></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><h4 className="text-sm font-semibold">Incubation timeline</h4><ol className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-muted-foreground">{b.events.length ? b.events.map((event,index)=><li key={`${event.at}-${index}`} className="flex flex-wrap gap-x-2"><time>{event.at.slice(0,16).replace("T"," ")}</time><span className="font-medium capitalize text-foreground">{event.type.replaceAll("_"," ")}</span>{event.temperature !== null && <span>{event.temperature}°C</span>}{event.humidity !== null && <span>{event.humidity}% RH</span>}{event.quantity !== null && <span>{event.quantity} eggs/chicks</span>}{event.notes && <span>{event.notes}</span>}</li>) : <li>Eggs-loaded event is created when incubation starts.</li>}</ol></div>
          <details className="sm:col-span-2"><summary className="cursor-pointer text-sm font-medium text-primary">Record manual observation</summary><form action={recordIncubationEventAction} className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3 sm:grid-cols-2">
            <input type="hidden" name="batchId" value={b.id}/><div><label className={label}>Observation</label><select name="eventType" className={field}><option value="candling">Candling</option><option value="turning">Egg turning</option><option value="temperature_check">Temperature check</option><option value="humidity_check">Humidity check</option><option value="losses_recorded">Losses recorded</option><option value="other">Other</option></select></div><div><label className={label}>Date and time</label><input name="eventAt" type="datetime-local" required defaultValue={nowLocal} className={field}/></div><div><label className={label}>Temperature (°C)</label><input name="temperature" type="number" min="-20" max="100" step="0.1" className={field}/></div><div><label className={label}>Humidity (%)</label><input name="humidity" type="number" min="0" max="100" step="0.1" className={field}/></div><div><label className={label}>Eggs / chicks checked</label><input name="quantity" type="number" min="0" className={field}/></div><div><label className={label}>Notes</label><input name="notes" maxLength={1000} className={field}/></div><button className={`${submit} sm:col-span-2`}>Save observation</button>
          </form></details>
          <details><summary className="cursor-pointer text-sm font-medium text-primary">{b.hatchDate ? "Update hatch result" : "Record hatch result"}</summary><form action={recordIncubationOutcomeAction} className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3">
            <input type="hidden" name="batchId" value={b.id}/><div className="col-span-2"><label className={label}>Actual hatch date</label><input name="hatchDate" type="date" required defaultValue={today} className={field}/></div>
            {[['fertile','Fertile eggs'],['infertile','Infertile eggs'],['cracked','Cracked / damaged'],['embryonicLosses','Embryonic losses'],['hatched','Total hatched'],['healthy','Healthy chicks'],['weak','Weak chicks'],['dead','Dead at hatch']].map(([name,title])=><div key={name}><label className={label}>{title}</label><input name={name} type="number" min="0" required defaultValue="0" className={field}/></div>)}
            <div className="col-span-2"><label className={label}>Notes</label><input name="notes" maxLength={1000} className={field}/></div><button className={`${submit} col-span-2`}>Save hatch counts</button>
          </form></details>
          <details><summary className="cursor-pointer text-sm font-medium text-primary">Add operating cost</summary><form action={addIncubationCostAction} className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3">
            <input type="hidden" name="batchId" value={b.id}/><div><label className={label}>Cost category</label><select name="category" className={field}><option value="electricity">Electricity</option><option value="fuel">Fuel</option><option value="labor">Labor</option><option value="incubator_operation">Incubator operation</option><option value="cleaning">Cleaning / disinfection</option><option value="transport">Transport</option><option value="other">Other</option></select></div><div><label className={label}>Amount</label><input name="amount" type="number" min="0" step="0.01" required className={field}/></div><div><label className={label}>Date incurred</label><input name="date" type="date" required defaultValue={today} className={field}/></div><div><label className={label}>Note</label><input name="notes" maxLength={500} className={field}/></div><button className={submit}>Save cost</button>
          </form></details>
        </div>
      </article>) : <p className="p-5 text-sm text-muted-foreground">No incubation batches yet. Register an incubator, then start a batch above.</p>}</div>
    </section>

    <section className={panel}>
      <div className="border-b border-border p-4"><h2 className={sectionTitle}><Wheat className="h-5 w-5 text-primary"/>Incubators</h2></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{overview.incubators.length ? overview.incubators.map(i=><article key={i.id} className="rounded-lg border border-border p-3"><div className="flex justify-between gap-2"><h3 className="font-semibold">{i.name}</h3><span className="text-xs capitalize text-muted-foreground">{i.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{i.farmName} · {i.capacity.toLocaleString()} egg capacity{i.location ? ` · ${i.location}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{[i.manufacturer,i.model].filter(Boolean).join(" · ") || "Manufacturer and model not recorded"}</p><p className="mt-1 text-xs text-muted-foreground">Manual monitoring: {i.monitorsTemperature ? "temperature" : ""}{i.monitorsTemperature && i.monitorsHumidity ? " + " : ""}{i.monitorsHumidity ? "humidity" : ""}{!i.monitorsTemperature && !i.monitorsHumidity ? "none recorded" : ""}</p></article>) : <p className="text-sm text-muted-foreground">No incubators registered yet.</p>}</div>
    </section>
  </main>;
}
