const CACHE_NAME = "sayayume-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

// Install: pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Network-first for API calls and chat
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/chat/")) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || offlineResponse())
      )
    );
    return;
  }

  // Network-first for content images that may update without URL change
  if (
    url.pathname.startsWith("/references/") ||
    url.pathname.startsWith("/avatars/")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || offlineResponse()))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, icons, fonts) — these have content hashes
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Network-first for pages (HTML navigation)
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || offlineResponse())
      )
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'さやゆめ', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag ?? 'sayayume',
      renotify: true,
      data: { url: data.url ?? '/' },
    })
  );
});

// Notification clicked → open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

function offlineResponse() {
  return new Response(
    '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>オフライン - さやゆめ</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#1a1a1a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}.container{max-width:400px}h1{font-size:1.5rem;margin-bottom:1rem}p{color:#999;margin-bottom:1.5rem}button{background:#ec4899;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:0.5rem;font-size:1rem;cursor:pointer}button:hover{background:#db2777}</style></head><body><div class="container"><h1>オフラインです</h1><p>インターネット接続を確認してね</p><button onclick="location.reload()">再読み込み</button></div></body></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
