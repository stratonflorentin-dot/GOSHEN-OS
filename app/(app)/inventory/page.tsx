import { redirect } from "next/navigation";
import { Boxes, Plus, ArrowLeft, AlertTriangle, Package, Search } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { listInventoryItems, listInventoryBalances, listInventoryCategories } from "@/services/inventoryService";

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const org = memberships[0].organization;
  const items = await listInventoryItems(user.id, org.id);
  const lowStock = await listInventoryBalances(user.id, org.id, true);
  const categories = await listInventoryCategories(user.id, org.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary-600" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground">{org.name}</p>
        </div>
        <a
          href="/inventory/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" /> Add item
        </a>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {lowStock.length} item{lowStock.length === 1 ? "" : "s"} at or below reorder point
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Review stock levels and create purchase requests.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card grid place-items-center p-10 text-center">
          <div>
            <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="mt-3 text-base font-semibold">No inventory items yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first item — seeds, fertilizer, feed, medicine, fuel, tools, etc.
            </p>
            <a
              href="/inventory/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" /> Add your first item
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.categoryId === cat.id);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.name}
                </div>
                <div className="divide-y divide-black/5">
                  {catItems.map((item) => (
                    <a
                      key={item.id}
                      href={`/inventory/${item.id}`}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center hover:bg-black/[0.02] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                          <Package className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-medium">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">{item.code} · {item.unit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground sm:ml-auto">
                        <span>Min: {item.minStockLevel} {item.unit}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}