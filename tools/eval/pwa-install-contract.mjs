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
} = {}) {
  const nodes = new Map(['pwa-install', 'pwa-install-action', 'pwa-install-help'].map((id) => [id, new Element()]));
  const windowListeners = new Map();
  const posted = [];
  const registrations = [];
  const worker = { postMessage(message) { posted.push(message); } };
  const serviceWorker = offline ? {
    controller: worker,
    addEventListener() {},
    async register(path, options) {
      registrations.push({ path, options });
      return { active: worker };
    },
  } : undefined;
  const window = {
    location: { origin: 'https://jogo.test' },
    performance: { getEntriesByType: () => resources.map((name) => ({ name })) },
    navigator: { userAgent, platform, maxTouchPoints: touch ? 5 : 0, standalone, serviceWorker },
    matchMedia: (query) => ({ matches: query.includes('pointer: coarse') ? touch : standalone }),
    addEventListener(type, listener) {
      const list = windowListeners.get(type) || [];
      list.push(listener);
      windowListeners.set(type, list);
    },
  };
  const document = { documentElement: { lang }, getElementById: (id) => nodes.get(id) || null };
  vm.runInNewContext(source, { window, document, URL });
  return {
    panel: nodes.get('pwa-install'),
    action: nodes.get('pwa-install-action'),
    help: nodes.get('pwa-install-help'),
    posted,
    registrations,
    dispatchWindow: async (type, event = {}) => {
      for (const listener of windowListeners.get(type) || []) await listener(event);
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
assert.equal(offline.registrations[0].path, '/sw.js', 'service worker lives at the root');
assert.equal(offline.registrations[0].options.scope, '/', 'service worker controls the installed game');
assert.equal(offline.posted.at(-1).type, 'CACHE_OFFLINE_RESOURCES');
assert.deepEqual([...offline.posted.at(-1).urls], [
  'https://jogo.test/',
  'https://jogo.test/js/main.js?v=release',
  'https://jogo.test/models/characters/test.glb?v=asset',
], 'page warms only the visited same-origin game resources');

console.log('PWA install contract: PASS (Android, iPhone, EN, standalone and desktop)');
