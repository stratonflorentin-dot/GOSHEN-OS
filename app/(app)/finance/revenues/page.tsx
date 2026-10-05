import { redirect } from "next/navigation";
import { Plus, TrendingUp } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listRevenues, listAccounts, ensureDefaultAccounts } from "@/services/financeService";
import { listFarmGeo } from "@/services/farmService";
import { formatCurrency } from "@/lib/format";
import { createRevenueAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls, PAYMENT_STATUS_LABELS } from "../_ui";

export default async function RevenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].organization.id;

  await ensureDefaultAccounts(user.id, orgId);
  const [revenues, accounts, farms, { error }] = await Promise.all([
    listRevenues(user.id, orgId),
    listAccounts(user.id, orgId, "revenue"),
    listFarmGeo(user.id, orgId),
    searchParams,
  ]);

  const total = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Revenues"
        subtitle={`${revenues.length} record${revenues.length === 1 ? "" : "s"} — ${formatCurrency(total)}`}
      />
      <ErrorBanner message={error} />

      <details className="card p-5" open={revenues.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Record revenue
        </summary>
        <form action={createRevenueAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="revenueDate" className={labelCls}>Date</label>
            <input id="revenueDate" name="revenueDate" type="date" required defaultValue={today} className={inputCls} />
          </div>
          <div>
            <label htmlFor="accountId" className={labelCls}>Income account</label>
            <select id="accountId" name="accountId" required className={inputCls}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className={labelCls}>Amount (TZS)</label>
            <input id="amount" name="amount" type="number" required min="0.01" step="0.01" placeholder="e.g. 750000" className={inputCls} />
          </div>
          <div>
            <label htmlFor="customerName" className={labelCls}>Customer (optional)</label>
            <input id="customerName" name="customerName" maxLength={160} placeholder="Who paid?" className={inputCls} />
          </div>
          <div>
            <label htmlFor="category" className={labelCls}>Category (optional)</label>
            <input id="category" name="category" maxLength={60} placeholder="e.g. maize sales, broiler sales" className={inputCls} />
          </div>
          <div>
            <label htmlFor="farmId" className={labelCls}>Farm (optional)</label>
            <select id="farmId" name="farmId" className={inputCls}>
              <option value="">—</option>
              {farms.map((f) => (
                <option key={f.farmId} value={f.farmId}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentStatus" className={labelCls}>Payment status</label>
            <select id="paymentStatus" name="paymentStatus" className={inputCls} defaultValue="paid">
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div>
            <label htmlFor="invoiceNumber" className={labelCls}>Invoice number (optional)</label>
            <input id="invoiceNumber" name="invoiceNumber" maxLength={60} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelCls}>Description (optional)</label>
            <input id="description" name="description" maxLength={500} placeholder="What was sold?" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
              <TrendingUp className="h-4 w-4" /> Save revenue
            </button>
          </div>
        </form>
      </details>

      {revenues.length === 0 ? (
        <EmptyState message="No revenue recorded yet. Log your first sale above." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <th className="px-5 py-3 font-semibold">Number</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-mono text-xs">{r.revenueNumber}</td>
                  <td className="whitespace-nowrap px-5 py-3">{r.revenueDate}</td>
                  <td className="px-5 py-3">{r.customerName ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.category ?? r.description ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono">{formatCurrency(Number(r.amount), r.currency)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : r.paymentStatus === "partial" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"}`}>
                      {PAYMENT_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
