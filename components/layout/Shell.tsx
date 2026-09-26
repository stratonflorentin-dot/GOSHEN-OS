"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3, Beef, Boxes, ChevronLeft, Cloud,
  Command, Home, Leaf, LogOut, Map, Menu, Plus, Search,
  Sprout, Wallet, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Item = { href: string; label: string; icon: LucideIcon };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Workspace", items: [
    { href: "/dashboard", label: "Overview", icon: Home },
    { href: "/farms", label: "Farms", icon: Map },
    { href: "/map", label: "Farm map", icon: Map },
    { href: "/plots", label: "Plots", icon: Command },
  ] },
  { label: "Production", items: [
    { href: "/crops", label: "Crops", icon: Sprout },
    { href: "/livestock", label: "Livestock", icon: Beef },
    { href: "/inventory", label: "Inventory", icon: Boxes },
  ] },
  { label: "Insights & finance", items: [
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: "/weather", label: "Weather", icon: Cloud },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ] },
];
const SEARCH_ITEMS = GROUPS.flatMap((group) => group.items);
const QUICK_ACTIONS: Item[] = [
  { href: "/farms/new", label: "Create farm", icon: Map },
  { href: "/plots/new", label: "Record field boundary", icon: Map },
  { href: "/crops/plan", label: "Plan crop season", icon: Sprout },
  { href: "/livestock/new", label: "Add livestock batch", icon: Beef },
  { href: "/inventory/new", label: "Add inventory", icon: Boxes },
  { href: "/finance/journal/new", label: "Record expense", icon: Wallet },
];

function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);
  const results = query.trim() ? SEARCH_ITEMS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5) : [];
  return <div className="relative hidden w-full max-w-sm md:block">
    <form onSubmit={(event) => { event.preventDefault(); const match = results[0]; if (match) { router.push(match.href); setQuery(""); setOpen(false); } }} className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-muted-foreground focus-within:border-primary/60">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
      <input ref={inputRef} aria-label="Search sections" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); setQuery(""); } }} placeholder="Search GOSHEN" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
      <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
    </form>
    {open && query && <><button aria-label="Close search results" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} /><div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg">{results.length ? results.map((item) => <Link key={item.href} href={item.href} onClick={() => { setOpen(false); setQuery(""); }} className="flex items-center gap-2 rounded px-2.5 py-2 text-sm hover:bg-muted"><item.icon className="h-4 w-4 text-muted-foreground" />{item.label}</Link>) : <p className="px-3 py-2 text-sm text-muted-foreground">No sections found</p>}</div></>}
  </div>;
}

function QuickActions({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="quick-actions-title">
    <button aria-label="Close quick actions" onClick={onClose} className="absolute inset-0 bg-black/40" />
    <section className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
      <div className="mb-4 flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Create</p><h2 id="quick-actions-title" className="mt-1 text-lg font-semibold">What would you like to record?</h2></div><button onClick={onClose} aria-label="Close" className="rounded p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
      <div className="divide-y divide-border">{QUICK_ACTIONS.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={onClose} className="flex min-h-12 items-center gap-3 py-2 text-sm font-medium hover:text-primary"><Icon className="h-4 w-4 text-muted-foreground" />{label}</Link>)}</div>
    </section>
  </div>;
}

export function Shell({ userName, orgName, children }: { userName: string; orgName: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  async function signOut() { await authClient.signOut(); router.push("/login"); }
  const current = SEARCH_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return <div className="min-h-[100dvh] pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3 sm:px-5">
      <button onClick={() => setMobileMenu((value) => !value)} aria-label="Open navigation" aria-expanded={mobileMenu} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"><Menu className="h-5 w-5" /></button>
      <Link href="/dashboard" className="flex w-[190px] shrink-0 items-center gap-2.5 lg:w-[210px]">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[#174c35] text-white"><Leaf className="h-4 w-4" /></span>
        <span className="min-w-0"><span className="block text-[13px] font-bold leading-tight tracking-[.07em]">GOSHEN <span className="font-medium tracking-normal text-muted-foreground">OS</span></span><span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">Agricultural operating system</span></span>
      </Link>
      <div className="hidden h-6 border-l border-border lg:block" />
      <div className="relative hidden min-w-0 items-center text-sm md:flex"><span className="max-w-48 truncate font-medium" title={orgName || "Organization"}>{orgName || "Organization"}</span></div>
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <SearchBox />
        <ThemeToggle className="h-8 w-8 rounded-md" />
        <span className="hidden max-w-[150px] truncate text-xs text-muted-foreground sm:block">{current?.label || "Workspace"}</span>
        <button onClick={signOut} aria-label={`Sign out ${userName}`} title="Sign out" className="flex h-8 items-center gap-2 rounded-md border border-border px-1.5 text-xs font-medium hover:bg-muted sm:px-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary-50 text-[11px] font-semibold text-primary-700">{(userName || "U").slice(0, 1).toUpperCase()}</span><span className="hidden max-w-24 truncate lg:block">{userName}</span><LogOut className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" /></button>
      </div>
    </header>
    <div className="flex min-h-[calc(100dvh-3.5rem)]">
      <aside className={cn("sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150 lg:flex", collapsed ? "w-[68px]" : "w-[232px]")}>
        <div className="flex-1 overflow-y-auto px-2.5 py-4">{GROUPS.map((group) => <div key={group.label} className="mb-5">
          {!collapsed && <h2 className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">{group.label}</h2>}
          <nav aria-label={group.label} className="space-y-0.5">{group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={cn("flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors", collapsed && "justify-center px-0", active ? "bg-primary-50 font-semibold text-primary-800 dark:bg-primary/15 dark:text-primary-200" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="h-[17px] w-[17px] shrink-0" /><span className={collapsed ? "sr-only" : "truncate"}>{label}</span></Link>;
          })}</nav>
        </div>)}</div>
        <div className="border-t border-border p-2.5"><button onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs text-muted-foreground hover:bg-muted">{collapsed ? <ChevronLeft className="h-4 w-4 rotate-180" /> : <><ChevronLeft className="h-4 w-4" />Collapse sidebar</>}</button></div>
      </aside>
      <main id="main-content" className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 xl:px-8">{children}</main>
    </div>
    {mobileMenu && <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation"><button aria-label="Close navigation" onClick={() => setMobileMenu(false)} className="absolute inset-0 bg-black/35" /><aside className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col border-r border-border bg-card p-3 shadow-xl"><div className="flex items-center justify-between border-b border-border pb-3"><span className="text-sm font-semibold">{orgName || "GOSHEN OS"}</span><button onClick={() => setMobileMenu(false)} aria-label="Close navigation" className="rounded p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button></div><nav className="flex-1 space-y-4 overflow-y-auto py-4">{GROUPS.map((group) => <section key={group.label}><h2 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h2>{group.items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileMenu(false)} className={cn("flex min-h-10 items-center gap-3 rounded-md px-2.5 text-sm", pathname === href || pathname.startsWith(`${href}/`) ? "bg-primary-50 font-semibold text-primary-800 dark:bg-primary/15 dark:text-primary-200" : "text-foreground hover:bg-muted")}><Icon className="h-4 w-4" />{label}</Link>)}</section>)}</nav></aside></div>}
    {addOpen && <QuickActions onClose={() => setAddOpen(false)} />}
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {[{ href: "/dashboard", label: "Home", icon: Home }, { href: "/map", label: "Map", icon: Map }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]", pathname.startsWith(href) ? "font-semibold text-primary-700" : "text-muted-foreground")}><Icon className="h-[19px] w-[19px]" />{label}</Link>)}
      <button onClick={() => setAddOpen(true)} aria-label="Create record" className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-primary-700"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white"><Plus className="h-5 w-5" /></span>Add</button>
      <Link href="/crops" aria-current={pathname.startsWith("/crops") ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]", pathname.startsWith("/crops") ? "font-semibold text-primary-700" : "text-muted-foreground")}><Sprout className="h-[19px] w-[19px]" />Crops</Link>
      <button onClick={() => setMobileMenu(true)} aria-label="More sections" className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"><Menu className="h-[19px] w-[19px]" />More</button>
    </nav>
  </div>;
}
