import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const PORT = 9354;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const networkFetch = globalThis.fetch;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(PORT)], { stdio: 'ignore' });
process.on('exit', () => server.kill());
let ready = false;
for (let attempt = 0; attempt < 120 && !ready; attempt += 1) {
  try {
    ready = (await networkFetch(ORIGIN)).ok;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
if (!ready) throw new Error(`servidor real não respondeu em ${ORIGIN}`);

const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');
const listeners = new Map();
const stores = new Map();
let online = true;
const fetched = [];

const keyOf = (value) => new URL(typeof value === 'string' ? value : value.url, ORIGIN).href;
class MemoryCache {
  entries = new Map();
  failWrites = false;
  async put(request, response) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.entries.set(keyOf(request), response.clone());
  }
  async match(request, options = {}) {
    const key = keyOf(request);
    if (!options.ignoreSearch) return this.entries.get(key)?.clone();
    const wanted = new URL(key);
    for (const [stored, response] of this.entries) {
      const candidate = new URL(stored);
      if (candidate.origin === wanted.origin && candidate.pathname === wanted.pathname) return response.clone();
    }
    return undefined;
  }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
  async delete(request) { return this.entries.delete(keyOf(request)); }
}
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new MemoryCache());
    return stores.get(name);
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
};
const fetch = async (request) => {
  const url = keyOf(request);
  fetched.push(url);
  if (!online) throw new TypeError('offline');
  return networkFetch(url);
};
const self = {
  location: { origin: ORIGIN },
  clients: { async claim() {} },
  async skipWaiting() {},
  addEventListener(type, listener) { listeners.set(type, listener); },
};
vm.runInNewContext(source, { self, caches, fetch, URL, Response, Request, Promise, Set, Map });

async function lifecycle(type, data = undefined) {
  let pending = Promise.resolve();
  listeners.get(type)({ data, waitUntil(value) { pending = Promise.resolve(value); } });
  await pending;
}
async function request(request) {
  let response;
  listeners.get('fetch')({ request, respondWith(value) { response = Promise.resolve(value); } });
  return response ? response : null;
}

await lifecycle('install');
const cache = await caches.open('coro-solto-offline-v1');
for (const url of fetched) {
  assert.ok(await cache.match(url), `install caches the real core resource ${new URL(url).pathname}`);
}
const shell = await (await cache.match('/')).text();
assert.match(shell, /src="\/js\/main\.js[^"]*"/, 'installed shell references the game entry script');
const mainSrc = shell.match(/src="(\/js\/main\.js[^"]*)"/)?.[1];
assert.equal((await networkFetch(new URL(mainSrc, ORIGIN))).ok, true, 'rendered game entry script resolves');
const defaultMap = await (await cache.match('/js/map_brasilia.js')).text();
assert.ok(defaultMap.length > 1_000, 'install keeps the real default single-player map');

const deepRoute = { method: 'GET', headers: new Headers(), mode: 'navigate', url: `${ORIGIN}/loja` };
const deepOnline = await (await request(deepRoute)).text();
assert.match(deepOnline, /<!doctype html>/i, 'online deep route reaches the real renderer');

online = false;
const offlineDeep = await request(deepRoute);
assert.equal(await offlineDeep.text(), shell, 'offline deep navigation falls back to the root shell');
const offlineHome = await request({ method: 'GET', headers: new Headers(), mode: 'navigate', url: `${ORIGIN}/` });
assert.equal(await offlineHome.text(), shell, 'offline navigation falls back to the installed shell');
const offlineDefaultMap = await request(new Request(`${ORIGIN}/js/map_brasilia.js?v=release-1`));
assert.equal(await offlineDefaultMap.text(), defaultMap, 'versioned map request can use the installed unversioned copy');

online = true;
const versioned = new Request(`${ORIGIN}/js/pwa-install.js?v=release-1`);
const versionedText = await (await request(versioned)).text();
assert.match(versionedText, /inicializaOffline/, 'online static resource reaches the real server');
online = false;
assert.equal(await (await request(versioned)).text(), versionedText, 'visited static resource remains available offline');

online = true;
const beforeMessage = fetched.length;
await lifecycle('message', {
  type: 'CACHE_OFFLINE_RESOURCES',
  urls: [`${ORIGIN}/js/rotas.js`, `${ORIGIN}/api/private.json`, 'https://other.test/foreign.js'],
});
const messageFetches = fetched.slice(beforeMessage);
assert.deepEqual(messageFetches, [`${ORIGIN}/js/rotas.js`], 'warm-up accepts only same-origin static resources');

cache.failWrites = true;
const uncached = await request(new Request(`${ORIGIN}/js/pwa-install.js?v=quota-full`));
assert.match(await uncached.text(), /inicializaOffline/, 'full cache does not break a valid static network response');
const uncachedHome = await request({ method: 'GET', headers: new Headers(), mode: 'navigate', url: `${ORIGIN}/` });
assert.match(await uncachedHome.text(), /<!doctype html>/i, 'full cache does not break a valid navigation response');
cache.failWrites = false;

await lifecycle('message', {
  type: 'CACHE_OFFLINE_RESOURCES',
  urls: Array.from({ length: 620 }, (_, index) => `${ORIGIN}/js/pwa-install.js?visited=${index}`),
});
assert.ok((await cache.keys()).length <= 600, 'runtime cache stays bounded');
assert.equal(await (await cache.match('/')).text(), shell, 'cache trimming preserves the offline shell');
assert.equal(
  await (await cache.match('/js/map_brasilia.js')).text(),
  defaultMap,
  'cache trimming preserves the default map',
);

server.kill();
console.log('PWA offline contract: PASS (real shell/assets, default map, runtime cache and filters)');
