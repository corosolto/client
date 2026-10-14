import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let source = readFileSync('public/js/media-rotation.js', 'utf8').replace('export function', 'function');
if (process.argv.includes('--mutante=sem-guardas')) {
  const original = source;
  source = source.replace('busy || document.hidden || motion.matches || !visible()', 'busy');
  assert.notEqual(source, original, 'mutação não aplicou');
}
let tick, cleared = false, visible = true, calls = 0;
const document = { hidden: false };
const motion = { matches: false };
const context = {
  document, matchMedia: () => motion, console,
  setInterval: (callback, interval) => { assert.equal(interval, 20000); tick = callback; return 42; },
  clearInterval: id => { assert.equal(id, 42); cleared = true; },
};
vm.createContext(context);
vm.runInContext(source + '\nthis.start = startVisibleRotation;', context);
const settle = () => new Promise(resolve => setImmediate(resolve));
let release;
const stop = context.start(() => { calls++; return new Promise(resolve => { release = resolve; }); }, () => visible);
tick(); await settle(); assert.equal(calls, 1);
tick(); await settle(); assert.equal(calls, 1, 'não sobrepor downloads');
release(); await settle();
document.hidden = true; tick(); await settle(); assert.equal(calls, 1, 'aba oculta não avança');
document.hidden = false; motion.matches = true; tick(); await settle(); assert.equal(calls, 1, 'movimento reduzido não avança');
motion.matches = false; visible = false; tick(); await settle(); assert.equal(calls, 1, 'partida não avança');
visible = true; tick(); await settle(); assert.equal(calls, 2, 'retomar rotação ao voltar');
release(); await settle(); stop(); assert(cleared);
console.log('MEDIA-ROTATION: visibilidade, movimento reduzido, serialização e retomada passaram');
