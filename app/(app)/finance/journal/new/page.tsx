import { redirect } from "next/navigation";
import { Calculator, ArrowLeft, Plus, Minus, X } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listAccounts, ensureDefaultAccounts } from "@/services/financeService";
import { createJournalEntryAction } from "./actions";

export default async function NewJournalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const { error } = await searchParams;
  await ensureDefaultAccounts(user.id, org.id);
  const accounts = await listAccounts(user.id, org.id);

  const assetAccounts = accounts.filter((a) => a.accountType === "asset");
  const liabilityAccounts = accounts.filter((a) => a.accountType === "liability");
  const equityAccounts = accounts.filter((a) => a.accountType === "equity");
  const revenueAccounts = accounts.filter((a) => a.accountType === "revenue");
  const expenseAccounts = accounts.filter((a) => a.accountType === "expense");
  const cogsAccounts = accounts.filter((a) => a.accountType === "cost_of_goods_sold");

  return (
    <div className="mx-auto max-w-3xl">
      <a href="/finance" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to finance
      </a>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary-600" />
          Create journal entry
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Double-entry bookkeeping. Debits must equal credits.
        </p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <span className="h-4 w-4" /> {error}
        </p>
      )}

      <form action={createJournalEntryAction} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="entryNumber" className="field-label">Entry number</label>
            <input id="entryNumber" name="entryNumber" required maxLength={40} placeholder="JE-2026-001" className="field-input" />
          </div>
          <div>
            <label htmlFor="entryDate" className="field-label">Entry date</label>
            <input id="entryDate" name="entryDate" type="date" required className="field-input" defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="field-label">Description</label>
          <textarea id="description" name="description" required rows={3} maxLength={500} placeholder="Description of the transaction" className="field-input" />
        </div>

        <div>
          <label htmlFor="referenceType" className="field-label">Reference type (optional)</label>
          <input id="referenceType" name="referenceType" maxLength={40} placeholder="e.g. purchase_invoice, sale, payroll" className="field-input" />
        </div>

        <div>
          <label htmlFor="referenceId" className="field-label">Reference ID (optional)</label>
          <input id="referenceId" name="referenceId" placeholder="UUID of related record" className="field-input" />
        </div>

        <div className="border-t border-black/5 pt-4">
          <h3 className="mb-3 text-sm font-semibold">Lines (minimum 2, debits = credits)</h3>
          <div id="lines-container" className="space-y-3">
            {/* Lines will be added dynamically via JS */}
          </div>
          <button
            type="button"
            id="add-line"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.02]"
          >
            <Plus className="h-4 w-4" /> Add line
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-black/5">
          <div className="text-sm text-muted-foreground">
            Total debits: <span id="total-debits" className="font-mono font-medium">0.00</span> | Total credits: <span id="total-credits" className="font-mono font-medium">0.00</span>
          </div>
          <button type="submit" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
            <Calculator className="h-4 w-4" /> Create entry
          </button>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const accounts = ${JSON.stringify(accounts)};
            const container = document.getElementById('lines-container');
            const addBtn = document.getElementById('add-line');
            const totalDebitsEl = document.getElementById('total-debits');
            const totalCreditsEl = document.getElementById('total-credits');
            let lineIndex = 0;

            function accountOptions(selectedId = '') {
              return accounts.map(a => \`<option value="\${a.id}" \${a.id === selectedId ? 'selected' : ''}>\${a.code} - \${a.name} (\${a.accountType})</option>\`).join('');
            }

            function createLine() {
              const div = document.createElement('div');
              div.className = 'grid gap-2 sm:grid-cols-[1fr_80px_80px_80px_auto] items-end';
              div.innerHTML = \`
                <select name="lines[\${lineIndex}].accountId" required class="field-input">\${accountOptions()}</select>
                <input type="number" name="lines[\${lineIndex}].debit" min="0" step="0.01" placeholder="Debit" class="field-input text-right" value="0" />
                <input type="number" name="lines[\${lineIndex}].credit" min="0" step="0.01" placeholder="Credit" class="field-input text-right" value="0" />
                <input type="text" name="lines[\${lineIndex}].description" placeholder="Description" class="field-input" />
                <button type="button" class="remove-line text-destructive hover:text-destructive/70 p-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              \`;
              container.appendChild(div);
              lineIndex++;
              updateTotals();
            }

            function updateTotals() {
              let totalDebits = 0, totalCredits = 0;
              container.querySelectorAll('[name$=".debit"]').forEach(el => totalDebits += parseFloat(el.value) || 0);
              container.querySelectorAll('[name$=".credit"]').forEach(el => totalCredits += parseFloat(el.value) || 0);
              totalDebitsEl.textContent = totalDebits.toFixed(2);
              totalCreditsEl.textContent = totalCredits.toFixed(2);
            }

            addBtn.addEventListener('click', createLine);
            container.addEventListener('input', updateTotals);
            container.addEventListener('click', e => {
              if (e.target.closest('.remove-line')) {
                e.target.closest('[id^="lines-container"] > div').remove();
                updateTotals();
              }
            });

            // Add first two lines by default
            createLine();
            createLine();
          })();
        `,
      }} />
    </div>
  );
}