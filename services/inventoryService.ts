import { withUser, type SqlExecutor } from "@/lib/db";
import type {
  CreateInventoryCategoryInput,
  CreateInventoryItemInput,
  CreateInventoryLocationInput,
  CreateInventoryMovementInput,
  CreateSupplierInput,
  CreatePurchaseRequestInput,
  CreatePurchaseOrderInput,
  CreateGoodsReceiptInput,
  CreateSupplierInvoiceInput,
} from "@/lib/validation/inventory";

export type InventoryCategory = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  parentId: string | null;
  description: string | null;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  code: string;
  description: string | null;
  unit: string;
  conversionFactor: string;
  baseUnit: string;
  minStockLevel: string;
  maxStockLevel: string | null;
  reorderPoint: string | null;
  defaultSupplierId: string | null;
  costMethod: string;
  standardCost: string | null;
  isActive: boolean;
  createdAt: string;
};

export type InventoryLocation = {
  id: string;
  organizationId: string;
  farmId: string | null;
  name: string;
  code: string;
  locationType: string;
  capacity: string | null;
  capacityUnit: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  isActive: boolean;
  createdAt: string;
};

export type InventoryMovement = {
  id: string;
  organizationId: string;
  itemId: string;
  locationId: string;
  movementType: string;
  quantity: string;
  unit: string;
  unitCost: string | null;
  totalCost: string;
  referenceType: string | null;
  referenceId: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  movementDate: string;
  notes: string | null;
  createdAt: string;
};

export type InventoryBalance = {
  id: string;
  organizationId: string;
  itemId: string;
  locationId: string;
  quantity: string;
  avgUnitCost: string | null;
  lastMovementId: string | null;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string;
  taxId: string | null;
  paymentTerms: string | null;
  currency: string;
  isActive: boolean;
  rating: string | null;
  notes: string | null;
  createdAt: string;
};

export type PurchaseRequest = {
  id: string;
  organizationId: string;
  requestNumber: string;
  requestedBy: string;
  requestDate: string;
  requiredDate: string | null;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: string;
};

export type PurchaseOrder = {
  id: string;
  organizationId: string;
  orderNumber: string;
  supplierId: string;
  requestId: string | null;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
};

export type GoodsReceipt = {
  id: string;
  organizationId: string;
  receiptNumber: string;
  orderId: string;
  supplierId: string;
  receiptDate: string;
  receivedBy: string;
  locationId: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type SupplierInvoice = {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  supplierId: string;
  orderId: string | null;
  receiptId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

function toCategory(row: Record<string, unknown>): InventoryCategory {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    code: row.code as string,
    parentId: (row.parent_id as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    categoryId: row.category_id as string,
    name: row.name as string,
    code: row.code as string,
    description: (row.description as string | null) ?? null,
    unit: row.unit as string,
    conversionFactor: String(row.conversion_factor),
    baseUnit: row.base_unit as string,
    minStockLevel: String(row.min_stock_level),
    maxStockLevel: (row.max_stock_level as string | null) ?? null,
    reorderPoint: (row.reorder_point as string | null) ?? null,
    defaultSupplierId: (row.default_supplier_id as string | null) ?? null,
    costMethod: row.cost_method as string,
    standardCost: (row.standard_cost as string | null) ?? null,
    isActive: row.is_active as boolean,
    createdAt: String(row.created_at),
  };
}

function toLocation(row: Record<string, unknown>): InventoryLocation {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    farmId: (row.farm_id as string | null) ?? null,
    name: row.name as string,
    code: row.code as string,
    locationType: row.location_type as string,
    capacity: (row.capacity as string | null) ?? null,
    capacityUnit: (row.capacity_unit as string | null) ?? null,
    gpsLat: (row.gps_lat as number | null) ?? null,
    gpsLng: (row.gps_lng as number | null) ?? null,
    isActive: row.is_active as boolean,
    createdAt: String(row.created_at),
  };
}

function toMovement(row: Record<string, unknown>): InventoryMovement {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    itemId: row.item_id as string,
    locationId: row.location_id as string,
    movementType: row.movement_type as string,
    quantity: String(row.quantity),
    unit: row.unit as string,
    unitCost: (row.unit_cost as string | null) ?? null,
    totalCost: String(row.total_cost),
    referenceType: (row.reference_type as string | null) ?? null,
    referenceId: (row.reference_id as string | null) ?? null,
    batchNumber: (row.batch_number as string | null) ?? null,
    expiryDate: (row.expiry_date as string | null) ?? null,
    movementDate: String(row.movement_date),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toBalance(row: Record<string, unknown>): InventoryBalance {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    itemId: row.item_id as string,
    locationId: row.location_id as string,
    quantity: String(row.quantity),
    avgUnitCost: (row.avg_unit_cost as string | null) ?? null,
    lastMovementId: (row.last_movement_id as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

function toSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    code: row.code as string,
    contactPerson: (row.contact_person as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    country: row.country as string,
    taxId: (row.tax_id as string | null) ?? null,
    paymentTerms: (row.payment_terms as string | null) ?? null,
    currency: row.currency as string,
    isActive: row.is_active as boolean,
    rating: (row.rating as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toPurchaseRequest(row: Record<string, unknown>): PurchaseRequest {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    requestNumber: row.request_number as string,
    requestedBy: row.requested_by as string,
    requestDate: String(row.request_date),
    requiredDate: (row.required_date as string | null) ?? null,
    status: row.status as string,
    priority: row.priority as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toPurchaseOrder(row: Record<string, unknown>): PurchaseOrder {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    orderNumber: row.order_number as string,
    supplierId: row.supplier_id as string,
    requestId: (row.request_id as string | null) ?? null,
    orderDate: String(row.order_date),
    expectedDeliveryDate: (row.expected_delivery_date as string | null) ?? null,
    status: row.status as string,
    currency: row.currency as string,
    exchangeRate: String(row.exchange_rate),
    subtotal: String(row.subtotal),
    taxAmount: String(row.tax_amount),
    discountAmount: String(row.discount_amount),
    totalAmount: String(row.total_amount),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toGoodsReceipt(row: Record<string, unknown>): GoodsReceipt {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    receiptNumber: row.receipt_number as string,
    orderId: row.order_id as string,
    supplierId: row.supplier_id as string,
    receiptDate: String(row.receipt_date),
    receivedBy: row.received_by as string,
    locationId: row.location_id as string,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function toSupplierInvoice(row: Record<string, unknown>): SupplierInvoice {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    invoiceNumber: row.invoice_number as string,
    supplierId: row.supplier_id as string,
    orderId: (row.order_id as string | null) ?? null,
    receiptId: (row.receipt_id as string | null) ?? null,
    invoiceDate: String(row.invoice_date),
    dueDate: (row.due_date as string | null) ?? null,
    currency: row.currency as string,
    exchangeRate: String(row.exchange_rate),
    subtotal: String(row.subtotal),
    taxAmount: String(row.tax_amount),
    totalAmount: String(row.total_amount),
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

// Categories
export async function createInventoryCategory(userId: string, input: CreateInventoryCategoryInput): Promise<InventoryCategory> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.inventory_categories (organization_id, name, code, parent_id, description)
      values (${input.organizationId}, ${input.name}, ${input.code}, ${input.parentId || null}, ${input.description || null})
      returning *
    `;
    return toCategory(rows[0]);
  });
}

export async function listInventoryCategories(userId: string, organizationId: string): Promise<InventoryCategory[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.inventory_categories
      where organization_id = ${organizationId}
      order by name
    `;
    return rows.map(toCategory);
  });
}

// Items
export async function createInventoryItem(userId: string, input: CreateInventoryItemInput): Promise<InventoryItem> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.inventory_items
        (organization_id, category_id, name, code, description, unit, conversion_factor,
         base_unit, min_stock_level, max_stock_level, reorder_point, default_supplier_id,
         cost_method, standard_cost)
      values
        (${input.organizationId}, ${input.categoryId}, ${input.name}, ${input.code},
         ${input.description || null}, ${input.unit}, ${input.conversionFactor},
         ${input.baseUnit}, ${input.minStockLevel}, ${input.maxStockLevel || null},
         ${input.reorderPoint || null}, ${input.defaultSupplierId || null},
         ${input.costMethod}, ${input.standardCost || null})
      returning *
    `;
    return toItem(rows[0]);
  });
}

export async function listInventoryItems(
  userId: string,
  organizationId: string,
  categoryId?: string,
): Promise<InventoryItem[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (categoryId) {
      rows = await db`
        select ii.*, ic.name as category_name
        from public.inventory_items ii
        join public.inventory_categories ic on ic.id = ii.category_id
        where ii.organization_id = ${organizationId} and ii.category_id = ${categoryId} and ii.is_active = true
        order by ii.name
      `;
    } else {
      rows = await db`
        select ii.*, ic.name as category_name
        from public.inventory_items ii
        join public.inventory_categories ic on ic.id = ii.category_id
        where ii.organization_id = ${organizationId} and ii.is_active = true
        order by ic.name, ii.name
      `;
    }
    return rows.map(toItem);
  });
}

export async function getInventoryItem(userId: string, itemId: string): Promise<InventoryItem | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.inventory_items where id = ${itemId}`;
    return rows[0] ? toItem(rows[0]) : null;
  });
}

// Locations
export async function createInventoryLocation(userId: string, input: CreateInventoryLocationInput): Promise<InventoryLocation> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.inventory_locations
        (organization_id, farm_id, name, code, location_type, capacity, capacity_unit, gps_lat, gps_lng)
      values
        (${input.organizationId}, ${input.farmId || null}, ${input.name}, ${input.code},
         ${input.locationType}, ${input.capacity || null}, ${input.capacityUnit || null},
         ${input.gpsLat || null}, ${input.gpsLng || null})
      returning *
    `;
    return toLocation(rows[0]);
  });
}

export async function listInventoryLocations(userId: string, organizationId: string, farmId?: string): Promise<InventoryLocation[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (farmId) {
      rows = await db`
        select * from public.inventory_locations
        where organization_id = ${organizationId} and farm_id = ${farmId} and is_active = true
        order by name
      `;
    } else {
      rows = await db`
        select * from public.inventory_locations
        where organization_id = ${organizationId} and is_active = true
        order by name
      `;
    }
    return rows.map(toLocation);
  });
}

// Movements
export async function createInventoryMovement(userId: string, input: CreateInventoryMovementInput): Promise<InventoryMovement> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.inventory_movements
        (organization_id, item_id, location_id, movement_type, quantity, unit, unit_cost,
         reference_type, reference_id, batch_number, expiry_date, notes)
      values
        (${input.organizationId}, ${input.itemId}, ${input.locationId}, ${input.movementType},
         ${input.quantity}, ${input.unit}, ${input.unitCost || null},
         ${input.referenceType || null}, ${input.referenceId || null},
         ${input.batchNumber || null}, ${input.expiryDate || null}, ${input.notes || null})
      returning *
    `;
    return toMovement(rows[0]);
  });
}

export async function listInventoryMovements(
  userId: string,
  organizationId: string,
  itemId?: string,
  locationId?: string,
): Promise<InventoryMovement[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (itemId && locationId) {
      rows = await db`
        select * from public.inventory_movements
        where organization_id = ${organizationId} and item_id = ${itemId} and location_id = ${locationId}
        order by movement_date desc
      `;
    } else if (itemId) {
      rows = await db`
        select * from public.inventory_movements
        where organization_id = ${organizationId} and item_id = ${itemId}
        order by movement_date desc
      `;
    } else if (locationId) {
      rows = await db`
        select * from public.inventory_movements
        where organization_id = ${organizationId} and location_id = ${locationId}
        order by movement_date desc
      `;
    } else {
      rows = await db`
        select * from public.inventory_movements
        where organization_id = ${organizationId}
        order by movement_date desc
        limit 500
      `;
    }
    return rows.map(toMovement);
  });
}

// Balances
export async function listInventoryBalances(
  userId: string,
  organizationId: string,
  lowStockOnly = false,
): Promise<InventoryBalance[]> {
  return withUser(userId, async (db) => {
    let rows;
    if (lowStockOnly) {
      rows = await db`
        select ib.*, ii.name as item_name, ii.code as item_code, ii.unit, ii.reorder_point, ii.min_stock_level,
               il.name as location_name, il.code as location_code
        from public.inventory_balances ib
        join public.inventory_items ii on ii.id = ib.item_id
        join public.inventory_locations il on il.id = ib.location_id
        where ib.organization_id = ${organizationId}
          and ib.quantity <= coalesce(ii.reorder_point, ii.min_stock_level)
        order by ib.quantity asc
      `;
    } else {
      rows = await db`
        select ib.*, ii.name as item_name, ii.code as item_code, ii.unit,
               il.name as location_name, il.code as location_code
        from public.inventory_balances ib
        join public.inventory_items ii on ii.id = ib.item_id
        join public.inventory_locations il on il.id = ib.location_id
        where ib.organization_id = ${organizationId}
        order by ii.name, il.name
      `;
    }
    return rows.map(toBalance);
  });
}

export async function getItemBalance(
  userId: string,
  itemId: string,
  locationId: string,
): Promise<InventoryBalance | null> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.inventory_balances
      where item_id = ${itemId} and location_id = ${locationId}
    `;
    return rows[0] ? toBalance(rows[0]) : null;
  });
}

// Suppliers
export async function createSupplier(userId: string, input: CreateSupplierInput): Promise<Supplier> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.suppliers
        (organization_id, name, code, contact_person, email, phone, address,
         country, tax_id, payment_terms, currency, rating, notes)
      values
        (${input.organizationId}, ${input.name}, ${input.code}, ${input.contactPerson || null},
         ${input.email || null}, ${input.phone || null}, ${input.address || null},
         ${input.country}, ${input.taxId || null}, ${input.paymentTerms || null},
         ${input.currency}, ${input.rating || null}, ${input.notes || null})
      returning *
    `;
    return toSupplier(rows[0]);
  });
}

export async function listSuppliers(userId: string, organizationId: string): Promise<Supplier[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.suppliers
      where organization_id = ${organizationId} and is_active = true
      order by name
    `;
    return rows.map(toSupplier);
  });
}

// Purchase Requests
export async function createPurchaseRequest(userId: string, input: CreatePurchaseRequestInput): Promise<PurchaseRequest> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.purchase_requests
        (organization_id, request_number, requested_by, required_date, priority, notes)
      values
        (${input.organizationId}, ${input.requestNumber}, ${input.requestedBy},
         ${input.requiredDate || null}, ${input.priority}, ${input.notes || null})
      returning *
    `;
    const pr = toPurchaseRequest(rows[0]);

    // Insert lines
    for (const line of input.lines) {
      await db`
        insert into public.purchase_request_lines (request_id, item_id, quantity, unit, estimated_unit_cost, notes)
        values (${pr.id}, ${line.itemId}, ${line.quantity}, ${line.unit}, ${line.estimatedUnitCost || null}, ${line.notes || null})
      `;
    }

    return pr;
  });
}

export async function listPurchaseRequests(userId: string, organizationId: string): Promise<PurchaseRequest[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.purchase_requests
      where organization_id = ${organizationId}
      order by request_date desc
    `;
    return rows.map(toPurchaseRequest);
  });
}

// Purchase Orders
export async function createPurchaseOrder(userId: string, input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.purchase_orders
        (organization_id, order_number, supplier_id, request_id, expected_delivery_date,
         currency, exchange_rate, notes)
      values
        (${input.organizationId}, ${input.orderNumber}, ${input.supplierId}, ${input.requestId || null},
         ${input.expectedDeliveryDate || null}, ${input.currency}, ${input.exchangeRate}, ${input.notes || null})
      returning *
    `;
    const po = toPurchaseOrder(rows[0]);

    for (const line of input.lines) {
      await db`
        insert into public.purchase_order_lines (order_id, item_id, quantity, unit, unit_price, tax_rate, discount_rate, notes)
        values (${po.id}, ${line.itemId}, ${line.quantity}, ${line.unit}, ${line.unitPrice}, ${line.taxRate}, ${line.discountRate}, ${line.notes || null})
      `;
    }

    return po;
  });
}

export async function listPurchaseOrders(userId: string, organizationId: string): Promise<PurchaseOrder[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select po.*, s.name as supplier_name
      from public.purchase_orders po
      join public.suppliers s on s.id = po.supplier_id
      where po.organization_id = ${organizationId}
      order by po.order_date desc
    `;
    return rows.map(toPurchaseOrder);
  });
}

// Goods Receipts
export async function createGoodsReceipt(userId: string, input: CreateGoodsReceiptInput): Promise<GoodsReceipt> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.goods_receipts
        (organization_id, receipt_number, order_id, supplier_id, received_by, location_id, notes)
      values
        (${input.organizationId}, ${input.receiptNumber}, ${input.orderId}, ${input.supplierId},
         ${input.receivedBy}, ${input.locationId}, ${input.notes || null})
      returning *
    `;
    const gr = toGoodsReceipt(rows[0]);

    for (const line of input.lines) {
      await db`
        insert into public.goods_receipt_lines
          (receipt_id, order_line_id, item_id, quantity, unit, unit_cost, batch_number, expiry_date, quality_status, notes)
        values
          (${gr.id}, ${line.orderLineId}, ${line.itemId}, ${line.quantity}, ${line.unit},
           ${line.unitCost || null}, ${line.batchNumber || null}, ${line.expiryDate || null},
           ${line.qualityStatus}, ${line.notes || null})
      `;
    }

    return gr;
  });
}

export async function listGoodsReceipts(userId: string, organizationId: string): Promise<GoodsReceipt[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select gr.*, po.order_number, s.name as supplier_name, il.name as location_name
      from public.goods_receipts gr
      join public.purchase_orders po on po.id = gr.order_id
      join public.suppliers s on s.id = gr.supplier_id
      join public.inventory_locations il on il.id = gr.location_id
      where gr.organization_id = ${organizationId}
      order by gr.receipt_date desc
    `;
    return rows.map(toGoodsReceipt);
  });
}

// Supplier Invoices
export async function createSupplierInvoice(userId: string, input: CreateSupplierInvoiceInput): Promise<SupplierInvoice> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.supplier_invoices
        (organization_id, invoice_number, supplier_id, order_id, receipt_id,
         invoice_date, due_date, currency, exchange_rate, subtotal, tax_amount, notes)
      values
        (${input.organizationId}, ${input.invoiceNumber}, ${input.supplierId}, ${input.orderId || null},
         ${input.receiptId || null}, ${input.invoiceDate}, ${input.dueDate || null},
         ${input.currency}, ${input.exchangeRate}, ${input.subtotal}, ${input.taxAmount}, ${input.notes || null})
      returning *
    `;
    return toSupplierInvoice(rows[0]);
  });
}

export async function listSupplierInvoices(userId: string, organizationId: string): Promise<SupplierInvoice[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select si.*, s.name as supplier_name
      from public.supplier_invoices si
      join public.suppliers s on s.id = si.supplier_id
      where si.organization_id = ${organizationId}
      order by si.invoice_date desc
    `;
    return rows.map(toSupplierInvoice);
  });
}