import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ORIGIN = 'https://jogo.test';
const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');
const listeners = new Map();
const stores = new Map();
let online = true;
const fetched = [];

const keyOf = (value) => new URL(typeof value === 'string' ? value : value.url, ORIGIN).href;
class MemoryCache {
  entries = new Map();
  async put(request, response) { this.entries.set(keyOf(request), response.clone()); }
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
  return new Response(`asset:${new URL(url).pathname}`, { status: 200 });
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
assert.equal(await (await cache.match('/')).text(), 'asset:/', 'install keeps an offline navigation shell');
assert.equal(await (await cache.match('/js/map_brasilia.js')).text(), 'asset:/js/map_brasilia.js', 'install keeps the default single-player map');

online = false;
const offlineHome = await request({ method: 'GET', headers: new Headers(), mode: 'navigate', url: `${ORIGIN}/` });
assert.equal(await offlineHome.text(), 'asset:/', 'offline navigation falls back to the installed shell');
const offlineDefaultMap = await request(new Request(`${ORIGIN}/js/map_brasilia.js?v=release-1`));
assert.equal(await offlineDefaultMap.text(), 'asset:/js/map_brasilia.js', 'versioned map request can use the installed unversioned copy');

online = true;
const versioned = new Request(`${ORIGIN}/js/runtime.js?v=release-1`);
assert.equal(await (await request(versioned)).text(), 'asset:/js/runtime.js', 'online static resource reaches the network');
online = false;
assert.equal(await (await request(versioned)).text(), 'asset:/js/runtime.js', 'visited static resource remains available offline');

online = true;
const beforeMessage = fetched.length;
await lifecycle('message', {
  type: 'CACHE_OFFLINE_RESOURCES',
  urls: [`${ORIGIN}/models/characters/test.glb`, `${ORIGIN}/api/private.json`, 'https://other.test/foreign.js'],
});
const messageFetches = fetched.slice(beforeMessage);
assert.deepEqual(messageFetches, [`${ORIGIN}/models/characters/test.glb`], 'warm-up accepts only same-origin static resources');

console.log('PWA offline contract: PASS (install shell, default map, runtime cache and filters)');
