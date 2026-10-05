import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listLoans, listLoanRepayments } from "@/services/financeService";
import { formatCurrency } from "@/lib/format";
import { createLoanAction, createLoanRepaymentAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState, labelCls, inputCls } from "../_ui";

const LENDER_TYPES = [
  ["bank", "Bank"],
  ["microfinance", "Microfinance"],
  ["cooperative", "Cooperative"],
  ["individual", "Individual"],
  ["government", "Government program"],
  ["other", "Other"],
];

const FREQUENCIES = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["semi_annual", "Semi-annual"],
  ["annual", "Annual"],
  ["bullet", "Bullet (at maturity)"],
];

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].organization.id;

  const [loans, { error }] = await Promise.all([
    listLoans(user.id, orgId),
    searchParams,
  ]);
  const repaymentsByLoan = new Map<string, Awaited<ReturnType<typeof listLoanRepayments>>>();
  for (const loan of loans) {
    repaymentsByLoan.set(loan.id, await listLoanRepayments(user.id, loan.id));
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Loans"
        subtitle="Loan register with repayments and outstanding balances"
      />
      <ErrorBanner message={error} />

      <details className="card p-5" open={loans.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Register loan
        </summary>
        <form action={createLoanAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lenderName" className={labelCls}>Lender</label>
            <input id="lenderName" name="lenderName" required maxLength={160} placeholder="e.g. NMB Bank" className={inputCls} />
          </div>
          <div>
            <label htmlFor="lenderType" className={labelCls}>Lender type</label>
            <select id="lenderType" name="lenderType" required className={inputCls} defaultValue="bank">
              {LENDER_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="principalAmount" className={labelCls}>Principal amount (TZS)</label>
            <input id="principalAmount" name="principalAmount" type="number" required min="0.01" step="0.01" className={inputCls} />
          </div>
          <div>
            <label htmlFor="interestRate" className={labelCls}>Interest rate (% per year)</label>
            <input id="interestRate" name="interestRate" type="number" required min="0.01" step="0.01" placeholder="e.g. 18" className={inputCls} />
          </div>
          <div>
            <label htmlFor="disbursementDate" className={labelCls}>Disbursement date</label>
            <input id="disbursementDate" name="disbursementDate" type="date" required defaultValue={today} className={inputCls} />
          </div>
          <div>
            <label htmlFor="maturityDate" className={labelCls}>Maturity date</label>
            <input id="maturityDate" name="maturityDate" type="date" required className={inputCls} />
          </div>
          <div>
            <label htmlFor="repaymentFrequency" className={labelCls}>Repayment frequency</label>
            <select id="repaymentFrequency" name="repaymentFrequency" required className={inputCls} defaultValue="monthly">
              {FREQUENCIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="purpose" className={labelCls}>Purpose (optional)</label>
            <input id="purpose" name="purpose" maxLength={500} placeholder="e.g. Broiler house construction" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
              <Plus className="h-4 w-4" /> Register loan
            </button>
          </div>
        </form>
      </details>

      {loans.length === 0 ? (
        <EmptyState message="No loans registered yet." />
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const repayments = repaymentsByLoan.get(loan.id) ?? [];
            return (
              <section key={loan.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {loan.lenderName} <span className="font-mono text-xs text-muted-foreground">{loan.loanNumber}</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {loan.interestRate}% / year · {FREQUENCIES.find(([v]) => v === loan.repaymentFrequency)?.[1] ?? loan.repaymentFrequency} · matures {loan.maturityDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">{formatCurrency(Number(loan.outstandingPrincipal), loan.currency)}</p>
                    <p className="text-xs text-muted-foreground">outstanding of {formatCurrency(Number(loan.principalAmount), loan.currency)}</p>
                  </div>
                </div>

                {repayments.length > 0 && (
                  <table className="mt-4 w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/5 text-left uppercase tracking-wide text-muted-foreground dark:border-white/10">
                        <th className="py-2 font-semibold">Date</th>
                        <th className="py-2 text-right font-semibold">Principal</th>
                        <th className="py-2 text-right font-semibold">Interest</th>
                        <th className="py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repayments.map((r) => (
                        <tr key={r.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                          <td className="py-2">{r.repaymentDate}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(Number(r.principalAmount), loan.currency)}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(Number(r.interestAmount), loan.currency)}</td>
                          <td className="py-2 text-right font-mono font-medium">{formatCurrency(Number(r.totalAmount), loan.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">Record repayment</summary>
                  <form action={createLoanRepaymentAction} className="mt-3 grid gap-3 sm:grid-cols-4">
                    <input type="hidden" name="loanId" value={loan.id} />
                    <div>
                      <label htmlFor={`rd-${loan.id}`} className={labelCls}>Date</label>
                      <input id={`rd-${loan.id}`} name="repaymentDate" type="date" required defaultValue={today} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor={`rp-${loan.id}`} className={labelCls}>Principal</label>
                      <input id={`rp-${loan.id}`} name="principalAmount" type="number" min="0" step="0.01" defaultValue="0" className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor={`ri-${loan.id}`} className={labelCls}>Interest</label>
                      <input id={`ri-${loan.id}`} name="interestAmount" type="number" min="0" step="0.01" defaultValue="0" className={inputCls} />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-primary px-3 text-xs font-medium text-white hover:bg-primary-600">
                        Save repayment
                      </button>
                    </div>
                  </form>
                </details>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
