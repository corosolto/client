import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import vm from 'node:vm';
import { MAPS } from '../../public/js/maps.js';

const reservation = net.createServer();
await new Promise((resolve, reject) => {
  reservation.once('error', reject);
  reservation.listen(0, '127.0.0.1', resolve);
});
const PORT = reservation.address().port;
await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const ORIGIN = `http://127.0.0.1:${PORT}`;
const networkFetch = globalThis.fetch;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(PORT)], { stdio: 'ignore' });
process.on('exit', () => server.kill());
let ready = false;
for (let attempt = 0; attempt < 480 && !ready; attempt += 1) {
  try {
    ready = (await networkFetch(`${ORIGIN}/site.webmanifest`)).ok;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
if (!ready) throw new Error(`servidor real não respondeu em ${ORIGIN}`);
const renderedShell = await (await networkFetch(`${ORIGIN}/`)).text();
const BUILD_REVISION = renderedShell.match(/data-pwa-rev="([^"]+)"/)?.[1];
if (!BUILD_REVISION) throw new Error('shell real não declarou data-pwa-rev');
const NEXT_REVISION = BUILD_REVISION === 'ffffffffffff' ? 'eeeeeeeeeeee' : 'ffffffffffff';
let servedRevision = BUILD_REVISION;
let switchRootRevisionAfterFirstFetch = true;
let rootFetchCount = 0;

const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');
const listeners = new Map();
const stores = new Map();
let online = true;
let blockedPath = '';
let skipWaitingCount = 0;
const fetched = [];

const keyOf = (value) => new URL(typeof value === 'string' ? value : value.url, ORIGIN).href;
class MemoryCache {
  entries = new Map();
  failWrites = false;
  async put(request, response) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.entries.set(keyOf(request), response.clone());
  }
  async addAll(requests) {
    const loaded = [];
    for (const request of requests) {
      const response = await fetch(request);
      if (!response.ok) throw new Error(`core returned ${response.status}: ${keyOf(request)}`);
      loaded.push([request, response]);
    }
    for (const [request, response] of loaded) this.entries.set(keyOf(request), response.clone());
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
  const parsed = new URL(url);
  if (parsed.pathname === blockedPath) return new Response('missing', { status: 404 });
  const response = await networkFetch(url);
  if (parsed.pathname !== '/') return response;
  rootFetchCount += 1;
  const responseRevision = switchRootRevisionAfterFirstFetch && rootFetchCount > 1
    ? NEXT_REVISION
    : servedRevision;
  if (responseRevision === BUILD_REVISION) return response;
  const body = (await response.text()).replaceAll(BUILD_REVISION, responseRevision);
  return new Response(body, { status: response.status, headers: response.headers });
};
const self = {
  location: { origin: ORIGIN, href: `${ORIGIN}/sw.js?v=${BUILD_REVISION}` },
  clients: { async claim() {} },
  async skipWaiting() { skipWaitingCount += 1; },
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
const cache = await caches.open(`coro-solto-offline-${BUILD_REVISION}`);
for (const url of fetched) {
  assert.ok(await cache.match(url), `install caches the real core resource ${new URL(url).pathname}`);
}
const shell = await (await cache.match('/')).text();
assert.equal(skipWaitingCount, 1, 'complete core activates the worker');
assert.equal(rootFetchCount, 1, 'install persists the same shell response it validated');
switchRootRevisionAfterFirstFetch = false;
servedRevision = NEXT_REVISION;
const nextShellResponse = await request({
  method: 'GET',
  headers: new Headers(),
  mode: 'navigate',
  url: `${ORIGIN}/`,
});
assert.match(await nextShellResponse.text(), new RegExp(`data-pwa-rev="${NEXT_REVISION}"`), 'active worker passes the next shell through online');
assert.equal(await (await cache.match('/')).text(), shell, 'active worker does not overwrite its shell with the next build');
await lifecycle('message', { type: 'CACHE_OFFLINE_RESOURCES', revision: NEXT_REVISION, urls: [`${ORIGIN}/`] });
assert.equal(await (await cache.match('/')).text(), shell, 'active worker ignores next-build warm-up');
blockedPath = '/site.webmanifest';
const nextListeners = new Map();
let nextSkipWaitingCount = 0;
const nextSelf = {
  location: { origin: ORIGIN, href: `${ORIGIN}/sw.js?v=${NEXT_REVISION}` },
  clients: { async claim() {} },
  async skipWaiting() { nextSkipWaitingCount += 1; },
  addEventListener(type, listener) { nextListeners.set(type, listener); },
};
vm.runInNewContext(source, { self: nextSelf, caches, fetch, URL, Response, Request, Promise, Set, Map });
let nextInstall = Promise.resolve();
nextListeners.get('install')({ waitUntil(value) { nextInstall = Promise.resolve(value); } });
await assert.rejects(nextInstall, /core returned 404/, 'missing core resource aborts the new generation');
assert.equal(nextSkipWaitingCount, 0, 'incomplete generation never replaces the active worker');
assert.equal(stores.has(`coro-solto-offline-${NEXT_REVISION}`), false, 'failed generation removes its partial cache');
assert.equal(await (await cache.match('/')).text(), shell, 'failed generation preserves the active offline shell');
blockedPath = '';
servedRevision = BUILD_REVISION;
assert.match(shell, /src="\/js\/main\.js[^"]*"/, 'installed shell references the game entry script');
const pwaRevision = shell.match(/data-pwa-rev="([^"]+)"/)?.[1];
assert.match(pwaRevision || '', /^[a-f0-9]{12}$/, 'rendered shell carries a build-derived PWA revision');
assert.match(shell, new RegExp(`/js/pwa-install\\.js\\?v=${pwaRevision}`), 'installer and worker share the PWA revision');
const importMap = JSON.parse(shell.match(/<script[^>]*type="importmap"[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '{}');
for (const resource of Object.values(importMap.imports || {}).filter((value) => !value.endsWith('/'))) {
  assert.ok(await cache.match(resource), `install persists imported module ${resource}`);
}
const vendorModules = JSON.parse(
  shell.match(/<script[^>]*id="offline-core-modules"[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '[]',
);
assert.ok(vendorModules.length > 0, 'rendered shell declares the vendor module graph');
for (const resource of vendorModules) {
  assert.ok(await cache.match(resource), `install persists vendor module ${resource}`);
}
const mainSrc = shell.match(/src="(\/js\/main\.js[^"]*)"/)?.[1];
assert.ok(await cache.match(mainSrc), 'rendered game entry script is persisted before activation');
const defaultMap = await (await cache.match('/js/map_brasilia.js')).text();
for (const prop of MAPS.praca_poderes.props) {
  assert.ok(await cache.match(`/models/props/${prop}.glb`), `install persists Praça prop ${prop}`);
}
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
  revision: BUILD_REVISION,
  urls: [`${ORIGIN}/js/rotas.js`, `${ORIGIN}/models/bot-brain/weights.bin`, `${ORIGIN}/api/private.json`, 'https://other.test/foreign.js'],
});
const messageFetches = fetched.slice(beforeMessage);
assert.deepEqual(messageFetches, [
  `${ORIGIN}/js/rotas.js`,
  `${ORIGIN}/models/bot-brain/weights.bin`,
], 'warm-up accepts only same-origin static resources, including BotBrain weights');

cache.failWrites = true;
const uncached = await request(new Request(`${ORIGIN}/js/pwa-install.js?v=quota-full`));
assert.match(await uncached.text(), /inicializaOffline/, 'full cache does not break a valid static network response');
const uncachedHome = await request({ method: 'GET', headers: new Headers(), mode: 'navigate', url: `${ORIGIN}/` });
assert.match(await uncachedHome.text(), /<!doctype html>/i, 'full cache does not break a valid navigation response');
cache.failWrites = false;

await lifecycle('message', {
  type: 'CACHE_OFFLINE_RESOURCES',
  revision: BUILD_REVISION,
  urls: Array.from({ length: 620 }, (_, index) => `${ORIGIN}/js/map_brasilia.js?historical=${index}`),
});
assert.ok((await cache.keys()).length <= 600, 'runtime cache stays bounded');
await Promise.all(Array.from(
  { length: 30 },
  (_, index) => request(new Request(`${ORIGIN}/js/pwa-install.js?runtime=${index}`)),
));
assert.ok((await cache.keys()).length <= 600, 'runtime fetch caching also enforces the limit');
assert.equal(await (await cache.match('/')).text(), shell, 'cache trimming preserves the offline shell');
assert.equal(
  await (await cache.match('/js/map_brasilia.js')).text(),
  defaultMap,
  'cache trimming preserves the default map',
);

server.kill();
console.log('PWA offline contract: PASS (real shell/assets, default map, runtime cache and filters)');
