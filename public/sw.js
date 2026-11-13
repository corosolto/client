const BUILD_REVISION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `coro-solto-offline-${BUILD_REVISION.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
  '/models/weapons/deagle.glb',
  '/models/anims/mixamo.glb',
  '/models/anims/index.json',
  '/models/anims/canarinho.glb',
  '/models/anims/foot-offsets.json',
  '/models/characters/canarinho.glb',
  '/models/props/congresso.glb',
  '/models/props/catedral.glb',
  '/models/props/ministerio.glb',
  '/models/props/palacio.glb',
  '/models/props/justica.glb',
  '/models/props/tires.glb',
  '/models/props/stall.glb',
  '/models/props/tent.glb',
  '/models/props/bus.glb',
  '/models/props/drinkstand.glb',
  '/models/props/towner.glb',
  '/models/props/urna.glb',
];
const CORE_MANIFEST_URL = new URL('/__offline_core_manifest__', self.location.origin).href;
const STATIC_PATH = /\.(?:avif|css|glb|gif|ico|jpe?g|js|json|mp3|ogg|png|svg|wasm|wav|webmanifest|webm|webp|woff2?)$/i;
let cacheMutation = Promise.resolve();
let cachedEntryCount = null;

const sameOriginStatic = (value) => {
  const url = new URL(value, self.location.origin);
  return url.origin === self.location.origin && STATIC_PATH.test(url.pathname) && !url.pathname.startsWith('/api/');
};

function cacheableUrls(values) {
  return [...new Set(values
    .map((value) => new URL(value, self.location.origin))
    .filter((url) => url.origin === self.location.origin && ((url.pathname === '/' && !url.search) || sameOriginStatic(url)))
    .map((url) => url.href))];
}

function mutateCache(operation) {
  const result = cacheMutation.then(operation, operation);
  cacheMutation = result.catch(() => {});
  return result;
}

async function protectedUrls(cache) {
  const stored = await cache.match(CORE_MANIFEST_URL);
  if (stored) {
    try {
      return new Set([CORE_MANIFEST_URL, ...await stored.json()]);
    } catch {
      // Um manifesto corrompido não protege revisões históricas indefinidamente.
    }
  }
  return new Set([CORE_MANIFEST_URL, ...cacheableUrls(OFFLINE_CORE)]);
}

async function trimCache(cache) {
  const keys = await cache.keys();
  const protectedKeys = await protectedUrls(cache);
  const removable = keys.filter((request) => !protectedKeys.has(request.url));
  const excess = Math.max(0, keys.length - CACHE_LIMIT);
  const removed = removable.slice(0, excess);
  await Promise.all(removed.map((request) => cache.delete(request)));
  return keys.length - removed.length;
}

async function boundedPut(request, response) {
  return mutateCache(async () => {
    const cache = await caches.open(CACHE_NAME);
    if (cachedEntryCount === null) cachedEntryCount = (await cache.keys()).length;
    const existed = await cache.match(request);
    await cache.put(request, response);
    if (!existed) cachedEntryCount += 1;
    if (cachedEntryCount > CACHE_LIMIT) cachedEntryCount = await trimCache(cache);
  });
}

async function cacheResponse(request, response) {
  if (!response?.ok || response.status === 206) return response;
  try {
    await boundedPut(request, response.clone());
  } catch {
    // Falta de espaço não pode transformar uma resposta de rede válida em falha.
  }
  return response;
}

const shellBuildRevision = (html) => html.match(/data-pwa-rev=["']([^"']+)["']/i)?.[1] || '';

function shellResources(html) {
  const values = [];
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) values.push(match[1]);
  for (const match of html.matchAll(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      values.push(...Object.values(JSON.parse(match[1]).imports || {}));
    } catch {
      throw new Error('offline shell has an invalid import map');
    }
  }
  for (const match of html.matchAll(/<script[^>]*id=["']offline-core-modules["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const modules = JSON.parse(match[1]);
    if (!Array.isArray(modules)) throw new Error('offline vendor manifest is invalid');
    values.push(...modules);
  }
  return cacheableUrls(values);
}

async function installOfflineCore() {
  const shell = await fetch('/', { credentials: 'same-origin' });
  if (!shell.ok) throw new Error(`offline shell returned ${shell.status}`);
  const shellForCache = shell.clone();
  const html = await shell.text();
  if (shellBuildRevision(html) !== BUILD_REVISION) throw new Error('offline shell revision does not match worker');
  const required = cacheableUrls([...OFFLINE_CORE, ...shellResources(html)]);
  if (required.length + 1 > CACHE_LIMIT) throw new Error('offline core exceeds cache limit');
  const rootUrl = new URL('/', self.location.origin).href;
  await caches.delete(CACHE_NAME);
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(required.filter((url) => url !== rootUrl));
    await cache.put(rootUrl, shellForCache);
    await cache.put(CORE_MANIFEST_URL, new Response(JSON.stringify(required), {
      headers: { 'content-type': 'application/json' },
    }));
    cachedEntryCount = await trimCache(cache);
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

async function cacheUrls(values) {
  const entries = (await Promise.all(cacheableUrls(values).map(async (url) => {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      return response.ok && response.status !== 206 ? [url, response] : null;
    } catch {
      return null;
    }
  }))).filter(Boolean);
  await mutateCache(async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const [url, response] of entries) {
      try {
        await cache.put(url, response);
      } catch {
        // O recurso continua disponível no cache anterior, se já tiver sido visitado.
      }
    }
    cachedEntryCount = await trimCache(cache);
  });
}

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const url = new URL(request.url);
      if (url.pathname === '/' && !url.search) {
        try {
          const html = await response.clone().text();
          if (shellBuildRevision(html) === BUILD_REVISION) await boundedPut('/', response.clone());
        } catch {
          // O jogo online continua mesmo quando o armazenamento local está cheio.
        }
      }
    }
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
  event.waitUntil(installOfflineCore().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name.startsWith('coro-solto-offline-') && name !== CACHE_NAME).map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_OFFLINE_RESOURCES'
    || event.data.revision !== BUILD_REVISION
    || !Array.isArray(event.data.urls)) return;
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
