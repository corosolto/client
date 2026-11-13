import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../public/js/pwa-install.js', import.meta.url), 'utf8');

class Element {
  hidden = true;
  textContent = '';
  attributes = new Map();
  listeners = new Map();
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  async dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) await listener(event);
  }
}

function start({
  userAgent = 'Android',
  platform = 'Linux',
  touch = true,
  standalone = false,
  lang = 'pt-BR',
  offline = false,
  resources = [],
  pwaRevision = 'pwa-build-123',
  hostname = 'jogo.test',
  controlled = true,
  controlledRevision = pwaRevision,
  langReady = null,
} = {}) {
  const nodes = new Map(['pwa-install', 'pwa-install-action', 'pwa-install-help'].map((id) => [id, new Element()]));
  const windowListeners = new Map();
  const posted = [];
  const registrations = [];
  let resourceObserver = null;
  class PerformanceObserver {
    constructor(callback) { resourceObserver = callback; }
    observe() {}
  }
  const makeWorker = (revision) => ({
    scriptURL: `https://${hostname}/sw.js?v=${encodeURIComponent(revision)}`,
    postMessage(message) { posted.push(message); },
  });
  const worker = makeWorker(pwaRevision);
  const initialWorker = controlled ? makeWorker(controlledRevision) : null;
  const serviceWorkerListeners = new Map();
  const registration = { active: initialWorker };
  const serviceWorker = offline ? {
    controller: initialWorker,
    addEventListener(type, listener) {
      const list = serviceWorkerListeners.get(type) || [];
      list.push(listener);
      serviceWorkerListeners.set(type, list);
    },
    async register(path, options) {
      registrations.push({ path, options });
      return registration;
    },
  } : undefined;
  const window = {
    __CS_LANG_READY__: langReady,
    location: { origin: `https://${hostname}`, hostname },
    performance: { getEntriesByType: () => resources.map((name) => ({ name })) },
    PerformanceObserver,
    navigator: { userAgent, platform, maxTouchPoints: touch ? 5 : 0, standalone, serviceWorker },
    matchMedia: (query) => ({ matches: query.includes('pointer: coarse') ? touch : standalone }),
    addEventListener(type, listener) {
      const list = windowListeners.get(type) || [];
      list.push(listener);
      windowListeners.set(type, list);
    },
  };
  const document = {
    documentElement: { lang },
    getElementById: (id) => nodes.get(id) || null,
    querySelector: (selector) => selector === 'script[data-pwa-rev]' ? { dataset: { pwaRev: pwaRevision } } : null,
  };
  vm.runInNewContext(source, { window, document, URL });
  return {
    panel: nodes.get('pwa-install'),
    action: nodes.get('pwa-install-action'),
    help: nodes.get('pwa-install-help'),
    posted,
    registrations,
    setLang: (value) => { document.documentElement.lang = value; },
    dispatchWindow: async (type, event = {}) => {
      for (const listener of windowListeners.get(type) || []) await listener(event);
    },
    dispatchResources: async (names) => {
      resourceObserver?.({ getEntries: () => names.map((name) => ({ name })) });
      await Promise.resolve();
    },
    activateWorker: async () => {
      if (!serviceWorker) return;
      serviceWorker.controller = worker;
      registration.active = worker;
      for (const listener of serviceWorkerListeners.get('controllerchange') || []) listener();
      await Promise.resolve();
    },
  };
}

const android = start();
assert.equal(android.panel.hidden, false, 'touch device gets install help');
assert.equal(android.action.textContent, 'COMO ADICIONAR');
assert.equal(android.panel.attributes.get('aria-label'), 'Instalação do beta web');
let prevented = false;
let prompted = false;
await android.dispatchWindow('beforeinstallprompt', {
  preventDefault() { prevented = true; },
  async prompt() { prompted = true; },
  userChoice: Promise.resolve({ outcome: 'accepted' }),
});
assert.equal(prevented, true, 'browser prompt waits for an explicit button tap');
assert.equal(android.action.textContent, 'INSTALAR JOGO');
await android.action.dispatch('click');
assert.equal(prompted, true, 'install prompt runs from the button handler');
assert.equal(android.panel.hidden, true, 'accepted install closes the promotion');

const dismissed = start();
await dismissed.dispatchWindow('beforeinstallprompt', {
  preventDefault() {},
  async prompt() {},
  userChoice: Promise.resolve({ outcome: 'dismissed' }),
});
await dismissed.action.dispatch('click');
assert.equal(dismissed.panel.hidden, false, 'dismissed prompt keeps manual install help available');
assert.match(dismissed.help.textContent, /não foi concluída/);
await dismissed.dispatchWindow('appinstalled');
assert.equal(dismissed.panel.hidden, true, 'appinstalled clears the promotion');

const ios = start({ userAgent: 'iPhone Safari', platform: 'iPhone' });
await ios.action.dispatch('click');
assert.match(ios.help.textContent, /Safari/);
assert.equal(ios.help.hidden, false, 'iPhone gets manual Home Screen instructions');

const installed = start({ standalone: true });
assert.equal(installed.panel.hidden, true, 'installed app does not see install promotion');
const desktop = start({ touch: false });
assert.equal(desktop.panel.hidden, true, 'desktop does not see mobile install promotion');
let desktopPrevented = false;
await desktop.dispatchWindow('beforeinstallprompt', {
  preventDefault() { desktopPrevented = true; },
});
assert.equal(desktopPrevented, false, 'desktop keeps the browser-managed install path');

let resolveLang;
const langReady = new Promise((resolve) => { resolveLang = resolve; });
const delayedEnglish = start({ langReady });
assert.equal(delayedEnglish.panel.hidden, true, 'install promotion waits for authoritative language');
let delayedPrevented = false;
let delayedPrompted = false;
await delayedEnglish.dispatchWindow('beforeinstallprompt', {
  preventDefault() { delayedPrevented = true; },
  async prompt() { delayedPrompted = true; },
  userChoice: Promise.resolve({ outcome: 'accepted' }),
});
assert.equal(delayedPrevented, true, 'native install prompt is captured while language is pending');
delayedEnglish.setLang('en');
resolveLang();
await langReady;
assert.equal(delayedEnglish.action.textContent, 'INSTALL GAME', 'captured prompt adopts authoritative English copy');
await delayedEnglish.action.dispatch('click');
assert.equal(delayedPrompted, true, 'captured prompt remains actionable after language resolution');

let resolveInstalledLang;
const installedLangReady = new Promise((resolve) => { resolveInstalledLang = resolve; });
const delayedInstalled = start({ langReady: installedLangReady, offline: true });
await Promise.resolve();
await Promise.resolve();
const warmupsBeforeInstall = delayedInstalled.posted.length;
await delayedInstalled.dispatchWindow('appinstalled');
assert.equal(delayedInstalled.posted.length, warmupsBeforeInstall + 1, 'appinstalled warms resources while language is pending');
resolveInstalledLang();
await installedLangReady;
assert.equal(delayedInstalled.panel.hidden, true, 'late language resolution does not reopen an installed promotion');

const english = start({ lang: 'en' });
assert.equal(english.action.textContent, 'HOW TO INSTALL', 'English install CTA is localized');
assert.match(english.help.textContent, /browser menu/);
await english.action.dispatch('click');
assert.equal(english.help.textContent, 'Open your browser menu and choose “Install app” or “Add to Home Screen”.');
assert.equal(english.panel.attributes.get('aria-label'), 'Install the web beta');

const offline = start({
  offline: true,
  resources: [
    'https://jogo.test/js/main.js?v=release',
    'https://jogo.test/models/characters/test.glb?v=asset',
    'https://jogo.test/api/private.json',
    'https://other.test/foreign.js',
  ],
});
await Promise.resolve();
await Promise.resolve();
await offline.dispatchWindow('load');
assert.equal(offline.registrations.length, 1, 'page registers one service worker');
assert.equal(offline.registrations[0].path, '/sw.js?v=pwa-build-123', 'service worker URL follows the deployed PWA revision');
assert.equal(offline.registrations[0].options.scope, '/', 'service worker controls the installed game');
assert.equal(offline.posted.at(-1).type, 'CACHE_OFFLINE_RESOURCES');
assert.equal(offline.posted.at(-1).revision, 'pwa-build-123', 'warm-up is scoped to the active build');
assert.deepEqual([...offline.posted.at(-1).urls], [
  'https://jogo.test/',
  'https://jogo.test/js/main.js?v=release',
  'https://jogo.test/models/characters/test.glb?v=asset',
], 'page warms only the visited same-origin game resources');
await offline.dispatchResources([
  'https://jogo.test/models/maps/late-prop.glb?v=visited',
  'https://jogo.test/api/late.json',
  'https://other.test/foreign.js',
]);
assert.deepEqual([...offline.posted.at(-1).urls], [
  'https://jogo.test/models/maps/late-prop.glb?v=visited',
], 'resources loaded after the load event are warmed continuously');

const activating = start({ offline: true, controlled: false, resources: [] });
await activating.dispatchResources([
  'https://jogo.test/models/maps/loaded-before-activation.glb?v=visited',
]);
await Promise.resolve();
await Promise.resolve();
assert.equal(activating.posted.length, 0, 'observed resources wait while no worker can receive them');
await activating.activateWorker();
assert.ok(
  [...activating.posted.at(-1).urls].includes('https://jogo.test/models/maps/loaded-before-activation.glb?v=visited'),
  'resources observed before activation flush to the controlling worker',
);

const updating = start({
  offline: true,
  controlledRevision: 'pwa-build-old',
  resources: [],
});
await Promise.resolve();
await Promise.resolve();
await updating.dispatchResources([
  'https://jogo.test/models/maps/loaded-during-update.glb?v=visited',
]);
assert.equal(updating.posted.length, 0, 'new-revision resources are not discarded through the old controller');
await updating.activateWorker();
assert.ok(
  [...updating.posted.at(-1).urls].includes('https://jogo.test/models/maps/loaded-during-update.glb?v=visited'),
  'resources loaded during an update flush only to the matching revision',
);

const local = start({ offline: true, hostname: 'localhost' });
await Promise.resolve();
assert.equal(local.registrations.length, 0, 'local eval and dev pages do not retain a service worker');

console.log('PWA install contract: PASS (Android, iPhone, EN, standalone and desktop)');
