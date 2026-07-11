const CACHE = "mis-finanzas-v2";
const PRECACHE = ["/offline.html", "/icon.png?v=2"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Clic en una notificación del sistema: enfoca la app y navega si hay URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients[0];
        if (existing) {
          existing.focus();
          return existing.navigate ? existing.navigate(url) : undefined;
        }
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navegación: red primero, página offline si no hay conexión
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // Estáticos precacheados: caché primero
  const url = new URL(request.url);
  if (url.origin === location.origin && PRECACHE.includes(url.pathname + url.search)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    );
  }
});
