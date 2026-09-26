const CACHE_NAME = "goshen-static-v2";
const STATIC_ASSET = /\/_next\/static\/|\.(?:css|js|woff2?|png|jpe?g|webp|svg|ico)$/i;

self.addEventListener("install", (event) => {
  // Don't make installation depend on pages that can redirect or require auth.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("goshen-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Keep authenticated HTML, API data, map tiles, and cross-origin resources
  // out of CacheStorage so stale/private responses are never replayed offline.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    !STATIC_ASSET.test(url.pathname)
  ) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
