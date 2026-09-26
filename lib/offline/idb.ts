/**
 * IndexedDB wrapper for offline data storage (Phase 9)
 * Handles caching of farm data, GPS traces, and sync outbox
 */

const DB_NAME = "goshen-offline";
const DB_VERSION = 1;

export interface OfflineFarmData {
  id: string;
  farmId: string;
  data: any;
  timestamp: number;
  version: number;
}

export interface GPSTrace {
  id: string;
  farmId: string;
  plotId?: string;
  points: Array<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  }>;
  status: "recording" | "completed" | "uploaded";
  startTime: number;
  endTime?: number;
}

export interface SyncItem {
  id: string;
  type: "gps_trace" | "task_completion" | "activity" | "observation" | "inventory_consumption";
  payload: any;
  status: "pending" | "syncing" | "synced" | "failed";
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
}

class IndexedDBWrapper {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Farm data cache
        if (!db.objectStoreNames.contains("farmData")) {
          const farmStore = db.createObjectStore("farmData", { keyPath: "id" });
          farmStore.createIndex("farmId", "farmId", { unique: false });
          farmStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // GPS traces
        if (!db.objectStoreNames.contains("gpsTraces")) {
          const gpsStore = db.createObjectStore("gpsTraces", { keyPath: "id" });
          gpsStore.createIndex("farmId", "farmId", { unique: false });
          gpsStore.createIndex("status", "status", { unique: false });
        }

        // Sync outbox
        if (!db.objectStoreNames.contains("syncOutbox")) {
          const syncStore = db.createObjectStore("syncOutbox", { keyPath: "id" });
          syncStore.createIndex("status", "status", { unique: false });
          syncStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async farmData(): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    return this.db!.transaction("farmData", "readwrite").objectStore("farmData");
  }

  async gpsTraces(): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    return this.db!.transaction("gpsTraces", "readwrite").objectStore("gpsTraces");
  }

  async syncOutbox(): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    return this.db!.transaction("syncOutbox", "readwrite").objectStore("syncOutbox");
  }

  // Farm data operations
  async cacheFarmData(data: OfflineFarmData): Promise<void> {
    const store = await this.farmData();
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFarmData(id: string): Promise<OfflineFarmData | undefined> {
    const store = await this.farmData();
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFarmData(): Promise<OfflineFarmData[]> {
    const store = await this.farmData();
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // GPS trace operations
  async saveGPSTrace(trace: GPSTrace): Promise<void> {
    const store = await this.gpsTraces();
    return new Promise((resolve, reject) => {
      const request = store.put(trace);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getGPSTrace(id: string): Promise<GPSTrace | undefined> {
    const store = await this.gpsTraces();
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingGPSTraces(): Promise<GPSTrace[]> {
    const store = await this.gpsTraces();
    return new Promise((resolve, reject) => {
      const index = store.index("status");
      const request = index.getAll("recording");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync outbox operations
  async addToSyncOutbox(item: SyncItem): Promise<void> {
    const store = await this.syncOutbox();
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<SyncItem[]> {
    const store = await this.syncOutbox();
    return new Promise((resolve, reject) => {
      const index = store.index("status");
      const request = index.getAll("pending");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncItemStatus(
    id: string,
    status: SyncItem["status"],
    errorMessage?: string
  ): Promise<void> {
    const store = await this.syncOutbox();
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          item.updatedAt = Date.now();
          if (errorMessage) item.errorMessage = errorMessage;
          if (status === "syncing") item.retryCount++;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSyncedItems(): Promise<void> {
    const store = await this.syncOutbox();
    return new Promise((resolve, reject) => {
      const index = store.index("status");
      const request = index.openCursor(IDBKeyRange.only("synced"));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const idb = new IndexedDBWrapper();