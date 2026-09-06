// Crítico reproduziu play antigo pausando hover novo. Promessas controladas medem
// o módulo real nas duas ordens de término (resolve/reject), sem esperar rede.
import { readFileSync } from 'node:fs';
let source = readFileSync(new URL('../../public/js/amazonia_map_preview.js', import.meta.url), 'utf8');
source = source.replace("import { MAP_PREVIEW_MEDIA } from './map_preview_media.js';", readFileSync(new URL('../../public/js/map_preview_media.js', import.meta.url), 'utf8'));
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant && !['play-antigo', 'erro-antigo'].includes(mutant)) throw Error('Mutante desconhecido');
if (mutant) {
  const changed = mutant === 'play-antigo'
    ? source.replace('else if (active !== state) video.pause();', 'else video.pause();')
    : source.replace('if (active === state && token === state.token) stop();', 'stop();');
  if (changed === source) throw Error('Mutante não aplicou');
  source = changed;
}
globalThis.ResizeObserver = class { observe(){} disconnect(){} };
globalThis.document = { hidden: false, addEventListener() {}, createElement: () => video };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let pending = [], paused = true;
const video = { style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, setAttribute() {},
  getAttribute: () => '', pause: () => { paused = true; },
  play: () => { paused = false; return new Promise((resolve, reject) => pending.push({ resolve, reject })); } };
const listeners = {};
const host = { classList: { add() {} }, append() {}, querySelector: () => null, addEventListener: (name, fn) => { listeners[name] = fn; } };
module.bindMapPreview(host, 'amazonia');
const results = [];
for (const ending of ['resolve', 'reject']) {
  pending = [];
  const old = listeners.pointerenter({ pointerType: 'mouse' });
  listeners.pointerleave();
  const current = listeners.pointerenter({ pointerType: 'mouse' });
  pending[0][ending](new Error('old request'));
  await old;
  const preserved = !paused;
  pending[1].resolve(); await current;
  results.push({ ending, preserved, playing: !paused });
  listeners.pointerleave();
}
console.log(JSON.stringify(results));
const valid = results.every(r => r.preserved && r.playing);
process.exitCode = mutant ? +valid : +!valid;
