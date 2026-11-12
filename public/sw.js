const CACHE_NAME = 'coro-solto-offline-v1';
const CACHE_LIMIT = 600;
const OFFLINE_CORE = [
  '/',
  '/site.webmanifest',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/js/map_brasilia.js',
  '/js/map_surface_finish.js',
  '/js/vao.js',
  '/js/map_sky.js',
  '/img/faccoes/time-e.webp',
  '/img/faccoes/time-b.webp',
  '/models/props/palacio.glb',
  '/models/props/justica.glb',
  '/models/props/tires.glb',
  '/models/props/stall.glb',
  '/models/props/tent.glb',
  '/models/props/bus.glb',
  '/models/props/drinkstand.glb',
  '/models/props/urna.glb',
];
const STATIC_PATH = /\.(?:avif|css|glb|gif|ico|jpe?g|js|json|mp3|ogg|png|svg|wasm|wav|webmanifest|webm|webp|woff2?)$/i;

const sameOriginStatic = (value) => {
  const url = new URL(value, self.location.origin);
  return url.origin === self.location.origin && STATIC_PATH.test(url.pathname) && !url.pathname.startsWith('/api/');
};

async function cacheResponse(request, response) {
  if (!response?.ok || response.status === 206) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function trimCache(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - CACHE_LIMIT)).map((key) => cache.delete(key)));
}

async function cacheUrls(values) {
  const urls = [...new Set(values)]
    .map((value) => new URL(value, self.location.origin))
    .filter((url) => url.origin === self.location.origin && (url.pathname === '/' || sameOriginStatic(url)))
    .map((url) => url.href);
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (response.ok && response.status !== 206) await cache.put(url, response);
    } catch {
      // O recurso continua disponível no cache anterior, se já tiver sido visitado.
    }
  }));
  await trimCache(cache);
}

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/')) || Response.error();
  }
}

async function staticResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  if (url.search) {
    const exact = await cache.match(request);
    if (exact) return exact;
  }
  try {
    return await cacheResponse(request, await fetch(request));
  } catch {
    return (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true })) || Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheUrls(OFFLINE_CORE).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name.startsWith('coro-solto-offline-') && name !== CACHE_NAME).map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_OFFLINE_RESOURCES' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(cacheUrls(event.data.urls));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }
  if (sameOriginStatic(url)) event.respondWith(staticResponse(request));
});
