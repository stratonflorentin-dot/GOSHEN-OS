import { redirect } from "next/navigation";
import { Plus, TrendingDown } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listExpenses, listAccounts, ensureDefaultAccounts } from "@/services/financeService";
import { listFarmGeo } from "@/services/farmService";
import { formatCurrency } from "@/lib/format";
import { createExpenseAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls, PAYMENT_STATUS_LABELS } from "../_ui";

export default async function ExpensesPage({
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
  const [expenses, accounts, farms, { error }] = await Promise.all([
    listExpenses(user.id, orgId),
    listAccounts(user.id, orgId, "expense"),
    listFarmGeo(user.id, orgId),
    searchParams,
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Expenses"
        subtitle={`${expenses.length} record${expenses.length === 1 ? "" : "s"} — ${formatCurrency(total)}`}
      />
      <ErrorBanner message={error} />

      <details className="card p-5" open={expenses.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Record expense
        </summary>
        <form action={createExpenseAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="expenseDate" className={labelCls}>Date</label>
            <input id="expenseDate" name="expenseDate" type="date" required defaultValue={today} className={inputCls} />
          </div>
          <div>
            <label htmlFor="accountId" className={labelCls}>Expense account</label>
            <select id="accountId" name="accountId" required className={inputCls}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className={labelCls}>Amount (TZS)</label>
            <input id="amount" name="amount" type="number" required min="0.01" step="0.01" placeholder="e.g. 150000" className={inputCls} />
          </div>
          <div>
            <label htmlFor="vendorName" className={labelCls}>Vendor (optional)</label>
            <input id="vendorName" name="vendorName" maxLength={160} placeholder="e.g. Agro Dealer Ltd" className={inputCls} />
          </div>
          <div>
            <label htmlFor="category" className={labelCls}>Category (optional)</label>
            <input id="category" name="category" maxLength={60} placeholder="e.g. fertilizer, fuel, labor" className={inputCls} />
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
            <label htmlFor="receiptNumber" className={labelCls}>Receipt number (optional)</label>
            <input id="receiptNumber" name="receiptNumber" maxLength={60} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelCls}>Description (optional)</label>
            <input id="description" name="description" maxLength={500} placeholder="What was purchased?" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
              <TrendingDown className="h-4 w-4" /> Save expense
            </button>
          </div>
        </form>
      </details>

      {expenses.length === 0 ? (
        <EmptyState message="No expenses recorded yet. Log your first operational cost above." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <th className="px-5 py-3 font-semibold">Number</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Vendor</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-mono text-xs">{e.expenseNumber}</td>
                  <td className="whitespace-nowrap px-5 py-3">{e.expenseDate}</td>
                  <td className="px-5 py-3">{e.vendorName ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.category ?? e.description ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono">{formatCurrency(Number(e.amount), e.currency)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : e.paymentStatus === "partial" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"}`}>
                      {PAYMENT_STATUS_LABELS[e.paymentStatus] ?? e.paymentStatus}
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
