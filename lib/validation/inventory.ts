import { z } from "zod";

export const createInventoryCategorySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9_]+$/),
  parentId: z.string().uuid().optional(),
  description: z.string().trim().max(2000).optional(),
});
export type CreateInventoryCategoryInput = z.infer<typeof createInventoryCategorySchema>;

export const createInventoryItemSchema = z.object({
  organizationId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/),
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(20),
  conversionFactor: z.number().positive().default(1),
  baseUnit: z.string().trim().min(1).max(20),
  minStockLevel: z.number().nonnegative().default(0),
  maxStockLevel: z.number().positive().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  defaultSupplierId: z.string().uuid().optional(),
  costMethod: z.enum(["fifo", "lifo", "average", "standard"]).default("fifo"),
  standardCost: z.number().nonnegative().optional(),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const createInventoryLocationSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9_-]+$/),
  locationType: z.enum(["warehouse", "store", "cold_room", "silo", "field", "other"]),
  capacity: z.number().positive().optional(),
  capacityUnit: z.string().optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
});
export type CreateInventoryLocationInput = z.infer<typeof createInventoryLocationSchema>;

export const createInventoryMovementSchema = z.object({
  organizationId: z.string().uuid(),
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  movementType: z.enum([
    "purchase_receipt",
    "production_receipt",
    "transfer_in",
    "transfer_out",
    "consumption",
    "adjustment_in",
    "adjustment_out",
    "loss",
    "spoilage",
    "sale_shipment",
    "return_in",
    "return_out",
    "opening_balance",
  ]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitCost: z.number().nonnegative().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  batchNumber: z.string().trim().max(60).optional(),
  expiryDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateInventoryMovementInput = z.infer<typeof createInventoryMovementSchema>;

export const createSupplierSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/),
  contactPerson: z.string().trim().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  country: z.string().length(2).default("TZ"),
  taxId: z.string().trim().max(60).optional(),
  paymentTerms: z.string().trim().max(60).optional(),
  currency: z.string().length(3).default("TZS"),
  rating: z.number().min(0).max(5).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const createPurchaseRequestSchema = z.object({
  organizationId: z.string().uuid(),
  requestNumber: z.string().trim().min(1).max(40),
  requestedBy: z.string().uuid(),
  requiredDate: z.string().date().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  notes: z.string().trim().max(2000).optional(),
  lines: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.number().positive(),
      unit: z.string().min(1),
      estimatedUnitCost: z.number().nonnegative().optional(),
      notes: z.string().trim().max(1000).optional(),
    })
  ).min(1),
});
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;

export const createPurchaseOrderSchema = z.object({
  organizationId: z.string().uuid(),
  orderNumber: z.string().trim().min(1).max(40),
  supplierId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  expectedDeliveryDate: z.string().date().optional(),
  currency: z.string().length(3).default("TZS"),
  exchangeRate: z.number().positive().default(1),
  notes: z.string().trim().max(2000).optional(),
  lines: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.number().positive(),
      unit: z.string().min(1),
      unitPrice: z.number().nonnegative(),
      taxRate: z.number().min(0).max(100).default(0),
      discountRate: z.number().min(0).max(100).default(0),
      notes: z.string().trim().max(1000).optional(),
    })
  ).min(1),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const createGoodsReceiptSchema = z.object({
  organizationId: z.string().uuid(),
  receiptNumber: z.string().trim().min(1).max(40),
  orderId: z.string().uuid(),
  supplierId: z.string().uuid(),
  receivedBy: z.string().uuid(),
  locationId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional(),
  lines: z.array(
    z.object({
      orderLineId: z.string().uuid(),
      itemId: z.string().uuid(),
      quantity: z.number().positive(),
      unit: z.string().min(1),
      unitCost: z.number().nonnegative().optional(),
      batchNumber: z.string().trim().max(60).optional(),
      expiryDate: z.string().date().optional(),
      qualityStatus: z.enum(["accepted", "rejected", "quarantine"]).default("accepted"),
      notes: z.string().trim().max(1000).optional(),
    })
  ).min(1),
});
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;

export const createSupplierInvoiceSchema = z.object({
  organizationId: z.string().uuid(),
  invoiceNumber: z.string().trim().min(1).max(60),
  supplierId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  receiptId: z.string().uuid().optional(),
  invoiceDate: z.string().date(),
  dueDate: z.string().date().optional(),
  currency: z.string().length(3).default("TZS"),
  exchangeRate: z.number().positive().default(1),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateSupplierInvoiceInput = z.infer<typeof createSupplierInvoiceSchema>;