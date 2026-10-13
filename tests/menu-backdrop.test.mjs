import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function loadMenuBackdrop() {');
const end = source.indexOf('\n}', start);
assert.ok(start >= 0 && end > start, 'loadMenuBackdrop must be extracted from production');
let backdropSource = source.slice(start, end + 2);
const mutant = process.env.MENU_BACKDROP_MUTANT;
if (mutant) {
  const original = backdropSource;
  if (mutant === 'fauna-gates') backdropSource = backdropSource.replace('return propsReady.then', 'return Promise.all([propsReady, ambienceReady]).then');
  else if (mutant === 'stale-map') backdropSource = backdropSource.replace('if (seq === _menuLoadSeq && id === currentMap)', 'if (true)');
  else if (mutant === 'ignore-seq') backdropSource = backdropSource.replace('seq === _menuLoadSeq && ', '');
  else if (mutant === 'ignore-map') backdropSource = backdropSource.replace(' && id === currentMap', '');
  else if (mutant === 'no-late-fauna') backdropSource = backdropSource.replace('if (propsLoaded) rebuildCurrent();', '');
  else throw new Error(`Unknown mutant: ${mutant}`);
  assert.notEqual(backdropSource, original, `Mutant must apply: ${mutant}`);
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

function world() {
  const loads = new Map();
  const rebuilt = [];
  const context = vm.createContext({
    currentMap: 'a', _menuLoadSeq: 0, MAPS: { a: { ambience: ['rat'] }, b: { ambience: ['bird'] } },
    menuProps: (id) => [id],
    preloadMapProps: ([id]) => { const d = deferred(); loads.set(`${id}:props`, d); return d.promise; },
    preloadAmbientLife: ([id]) => { const d = deferred(); loads.set(id, d); return d.promise; },
    rebuildMenuBackdrop: () => rebuilt.push(context.currentMap),
  });
  vm.runInContext(backdropSource, context);
  const load = () => {
    let ready = false, error = null;
    context.loadMenuBackdrop().then(() => { ready = true; }, (e) => { error = e; });
    return { get ready() { return ready; }, get error() { return error; } };
  };
  return { context, loads, rebuilt, load };
}

test('ready props release the menu while decorative fauna is still pending', async () => {
  const w = world(), run = w.load();
  w.loads.get('a:props').resolve();
  await flush();
  assert.equal(run.ready, true, 'optional fauna must not hold the splash until the failsafe');
  assert.deepEqual(w.rebuilt, ['a'], 'ready scenery must be drawn before entry');
  w.loads.get('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, ['a', 'a'], 'late fauna must still appear');
});

test('fauna finishing first does not release entry before props and builds only once', async () => {
  const w = world(), run = w.load();
  w.loads.get('rat').resolve();
  await flush();
  assert.equal(run.ready, false);
  assert.deepEqual(w.rebuilt, []);
  w.loads.get('a:props').resolve();
  await flush();
  assert.equal(run.ready, true);
  assert.deepEqual(w.rebuilt, ['a']);
});

test('a failed optional fauna load does not discard ready scenery or reject entry', async () => {
  const w = world(), run = w.load();
  w.loads.get('rat').reject(new Error('synthetic optional download failure'));
  await flush();
  w.loads.get('a:props').resolve();
  await flush();
  assert.equal(run.error, null);
  assert.equal(run.ready, true);
  assert.deepEqual(w.rebuilt, ['a']);
});

test('old props and fauna cannot rebuild a newly selected map', async () => {
  const w = world();
  w.load();
  w.context.currentMap = 'b';
  const current = w.load();
  w.loads.get('b:props').resolve();
  w.loads.get('bird').resolve();
  await flush();
  assert.equal(current.ready, true);
  assert.ok(w.rebuilt.length > 0);
  assert.ok(w.rebuilt.every((map) => map === 'b'));
  const currentBuilds = [...w.rebuilt];
  w.loads.get('a:props').resolve();
  w.loads.get('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds);
});

test('old callbacks from A cannot redraw after switching A to B and back to A', async () => {
  const w = world();
  w.load();
  const oldProps = w.loads.get('a:props'), oldFauna = w.loads.get('rat');
  w.context.currentMap = 'b';
  w.load();
  const bProps = w.loads.get('b:props'), bFauna = w.loads.get('bird');
  w.context.currentMap = 'a';
  w.load();
  w.loads.get('a:props').resolve();
  w.loads.get('rat').resolve();
  await flush();
  const currentBuilds = [...w.rebuilt];
  assert.ok(currentBuilds.length > 0);
  oldProps.resolve();
  oldFauna.resolve();
  bProps.resolve();
  bFauna.resolve();
  await flush();
  assert.deepEqual(w.rebuilt, currentBuilds, 'map equality alone must not accept old A');
});

test('callbacks cannot redraw when map changes without starting a new preload', async () => {
  const w = world();
  w.load();
  w.context.currentMap = 'b';
  w.loads.get('a:props').resolve();
  w.loads.get('rat').resolve();
  await flush();
  assert.deepEqual(w.rebuilt, [], 'sequence equality alone must not accept another map');
});
