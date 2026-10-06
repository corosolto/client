import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../public/js/pwa-install.js', import.meta.url), 'utf8');

class Element {
  hidden = true;
  textContent = '';
  listeners = new Map();
  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  async dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) await listener(event);
  }
}

function start({ userAgent = 'Android', platform = 'Linux', touch = true, standalone = false } = {}) {
  const nodes = new Map(['pwa-install', 'pwa-install-action', 'pwa-install-help'].map((id) => [id, new Element()]));
  const windowListeners = new Map();
  const window = {
    navigator: { userAgent, platform, maxTouchPoints: touch ? 5 : 0, standalone },
    matchMedia: (query) => ({ matches: query.includes('pointer: coarse') ? touch : standalone }),
    addEventListener(type, listener) {
      const list = windowListeners.get(type) || [];
      list.push(listener);
      windowListeners.set(type, list);
    },
  };
  const document = { getElementById: (id) => nodes.get(id) || null };
  vm.runInNewContext(source, { window, document });
  return {
    panel: nodes.get('pwa-install'),
    action: nodes.get('pwa-install-action'),
    help: nodes.get('pwa-install-help'),
    dispatchWindow: async (type, event = {}) => {
      for (const listener of windowListeners.get(type) || []) await listener(event);
    },
  };
}

const android = start();
assert.equal(android.panel.hidden, false, 'touch device gets install help');
assert.equal(android.action.textContent, 'COMO ADICIONAR');
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

console.log('PWA install contract: PASS (Android prompt, iPhone guidance, standalone and desktop)');
