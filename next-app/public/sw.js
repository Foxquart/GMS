// Bump the version on any change here: these names are what retire old caches.
const VERSION = "v4";
// The shell is precached and never evicted — it is the offline floor.
const SHELL_CACHE = `gms-shell-${VERSION}`;
// Everything picked up while browsing, capped so it cannot grow forever.
const RUNTIME_CACHE = `gms-runtime-${VERSION}`;
const RUNTIME_MAX_ENTRIES = 80;

// Only routes safe to hold for a signed-out visitor. /dashboard used to be
// here, but it redirects to /login without a session, so precaching it stored
// login markup under the dashboard key and served that back offline.
const SHELL = ["/", "/login", "/offline"];

/**
 * Cache.keys() returns entries in insertion order, so dropping from the front
 * evicts the least recently added. Approximate LRU, no bookkeeping.
 */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, not cache.addAll: addAll rejects as a unit, so a single
      // unreachable URL meant the worker never installed at all.
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            // A shell entry we could not reach is not worth failing over.
          }
        }),
      );
    })(),
  );
  // No skipWaiting() here on purpose. Taking over mid-session swaps the JS
  // under a running page and breaks hydration; the app offers the reload.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// The update banner asks for the swap once someone has chosen to take it.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls: network-only. Serving a stale invoice or stock level from cache
  // is worse than showing nothing, so offline simply fails here.
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: stale-while-revalidate.
  //
  // This was cache-first, which pinned scripts and styles to whatever was
  // cached on the first visit. A new release then rendered fresh server markup
  // against stale client JS — the app looked unchanged and React threw
  // hydration mismatches. Serve the cached copy for speed, but always refetch
  // in the background so the next load is current.
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              event.waitUntil(
                caches.open(RUNTIME_CACHE).then(async (cache) => {
                  await cache.put(request, copy);
                  await trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES);
                }),
              );
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Page navigations: network-first, then this page from cache, then the
  // offline page. Falling back to /dashboard sent people to a stale dashboard
  // that may not even be theirs; /offline says what is actually wrong.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            const copy = res.clone();
            event.waitUntil(
              caches.open(RUNTIME_CACHE).then(async (cache) => {
                await cache.put(request, copy);
                await trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES);
              }),
            );
          }
          return res;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/offline")) ||
            Response.error()
          );
        }
      })(),
    );
  }
});
