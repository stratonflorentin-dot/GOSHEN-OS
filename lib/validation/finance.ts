import { z } from "zod";

export const createAccountSchema = z.object({
  organizationId: z.string().uuid(),
  code: z.string().trim().min(3).max(10).regex(/^[0-9]+$/),
  name: z.string().trim().min(1).max(120),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense", "cost_of_goods_sold"]),
  parentId: z.string().uuid().optional(),
  currency: z.string().length(3).default("TZS"),
  description: z.string().trim().max(2000).optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const createJournalEntrySchema = z.object({
  organizationId: z.string().uuid(),
  entryNumber: z.string().trim().min(1).max(40),
  entryDate: z.string().date(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  description: z.string().trim().min(1).max(500),
  lines: z.array(
    z.object({
      accountId: z.string().uuid(),
      description: z.string().trim().max(200).optional(),
      debit: z.number().nonnegative().default(0),
      credit: z.number().nonnegative().default(0),
      currency: z.string().length(3).default("TZS"),
      exchangeRate: z.number().positive().default(1),
      farmId: z.string().uuid().optional(),
      plotId: z.string().uuid().optional(),
      cropSeasonId: z.string().uuid().optional(),
      livestockBatchId: z.string().uuid().optional(),
      costCenterId: z.string().uuid().optional(),
    })
  ).min(2).refine(
    (lines) => {
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: "Total debits must equal total credits" }
  ),
});
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

export const createPaymentSchema = z.object({
  organizationId: z.string().uuid(),
  paymentNumber: z.string().trim().min(1).max(40),
  paymentDate: z.string().date(),
  paymentType: z.enum(["receipt", "payment", "transfer"]),
  method: z.enum(["cash", "bank_transfer", "mobile_money", "cheque", "card", "other"]),
  accountId: z.string().uuid(),
  counterpartyType: z.enum(["customer", "supplier", "employee", "owner", "other"]).optional(),
  counterpartyId: z.string().uuid().optional(),
  counterpartyName: z.string().trim().max(160).optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("TZS"),
  exchangeRate: z.number().positive().default(1),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const createExpenseSchema = z.object({
  organizationId: z.string().uuid(),
  expenseNumber: z.string().trim().min(1).max(40),
  expenseDate: z.string().date(),
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("TZS"),
  exchangeRate: z.number().positive().default(1),
  vendorName: z.string().trim().max(160).optional(),
  vendorId: z.string().uuid().optional(),
  category: z.string().trim().max(60).optional(),
  farmId: z.string().uuid().optional(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  description: z.string().trim().max(500).optional(),
  receiptNumber: z.string().trim().max(60).optional(),
  receiptFileUrl: z.string().url().optional().or(z.literal("")),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const createRevenueSchema = z.object({
  organizationId: z.string().uuid(),
  revenueNumber: z.string().trim().min(1).max(40),
  revenueDate: z.string().date(),
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("TZS"),
  exchangeRate: z.number().positive().default(1),
  customerName: z.string().trim().max(160).optional(),
  customerId: z.string().uuid().optional(),
  category: z.string().trim().max(60).optional(),
  farmId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  description: z.string().trim().max(500).optional(),
  invoiceNumber: z.string().trim().max(60).optional(),
  invoiceFileUrl: z.string().url().optional().or(z.literal("")),
});
export type CreateRevenueInput = z.infer<typeof createRevenueSchema>;

export const createCostAllocationSchema = z.object({
  organizationId: z.string().uuid(),
  sourceType: z.enum(["expense", "journal_entry", "purchase_order", "payroll", "asset_depreciation"]),
  sourceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("TZS"),
  allocationBasis: z.enum(["direct", "area_proportional", "head_count_proportional", "manual"]),
  farmId: z.string().uuid().optional(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  allocationDate: z.string().date(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateCostAllocationInput = z.infer<typeof createCostAllocationSchema>;

export const createCostCenterSchema = z.object({
  organizationId: z.string().uuid(),
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  farmId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
});
export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;

export const createAssetSchema = z.object({
  organizationId: z.string().uuid(),
  assetNumber: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  assetType: z.enum(["land", "building", "machinery", "vehicle", "equipment", "irrigation", "fencing", "other"]),
  farmId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  purchaseDate: z.string().date().optional(),
  purchaseCost: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("TZS"),
  usefulLifeMonths: z.number().int().positive().optional(),
  depreciationMethod: z.enum(["straight_line", "declining_balance", "units_of_production"]).default("straight_line"),
  salvageValue: z.number().nonnegative().default(0),
  serialNumber: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  supplierId: z.string().uuid().optional(),
  warrantyExpiry: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const createLoanSchema = z.object({
  organizationId: z.string().uuid(),
  loanNumber: z.string().trim().min(1).max(40),
  lenderName: z.string().trim().min(1).max(160),
  lenderType: z.enum(["bank", "microfinance", "cooperative", "individual", "government", "other"]),
  principalAmount: z.number().positive(),
  currency: z.string().length(3).default("TZS"),
  interestRate: z.number().positive(),
  interestType: z.enum(["fixed", "variable"]).default("fixed"),
  disbursementDate: z.string().date(),
  maturityDate: z.string().date(),
  repaymentFrequency: z.enum(["monthly", "quarterly", "semi_annual", "annual", "bullet"]),
  repaymentAmount: z.number().nonnegative().optional(),
  collateral: z.string().trim().max(500).optional(),
  purpose: z.string().trim().max(500).optional(),
  farmId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;

export const createLoanRepaymentSchema = z.object({
  loanId: z.string().uuid(),
  organizationId: z.string().uuid(),
  repaymentDate: z.string().date(),
  principalAmount: z.number().nonnegative().default(0),
  interestAmount: z.number().nonnegative().default(0),
  fees: z.number().nonnegative().default(0),
  paymentId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateLoanRepaymentInput = z.infer<typeof createLoanRepaymentSchema>;

export const createOwnerEquitySchema = z.object({
  organizationId: z.string().uuid(),
  transactionNumber: z.string().trim().min(1).max(40),
  transactionDate: z.string().date(),
  transactionType: z.enum(["contribution", "withdrawal", "profit_allocation", "loss_allocation"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("TZS"),
  ownerId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateOwnerEquityInput = z.infer<typeof createOwnerEquitySchema>;