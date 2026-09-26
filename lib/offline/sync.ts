/**
 * Offline Sync Service (Phase 9)
 * Handles synchronization of offline data with the server
 */

import { idb, type SyncItem } from "./idb";

export class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async startBackgroundSync(intervalMs = 60000): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    console.log("Starting background sync service");

    // Initial sync
    await this.syncPendingItems();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncPendingItems().catch((err) => {
        console.error("Background sync error:", err);
      });
    }, intervalMs);

    // Listen for online events
    window.addEventListener("online", this.handleOnline);
  }

  async stopBackgroundSync(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isSyncing = false;
    window.removeEventListener("online", this.handleOnline);
    console.log("Stopped background sync service");
  }

  private handleOnline = async (): Promise<void> => {
    console.log("Device came online, triggering sync");
    await this.syncPendingItems();
  };

  async syncPendingItems(): Promise<void> {
    const pendingItems = await idb.getPendingSyncItems();

    if (pendingItems.length === 0) {
      console.log("No pending items to sync");
      return;
    }

    console.log(`Syncing ${pendingItems.length} pending items`);

    for (const item of pendingItems) {
      try {
        await idb.updateSyncItemStatus(item.id, "syncing");

        const success = await this.syncItem(item);

        if (success) {
          await idb.updateSyncItemStatus(item.id, "synced");
          console.log(`Successfully synced item ${item.id}`);
        } else {
          await idb.updateSyncItemStatus(item.id, "pending", "Sync failed");
        }
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        await idb.updateSyncItemStatus(
          item.id,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    // Clean up synced items
    await idb.clearSyncedItems();
  }

  private async syncItem(item: SyncItem): Promise<boolean> {
    switch (item.type) {
      case "gps_trace":
        return this.syncGPSTrace(item);
      case "task_completion":
        return this.syncTaskCompletion(item);
      case "activity":
        return this.syncActivity(item);
      case "observation":
        return this.syncObservation(item);
      case "inventory_consumption":
        return this.syncInventoryConsumption(item);
      default:
        console.warn(`Unknown sync item type: ${item.type}`);
        return false;
    }
  }

  private async syncGPSTrace(item: SyncItem): Promise<boolean> {
    try {
      const trace = await idb.getGPSTrace(item.payload.traceId);
      if (!trace) return false;

      const response = await fetch("/api/gps/traces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trace),
      });

      if (response.ok) {
        // Update local trace status
        trace.status = "uploaded";
        await idb.saveGPSTrace(trace);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to sync GPS trace:", error);
      return false;
    }
  }

  private async syncTaskCompletion(item: SyncItem): Promise<boolean> {
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to sync task completion:", error);
      return false;
    }
  }

  private async syncActivity(item: SyncItem): Promise<boolean> {
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to sync activity:", error);
      return false;
    }
  }

  private async syncObservation(item: SyncItem): Promise<boolean> {
    try {
      const response = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to sync observation:", error);
      return false;
    }
  }

  private async syncInventoryConsumption(item: SyncItem): Promise<boolean> {
    try {
      const response = await fetch("/api/inventory/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to sync inventory consumption:", error);
      return false;
    }
  }

  async queueItemForSync(item: Omit<SyncItem, "id" | "status" | "retryCount" | "createdAt" | "updatedAt">): Promise<string> {
    const syncItem: SyncItem = {
      ...item,
      id: this.generateId(),
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await idb.addToSyncOutbox(syncItem);
    return syncItem.id;
  }

  private generateId(): string {
    // Fallback for browsers without crypto.randomUUID
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getSyncStatus(): { isSyncing: boolean; pendingCount: number } {
    return {
      isSyncing: this.isSyncing,
      pendingCount: 0, // Would need to query IndexedDB for real count
    };
  }
}

export const syncService = new SyncService();