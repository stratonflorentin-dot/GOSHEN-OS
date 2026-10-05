import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Wallet, TrendingUp, TrendingDown, CreditCard, Receipt, Plus,
  Calculator, FileText, ArrowRight,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import {
  getFinancialSummary, listExpenses, listRevenues, listPayments, ensureDefaultAccounts,
} from "@/services/financeService";
import { formatCurrency } from "@/lib/format";
import { FinancePageHeader } from "./_ui";

type RecentItem = {
  key: string;
  date: string;
  label: string;
  detail: string | null;
  kind: "expense" | "revenue" | "receipt" | "payment" | "transfer";
  amount: number;
  currency: string;
  href: string;
};

const KIND_BADGES: Record<RecentItem["kind"], string> = {
  expense: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  revenue: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  receipt: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  payment: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  transfer: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

const KIND_LABELS: Record<RecentItem["kind"], string> = {
  expense: "Expense",
  revenue: "Revenue",
  receipt: "Money in",
  payment: "Money out",
  transfer: "Transfer",
};

export default async function FinancePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  await ensureDefaultAccounts(user.id, org.id);
  const [summary, expenses, revenues, payments] = await Promise.all([
    getFinancialSummary(user.id, org.id),
    listExpenses(user.id, org.id, undefined, undefined, undefined, 10),
    listRevenues(user.id, org.id, undefined, undefined, undefined, 10),
    listPayments(user.id, org.id, 10),
  ]);

  const recent: RecentItem[] = [
    ...expenses.map<RecentItem>((e) => ({
      key: `exp-${e.id}`,
      date: e.expenseDate,
      label: e.vendorName ?? e.description ?? e.expenseNumber,
      detail: e.expenseNumber,
      kind: "expense",
      amount: Number(e.amount),
      currency: e.currency,
      href: "/finance/expenses",
    })),
    ...revenues.map<RecentItem>((r) => ({
      key: `rev-${r.id}`,
      date: r.revenueDate,
      label: r.customerName ?? r.description ?? r.revenueNumber,
      detail: r.revenueNumber,
      kind: "revenue",
      amount: Number(r.amount),
      currency: r.currency,
      href: "/finance/revenues",
    })),
    ...payments.map<RecentItem>((p) => ({
      key: `pay-${p.id}`,
      date: p.paymentDate,
      label: p.counterpartyName ?? p.paymentNumber,
      detail: p.paymentNumber,
      kind: (p.paymentType as RecentItem["kind"]) ?? "transfer",
      amount: Number(p.amount),
      currency: p.currency,
      href: "/finance/payments",
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10);

  const kpis = [
    {
      href: "/finance/revenues",
      label: "Total Revenue",
      value: summary.totalRevenue,
      icon: TrendingUp,
      cls: "bg-blue-50 text-blue-700",
      valueCls: "text-blue-700",
      span: false,
    },
    {
      href: "/finance/expenses",
      label: "Total Expenses",
      value: summary.totalExpenses,
      icon: TrendingDown,
      cls: "bg-red-50 text-red-700",
      valueCls: "text-red-700",
      span: false,
    },
    {
      href: "/finance/payments",
      label: "Cash Balance",
      value: summary.cashBalance,
      icon: CreditCard,
      cls: "bg-primary-50 text-primary-700",
      valueCls: "",
      span: false,
    },
    {
      href: "/finance/revenues",
      label: "Accounts Receivable",
      value: summary.accountsReceivable,
      icon: Receipt,
      cls: "bg-amber-50 text-amber-700",
      valueCls: "",
      span: false,
    },
    {
      href: "/finance/expenses",
      label: "Accounts Payable",
      value: summary.accountsPayable,
      icon: FileText,
      cls: "bg-purple-50 text-purple-700",
      valueCls: "",
      span: false,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Finance"
        subtitle={org.name}
        action={
          <Link
            href="/finance/journal/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> Journal entry
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        <Link
          href="/finance/journal"
          className="card flex items-center gap-3.5 p-4.5 transition hover:border-primary/40 xl:col-span-2"
        >
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${summary.netProfit >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {summary.netProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className={`stat-value ${summary.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(summary.netProfit)}
            </div>
            <div className="truncate text-xs text-muted-foreground">Net Profit</div>
          </div>
        </Link>
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="card flex items-center gap-3.5 p-4.5 transition hover:border-primary/40">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${kpi.cls}`}>
              <kpi.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className={`stat-value ${kpi.valueCls}`}>{formatCurrency(kpi.value)}</div>
              <div className="truncate text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/finance/journal/new" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 transition hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700"><Calculator className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Create Journal Entry</p>
              <p className="text-xs text-muted-foreground">Record a double-entry transaction</p>
            </div>
          </a>
          <a href="/finance/expenses" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 transition hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700"><TrendingDown className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Record Expense</p>
              <p className="text-xs text-muted-foreground">Log an operational expense</p>
            </div>
          </a>
          <a href="/finance/revenues" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 transition hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-50 text-green-700"><TrendingUp className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Record Revenue</p>
              <p className="text-xs text-muted-foreground">Log a sales revenue entry</p>
            </div>
          </a>
          <a href="/finance/payments" className="flex items-center gap-3 rounded-xl border border-black/5 p-4 transition hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700"><CreditCard className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Record Payment</p>
              <p className="text-xs text-muted-foreground">Log cash/bank/mobile money movement</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Transactions</h2>
          {recent.length > 0 && (
            <Link href="/finance/journal" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View journal <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-muted-foreground dark:border-white/10">
            No transactions yet. Use the quick actions above to record your first expense, revenue or payment.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {recent.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="flex items-center gap-3 py-2.5 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.date}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${KIND_BADGES[item.kind]}`}>
                    {KIND_LABELS[item.kind]}
                  </span>
                  <span className={`w-28 shrink-0 text-right font-mono text-sm font-medium ${item.kind === "revenue" || item.kind === "receipt" ? "text-emerald-700 dark:text-emerald-300" : item.kind === "expense" || item.kind === "payment" ? "text-red-700 dark:text-red-300" : ""}`}>
                    {item.kind === "revenue" || item.kind === "receipt" ? "+" : item.kind === "expense" || item.kind === "payment" ? "−" : ""}
                    {formatCurrency(item.amount, item.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Module navigation */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/finance/chart-of-accounts", icon: FileText, iconCls: "bg-primary-50 text-primary-700", label: "Chart of Accounts", desc: "Manage account structure" },
            { href: "/finance/journal", icon: Calculator, iconCls: "bg-primary-50 text-primary-700", label: "Journal Entries", desc: "View and post entries" },
            { href: "/finance/expenses", icon: TrendingDown, iconCls: "bg-red-50 text-red-700", label: "Expenses", desc: "Track operational costs" },
            { href: "/finance/revenues", icon: TrendingUp, iconCls: "bg-green-50 text-green-700", label: "Revenues", desc: "Track sales income" },
            { href: "/finance/payments", icon: CreditCard, iconCls: "bg-blue-50 text-blue-700", label: "Payments", desc: "Cash & bank movements" },
            { href: "/finance/cost-allocations", icon: FileText, iconCls: "bg-purple-50 text-purple-700", label: "Cost Allocations", desc: "Distribute costs to enterprises" },
            { href: "/finance/assets", icon: Receipt, iconCls: "bg-amber-50 text-amber-700", label: "Fixed Assets", desc: "Asset register & depreciation" },
            { href: "/finance/loans", icon: Wallet, iconCls: "bg-indigo-50 text-indigo-700", label: "Loans", desc: "Loan register & repayments" },
          ].map((mod) => (
            <Link key={mod.href} href={mod.href} className="flex items-center gap-3 rounded-xl border border-black/5 p-4 transition hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]">
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${mod.iconCls}`}><mod.icon className="h-5 w-5" /></span>
              <div>
                <p className="font-medium">{mod.label}</p>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
