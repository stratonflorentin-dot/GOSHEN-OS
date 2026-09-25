import { withUser, type SqlExecutor } from "@/lib/db";
import type {
  CreateAccountInput,
  CreateJournalEntryInput,
  CreatePaymentInput,
  CreateExpenseInput,
  CreateRevenueInput,
  CreateCostAllocationInput,
  CreateCostCenterInput,
  CreateAssetInput,
  CreateLoanInput,
  CreateLoanRepaymentInput,
  CreateOwnerEquityInput,
} from "@/lib/validation/finance";

export type Account = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  accountType: string;
  parentId: string | null;
  currency: string;
  isActive: boolean;
  isSystem: boolean;
  description: string | null;
  createdAt: string;
};

export type JournalEntry = {
  id: string;
  organizationId: string;
  entryNumber: string;
  entryDate: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string;
  status: string;
  postedAt: string | null;
  postedBy: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalReason: string | null;
  createdAt: string;
};

export type JournalLine = {
  id: string;
  entryId: string;
  accountId: string;
  description: string | null;
  debit: string;
  credit: string;
  currency: string;
  exchangeRate: string;
  farmId: string | null;
  plotId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  costCenterId: string | null;
  createdAt: string;
};

export type Payment = {
  id: string;
  organizationId: string;
  paymentNumber: string;
  paymentDate: string;
  paymentType: string;
  method: string;
  accountId: string;
  counterpartyType: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  amount: string;
  currency: string;
  exchangeRate: string;
  referenceType: string | null;
  referenceId: string | null;
  status: string;
  clearedDate: string | null;
  notes: string | null;
  createdAt: string;
};

export type Expense = {
  id: string;
  organizationId: string;
  expenseNumber: string;
  expenseDate: string;
  accountId: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  vendorName: string | null;
  vendorId: string | null;
  category: string | null;
  farmId: string | null;
  plotId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  paymentId: string | null;
  paymentStatus: string;
  description: string | null;
  receiptNumber: string | null;
  receiptFileUrl: string | null;
  createdAt: string;
};

export type Revenue = {
  id: string;
  organizationId: string;
  revenueNumber: string;
  revenueDate: string;
  accountId: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  customerName: string | null;
  customerId: string | null;
  category: string | null;
  farmId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  paymentId: string | null;
  paymentStatus: string;
  description: string | null;
  invoiceNumber: string | null;
  invoiceFileUrl: string | null;
  createdAt: string;
};

export type CostAllocation = {
  id: string;
  organizationId: string;
  sourceType: string;
  sourceId: string;
  amount: string;
  currency: string;
  allocationBasis: string;
  farmId: string | null;
  plotId: string | null;
  cropSeasonId: string | null;
  livestockBatchId: string | null;
  costCenterId: string | null;
  allocationDate: string;
  notes: string | null;
  createdAt: string;
};

export type CostCenter = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  farmId: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Asset = {
  id: string;
  organizationId: string;
  assetNumber: string;
  name: string;
  assetType: string;
  farmId: string | null;
  locationId: string | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  currency: string;
  usefulLifeMonths: number | null;
  depreciationMethod: string;
  salvageValue: string;
  accumulatedDepreciation: string;
  lastDepreciationDate: string | null;
  status: string;
  serialNumber: string | null;
  model: string | null;
  supplierId: string | null;
  warrantyExpiry: string | null;
  notes: string | null;
  createdAt: string;
};

export type Loan = {
  id: string;
  organizationId: string;
  loanNumber: string;
  lenderName: string;
  lenderType: string;
  principalAmount: string;
  currency: string;
  interestRate: string;
  interestType: string;
  disbursementDate: string;
  maturityDate: string;
  repaymentFrequency: string;
  repaymentAmount: string | null;
  outstandingPrincipal: string;
  outstandingInterest: string;
  status: string;
  collateral: string | null;
  purpose: string | null;
  farmId: string | null;
  notes: string | null;
  createdAt: string;
};

export type LoanRepayment = {
  id: string;
  loanId: string;
  organizationId: string;
  repaymentDate: string;
  principalAmount: string;
  interestAmount: string;
  fees: string;
  totalAmount: string;
  paymentId: string | null;
  notes: string | null;
  createdAt: string;
};

export type OwnerEquity = {
  id: string;
  organizationId: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: string;
  amount: string;
  currency: string;
  ownerId: string;
  paymentId: string | null;
  notes: string | null;
  createdAt: string;
};

function toAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    code: row.code as string,
    name: row.name as string,
    accountType: row.account_type as string,
    parentId: (row.parent_id as string | null) ?? null,
    currency: row.currency as string,
    isActive: row.is_active as boolean,
    isSystem: row.is_system as boolean,
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toJournalEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    entryNumber: row.entry_number as string,
    entryDate: String(row.entry_date),
    referenceType: (row.reference_type as string | null) ?? null,
    referenceId: (row.reference_id as string | null) ?? null,
    description: row.description as string,
    status: row.status as string,
    postedAt: (row.posted_at as string | null) ?? null,
    postedBy: (row.posted_by as string | null) ?? null,
    reversedAt: (row.reversed_at as string | null) ?? null,
    reversedBy: (row.reversed_by as string | null) ?? null,
    reversalReason: (row.reversal_reason as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toJournalLine(row: Record<string, unknown>): JournalLine {
  return {
    id: row.id as string,
    entryId: row.entry_id as string,
    accountId: row.account_id as string,
    description: (row.description as string | null) ?? null,
    debit: String(row.debit),
    credit: String(row.credit),
    currency: row.currency as string,
    exchangeRate: String(row.exchange_rate),
    farmId: (row.farm_id as string | null) ?? null,
    plotId: (row.plot_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    costCenterId: (row.cost_center_id as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    paymentNumber: row.payment_number as string,
    paymentDate: String(row.payment_date),
    paymentType: row.payment_type as string,
    method: row.method as string,
    accountId: row.account_id as string,
    counterpartyType: (row.counterparty_type as string | null) ?? null,
    counterpartyId: (row.counterparty_id as string | null) ?? null,
    counterpartyName: (row.counterparty_name as string | null) ?? null,
    amount: String(row.amount),
    currency: row.currency as string,
    exchangeRate: String(row.exchange_rate),
    referenceType: (row.reference_type as string | null) ?? null,
    referenceId: (row.reference_id as string | null) ?? null,
    status: row.status as string,
    clearedDate: (row.cleared_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    expenseNumber: row.expense_number as string,
    expenseDate: String(row.expense_date),
    accountId: row.account_id as string,
    amount: String(row.amount),
    currency: row.currency as string,
    exchangeRate: String(row.exchange_rate),
    vendorName: (row.vendor_name as string | null) ?? null,
    vendorId: (row.vendor_id as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    farmId: (row.farm_id as string | null) ?? null,
    plotId: (row.plot_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    paymentId: (row.payment_id as string | null) ?? null,
    paymentStatus: row.payment_status as string,
    description: (row.description as string | null) ?? null,
    receiptNumber: (row.receipt_number as string | null) ?? null,
    receiptFileUrl: (row.receipt_file_url as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toRevenue(row: Record<string, unknown>): Revenue {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    revenueNumber: row.revenue_number as string,
    revenueDate: String(row.revenue_date),
    accountId: row.account_id as string,
    amount: String(row.amount),
    currency: row.currency as string,
    exchangeRate: String(row.exchange_rate),
    customerName: (row.customer_name as string | null) ?? null,
    customerId: (row.customer_id as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    farmId: (row.farm_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    paymentId: (row.payment_id as string | null) ?? null,
    paymentStatus: row.payment_status as string,
    description: (row.description as string | null) ?? null,
    invoiceNumber: (row.invoice_number as string | null) ?? null,
    invoiceFileUrl: (row.invoice_file_url as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toCostAllocation(row: Record<string, unknown>): CostAllocation {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    sourceType: row.source_type as string,
    sourceId: row.source_id as string,
    amount: String(row.amount),
    currency: row.currency as string,
    allocationBasis: row.allocation_basis as string,
    farmId: (row.farm_id as string | null) ?? null,
    plotId: (row.plot_id as string | null) ?? null,
    cropSeasonId: (row.crop_season_id as string | null) ?? null,
    livestockBatchId: (row.livestock_batch_id as string | null) ?? null,
    costCenterId: (row.cost_center_id as string | null) ?? null,
    allocationDate: String(row.allocation_date),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toCostCenter(row: Record<string, unknown>): CostCenter {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    farmId: (row.farm_id as string | null) ?? null,
    managerId: (row.manager_id as string | null) ?? null,
    isActive: row.is_active as boolean,
    createdAt: String(row.created_at),
  };
}

function toAsset(row: Record<string, unknown>): Asset {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    assetNumber: row.asset_number as string,
    name: row.name as string,
    assetType: row.asset_type as string,
    farmId: (row.farm_id as string | null) ?? null,
    locationId: (row.location_id as string | null) ?? null,
    purchaseDate: (row.purchase_date as string | null) ?? null,
    purchaseCost: (row.purchase_cost as string | null) ?? null,
    currency: row.currency as string,
    usefulLifeMonths: (row.useful_life_months as number | null) ?? null,
    depreciationMethod: row.depreciation_method as string,
    salvageValue: String(row.salvage_value),
    accumulatedDepreciation: String(row.accumulated_depreciation),
    lastDepreciationDate: (row.last_depreciation_date as string | null) ?? null,
    status: row.status as string,
    serialNumber: (row.serial_number as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    supplierId: (row.supplier_id as string | null) ?? null,
    warrantyExpiry: (row.warranty_expiry as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLoan(row: Record<string, unknown>): Loan {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    loanNumber: row.loan_number as string,
    lenderName: row.lender_name as string,
    lenderType: row.lender_type as string,
    principalAmount: String(row.principal_amount),
    currency: row.currency as string,
    interestRate: String(row.interest_rate),
    interestType: row.interest_type as string,
    disbursementDate: String(row.disbursement_date),
    maturityDate: String(row.maturity_date),
    repaymentFrequency: row.repayment_frequency as string,
    repaymentAmount: (row.repayment_amount as string | null) ?? null,
    outstandingPrincipal: String(row.outstanding_principal),
    outstandingInterest: String(row.outstanding_interest),
    status: row.status as string,
    collateral: (row.collateral as string | null) ?? null,
    purpose: (row.purpose as string | null) ?? null,
    farmId: (row.farm_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toLoanRepayment(row: Record<string, unknown>): LoanRepayment {
  return {
    id: row.id as string,
    loanId: row.loan_id as string,
    organizationId: row.organization_id as string,
    repaymentDate: String(row.repayment_date),
    principalAmount: String(row.principal_amount),
    interestAmount: String(row.interest_amount),
    fees: String(row.fees),
    totalAmount: String(row.total_amount),
    paymentId: (row.payment_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toOwnerEquity(row: Record<string, unknown>): OwnerEquity {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    transactionNumber: row.transaction_number as string,
    transactionDate: String(row.transaction_date),
    transactionType: row.transaction_type as string,
    amount: String(row.amount),
    currency: row.currency as string,
    ownerId: row.owner_id as string,
    paymentId: (row.payment_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

// Accounts
export async function createAccount(userId: string, input: CreateAccountInput): Promise<Account> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.accounts (organization_id, code, name, account_type, parent_id, currency, description)
      values (${input.organizationId}, ${input.code}, ${input.name}, ${input.accountType}, ${input.parentId || null}, ${input.currency}, ${input.description || null})
      returning *
    `;
    return toAccount(rows[0]);
  });
}

export async function listAccounts(userId: string, organizationId: string, accountType?: string): Promise<Account[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (accountType) {
      rows = await db`
        select * from public.accounts
        where organization_id = ${organizationId} and account_type = ${accountType} and is_active = true
        order by code
      `;
    } else {
      rows = await db`
        select * from public.accounts
        where organization_id = ${organizationId} and is_active = true
        order by account_type, code
      `;
    }
    return rows.map(toAccount);
  });
}

export async function getAccount(userId: string, accountId: string): Promise<Account | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.accounts where id = ${accountId}`;
    return rows[0] ? toAccount(rows[0]) : null;
  });
}

// Journal Entries
export async function createJournalEntry(userId: string, input: CreateJournalEntryInput): Promise<JournalEntry> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.journal_entries (organization_id, entry_number, entry_date, reference_type, reference_id, description)
      values (${input.organizationId}, ${input.entryNumber}, ${input.entryDate}, ${input.referenceType || null}, ${input.referenceId || null}, ${input.description})
      returning *
    `;
    const entry = toJournalEntry(rows[0]);

    for (const line of input.lines) {
      await db`
        insert into public.journal_lines (entry_id, account_id, description, debit, credit, currency, exchange_rate, farm_id, plot_id, crop_season_id, livestock_batch_id, cost_center_id)
        values (${entry.id}, ${line.accountId}, ${line.description || null}, ${line.debit}, ${line.credit}, ${line.currency}, ${line.exchangeRate}, ${line.farmId || null}, ${line.plotId || null}, ${line.cropSeasonId || null}, ${line.livestockBatchId || null}, ${line.costCenterId || null})
      `;
    }

    return entry;
  });
}

export async function listJournalEntries(userId: string, organizationId: string, limit = 100): Promise<JournalEntry[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.journal_entries
      where organization_id = ${organizationId}
      order by entry_date desc, created_at desc
      limit ${limit}
    `;
    return rows.map(toJournalEntry);
  });
}

export async function getJournalEntryWithLines(userId: string, entryId: string): Promise<{ entry: JournalEntry; lines: JournalLine[] } | null> {
  return withUser(userId, async (db) => {
    const entryRows = await db`select * from public.journal_entries where id = ${entryId}`;
    if (!entryRows[0]) return null;
    const lineRows = await db`select * from public.journal_lines where entry_id = ${entryId} order by created_at`;
    return {
      entry: toJournalEntry(entryRows[0]),
      lines: lineRows.map(toJournalLine),
    };
  });
}

export async function postJournalEntry(userId: string, entryId: string): Promise<JournalEntry> {
  return withUser(userId, async (db) => {
    const rows = await db`
      update public.journal_entries
      set status = 'posted', posted_at = now(), posted_by = ${userId}
      where id = ${entryId} and status = 'draft'
      returning *
    `;
    if (!rows[0]) throw new Error("Entry not found or not in draft status");
    return toJournalEntry(rows[0]);
  });
}

// Payments
export async function createPayment(userId: string, input: CreatePaymentInput): Promise<Payment> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.payments
        (organization_id, payment_number, payment_date, payment_type, method, account_id,
         counterparty_type, counterparty_id, counterparty_name, amount, currency, exchange_rate,
         reference_type, reference_id, notes)
      values
        (${input.organizationId}, ${input.paymentNumber}, ${input.paymentDate}, ${input.paymentType},
         ${input.method}, ${input.accountId}, ${input.counterpartyType || null}, ${input.counterpartyId || null},
         ${input.counterpartyName || null}, ${input.amount}, ${input.currency}, ${input.exchangeRate},
         ${input.referenceType || null}, ${input.referenceId || null}, ${input.notes || null})
      returning *
    `;
    return toPayment(rows[0]);
  });
}

export async function listPayments(userId: string, organizationId: string, limit = 100): Promise<Payment[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.payments
      where organization_id = ${organizationId}
      order by payment_date desc, created_at desc
      limit ${limit}
    `;
    return rows.map(toPayment);
  });
}

// Expenses
export async function createExpense(userId: string, input: CreateExpenseInput): Promise<Expense> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.expenses
        (organization_id, expense_number, expense_date, account_id, amount, currency, exchange_rate,
         vendor_name, vendor_id, category, farm_id, plot_id, crop_season_id, livestock_batch_id,
         payment_id, payment_status, description, receipt_number, receipt_file_url)
      values
        (${input.organizationId}, ${input.expenseNumber}, ${input.expenseDate}, ${input.accountId},
         ${input.amount}, ${input.currency}, ${input.exchangeRate}, ${input.vendorName || null},
         ${input.vendorId || null}, ${input.category || null}, ${input.farmId || null},
         ${input.plotId || null}, ${input.cropSeasonId || null}, ${input.livestockBatchId || null},
         ${input.paymentId || null}, ${input.paymentStatus}, ${input.description || null},
         ${input.receiptNumber || null}, ${input.receiptFileUrl || null})
      returning *
    `;
    return toExpense(rows[0]);
  });
}

export async function listExpenses(
  userId: string,
  organizationId: string,
  farmId?: string,
  cropSeasonId?: string,
  livestockBatchId?: string,
  limit = 100,
): Promise<Expense[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select * from public.expenses
        where organization_id = ${organizationId} and farm_id = ${farmId}
        order by expense_date desc, created_at desc
        limit ${limit}
      `;
    } else if (cropSeasonId) {
      rows = await db`
        select * from public.expenses
        where organization_id = ${organizationId} and crop_season_id = ${cropSeasonId}
        order by expense_date desc, created_at desc
        limit ${limit}
      `;
    } else if (livestockBatchId) {
      rows = await db`
        select * from public.expenses
        where organization_id = ${organizationId} and livestock_batch_id = ${livestockBatchId}
        order by expense_date desc, created_at desc
        limit ${limit}
      `;
    } else {
      rows = await db`
        select * from public.expenses
        where organization_id = ${organizationId}
        order by expense_date desc, created_at desc
        limit ${limit}
      `;
    }
    return rows.map(toExpense);
  });
}

// Revenues
export async function createRevenue(userId: string, input: CreateRevenueInput): Promise<Revenue> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.revenues
        (organization_id, revenue_number, revenue_date, account_id, amount, currency, exchange_rate,
         customer_name, customer_id, category, farm_id, crop_season_id, livestock_batch_id,
         payment_id, payment_status, description, invoice_number, invoice_file_url)
      values
        (${input.organizationId}, ${input.revenueNumber}, ${input.revenueDate}, ${input.accountId},
         ${input.amount}, ${input.currency}, ${input.exchangeRate}, ${input.customerName || null},
         ${input.customerId || null}, ${input.category || null}, ${input.farmId || null},
         ${input.cropSeasonId || null}, ${input.livestockBatchId || null}, ${input.paymentId || null},
         ${input.paymentStatus}, ${input.description || null}, ${input.invoiceNumber || null},
         ${input.invoiceFileUrl || null})
      returning *
    `;
    return toRevenue(rows[0]);
  });
}

export async function listRevenues(
  userId: string,
  organizationId: string,
  farmId?: string,
  cropSeasonId?: string,
  livestockBatchId?: string,
  limit = 100,
): Promise<Revenue[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select * from public.revenues
        where organization_id = ${organizationId} and farm_id = ${farmId}
        order by revenue_date desc, created_at desc
        limit ${limit}
      `;
    } else if (cropSeasonId) {
      rows = await db`
        select * from public.revenues
        where organization_id = ${organizationId} and crop_season_id = ${cropSeasonId}
        order by revenue_date desc, created_at desc
        limit ${limit}
      `;
    } else if (livestockBatchId) {
      rows = await db`
        select * from public.revenues
        where organization_id = ${organizationId} and livestock_batch_id = ${livestockBatchId}
        order by revenue_date desc, created_at desc
        limit ${limit}
      `;
    } else {
      rows = await db`
        select * from public.revenues
        where organization_id = ${organizationId}
        order by revenue_date desc, created_at desc
        limit ${limit}
      `;
    }
    return rows.map(toRevenue);
  });
}

// Cost Allocations
export async function createCostAllocation(userId: string, input: CreateCostAllocationInput): Promise<CostAllocation> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.cost_allocations
        (organization_id, source_type, source_id, amount, currency, allocation_basis,
         farm_id, plot_id, crop_season_id, livestock_batch_id, cost_center_id, allocation_date, notes)
      values
        (${input.organizationId}, ${input.sourceType}, ${input.sourceId}, ${input.amount},
         ${input.currency}, ${input.allocationBasis}, ${input.farmId || null}, ${input.plotId || null},
         ${input.cropSeasonId || null}, ${input.livestockBatchId || null}, ${input.costCenterId || null},
         ${input.allocationDate}, ${input.notes || null})
      returning *
    `;
    return toCostAllocation(rows[0]);
  });
}

export async function listCostAllocations(
  userId: string,
  organizationId: string,
  farmId?: string,
  cropSeasonId?: string,
  livestockBatchId?: string,
): Promise<CostAllocation[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select * from public.cost_allocations
        where organization_id = ${organizationId} and farm_id = ${farmId}
        order by allocation_date desc
      `;
    } else if (cropSeasonId) {
      rows = await db`
        select * from public.cost_allocations
        where organization_id = ${organizationId} and crop_season_id = ${cropSeasonId}
        order by allocation_date desc
      `;
    } else if (livestockBatchId) {
      rows = await db`
        select * from public.cost_allocations
        where organization_id = ${organizationId} and livestock_batch_id = ${livestockBatchId}
        order by allocation_date desc
      `;
    } else {
      rows = await db`
        select * from public.cost_allocations
        where organization_id = ${organizationId}
        order by allocation_date desc
      `;
    }
    return rows.map(toCostAllocation);
  });
}

// Cost Centers
export async function createCostCenter(userId: string, input: CreateCostCenterInput): Promise<CostCenter> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.cost_centers (organization_id, code, name, description, farm_id, manager_id)
      values (${input.organizationId}, ${input.code}, ${input.name}, ${input.description || null}, ${input.farmId || null}, ${input.managerId || null})
      returning *
    `;
    return toCostCenter(rows[0]);
  });
}

export async function listCostCenters(userId: string, organizationId: string): Promise<CostCenter[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.cost_centers
      where organization_id = ${organizationId} and is_active = true
      order by code
    `;
    return rows.map(toCostCenter);
  });
}

// Assets
export async function createAsset(userId: string, input: CreateAssetInput): Promise<Asset> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.assets
        (organization_id, asset_number, name, asset_type, farm_id, location_id, purchase_date,
         purchase_cost, currency, useful_life_months, depreciation_method, salvage_value,
         serial_number, model, supplier_id, warranty_expiry, notes)
      values
        (${input.organizationId}, ${input.assetNumber}, ${input.name}, ${input.assetType},
         ${input.farmId || null}, ${input.locationId || null}, ${input.purchaseDate || null},
         ${input.purchaseCost || null}, ${input.currency}, ${input.usefulLifeMonths || null},
         ${input.depreciationMethod}, ${input.salvageValue}, ${input.serialNumber || null},
         ${input.model || null}, ${input.supplierId || null}, ${input.warrantyExpiry || null},
         ${input.notes || null})
      returning *
    `;
    return toAsset(rows[0]);
  });
}

export async function listAssets(userId: string, organizationId: string, farmId?: string): Promise<Asset[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select * from public.assets
        where organization_id = ${organizationId} and farm_id = ${farmId}
        order by asset_type, name
      `;
    } else {
      rows = await db`
        select * from public.assets
        where organization_id = ${organizationId}
        order by asset_type, name
      `;
    }
    return rows.map(toAsset);
  });
}

// Loans
export async function createLoan(userId: string, input: CreateLoanInput): Promise<Loan> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.loans
        (organization_id, loan_number, lender_name, lender_type, principal_amount, currency,
         interest_rate, interest_type, disbursement_date, maturity_date, repayment_frequency,
         repayment_amount, outstanding_principal, outstanding_interest, collateral, purpose, farm_id, notes)
      values
        (${input.organizationId}, ${input.loanNumber}, ${input.lenderName}, ${input.lenderType},
         ${input.principalAmount}, ${input.currency}, ${input.interestRate}, ${input.interestType},
         ${input.disbursementDate}, ${input.maturityDate}, ${input.repaymentFrequency},
         ${input.repaymentAmount || null}, ${input.principalAmount}, 0, ${input.collateral || null},
         ${input.purpose || null}, ${input.farmId || null}, ${input.notes || null})
      returning *
    `;
    return toLoan(rows[0]);
  });
}

export async function listLoans(userId: string, organizationId: string): Promise<Loan[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.loans
      where organization_id = ${organizationId}
      order by disbursement_date desc
    `;
    return rows.map(toLoan);
  });
}

export async function createLoanRepayment(userId: string, input: CreateLoanRepaymentInput): Promise<LoanRepayment> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.loan_repayments
        (loan_id, organization_id, repayment_date, principal_amount, interest_amount, fees, payment_id, notes)
      values
        (${input.loanId}, ${input.organizationId}, ${input.repaymentDate}, ${input.principalAmount},
         ${input.interestAmount}, ${input.fees}, ${input.paymentId || null}, ${input.notes || null})
      returning *
    `;
    return toLoanRepayment(rows[0]);
  });
}

export async function listLoanRepayments(userId: string, loanId: string): Promise<LoanRepayment[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.loan_repayments
      where loan_id = ${loanId}
      order by repayment_date
    `;
    return rows.map(toLoanRepayment);
  });
}

// Owner Equity
export async function createOwnerEquity(userId: string, input: CreateOwnerEquityInput): Promise<OwnerEquity> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.owner_equity
        (organization_id, transaction_number, transaction_date, transaction_type, amount, currency, owner_id, payment_id, notes)
      values
        (${input.organizationId}, ${input.transactionNumber}, ${input.transactionDate}, ${input.transactionType},
         ${input.amount}, ${input.currency}, ${input.ownerId}, ${input.paymentId || null}, ${input.notes || null})
      returning *
    `;
    return toOwnerEquity(rows[0]);
  });
}

export async function listOwnerEquity(userId: string, organizationId: string): Promise<OwnerEquity[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.owner_equity
      where organization_id = ${organizationId}
      order by transaction_date desc
    `;
    return rows.map(toOwnerEquity);
  });
}

// Financial summaries for dashboard
export async function getFinancialSummary(userId: string, organizationId: string, fromDate?: string, toDate?: string): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
}> {
  return withUser(userId, async (db) => {
    let dateFilter = "";
    const params: (string | number)[] = [organizationId];
    if (fromDate) {
      dateFilter += " and expense_date >= $" + (params.length + 1);
      params.push(fromDate);
    }
    if (toDate) {
      dateFilter += " and expense_date <= $" + (params.length + 1);
      params.push(toDate);
    }

    const [expenses, revenues, payments, ar, ap] = await Promise.all([
      db.unsafe(`select sum(amount)::numeric as total from public.expenses where organization_id = $1 ${dateFilter}`, params),
      db.unsafe(`select sum(amount)::numeric as total from public.revenues where organization_id = $1 ${dateFilter.replace("expense_date", "revenue_date")}`, params),
      db.unsafe(`select sum(case when payment_type = 'receipt' then amount else -amount end)::numeric as total from public.payments where organization_id = $1 and status = 'cleared'`, [organizationId]),
      db.unsafe(`select sum(amount)::numeric as total from public.revenues where organization_id = $1 and payment_status != 'paid'`, [organizationId]),
      db.unsafe(`select sum(amount)::numeric as total from public.expenses where organization_id = $1 and payment_status != 'paid'`, [organizationId]),
    ]);

    const totalRevenue = Number(revenues[0]?.total ?? 0);
    const totalExpenses = Number(expenses[0]?.total ?? 0);
    const cashBalance = Number(payments[0]?.total ?? 0);
    const accountsReceivable = Number(ar[0]?.total ?? 0);
    const accountsPayable = Number(ap[0]?.total ?? 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      cashBalance,
      accountsReceivable,
      accountsPayable,
    };
  });
}