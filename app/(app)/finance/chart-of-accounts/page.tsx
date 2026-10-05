import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listAccounts, ensureDefaultAccounts } from "@/services/financeService";
import { createAccountAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls } from "../_ui";

const TYPE_GROUPS: Array<{ type: string; label: string }> = [
  { type: "asset", label: "Assets" },
  { type: "liability", label: "Liabilities" },
  { type: "equity", label: "Equity" },
  { type: "revenue", label: "Revenue" },
  { type: "expense", label: "Expenses" },
  { type: "cost_of_goods_sold", label: "Cost of Goods Sold" },
];

export default async function ChartOfAccountsPage({
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
  const accounts = await listAccounts(user.id, orgId);
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Chart of Accounts"
        subtitle={`${accounts.length} active accounts`}
      />
      <ErrorBanner message={error} />

      <details className="card p-5">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Add account
        </summary>
        <form action={createAccountAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="code" className={labelCls}>Account code</label>
            <input id="code" name="code" required maxLength={10} pattern="[0-9]+" placeholder="e.g. 5080" className={inputCls} />
          </div>
          <div>
            <label htmlFor="name" className={labelCls}>Account name</label>
            <input id="name" name="name" required maxLength={120} placeholder="e.g. Veterinary Services" className={inputCls} />
          </div>
          <div>
            <label htmlFor="accountType" className={labelCls}>Account type</label>
            <select id="accountType" name="accountType" required className={inputCls} defaultValue="expense">
              {TYPE_GROUPS.map((g) => (
                <option key={g.type} value={g.type}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="description" className={labelCls}>Description (optional)</label>
            <input id="description" name="description" maxLength={2000} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
              <Plus className="h-4 w-4" /> Create account
            </button>
          </div>
        </form>
      </details>

      <div className="space-y-5">
        {TYPE_GROUPS.map((group) => {
          const groupAccounts = accounts.filter((a) => a.accountType === group.type);
          if (groupAccounts.length === 0) return null;
          return (
            <section key={group.type} className="card overflow-hidden">
              <h2 className="border-b border-black/5 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:border-white/10">
                {group.label}
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {groupAccounts.map((a) => (
                    <tr key={a.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                      <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{a.code}</td>
                      <td className="px-5 py-2.5 font-medium">{a.name}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">{a.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
        {accounts.length === 0 && <EmptyState message="No accounts yet. Add your first account above." />}
      </div>
    </div>
  );
}
