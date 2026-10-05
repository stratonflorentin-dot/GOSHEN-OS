"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import {
  createAccount,
  createExpense,
  createRevenue,
  createPayment,
  createCostAllocation,
  createAsset,
  createLoan,
  createLoanRepayment,
  postJournalEntry,
  nextDocumentNumber,
} from "@/services/financeService";
import {
  createAccountSchema,
  createExpenseSchema,
  createRevenueSchema,
  createPaymentSchema,
  createCostAllocationSchema,
  createAssetSchema,
  createLoanSchema,
  createLoanRepaymentSchema,
} from "@/lib/validation/finance";

type FinanceAction = (formData: FormData) => Promise<void>;

async function requireContext() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");
  return { user, orgId: memberships[0].organization.id };
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export const createAccountAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const parsed = createAccountSchema.safeParse({
    organizationId: orgId,
    code: formData.get("code"),
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) redirect(`/finance/chart-of-accounts?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createAccount(user.id, parsed.data);
  revalidatePath("/finance/chart-of-accounts");
  redirect("/finance/chart-of-accounts");
};

export const createExpenseAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const expenseNumber = await nextDocumentNumber(user.id, orgId, "expenses", "EXP");
  const parsed = createExpenseSchema.safeParse({
    organizationId: orgId,
    expenseNumber,
    expenseDate: formData.get("expenseDate"),
    accountId: formData.get("accountId"),
    amount: Number(formData.get("amount")),
    vendorName: formData.get("vendorName") || undefined,
    category: formData.get("category") || undefined,
    farmId: formData.get("farmId") || undefined,
    paymentStatus: formData.get("paymentStatus") || "unpaid",
    description: formData.get("description") || undefined,
    receiptNumber: formData.get("receiptNumber") || undefined,
  });
  if (!parsed.success) redirect(`/finance/expenses?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createExpense(user.id, parsed.data);
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  redirect("/finance/expenses");
};

export const createRevenueAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const revenueNumber = await nextDocumentNumber(user.id, orgId, "revenues", "REV");
  const parsed = createRevenueSchema.safeParse({
    organizationId: orgId,
    revenueNumber,
    revenueDate: formData.get("revenueDate"),
    accountId: formData.get("accountId"),
    amount: Number(formData.get("amount")),
    customerName: formData.get("customerName") || undefined,
    category: formData.get("category") || undefined,
    farmId: formData.get("farmId") || undefined,
    paymentStatus: formData.get("paymentStatus") || "unpaid",
    description: formData.get("description") || undefined,
    invoiceNumber: formData.get("invoiceNumber") || undefined,
  });
  if (!parsed.success) redirect(`/finance/revenues?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createRevenue(user.id, parsed.data);
  revalidatePath("/finance/revenues");
  revalidatePath("/finance");
  redirect("/finance/revenues");
};

export const createPaymentAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const paymentNumber = await nextDocumentNumber(user.id, orgId, "payments", "PAY");
  const parsed = createPaymentSchema.safeParse({
    organizationId: orgId,
    paymentNumber,
    paymentDate: formData.get("paymentDate"),
    paymentType: formData.get("paymentType"),
    method: formData.get("method"),
    accountId: formData.get("accountId"),
    counterpartyType: formData.get("counterpartyType") || undefined,
    counterpartyName: formData.get("counterpartyName") || undefined,
    amount: Number(formData.get("amount")),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect(`/finance/payments?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createPayment(user.id, parsed.data);
  revalidatePath("/finance/payments");
  revalidatePath("/finance");
  redirect("/finance/payments");
};

export const postJournalEntryAction: FinanceAction = async (formData) => {
  const { user } = await requireContext();
  await postJournalEntry(user.id, String(formData.get("entryId")));
  revalidatePath("/finance/journal");
  redirect("/finance/journal");
};

export const createCostAllocationAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const parsed = createCostAllocationSchema.safeParse({
    organizationId: orgId,
    sourceType: "expense",
    sourceId: formData.get("sourceId"),
    amount: Number(formData.get("amount")),
    allocationBasis: "direct",
    farmId: formData.get("farmId") || undefined,
    allocationDate: formData.get("allocationDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect(`/finance/cost-allocations?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createCostAllocation(user.id, parsed.data);
  revalidatePath("/finance/cost-allocations");
  redirect("/finance/cost-allocations");
};

export const createAssetAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const assetNumber = await nextDocumentNumber(user.id, orgId, "assets", "AST");
  const parsed = createAssetSchema.safeParse({
    organizationId: orgId,
    assetNumber,
    name: formData.get("name"),
    assetType: formData.get("assetType"),
    purchaseDate: formData.get("purchaseDate") || undefined,
    purchaseCost: formData.get("purchaseCost") ? Number(formData.get("purchaseCost")) : undefined,
    usefulLifeMonths: formData.get("usefulLifeMonths") ? Number(formData.get("usefulLifeMonths")) : undefined,
    serialNumber: formData.get("serialNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect(`/finance/assets?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createAsset(user.id, parsed.data);
  revalidatePath("/finance/assets");
  redirect("/finance/assets");
};

export const createLoanAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const loanNumber = await nextDocumentNumber(user.id, orgId, "loans", "LN");
  const parsed = createLoanSchema.safeParse({
    organizationId: orgId,
    loanNumber,
    lenderName: formData.get("lenderName"),
    lenderType: formData.get("lenderType"),
    principalAmount: Number(formData.get("principalAmount")),
    interestRate: Number(formData.get("interestRate")),
    disbursementDate: formData.get("disbursementDate"),
    maturityDate: formData.get("maturityDate"),
    repaymentFrequency: formData.get("repaymentFrequency"),
    purpose: formData.get("purpose") || undefined,
  });
  if (!parsed.success) redirect(`/finance/loans?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createLoan(user.id, parsed.data);
  revalidatePath("/finance/loans");
  redirect("/finance/loans");
};

export const createLoanRepaymentAction: FinanceAction = async (formData) => {
  const { user, orgId } = await requireContext();
  const parsed = createLoanRepaymentSchema.safeParse({
    organizationId: orgId,
    loanId: formData.get("loanId"),
    repaymentDate: formData.get("repaymentDate"),
    principalAmount: Number(formData.get("principalAmount") || 0),
    interestAmount: Number(formData.get("interestAmount") || 0),
    fees: Number(formData.get("fees") || 0),
  });
  if (!parsed.success) redirect(`/finance/loans?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  await createLoanRepayment(user.id, parsed.data);
  revalidatePath("/finance/loans");
  redirect("/finance/loans");
};
