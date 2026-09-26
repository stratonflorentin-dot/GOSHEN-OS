/**
 * Service Worker for GOSHEN OS PWA (Phase 9)
 * Handles offline caching, background sync, and asset management
 */

const CACHE_NAME = "goshen-os-v1";
const OFFLINE_CACHE = "goshen-offline-v1";

// Assets to cache immediately
const ASSETS_TO_CACHE = [
  "/",
  "/login",
  "/register",
  "/manifest.json",
  "/favicon.ico",
];

// API routes that can be cached (GET requests only)
const CACHEABLE_API_ROUTES = [
  "/api/analytics/kpis",
  "/api/analytics/plots",
  "/api/analytics/crops",
  "/api/analytics/livestock",
  "/api/analytics/seasons",
  "/api/analytics/cashflow",
];

// Install event - cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== OFFLINE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first strategy for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    // For GET requests to cacheable API routes, use network-first with cache fallback
    if (
      event.request.method === "GET" &&
      CACHEABLE_API_ROUTES.some((route) => url.pathname.startsWith(route))
    ) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(OFFLINE_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Fall back to cache if network fails
            return caches.match(event.request).then((cached) => {
              if (cached) {
                return cached;
              }
              // Return offline fallback for API errors
              return new Response(
                JSON.stringify({ error: "Offline - data not available" }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" },
                }
              );
            });
          })
      );
      return;
    }

    // For non-cacheable API routes, try network only
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline - this feature requires internet connection" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Handle page navigation - cache-first with network fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // Check if cache is stale (older than 5 minutes)
          const cachedDate = cached.headers.get("date");
          if (cachedDate) {
            const cacheAge = Date.now() - new Date(cachedDate).getTime();
            if (cacheAge > 5 * 60 * 1000) {
              // Cache is stale, fetch from network and update cache
              fetch(event.request).then((response) => {
                if (response.ok) {
                  const responseClone = response.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                  });
                }
              });
            }
          }
          return cached;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Handle static assets - cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Background sync for offline data
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-outbox") {
    event.waitUntil(syncOutbox());
  }
});

// Handle skip waiting for updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function syncOutbox() {
  // This would normally communicate with IndexedDB and sync pending items
  // For now, it's a placeholder that would be implemented with proper sync logic
  console.log("Background sync: processing outbox");

  // In a real implementation, this would:
  // 1. Open IndexedDB
  // 2. Get all pending sync items
  // 3. Try to upload each item to the server
  // 4. Update item status based on result
  // 5. Remove successfully synced items
}

// Push notification handling (for future use)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification from GOSHEN OS",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };

  event.waitUntil(
    self.registration.showNotification("GOSHEN OS", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/")
  );
});