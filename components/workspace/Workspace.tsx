"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, BarChart3, Beef, CircleHelp,
  CloudSun, FileSpreadsheet, Leaf, MapPinned, Menu, Plus, Search, Settings2,
  Sprout, Tractor, Wheat, X,
} from "lucide-react";

type Section = "Overview" | "Farms" | "Crops" | "Livestock" | "Finance";
type RecordItem = { id: string; type: Exclude<Section, "Overview">; name: string; detail: string; amount?: number; createdAt: string };
const STORAGE_KEY = "goshen-workspace-v1";
const sections: { name: Section; icon: typeof Activity }[] = [
  { name: "Overview", icon: BarChart3 }, { name: "Farms", icon: MapPinned },
  { name: "Crops", icon: Sprout }, { name: "Livestock", icon: Beef }, { name: "Finance", icon: FileSpreadsheet },
];
const styles: Record<string, string> = {
  Farms: "bg-emerald-50 text-emerald-700", Crops: "bg-lime-50 text-lime-700",
  Livestock: "bg-amber-50 text-amber-700", Finance: "bg-blue-50 text-blue-700",
};

export default function Workspace() {
  const [section, setSection] = useState<Section>("Overview");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Exclude<Section, "Overview">>("Farms");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setRecords(parsed as RecordItem[]);
      }
    } catch { /* Start with a clean workspace if stored data is unreadable. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, ready]);

  const filtered = useMemo(() => records.filter((r) =>
    (section === "Overview" || r.type === section) && `${r.name} ${r.detail} ${r.type}`.toLowerCase().includes(query.toLowerCase()),
  ), [records, section, query]);
  const totals = useMemo(() => ({
    farms: records.filter((r) => r.type === "Farms").length,
    crops: records.filter((r) => r.type === "Crops").length,
    livestock: records.filter((r) => r.type === "Livestock").length,
    spend: records.filter((r) => r.type === "Finance" && r.amount).reduce((sum, r) => sum + (r.amount ?? 0), 0),
  }), [records]);

  function addRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    setRecords((old) => [{ id: crypto.randomUUID(), type, name: value, detail: detail.trim(), amount: amount ? Number(amount) : undefined, createdAt: new Date().toISOString() }, ...old]);
    setName(""); setDetail(""); setAmount(""); setAdding(false);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "goshen-workspace-backup.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  const today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#1c2921]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#e7ebe6] bg-white px-5 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#174c35] text-white"><Leaf className="h-5 w-5" /></span>
          <div><div className="text-[15px] font-bold tracking-[.11em]">GOSHEN</div><div className="text-[10px] font-semibold tracking-[.18em] text-[#829087]">FARM OPERATIONS</div></div>
        </div>
        <div className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#98a39b]">Workspace</div>
        <nav className="space-y-1" aria-label="Workspace sections">{sections.map(({ name: item, icon: Icon }) => (
          <button key={item} onClick={() => setSection(item)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${section === item ? "bg-[#edf5ef] text-[#174c35]" : "text-[#6c7970] hover:bg-[#f5f7f4] hover:text-[#1c2921]"}`}>
            <Icon className="h-[17px] w-[17px]" />{item}{item === "Overview" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2d8b59]" />}
          </button>
        ))}</nav>
        <div className="mt-auto rounded-2xl bg-[#f4f7f3] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-[#51a36f]" />Local workspace</div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#78857c]">Your records are saved on this device. No account needed.</p>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[252px]">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-[#e7ebe6] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-[#66746b] lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu className="h-5 w-5" /></button>
            <div className="hidden items-center gap-2 text-xs text-[#89948c] sm:flex"><span>Workspace</span><span>/</span><span className="font-semibold text-[#34443a]">{section}</span></div>
            <div className="font-bold tracking-[.1em] lg:hidden">GOSHEN</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-[#8a958d] md:block">{today}</span>
            <button onClick={exportData} title="Download workspace backup" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e5eae5] px-3 text-xs font-semibold text-[#47564b] hover:bg-[#f5f7f4]"><ArrowDownToLine className="h-4 w-4"/><span className="hidden sm:block">Backup</span></button>
            <button onClick={() => { setType(section === "Overview" ? "Farms" : section); setAdding(true); }} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#174c35] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#103e2a]"><Plus className="h-4 w-4"/>Add record</button>
          </div>
        </header>

        {menuOpen && <nav className="absolute z-20 w-full border-b border-[#e7ebe6] bg-white p-3 shadow-lg lg:hidden">{sections.map(({name: item, icon: Icon}) => <button key={item} onClick={() => {setSection(item); setMenuOpen(false);}} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm"><Icon className="h-4 w-4"/>{item}</button>)}</nav>}
        <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#65806d]"><span className="h-1.5 w-1.5 rounded-full bg-[#4c9a64]"/>Farm management</div><h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">{section === "Overview" ? "Good day. Here’s your farm." : section}</h1><p className="mt-1.5 text-sm text-[#7d8981]">A clear view of your operation, all in one place.</p></div>
            <div className="flex items-center gap-2 text-xs text-[#7d8981]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf1eb] text-[#38644a]"><Activity className="h-4 w-4"/></span><span>{records.length} record{records.length === 1 ? "" : "s"} saved on this device</span></div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat icon={MapPinned} label="Farms & fields" value={totals.farms.toString()} note="properties recorded" tone="green"/>
            <Stat icon={Sprout} label="Crop records" value={totals.crops.toString()} note="growing activities" tone="lime"/>
            <Stat icon={Beef} label="Livestock" value={totals.livestock.toString()} note="herd records" tone="amber"/>
            <Stat icon={FileSpreadsheet} label="Expenses recorded" value={totals.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })} note="amount entered" tone="blue"/>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
            <section className="overflow-hidden rounded-2xl border border-[#e6ebe5] bg-white shadow-[0_2px_8px_rgba(31,53,37,.03)]">
              <div className="flex flex-col gap-3 border-b border-[#edf0ec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><h2 className="text-sm font-semibold">{section === "Overview" ? "Recent records" : `${section} records`}</h2><p className="mt-1 text-xs text-[#8a958d]">Your latest farm updates</p></div>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-[#e7ebe6] px-3 sm:w-56"><Search className="h-4 w-4 text-[#98a39b]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records" className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0aaa2]"/></label>
              </div>
              {filtered.length ? <div className="divide-y divide-[#f0f2ef]">{filtered.map((r) => <article key={r.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles[r.type]}`}><TypeIcon type={r.type}/></span>
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{r.name}</div><div className="mt-1 truncate text-xs text-[#89948c]">{r.detail || r.type}</div></div>
                {r.amount !== undefined && <div className="mr-2 text-xs font-semibold">{r.amount.toLocaleString()}</div>}
                <span className="hidden rounded-full bg-[#f4f6f3] px-2.5 py-1 text-[10px] font-semibold text-[#66746b] sm:block">{r.type}</span>
                <time className="w-[62px] text-right text-[10px] text-[#9aa49d]">{new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(r.createdAt))}</time>
              </article>)}</div> : <div className="grid min-h-[275px] place-items-center px-6 py-10 text-center"><div className="max-w-xs"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f5f0] text-[#54745e]"><Wheat className="h-5 w-5"/></span><h3 className="mt-4 text-sm font-semibold">{query ? "No matching records" : "Your workspace is ready"}</h3><p className="mt-1.5 text-xs leading-relaxed text-[#87928a]">{query ? "Try another search term." : "Add your first farm, crop, livestock, or expense record to get started."}</p>{!query && <button onClick={() => {setType(section === "Overview" ? "Farms" : section); setAdding(true);}} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#174c35] px-3.5 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Create first record</button>}</div></div>}
              {filtered.length > 0 && <div className="border-t border-[#edf0ec] px-6 py-3 text-[11px] text-[#929d95]">Showing {filtered.length} of {records.length} records</div>}
            </section>

            <div className="space-y-5">
              <section className="rounded-2xl border border-[#e6ebe5] bg-white p-5 shadow-[0_2px_8px_rgba(31,53,37,.03)]"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Quick actions</h2><Settings2 className="h-4 w-4 text-[#9aa49d]"/></div><div className="mt-4 space-y-2">{sections.slice(1).map(({name: item, icon: Icon}) => <button key={item} onClick={() => {setType(item as Exclude<Section, "Overview">);setAdding(true);}} className="flex w-full items-center gap-3 rounded-xl border border-[#edf0ec] px-3 py-3 text-left transition hover:border-[#cbd9ce] hover:bg-[#fafcf9]"><span className={`grid h-8 w-8 place-items-center rounded-lg ${styles[item]}`}><Icon className="h-4 w-4"/></span><span className="flex-1 text-xs font-semibold">Add {item.toLowerCase()} record</span><Plus className="h-4 w-4 text-[#98a39b]"/></button>)}</div></section>
              <section className="relative overflow-hidden rounded-2xl bg-[#174c35] p-5 text-white"><span className="absolute -right-7 -top-7 h-28 w-28 rounded-full border border-white/10"/><span className="absolute -right-2 -top-2 h-16 w-16 rounded-full border border-white/10"/><div className="flex items-center gap-2 text-xs font-semibold"><CloudSun className="h-4 w-4 text-[#c0d6a8]"/>Field note</div><p className="mt-3 text-sm font-medium leading-relaxed">Keep your operation in view.</p><p className="mt-1 text-xs leading-relaxed text-white/65">Capture the small details today that help guide the season ahead.</p><div className="mt-4 flex items-center gap-2 text-[10px] text-white/55"><Tractor className="h-3.5 w-3.5"/>GOSHEN farm operations</div></section>
              <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-[#8b968e]"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0"/>Data is stored in this browser on this device. Use Backup to download a copy.</p>
            </div>
          </div>
        </div>
      </main>

      {adding && <div className="fixed inset-0 z-50 grid place-items-center bg-[#102318]/40 p-4" onMouseDown={(e) => {if (e.target === e.currentTarget) setAdding(false);}}><form onSubmit={addRecord} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#65806d]">New entry</div><h2 className="mt-1 text-lg font-semibold">Add a farm record</h2></div><button type="button" onClick={() => setAdding(false)} aria-label="Close" className="rounded-lg p-1 text-[#829087] hover:bg-[#f2f5f1]"><X className="h-5 w-5"/></button></div>
        <label className="mt-5 block text-xs font-semibold">Record type<select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1.5 h-10 w-full rounded-lg border border-[#e2e8e1] bg-white px-3 text-sm">{sections.slice(1).map((s) => <option key={s.name}>{s.name}</option>)}</select></label>
        <label className="mt-4 block text-xs font-semibold">Name<input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "Farms" ? "e.g. North field" : `e.g. ${type} entry`} className="mt-1.5 h-10 w-full rounded-lg border border-[#e2e8e1] px-3 text-sm outline-none focus:border-[#3d8055]"/></label>
        <label className="mt-4 block text-xs font-semibold">Notes <span className="font-normal text-[#929d95]">(optional)</span><textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} placeholder="Add a useful detail..." className="mt-1.5 w-full resize-none rounded-lg border border-[#e2e8e1] px-3 py-2 text-sm outline-none focus:border-[#3d8055]"/></label>
        {type === "Finance" && <label className="mt-4 block text-xs font-semibold">Amount<input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="mt-1.5 h-10 w-full rounded-lg border border-[#e2e8e1] px-3 text-sm outline-none focus:border-[#3d8055]"/></label>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAdding(false)} className="h-10 rounded-lg px-4 text-xs font-semibold text-[#657269] hover:bg-[#f3f5f2]">Cancel</button><button type="submit" className="h-10 rounded-lg bg-[#174c35] px-4 text-xs font-semibold text-white hover:bg-[#103e2a]">Save record</button></div>
      </form></div>}
    </div>
  );
}

function TypeIcon({ type }: { type: RecordItem["type"] }) {
  const Icon = type === "Farms" ? MapPinned : type === "Crops" ? Sprout : type === "Livestock" ? Beef : FileSpreadsheet;
  return <Icon className="h-[17px] w-[17px]"/>;
}
function Stat({ icon: Icon, label, value, note, tone }: { icon: typeof Activity; label: string; value: string; note: string; tone: string }) {
  const colors: Record<string, string> = { green: "bg-[#edf5ef] text-[#2b7045]", lime: "bg-[#f2f6e9] text-[#69843d]", amber: "bg-[#fbf3e5] text-[#a4772b]", blue: "bg-[#edf3f8] text-[#4f7696]" };
  return <div className="rounded-2xl border border-[#e6ebe5] bg-white p-4 shadow-[0_2px_8px_rgba(31,53,37,.03)] sm:p-5"><div className="flex items-start justify-between"><span className="text-xs font-medium text-[#78857c]">{label}</span><span className={`grid h-8 w-8 place-items-center rounded-lg ${colors[tone]}`}><Icon className="h-4 w-4"/></span></div><div className="mt-3 text-[25px] font-semibold tracking-tight">{value}</div><div className="mt-1 text-[10px] text-[#9aa49d]">{note}</div></div>;
}
