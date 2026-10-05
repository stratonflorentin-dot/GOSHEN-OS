import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import {
  listJournalEntries,
  listJournalLineTotals,
} from "@/services/financeService";
import { formatCurrency } from "@/lib/format";
import { postJournalEntryAction } from "../actions";
import { FinancePageHeader, ErrorBanner, EmptyState } from "../_ui";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].organization.id;

  const [entries, totals, { error }] = await Promise.all([
    listJournalEntries(user.id, orgId, 100),
    listJournalLineTotals(user.id, orgId),
    searchParams,
  ]);
  const totalsById = new Map(totals.map((t) => [t.entryId, t]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinancePageHeader
        title="Journal Entries"
        subtitle="Double-entry transactions — draft entries must be posted to take effect"
        action={
          <Link
            href="/finance/journal/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> New entry
          </Link>
        }
      />
      <ErrorBanner message={error} />

      {entries.length === 0 ? (
        <EmptyState message="No journal entries yet. Create your first double-entry transaction." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <th className="px-5 py-3 font-semibold">Entry</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const total = totalsById.get(e.id);
                return (
                  <tr key={e.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="px-5 py-3 font-mono text-xs">{e.entryNumber}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{e.entryDate}</td>
                    <td className="max-w-[280px] truncate px-5 py-3">{e.description}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      {formatCurrency(Number(total?.totalDebit ?? 0))}
                    </td>
                    <td className="px-5 py-3">
                      {e.status === "posted" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Posted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                          <Circle className="h-3.5 w-3.5" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {e.status === "draft" && (
                        <form action={postJournalEntryAction}>
                          <input type="hidden" name="entryId" value={e.id} />
                          <button type="submit" className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10">
                            Post
                          </button>
                        </form>
                      )}
                    </td>
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
