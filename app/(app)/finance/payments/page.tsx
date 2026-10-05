import { redirect } from "next/navigation";
import { Plus, CreditCard } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listPayments, listAccounts, ensureDefaultAccounts } from "@/services/financeService";
import { formatCurrency } from "@/lib/format";
import { createPaymentAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls } from "../_ui";

const TYPE_LABELS: Record<string, string> = {
  receipt: "Receipt (money in)",
  payment: "Payment (money out)",
  transfer: "Transfer",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export default async function PaymentsPage({
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
  const [payments, accounts, { error }] = await Promise.all([
    listPayments(user.id, orgId),
    listAccounts(user.id, orgId, "asset"),
    searchParams,
  ]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Payments"
        subtitle="Cash, bank and mobile money movements — these determine your cash balance"
      />
      <ErrorBanner message={error} />

      <details className="card p-5" open={payments.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Record payment
        </summary>
        <form action={createPaymentAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="paymentDate" className={labelCls}>Date</label>
            <input id="paymentDate" name="paymentDate" type="date" required defaultValue={today} className={inputCls} />
          </div>
          <div>
            <label htmlFor="paymentType" className={labelCls}>Type</label>
            <select id="paymentType" name="paymentType" required className={inputCls} defaultValue="receipt">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="method" className={labelCls}>Method</label>
            <select id="method" name="method" required className={inputCls} defaultValue="mobile_money">
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="accountId" className={labelCls}>Account affected</label>
            <select id="accountId" name="accountId" required className={inputCls}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className={labelCls}>Amount (TZS)</label>
            <input id="amount" name="amount" type="number" required min="0.01" step="0.01" className={inputCls} />
          </div>
          <div>
            <label htmlFor="counterpartyName" className={labelCls}>Counterparty (optional)</label>
            <input id="counterpartyName" name="counterpartyName" maxLength={160} placeholder="Customer, supplier or person" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className={labelCls}>Notes (optional)</label>
            <input id="notes" name="notes" maxLength={2000} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
              <CreditCard className="h-4 w-4" /> Save payment
            </button>
          </div>
        </form>
      </details>

      {payments.length === 0 ? (
        <EmptyState message="No payments recorded yet. Log your first cash/bank movement above." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <th className="px-5 py-3 font-semibold">Number</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Counterparty</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 font-mono text-xs">{p.paymentNumber}</td>
                  <td className="whitespace-nowrap px-5 py-3">{p.paymentDate}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.paymentType === "receipt" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : p.paymentType === "transfer" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"}`}>
                      {p.paymentType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td className="px-5 py-3">{p.counterpartyName ?? "—"}</td>
                  <td className={`px-5 py-3 text-right font-mono ${p.paymentType === "receipt" ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                    {p.paymentType === "payment" ? "−" : ""}
                    {formatCurrency(Number(p.amount), p.currency)}
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
