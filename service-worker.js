const CACHE_NAME = "tcm-workbench-static-v5";
const PRECACHE_URLS = ["./", "./index.html", "./manifest.json", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/apple-touch-icon.png"];

async function cachePut(request, response) {
  if (!response || !response.ok) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (_) {
    // 缓存失败不应影响在线响应。
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    await cachePut(request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, event) {
  const cached = await caches.match(request);
  const refresh = fetch(request).then(async (response) => {
    await cachePut(request, response);
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request).catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./"))));
    return;
  }

  if (url.pathname.endsWith("/library/index.json")) {
    // 书库索引决定译本入口，联网时必须优先获取最新版本。
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.includes("/library/")) {
    // 古籍正文先用缓存保证离线阅读，同时在后台更新。
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then(async (response) => {
        await cachePut(request, response);
        return response;
      });
    })
  );
});
