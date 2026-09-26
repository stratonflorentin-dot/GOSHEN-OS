"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Map, Sprout, Beef, Boxes, Wallet, Cloud, BarChart3,
  Leaf, LogOut, Home, Plus, Grid2x2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";

type NavItem = { href: string; label: string; icon: LucideIcon; phase?: number };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/farms", label: "Farms", icon: Map },
  { href: "/plots", label: "Plots", icon: Grid2x2 },
  { href: "/crops", label: "Crops", icon: Sprout },
  { href: "/livestock", label: "Livestock", icon: Beef },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/map", label: "Field map", icon: Map },
  { href: "/weather", label: "Weather", icon: Cloud },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const QUICK_ACTIONS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "Add a farm", icon: Map, href: "/farms/new" },
  { label: "Plan a crop season", icon: Sprout, href: "/crops/plan" },
  { label: "Create livestock batch", icon: Beef, href: "/livestock/new" },
  { label: "Add inventory", icon: Boxes, href: "/inventory/new" },
  { label: "Record expense", icon: Wallet, href: "/finance/journal/new" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  if (typeof item.phase === "number") {
    return (
      <span
        className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/50"
        title={`Coming in Phase ${item.phase}`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {item.label}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-primary-50 font-medium text-primary-700"
          : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {item.label}
    </Link>
  );
}

function AddSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        aria-label="Close quick actions"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
        <h2 className="mb-3 text-base font-semibold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href} onClick={onClose} className="flex flex-col items-start gap-2 rounded-2xl border border-black/5 bg-white p-3.5 text-sm active:bg-black/[0.04]">
              <Icon className="h-5 w-5 text-primary-600" />{label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const homeActive = pathname.startsWith("/dashboard");
  const mapActive = pathname.startsWith("/farms") || pathname.startsWith("/map");
  const cropsActive = pathname.startsWith("/crops");
  const financeActive = pathname.startsWith("/finance");

  return (
    <>
      {addOpen && <AddSheet onClose={() => setAddOpen(false)} />}
      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(20,40,26,0.06)] backdrop-blur lg:hidden">
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
            homeActive ? "font-medium text-primary-700" : "text-muted-foreground",
          )}
        >
            <Home className="h-5 w-5" />
          Home
        </Link>
        <Link
          href="/map"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
            mapActive ? "font-medium text-primary-700" : "text-muted-foreground",
          )}
        >
          <Map className="h-5 w-5" />
          Map
        </Link>
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Add"
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted-foreground"
        >
          <span className="grid h-9 w-9 -translate-y-1 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
            <Plus className="h-5 w-5" />
          </span>
          Add
        </button>
        <Link
          href="/crops"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
            cropsActive ? "font-medium text-primary-700" : "text-muted-foreground",
          )}
        >
          <Sprout className="h-5 w-5" />
          Crops
        </Link>
        <Link
          href="/finance"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
            financeActive ? "font-medium text-primary-700" : "text-muted-foreground",
          )}
        >
          <Wallet className="h-5 w-5" />
          Finance
        </Link>
      </nav>
    </>
  );
}

export function Shell({
  userName,
  orgName,
  children,
}: {
  userName: string;
  orgName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          {/* Brand (mobile) */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#174c35] text-white shadow-sm">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-[.12em]">GOSHEN <span className="font-medium tracking-normal text-muted-foreground">OS</span></span>
          </Link>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#55a271]"/>Farm operations</div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Org selector (mobile) */}
            {orgName && <div title={orgName} className="hidden max-w-[180px] rounded-lg bg-[#f4f7f3] px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:block lg:hidden"><span className="block truncate">{orgName}</span></div>}

            <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 hover:bg-primary-200 lg:hidden">
              {(userName || "U").slice(0, 1).toUpperCase()}
            </button>

            {/* Account (desktop) */}
            <div className="hidden items-center gap-1 lg:flex">
              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-black/5 hover:text-foreground"
                title="Sign out"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {(userName || "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate">{userName}</span>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col overflow-y-auto border-r border-[#e7ebe6] bg-white px-4 py-6 lg:flex">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#174c35] text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </span>
            <span><span className="block text-sm font-bold tracking-[.12em]">GOSHEN OS</span><span className="mt-0.5 block text-[9px] font-semibold tracking-[.15em] text-muted-foreground">FARM OPERATIONS</span></span>
          </Link>

          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#98a39b]">Workspace</div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </nav>

          <div className="mt-5 rounded-2xl bg-[#f2f6f1] p-3.5 text-[11px] leading-relaxed text-[#718076]">One clear view of your farms, fields, and daily work.</div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
