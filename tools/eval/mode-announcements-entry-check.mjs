import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Handler real, com a fronteira de download substituída por promessa controlável.
// Sem cópia do algoritmo de entrada nem servidor/renderer na fixture.
let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('function dismissSplash(e) {');
const end = main.indexOf('/* Foco no 1º item', start);
assert.ok(start >= 0 && end > start, 'handler de entrada encontrado');
main = main.slice(start, end);
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const edits = {
  'gesto-vaza': ['  e?.preventDefault?.(); e?.stopPropagation?.();', '  if (sp.dataset.csEntrada) return;\n  e?.preventDefault?.(); e?.stopPropagation?.();'],
  'import-tardio': ['if (lobbyMarcado) { soltaSplash(); return; }', 'if (false) { soltaSplash(); return; }'],
};
if (mutante) {
  assert.ok(edits[mutante], 'mutante conhecido');
  const [before, after] = edits[mutante];
  assert.equal(main.split(before).length - 1, 1, 'alvo do mutante único');
  main = main.replace(before, after);
  console.log('Mutação aplicada: '+mutante);
}
const download = "import('./mode-announcements.js')";
assert.equal(main.split(download).length - 1, 1, 'fronteira de download única');
main = main.replace(download, '__loadAnnouncement()');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ params = '', testMode = false } = {}) {
  let resolveImport, rejectImport, lobby = 0, opens = 0, removed = 0, done;
  const pending = new Promise((resolve, reject) => { resolveImport = resolve; rejectImport = reject; });
  const timers = new Map(), classes = new Set();
  const sp = { dataset: {}, classList: { contains: k => classes.has(k), add: k => classes.add(k) }, remove() { removed++; } };
  const noop = () => {};
  const context = vm.createContext({
    document: { getElementById: () => sp }, _splashReady: true,
    performance: { now: () => 100 }, _entradaEm: 0,
    loadingStage: { hide: noop }, dockLoadingCharacter: noop,
    window: {}, contagem: { evento: noop }, marcoFunil: noop, _lobbyEntrou: () => lobby++, focusMenu: noop,
    inspectionScreen: false, testMode, params: new URLSearchParams(params), mapasDoMenu: () => ['operacao_flavio'],
    setTimeout: (fn, ms) => { timers.set(ms, fn); return ms; }, clearTimeout: ms => timers.delete(ms),
    musicArmed: false, musicFade: null, startMenuMusic: noop, __loadAnnouncement: () => pending,
  });
  new vm.Script(main).runInContext(context);
  return { context, sp, timers, classes, get lobby() { return lobby; }, get opens() { return opens; }, get removed() { return removed; },
    resolve() { resolveImport({ mostrarNovidadesModos({ onDone }) { opens++; done = onDone; return true; } }); },
    reject() { rejectImport(new Error('download interrompido')); }, close() { done?.(); },
    gesture() {
      let prevented = 0, stopped = 0;
      context.dismissSplash({ target: { closest: () => null }, preventDefault: () => prevented++, stopPropagation: () => stopped++ });
      assert.equal(prevented, 1, 'gesto não dispara ação padrão sob a splash');
      assert.equal(stopped, 1, 'gesto não chega ao lobby enquanto import aguarda');
    } };
}
{
  const f = fixture(); f.gesture(); f.gesture();
  assert.equal(f.lobby, 0); assert.equal(f.classes.has('gone'), false, 'splash bloqueia durante download');
  f.resolve(); await tick();
  assert.equal(f.opens, 1); assert.equal(f.lobby, 0, 'anúncio aberto ainda não é lobby');
  assert.equal(f.classes.has('gone'), true);
  f.close(); f.close(); assert.equal(f.lobby, 1, 'entrada única mesmo com callback repetido');
  assert.equal(f.timers.has(2500), false, 'prazo cancelado depois de abrir');
  console.log('✓ gestos contidos, anúncio antes do lobby e entrada única');
}
{
  const f = fixture(); f.gesture(); f.timers.get(2500)();
  assert.equal(f.lobby, 1); assert.equal(f.classes.has('gone'), true);
  f.resolve(); await tick();
  assert.equal(f.opens, 0, 'download tardio não reabre anúncio'); assert.equal(f.lobby, 1);
  console.log('✓ prazo libera lobby e ignora conclusão tardia do download');
}
{
  const f = fixture(); f.gesture(); f.reject(); await tick();
  assert.equal(f.lobby, 1); assert.equal(f.classes.has('gone'), true); assert.equal(f.timers.has(2500), false);
  console.log('✓ falha de download libera entrada e limpa o prazo');
}
for (const opts of [{ params: 'sala=teste' }, { testMode: true }]) {
  const f = fixture(opts); f.gesture();
  assert.equal(f.lobby, 1); assert.equal(f.opens, 0); assert.equal(f.timers.has(2500), false);
}
console.log('✓ convite e modo de teste preservam entrada direta');
