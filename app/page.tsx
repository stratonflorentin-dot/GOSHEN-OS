import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Beef,
  Boxes,
  CloudSun,
  Compass,
  Leaf,
  MapPinned,
  ShieldCheck,
  Sprout,
  Wallet,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";

const modules = [
  { icon: MapPinned, title: "Land & GIS", detail: "Farms, boundaries, plots, and field maps" },
  { icon: Sprout, title: "Production", detail: "Crop seasons, livestock, and harvest records" },
  { icon: Boxes, title: "Operations", detail: "Inventory, inputs, tasks, and daily work" },
  { icon: Wallet, title: "Finance", detail: "Transactions, costs, revenue, and profitability" },
  { icon: CloudSun, title: "Field context", detail: "Weather, observations, and farm analytics" },
  { icon: ShieldCheck, title: "Organization", detail: "A shared account with tenant-scoped access" },
];

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f8f4] text-[#18251d]">
      <header className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="GOSHEN OS home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#174c35] text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold tracking-[.14em]">GOSHEN <span className="font-medium tracking-normal text-[#758279]">OS</span></span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link href="/login" className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-[#536359] hover:bg-white">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-[#174c35] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#103e2a]">Create account</Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pt-20">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce8dc] bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#41624b]">
            <span className="h-2 w-2 rounded-full bg-[#63a273]" /> Agricultural operations platform
          </div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-.04em] sm:text-5xl lg:text-[3.65rem]">
            Run your farm business from <span className="text-[#32714b]">one place.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#65736a] sm:text-lg sm:leading-8">
            Connect your organization, farms, fields, production, inventory, and finances in a workspace built for agricultural teams.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#174c35] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(23,76,53,.16)] transition hover:bg-[#103e2a]">
              Set up your organization <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dfe7df] bg-white px-5 text-sm font-semibold text-[#33453a] transition hover:bg-[#fafffa]">
              Sign in to GOSHEN OS
            </Link>
          </div>
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#7a877e]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5d8767]" />
            Your account starts with an organization. Add one farm or manage a growing portfolio.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute -right-12 -top-14 h-52 w-52 rounded-full bg-[#dfeedd] blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#e7eee0] blur-3xl" />
          <div className="relative overflow-hidden rounded-[26px] border border-[#dce5dc] bg-white p-4 shadow-[0_28px_80px_rgba(30,54,37,.12)] sm:p-5">
            <div className="flex items-center justify-between border-b border-[#edf1ec] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#edf5ee] text-[#326d48]"><Compass className="h-[18px] w-[18px]" /></span>
                <div><div className="text-xs font-semibold">Farm operations</div><div className="mt-0.5 text-[10px] text-[#8a958d]">Organization workspace</div></div>
              </div>
              <span className="rounded-full bg-[#eff6ef] px-2.5 py-1 text-[10px] font-semibold text-[#4d7958]">Cloud account</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {modules.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="min-h-[118px] rounded-xl border border-[#edf1ed] bg-[#fcfdfb] p-3.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf5ee] text-[#326d48]"><Icon className="h-4 w-4" /></span>
                  <div className="mt-3 text-xs font-semibold">{title}</div>
                  <div className="mt-1 text-[10px] leading-4 text-[#7e8b81]">{detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f3f7f1] px-3.5 py-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-[#526458]"><BarChart3 className="h-4 w-4 text-[#52815c]" /> Business records stay connected</div>
              <div className="flex -space-x-1.5"><span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#f3f7f1] bg-[#d9e8d6] text-[#477050]"><Sprout className="h-3 w-3" /></span><span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#f3f7f1] bg-[#efe8d7] text-[#8a7547]"><Beef className="h-3 w-3" /></span><span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#f3f7f1] bg-[#dbe9e6] text-[#477b6d]"><Wallet className="h-3 w-3" /></span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e6ece5] bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-7 sm:flex-row sm:items-center sm:px-8">
          <div><p className="text-sm font-semibold">Prefer to explore without an account?</p><p className="mt-1 text-xs text-[#77847a]">The device-only workspace is still available as an optional local demo. Its records do not sync.</p></div>
          <Link href="/workspace" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dfe7df] bg-white px-4 text-xs font-semibold text-[#3b5944] hover:bg-[#f8fbf7]">Open local demo <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>
    </main>
  );
}
