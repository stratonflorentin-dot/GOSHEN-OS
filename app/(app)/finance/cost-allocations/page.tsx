import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listCostAllocations, listExpenses } from "@/services/financeService";
import { listFarmGeo } from "@/services/farmService";
import { formatCurrency } from "@/lib/format";
import { createCostAllocationAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls } from "../_ui";

export default async function CostAllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].organization.id;

  const [allocations, expenses, farms, { error }] = await Promise.all([
    listCostAllocations(user.id, orgId),
    listExpenses(user.id, orgId),
    listFarmGeo(user.id, orgId),
    searchParams,
  ]);

  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  const farmById = new Map(farms.map((f) => [f.farmId, f]));
  const today = new Date().toISOString().split("T")[0];
  const unallocated = expenses.filter((e) => !allocations.some((a) => a.sourceId === e.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Cost Allocations"
        subtitle="Assign expenses to farms and enterprises so profitability reflects true costs (§20)"
      />
      <ErrorBanner message={error} />

      <details className="card p-5" open={unallocated.length > 0 && allocations.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Allocate an expense
        </summary>
        <form action={createCostAllocationAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="sourceId" className={labelCls}>Expense to allocate</label>
            <select id="sourceId" name="sourceId" required className={inputCls}>
              {expenses.length === 0 && <option value="">No expenses recorded yet</option>}
              {expenses.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.expenseNumber} — {formatCurrency(Number(e.amount), e.currency)} {e.description ? `(${e.description})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className={labelCls}>Amount to allocate (TZS)</label>
            <input id="amount" name="amount" type="number" required min="0.01" step="0.01" className={inputCls} />
          </div>
          <div>
            <label htmlFor="allocationDate" className={labelCls}>Allocation date</label>
            <input id="allocationDate" name="allocationDate" type="date" required defaultValue={today} className={inputCls} />
          </div>
          <div>
            <label htmlFor="farmId" className={labelCls}>Allocate to farm</label>
            <select id="farmId" name="farmId" required className={inputCls}>
              {farms.map((f) => (
                <option key={f.farmId} value={f.farmId}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className={labelCls}>Notes (optional)</label>
            <input id="notes" name="notes" maxLength={2000} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={expenses.length === 0 || farms.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Save allocation
            </button>
          </div>
        </form>
      </details>

      {allocations.length === 0 ? (
        <EmptyState message="No allocations yet. Allocate an expense to a farm or enterprise above." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Source expense</th>
                <th className="px-5 py-3 font-semibold">Farm</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const source = expenseById.get(a.sourceId);
                return (
                  <tr key={a.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="whitespace-nowrap px-5 py-3">{a.allocationDate}</td>
                    <td className="px-5 py-3 font-mono text-xs">{source?.expenseNumber ?? a.sourceId.slice(0, 8)}</td>
                    <td className="px-5 py-3">{a.farmId ? (farmById.get(a.farmId)?.name ?? "—") : "—"}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatCurrency(Number(a.amount), a.currency)}</td>
                    <td className="max-w-[240px] truncate px-5 py-3 text-muted-foreground">{a.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
