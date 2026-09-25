import { redirect } from "next/navigation";
import { Wallet, TrendingUp, TrendingDown, CreditCard, Receipt, ArrowLeft, Plus, Calculator, FileText } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { getFinancialSummary } from "@/services/financeService";
import { formatCurrency } from "@/lib/format";

export default async function FinancePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const summary = await getFinancialSummary(user.id, org.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary-600" /> Finance
          </h1>
          <p className="text-sm text-muted-foreground">{org.name}</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/finance/journal/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> Journal entry
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        <div className="card flex items-center gap-3.5 p-4.5 xl:col-span-2 2xl:col-span-2">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-50 text-green-700">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="stat-value text-green-700">{formatCurrency(summary.netProfit)}</div>
            <div className="truncate text-xs text-muted-foreground">Net Profit</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="stat-value text-blue-700">{formatCurrency(summary.totalRevenue)}</div>
            <div className="truncate text-xs text-muted-foreground">Total Revenue</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="stat-value text-red-700">{formatCurrency(summary.totalExpenses)}</div>
            <div className="truncate text-xs text-muted-foreground">Total Expenses</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="stat-value">{formatCurrency(summary.cashBalance)}</div>
            <div className="truncate text-xs text-muted-foreground">Cash Balance</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Receipt className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="stat-value">{formatCurrency(summary.accountsReceivable)}</div>
            <div className="truncate text-xs text-muted-foreground">Accounts Receivable</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 p-4.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="stat-value">{formatCurrency(summary.accountsPayable)}</div>
            <div className="truncate text-xs text-muted-foreground">Accounts Payable</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/finance/journal/new"
            className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Create Journal Entry</p>
              <p className="text-xs text-muted-foreground">Record a double-entry transaction</p>
            </div>
          </a>
          <a
            href="/finance/expenses"
            className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700">
              <TrendingDown className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Record Expense</p>
              <p className="text-xs text-muted-foreground">Log an operational expense</p>
            </div>
          </a>
          <a
            href="/finance/revenues"
            className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-50 text-green-700">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Record Revenue</p>
              <p className="text-xs text-muted-foreground">Log a sales revenue entry</p>
            </div>
          </a>
          <a
            href="/finance/payments"
            className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Record Payment</p>
              <p className="text-xs text-muted-foreground">Log cash/bank/mobile money movement</p>
            </div>
          </a>
        </div>
      </div>

      {/* Module Navigation */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/finance/chart-of-accounts" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700"><FileText className="h-5 w-5" /></span>
            <div><p className="font-medium">Chart of Accounts</p><p className="text-xs text-muted-foreground">Manage account structure</p></div>
          </a>
          <a href="/finance/journal" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700"><Calculator className="h-5 w-5" /></span>
            <div><p className="font-medium">Journal Entries</p><p className="text-xs text-muted-foreground">View and post entries</p></div>
          </a>
          <a href="/finance/expenses" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700"><TrendingDown className="h-5 w-5" /></span>
            <div><p className="font-medium">Expenses</p><p className="text-xs text-muted-foreground">Track operational costs</p></div>
          </a>
          <a href="/finance/revenues" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-50 text-green-700"><TrendingUp className="h-5 w-5" /></span>
            <div><p className="font-medium">Revenues</p><p className="text-xs text-muted-foreground">Track sales income</p></div>
          </a>
          <a href="/finance/payments" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700"><CreditCard className="h-5 w-5" /></span>
            <div><p className="font-medium">Payments</p><p className="text-xs text-muted-foreground">Cash & bank movements</p></div>
          </a>
          <a href="/finance/cost-allocations" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-50 text-purple-700"><FileText className="h-5 w-5" /></span>
            <div><p className="font-medium">Cost Allocations</p><p className="text-xs text-muted-foreground">Distribute costs to enterprises</p></div>
          </a>
          <a href="/finance/assets" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><Receipt className="h-5 w-5" /></span>
            <div><p className="font-medium">Fixed Assets</p><p className="text-xs text-muted-foreground">Asset register & depreciation</p></div>
          </a>
          <a href="/finance/loans" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 hover:bg-black/[0.02] transition">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Wallet className="h-5 w-5" /></span>
            <div><p className="font-medium">Loans</p><p className="text-xs text-muted-foreground">Loan register & repayments</p></div>
          </a>
        </div>
      </div>
    </div>
  );
}