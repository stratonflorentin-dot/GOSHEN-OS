"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Map,
  Sprout,
  Beef,
  Boxes,
  ShoppingCart,
  Wallet,
  Users,
  Tractor,
  Droplets,
  Cloud,
  BarChart3,
  FileBarChart,
  Sparkles,
  ListTodo,
  FolderOpen,
  Settings,
  Leaf,
  LogOut,
  Bell,
  Search,
  Home,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Wheat,
  Camera,
  Grid2x2,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";

type NavItem = { href: string; label: string; icon: LucideIcon; phase?: number };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/farms", label: "Farms", icon: Map },
  { href: "/map", label: "Map", icon: Map },
  { href: "/plots", label: "Plots", icon: Grid2x2 },
  { href: "/crops", label: "Crops", icon: Sprout },
  { href: "/livestock", label: "Livestock", icon: Beef },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/production", label: "Production", icon: BarChart3 },
  { href: "/labor", label: "Labor", icon: Users },
  { href: "/equipment", label: "Equipment", icon: Tractor },
  { href: "/irrigation", label: "Irrigation", icon: Droplets },
  { href: "/soil", label: "Soil", icon: Layers },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/weather", label: "Weather", icon: Cloud, phase: 7 },
  { href: "/analytics", label: "Analytics", icon: BarChart3, phase: 7 },
  { href: "/reports", label: "Reports", icon: FileBarChart, phase: 11 },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, phase: 10 },
];

const MORE_ACTIONS: NavItem[] = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const QUICK_ACTIONS: { label: string; icon: LucideIcon; phase?: number }[] = [
  { label: "Record crop activity", icon: Sprout, phase: 3 },
  { label: "Record livestock event", icon: Beef, phase: 3 },
  { label: "Record inventory movement", icon: Boxes, phase: 4 },
  { label: "Record expense", icon: Wallet, phase: 5 },
  { label: "Record harvest", icon: Wheat, phase: 6 },
  { label: "Record sale", icon: ShoppingCart, phase: 5 },
  { label: "Take field photo", icon: Camera, phase: 6 },
  { label: "Record GPS boundary", icon: Map },
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
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
        <h2 className="mb-3 text-base font-semibold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ label, icon: Icon, phase }) => {
            const upcoming = typeof phase === "number";
            return upcoming ? (
              <span
                key={label}
                className="flex cursor-default flex-col items-start gap-2 rounded-2xl border border-black/5 bg-black/[0.02] p-3.5 text-sm text-muted-foreground/60"
                title={`Coming in Phase ${phase}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </span>
            ) : (
              <Link
                key={label}
                href="/farms/new"
                onClick={onClose}
                className="flex flex-col items-start gap-2 rounded-2xl border border-black/5 bg-white p-3.5 text-sm active:bg-black/[0.04]"
              >
                <Icon className="h-5 w-5 text-primary-600" />
                {label}
              </Link>
            );
          })}
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
  const tasksActive = pathname.startsWith("/tasks");
  const moreActive = !homeActive && !mapActive && !tasksActive && !addOpen;

  return (
    <>
      {addOpen && <AddSheet onClose={() => setAddOpen(false)} />}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
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
          href="/farms"
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
          href="/tasks"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
            tasksActive ? "font-medium text-primary-700" : "text-muted-foreground",
          )}
        >
          <ListTodo className="h-5 w-5" />
          Tasks
        </Link>
        <Link
          href="/team"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
            moreActive ? "font-medium text-primary-700" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
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
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          {/* Brand (mobile) */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">HUNDREDFOLD</span>
          </Link>

          {/* Search (desktop) */}
          <div className="relative hidden w-full max-w-md lg:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="search"
              placeholder="Search farm, plot, livestock..."
              className="w-full rounded-xl border border-black/10 bg-black/[0.02] py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-black/5 hover:text-foreground"
              title="Notifications (Phase 6)"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* Org selector (mobile) */}
            {orgName && (
              <button className="hidden max-w-[180px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-black/5 sm:flex lg:hidden">
                <span className="truncate">{orgName}</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>
            )}

            {/* Account (desktop) */}
            <div className="hidden items-center gap-1 lg:flex">
              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-black/5 hover:text-foreground"
                title="Account"
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
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col overflow-y-auto border-r border-black/5 bg-white px-4 py-5 lg:flex">
          <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">HUNDREDFOLD</span>
          </Link>

          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </nav>

          <div className="mt-4 border-t border-black/5 pt-3">
            {MORE_ACTIONS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
