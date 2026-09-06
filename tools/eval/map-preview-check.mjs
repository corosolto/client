#!/usr/bin/env node
// Pedido V7: vídeo real no hover, sem baixar no boot ou continuar escondido.
// Contratos de interação; captura/codec reais são verificados no browser pelo roteiro da doc.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../../public/js/map_preview.js', import.meta.url);
let source = await readFile(path, 'utf8');
if (process.argv.includes('--mutante=aba-oculta')) {
  const mutant = source.replace('doc.hidden ||', 'false ||');
  assert.notEqual(mutant, source, 'MUTANTE NÃO APLICOU');
  source = mutant;
}
const { createMapPreview } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
let checks = 0;
class Surface extends EventTarget {
  constructor(doc) {
    super(); this.ownerDocument = doc; this.children = []; this.attrs = {};
    this.classWrites = 0;
    this.classList = {
      toggle: (key, value) => { this[key] = value; this.classWrites++; }, contains: key => this[key] === true,
    };
    this.isConnected = true; this.visible = true;
  }
  setAttribute(key, value) { this.attrs[key] = value; }
  removeAttribute(key) { delete this.attrs[key]; if (key === 'src') this.src = ''; }
  append(child) { this.children.push(child); child.parent = this; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  contains(target) { return target === this; }
  getClientRects() { return this.visible ? [{}] : []; }
}
function setup({ reduced = false, saveData = false, reject = false, delayed = false, id = 'lajes' } = {}) {
  const doc = new EventTarget(), mediaQuery = new EventTarget(), connection = new EventTarget();
  doc.hidden = false; doc.documentElement = {};
  mediaQuery.matches = reduced; connection.saveData = saveData;
  const observers = [], videos = [];
  doc.defaultView = {
    matchMedia: () => mediaQuery, navigator: { connection },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe() {} disconnect() { this.closed = true; }
    },
  };
  let resolvePlay;
  doc.createElement = tag => {
    assert.equal(tag, 'video');
    const video = new Surface(doc);
    Object.assign(video, {
      playCount: 0, paused: true, currentTime: 0, load() {},
      pause() { this.paused = true; },
      play() {
        this.playCount++; this.paused = false;
        if (reject) return Promise.reject(new Error('codec unavailable'));
        if (delayed) return new Promise(resolve => { resolvePlay = resolve; });
        return Promise.resolve();
      },
    });
    videos.push(video); return video;
  };
  const host = new Surface(doc), media = new Surface(doc);
  const controller = createMapPreview(host, { id, version: 'test', media, isActive: () => host.active !== false });
  return { host, media, doc, mediaQuery, connection, observers, videos, controller, resolve: () => resolvePlay() };
}
const fire = (target, event) => target.dispatchEvent(new Event(event));
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
async function scenario(name, fn) { await fn(); checks++; console.log(`PASS MP${checks} ${name}`); }

await scenario('fonte lazy, loop mudo inline e início somente na interação', async () => {
  const s = setup(); assert.equal(s.videos.length, 0);
  fire(s.host, 'pointerenter'); await flush();
  const video = s.videos[0]; assert.ok(video, 'Hover de Lajes não criou vídeo');
  assert.equal(video.src, '/video/map-previews/lajes.webm?v=test');
  assert.equal(video.preload, 'none'); assert.ok(video.muted && video.loop && video.playsInline);
  assert.equal(video.paused, false); assert.equal(s.media.classList.contains('map-preview-playing'), true);
  fire(s.host, 'pointerleave'); assert.equal(video.paused, true); assert.equal(video.currentTime, 0);
  assert.equal(s.media.classList.contains('map-preview-playing'), false); s.controller.dispose();
});
await scenario('foco de teclado inicia, blur pausa', async () => {
  const s = setup(); fire(s.host, 'focusin'); await flush();
  assert.equal(s.videos[0].paused, false); fire(s.host, 'focusout');
  assert.equal(s.videos[0].paused, true); s.controller.dispose();
});
await scenario('aba oculta interrompe e impede novo play', async () => {
  const s = setup(); fire(s.host, 'pointerenter'); await flush();
  s.doc.hidden = true; fire(s.doc, 'visibilitychange'); assert.equal(s.videos[0].paused, true, 'Vídeo continua na aba oculta');
  fire(s.host, 'pointerenter'); await flush(); assert.equal(s.videos[0].playCount, 1, 'Vídeo reiniciou na aba oculta');
  s.controller.dispose();
});
await scenario('reduced-motion e saveData não carregam vídeo', async () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const s = setup(options); fire(s.host, 'pointerenter'); fire(s.host, 'focusin'); await flush();
    assert.equal(s.videos.length, 0); s.controller.dispose();
  }
});
await scenario('preferência alterada em execução pausa', async () => {
  const s = setup(); fire(s.host, 'pointerenter'); await flush();
  s.mediaQuery.matches = true; fire(s.mediaQuery, 'change'); assert.equal(s.videos[0].paused, true);
  s.mediaQuery.matches = false; fire(s.host, 'pointerenter'); await flush();
  s.connection.saveData = true; fire(s.connection, 'change'); assert.equal(s.videos[0].paused, true);
  s.controller.dispose();
});
await scenario('falha de playback preserva poster e não repete download', async () => {
  const s = setup({ reject: true }); fire(s.host, 'pointerenter'); await flush();
  assert.equal(s.media.classList.contains('map-preview-playing'), false); assert.equal(s.videos[0].paused, true);
  fire(s.host, 'pointerenter'); await flush(); assert.equal(s.videos[0].playCount, 1); s.controller.dispose();
});
await scenario('erro do arquivo de mídia restaura poster durante reprodução', async () => {
  const s = setup(); fire(s.host, 'pointerenter'); await flush();
  s.videos[0].onerror(); assert.equal(s.media.classList.contains('map-preview-playing'), false);
  assert.equal(s.videos[0].paused, true); s.controller.dispose();
});
await scenario('promise tardia não ressuscita vídeo após saída', async () => {
  const s = setup({ delayed: true }); fire(s.host, 'pointerenter'); fire(s.host, 'pointerleave');
  s.resolve(); await flush(); assert.equal(s.videos[0].paused, true);
  assert.equal(s.media.classList.contains('map-preview-playing'), false); s.controller.dispose();
});
await scenario('menu escondido pausa e remoção descarta listeners', async () => {
  const s = setup(); fire(s.host, 'pointerenter'); await flush();
  s.host.visible = false; s.observers.forEach(o => o.fn()); assert.equal(s.videos[0].paused, true);
  const writes = s.media.classWrites;
  for (let i = 0; i < 10; i++) s.observers.forEach(o => o.fn());
  assert.equal(s.media.classWrites, writes, 'Observer reescreve classes de vídeo parado e causa realimentação');
  s.host.visible = true; s.host.isConnected = false; s.observers.forEach(o => o.fn());
  fire(s.host, 'pointerenter'); assert.equal(s.videos[0].playCount, 1); assert.equal(s.media.children.length, 0);
});
await scenario('painel fechado por opacity/transform pausa mesmo mantendo retângulos', async () => {
  const s = setup(); fire(s.host, 'pointerenter'); await flush();
  s.host.active = false; s.observers.forEach(o => o.fn());
  assert.equal(s.videos[0].paused, true); fire(s.host, 'focusin'); await flush();
  assert.equal(s.videos[0].playCount, 1); s.controller.dispose();
});
await scenario('troca de mapa elimina vídeo anterior e outros mapas seguem estáticos', async () => {
  const s = setup(); fire(s.host, 'pointerenter'); await flush(); s.controller.setMap('havan');
  assert.equal(s.videos[0].paused, true); assert.equal(s.media.children.length, 0);
  fire(s.host, 'pointerenter'); await flush(); assert.equal(s.videos.length, 1);
  s.controller.setMap('lajes'); fire(s.host, 'focusin'); await flush(); assert.equal(s.videos.length, 2);
  s.controller.dispose();
});
console.log(`${checks}/${checks} contratos de preview aprovados; codec e pixels exigem browser.`);
