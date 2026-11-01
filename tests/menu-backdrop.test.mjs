import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
const header = 'async function loadMenuBackdrop() {';
assert.equal(source.split(header).length - 1, 1, 'production async function must have a unique header');
const start = source.indexOf(header);
const end = source.indexOf('\n}', start);
assert.ok(start >= 0 && end > start, 'loadMenuBackdrop must be extracted from production');
let backdropSource = source.slice(start, end + 2);
// O span extraído preserva a função async real de produção: nenhum portão pode ser descartado.
assert.ok(backdropSource.startsWith('async function loadMenuBackdrop()'), 'extracted production function must stay async');
assert.ok(backdropSource.includes('return propsReady.then(() => {'), 'production span must keep the props-before-fauna chain');
const mutant = process.env.MENU_BACKDROP_MUTANT;
const applyMutant = (name, from, to) => {
  const before = backdropSource.split(from).length - 1;
  assert.equal(before, 1, `mutant target must appear exactly once in the production span: ${name}`);
  backdropSource = backdropSource.replace(from, to);
  assert.equal(backdropSource.split(from).length - 1, to.split(from).length - 1, `mutant must apply exactly once: ${name}`);
};
if (mutant) {
  // fauna-gates: a promessa devolvida passa a aguardar a fauna opcional (prende a entrada/splash).
  if (mutant === 'fauna-gates') applyMutant(mutant, 'preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});', 'return preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});');
  // stale-map: ignorar seq E mapa juntos destrava qualquer callback antigo.
  else if (mutant === 'stale-map') applyMutant(mutant, 'if (seq === _menuLoadSeq && id === currentMap)', 'if (true)');
  // ignore-seq: só o mapa protege; A->B->A aceita callbacks da primeira passada por A.
  else if (mutant === 'ignore-seq') applyMutant(mutant, 'seq === _menuLoadSeq && ', '');
  // ignore-map: só o seq protege; troca de mapa sem novo preload aceita o callback velho.
  else if (mutant === 'ignore-map') applyMutant(mutant, ' && id === currentMap', '');
  // no-late-fauna: preserva o desenho dos props e remove somente o redesenho da fauna tardia.
  else if (mutant === 'no-late-fauna') applyMutant(mutant, 'preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});', 'preloadMapAmbientLife(mapa).then(() => {}).catch(() => {});');
  // fauna-first: pede a fauna antes dos props, invertendo a ordenança de banda do span real.
  else if (mutant === 'fauna-first') applyMutant(mutant, "    return propsReady.then(() => {\n      rebuildCurrent();\n      preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});\n    });", "    preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});\n    return propsReady.then(() => {\n      rebuildCurrent();\n    });");
  else throw new Error(`Unknown mutant: ${mutant}`);
}
// Emitido só depois da mutação literal e de suas assertivas de aplicação.
if (mutant) process.stdout.write(`MENU_MUTANT_APPLIED ${mutant}\n`);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

function world() {
  const loads = new Map();
  const rebuilt = [];
  // Fila explícita por chave: recarregar o mesmo mapa nunca sobrescreve o deferred antigo.
  const queue = (key) => {
    const d = deferred();
    loads.set(key, [...(loads.get(key) || []), d]);
    return d.promise;
  };
  const context = vm.createContext({
    currentMap: 'a', _menuLoadSeq: 0,
    MAPS: { a: { id: 'a', ambience: ['rat'] }, b: { id: 'b', ambience: ['bird'] } },
    comMapaCarregado: (id, use) => Promise.resolve(use(context.MAPS[id], id)),
    menuProps: (mapa) => [mapa.id],
    preloadMapProps: ([id]) => queue(`${id}:props`),
    preloadMapAmbientLife: ({ ambience: [id] }) => queue(id),
    rebuildMenuBackdrop: (mapa) => rebuilt.push(mapa.id),
  });
  vm.runInContext(backdropSource, context);
  const load = () => {
    let ready = false, error = null;
    const entering = context.loadMenuBackdrop();
    assert.ok(entering && typeof entering.then === 'function', 'loadMenuBackdrop must return a real promise');
    entering.then(() => { ready = true; }, (e) => { error = e; });
    return { get ready() { return ready; }, get error() { return error; } };
  };
  // Consome o deferred mais antigo da fila; falha fechado se nada foi pedido ainda.
  const take = (key) => {
    const list = loads.get(key) || [];
    const d = list.shift();
    assert.ok(d, `expected a pending ${key} load at this point`);
    if (!list.length) loads.delete(key);
    return d;
  };
  return { context, loads, rebuilt, load, take };
}

test('ready props release the menu while decorative fauna is still pending', { id: 'mb-backdrop-01-props-release' }, async () => {
  const w = world(), run = w.load();
  w.take('a:props').resolve();
  await flush();
  assert.equal(run.ready, true, 'optional fauna must not hold the splash until the failsafe');
  assert.deepEqual(w.rebuilt, ['a', 'a'], 'loaded map draws immediately and again with ready props');
  w.take('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, ['a', 'a', 'a'], 'late fauna must still appear');
});

test('props pending means no fauna requested; ordering is props before fauna', { id: 'mb-backdrop-02-props-before-fauna' }, async () => {
  const w = world(), run = w.load();
  assert.equal(w.loads.has('rat'), false, 'fauna must not be requested while props are still pending');
  await flush();
  assert.equal(run.ready, false);
  assert.deepEqual(w.rebuilt, ['a']);
  w.take('a:props').resolve();
  await flush();
  assert.equal(w.loads.has('rat'), true, 'resolving props requests the decorative fauna');
  assert.equal(run.ready, true);
  assert.deepEqual(w.rebuilt, ['a', 'a'], 'map draws immediately and again with ready props');
  assert.equal(w.loads.has('rat'), true, 'ready props must start the deferred fauna load');
  w.take('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, ['a', 'a', 'a'], 'late fauna still refines the same arena');
});

test('a failed optional fauna load does not discard ready scenery or reject entry', { id: 'mb-backdrop-03-optional-fauna-rejection' }, async () => {
  const w = world(), run = w.load();
  w.take('a:props').resolve();
  await flush();   // fauna só é pedida depois dos props resolverem
  w.loads.set('rat', w.take('rat'));
  await flush();
  w.loads.get('rat').reject(new Error('synthetic optional download failure'));
  await flush();
  assert.equal(run.error, null);
  assert.equal(run.ready, true);
  assert.deepEqual(w.rebuilt, ['a', 'a']);
});

test('old props and fauna cannot rebuild a newly selected map', { id: 'mb-backdrop-04-stale-loads' }, async () => {
  const w = world();
  w.load();
  await flush();   // A precisa iniciar de verdade antes da troca
  w.context.currentMap = 'b';
  const current = w.load();
  w.take('b:props').resolve();
  await flush();   // a fauna B só existe após os props B
  w.take('bird').resolve();
  await flush();
  assert.equal(current.ready, true);
  assert.ok(w.rebuilt.length > 1);
  assert.ok(w.rebuilt.slice(1).every((map) => map === 'b'));
  const currentBuilds = [...w.rebuilt];
  w.take('a:props').resolve();
  await flush();   // a fauna antiga só é pedida quando os props antigos resolvem
  assert.deepEqual(w.rebuilt, currentBuilds, 'old props must not redraw the selected map');
  w.take('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds);
});

test('old callbacks from A cannot redraw after switching A to B and back to A', { id: 'mb-backdrop-05-return-to-a' }, async () => {
  const w = world();
  w.load();
  await flush();
  const oldProps = w.take('a:props');
  w.context.currentMap = 'b';
  w.load();
  await flush();
  const bProps = w.take('b:props');
  w.context.currentMap = 'a';
  w.load();
  await flush();
  const newProps = w.take('a:props');
  newProps.resolve();
  await flush();   // fauna da A atual só agora é pedida
  w.take('rat').resolve();
  await flush();
  const currentBuilds = [...w.rebuilt];
  assert.ok(currentBuilds.length > 0);
  oldProps.resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A props');
  bProps.resolve();
  await flush();   // callbacks velhos ainda pedem fauna, mas não podem redesenhar
  while (w.loads.has('rat')) w.take('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A fauna');
  while (w.loads.has('bird')) w.take('bird').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A');
});

test('callbacks cannot redraw when map changes without starting a new preload', { id: 'mb-backdrop-06-map-changed-no-preload' }, async () => {
  const w = world();
  w.load();
  await flush();
  w.context.currentMap = 'b';
  w.take('a:props').resolve();
  await flush();   // fauna do mapa antigo é pedida aqui
  assert.deepEqual(w.rebuilt, ['a'], 'old props must not redraw after selection changes');
  w.take('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, ['a'], 'callbacks from the old map must not redraw after selection changes');
});

test('pending old props cannot redraw after A to B to A', { id: 'mb-backdrop-07-pending-old-props' }, async () => {
  const w = world();
  w.load();
  await flush();
  const oldProps = w.take('a:props');
  w.context.currentMap = 'b';
  w.load();
  await flush();
  const bProps = w.take('b:props');
  w.context.currentMap = 'a';
  w.load();
  await flush();
  const newProps = w.take('a:props');
  newProps.resolve();
  await flush();   // a fauna da A corrente só é pedida após os props novos resolverem
  w.take('rat').resolve();
  await flush();
  const currentBuilds = [...w.rebuilt];
  assert.ok(currentBuilds.length > 0);
  oldProps.resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A props');
  // Callbacks velhos ainda pedem fauna: cada pedido deve ser drenado sem redesenhar.
  while (w.loads.has('rat')) w.take('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A fauna');
  bProps.resolve();
  await flush();
  while (w.loads.has('bird')) w.take('bird').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A');
});
