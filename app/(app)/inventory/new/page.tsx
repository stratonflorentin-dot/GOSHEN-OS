import { redirect } from "next/navigation";
import { Boxes, ArrowLeft, Plus, Package, Tag } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listInventoryCategories } from "@/services/inventoryService";
import { createInventoryItemAction } from "./actions";

export default async function NewInventoryItemPage({
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
  const categories = await listInventoryCategories(user.id, org.id);

  return (
    <div className="mx-auto max-w-2xl">
      <a href="/inventory" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to inventory
      </a>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary-600" />
          Add inventory item
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define a new inventory item — seeds, fertilizer, feed, medicine, fuel, tools, etc.
        </p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <span className="h-4 w-4" /> {error}
        </p>
      )}

      <form action={createInventoryItemAction} className="card space-y-4 p-6">
        <div>
          <label htmlFor="categoryId" className="field-label">Category</label>
          <select id="categoryId" name="categoryId" required className="field-input">
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="field-label">Item name</label>
          <input
            id="name"
            name="name"
            required
            maxLength={160}
            placeholder="e.g. NPK 17-17-17 Fertilizer"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="code" className="field-label">Code (unique, lowercase, underscores)</label>
          <input
            id="code"
            name="code"
            required
            maxLength={60}
            pattern="[a-z0-9_-]+"
            placeholder="e.g. npk_17_17_17"
            className="field-input lowercase"
          />
        </div>

        <div>
          <label htmlFor="description" className="field-label">Description (optional)</label>
          <textarea id="description" name="description" rows={3} maxLength={2000} className="field-input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="unit" className="field-label">Unit</label>
            <input id="unit" name="unit" required maxLength={20} placeholder="e.g. kg" className="field-input" />
          </div>
          <div>
            <label htmlFor="baseUnit" className="field-label">Base unit</label>
            <input id="baseUnit" name="baseUnit" required maxLength={20} defaultValue="kg" className="field-input" />
          </div>
        </div>

        <div>
          <label htmlFor="conversionFactor" className="field-label">Conversion factor (to base unit)</label>
          <input id="conversionFactor" name="conversionFactor" type="number" min="0.000001" step="0.000001" defaultValue="1" className="field-input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="minStockLevel" className="field-label">Min stock level</label>
            <input id="minStockLevel" name="minStockLevel" type="number" min="0" step="0.001" defaultValue="0" className="field-input" />
          </div>
          <div>
            <label htmlFor="reorderPoint" className="field-label">Reorder point</label>
            <input id="reorderPoint" name="reorderPoint" type="number" min="0" step="0.001" className="field-input" />
          </div>
        </div>

        <div>
          <label htmlFor="maxStockLevel" className="field-label">Max stock level (optional)</label>
          <input id="maxStockLevel" name="maxStockLevel" type="number" min="0" step="0.001" className="field-input" />
        </div>

        <div>
          <label htmlFor="costMethod" className="field-label">Cost method</label>
          <select id="costMethod" name="costMethod" defaultValue="fifo" className="field-input">
            <option value="fifo">FIFO</option>
            <option value="lifo">LIFO</option>
            <option value="average">Weighted Average</option>
            <option value="standard">Standard Cost</option>
          </select>
        </div>

        <div>
          <label htmlFor="standardCost" className="field-label">Standard cost per unit (optional)</label>
          <input id="standardCost" name="standardCost" type="number" min="0" step="0.01" className="field-input" />
        </div>

        <div>
          <label htmlFor="defaultSupplierId" className="field-label">Default supplier (optional)</label>
          <input id="defaultSupplierId" name="defaultSupplierId" placeholder="Supplier UUID" className="field-input" />
        </div>

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600">
          <Plus className="h-4 w-4" /> Create item
        </button>
      </form>
    </div>
  );
}