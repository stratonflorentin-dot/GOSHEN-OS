import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listAssets } from "@/services/financeService";
import { formatCurrency } from "@/lib/format";
import { createAssetAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls } from "../_ui";

const ASSET_TYPES = [
  ["land", "Land"],
  ["building", "Building"],
  ["machinery", "Machinery"],
  ["vehicle", "Vehicle"],
  ["equipment", "Equipment"],
  ["irrigation", "Irrigation"],
  ["fencing", "Fencing"],
  ["other", "Other"],
];

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].organization.id;

  const [assets, { error }] = await Promise.all([
    listAssets(user.id, orgId),
    searchParams,
  ]);

  const typeLabel = (t: string) => ASSET_TYPES.find(([v]) => v === t)?.[1] ?? t;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Fixed Assets"
        subtitle="Asset register with depreciation tracking"
      />
      <ErrorBanner message={error} />

      <details className="card p-5" open={assets.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Register asset
        </summary>
        <form action={createAssetAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelCls}>Asset name</label>
            <input id="name" name="name" required maxLength={160} placeholder="e.g. Massey Ferguson Tractor" className={inputCls} />
          </div>
          <div>
            <label htmlFor="assetType" className={labelCls}>Asset type</label>
            <select id="assetType" name="assetType" required className={inputCls} defaultValue="machinery">
              {ASSET_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="purchaseDate" className={labelCls}>Purchase date (optional)</label>
            <input id="purchaseDate" name="purchaseDate" type="date" className={inputCls} />
          </div>
          <div>
            <label htmlFor="purchaseCost" className={labelCls}>Purchase cost (optional, TZS)</label>
            <input id="purchaseCost" name="purchaseCost" type="number" min="0" step="0.01" className={inputCls} />
          </div>
          <div>
            <label htmlFor="usefulLifeMonths" className={labelCls}>Useful life, months (optional)</label>
            <input id="usefulLifeMonths" name="usefulLifeMonths" type="number" min="1" step="1" placeholder="e.g. 120" className={inputCls} />
          </div>
          <div>
            <label htmlFor="serialNumber" className={labelCls}>Serial number (optional)</label>
            <input id="serialNumber" name="serialNumber" maxLength={80} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className={labelCls}>Notes (optional)</label>
            <input id="notes" name="notes" maxLength={2000} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
              <Plus className="h-4 w-4" /> Register asset
            </button>
          </div>
        </form>
      </details>

      {assets.length === 0 ? (
        <EmptyState message="No assets registered yet." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <th className="px-5 py-3 font-semibold">Number</th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">Cost</th>
                <th className="px-5 py-3 text-right font-semibold">Depreciation</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-mono text-xs">{a.assetNumber}</td>
                  <td className="px-5 py-3 font-medium">{a.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{typeLabel(a.assetType)}</td>
                  <td className="px-5 py-3 text-right font-mono">{a.purchaseCost ? formatCurrency(Number(a.purchaseCost), a.currency) : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                    {Number(a.accumulatedDepreciation) > 0 ? formatCurrency(Number(a.accumulatedDepreciation), a.currency) : "—"}
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
