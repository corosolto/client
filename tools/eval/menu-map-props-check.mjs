// Só a Praça teve dependências completas auditadas; outros mapas preservam o pool legado.
// O pool vive no mapPropIds() real (mapprops.js), delegado por menuProps() no main.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const script = fileURLToPath(import.meta.url);
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
const valid = (result, name, clause) => {
  const output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`) && output.includes(`✗ ${clause}: AssertionError:`)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 2000000 });
if (process.argv.includes('--autoteste')) {
  const good = { status: 1, stdout: 'Mutação aplicada: controle\n✗ contrato: AssertionError:', stderr: '' };
  assert(valid(good, 'controle', 'contrato'));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: '✗ contrato: AssertionError:' },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: 'Mutação aplicada: controle\n✗ outra: AssertionError:' }]) assert(!valid(bad, 'controle', 'contrato'));
  for (const kind of ['TypeError', 'AssertionError']) {
    const result = run([`--prova-reporter=${kind}`]);
    assert.equal(valid(result, 'controle-reporter', 'reporter'), kind === 'AssertionError');
  }
  console.log('menuprops: sete falsos positivos rejeitados; reporter real distingue crash');
  process.exit(0);
}
if (process.argv.includes('--mutantes')) {
  const baseline = run([]); assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'baseline válido antes dos mutantes');
  for (const [name, clause] of [
    ['pool-global', 'deps: Praça carrega somente seus props declarados'],
    ['todos-explicitos', 'deps: mapas não auditados preservam pool e props locais'],
    ['sem-praca', 'deps: Praça carrega somente seus props declarados'],
    ['sem-props-mapa', 'preload: dependências do mapa chegam ao carregador real'],
    ['sem-rebuild', 'rebuild: conclusão dos props reconstrói o fundo'],
    ['sem-troca', 'troca: mapa escolhido dispara carregamento do fundo'],
  ]) {
    assert(valid(run([`--mutante=${name}`]), name, clause), `mutante sem prova semântica: ${name}`);
    console.log(`menuprops: ${name} aplicado e detectado`);
  }
  process.exit(0);
}
let failures = 0;
const check = async (name, task) => {
  try { await task(); console.log(`✓ ${name}`); }
  catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message.split('\n')[0]}`); }
};
const reporter = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.split('=')[1];
if (reporter) {
  assert(['TypeError', 'AssertionError'].includes(reporter)); console.log('Mutação aplicada: controle-reporter');
  await check('reporter', () => { if (reporter === 'TypeError') throw new TypeError('controle'); assert.fail('controle'); });
  process.exit(1);
}
const { MAPS } = await import('./harness.mjs');
const { COMMON_MAP_PROPS, mapPropIds } = await import('../../public/js/mapprops.js');
let source = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
// O gotoMap pós-#1160 rotula o modo de objetivo: a régua leva a const real de main.js.
const modoObjetivo = source.match(/^const modoObjetivoAtual = .*;$/m)?.[0];
assert(modoObjetivo, 'modoObjetivoAtual real presente em main');
const begin = source.indexOf('function menuProps(mapa) {'), end = source.indexOf('// Rotas compartilhadas,', begin);
const gotoBegin = source.indexOf('function gotoMap('), gotoEnd = source.indexOf('function stepMap(', gotoBegin);
assert(begin >= 0 && end > begin && gotoBegin > end && gotoEnd > gotoBegin, 'fronteiras das funções reais');
if (mutation) {
  const body = source.slice(begin, source.indexOf('let _menuLoadSeq', begin));
  const edits = {
    'pool-global': [body, 'function menuProps(mapa) { return [...MAP_PROPS, ...(mapa.props || [])]; }\n'],
    'todos-explicitos': [body, 'function menuProps(mapa) { const props = mapa.props; return Array.isArray(props) ? props : MAP_PROPS; }\n'],
    // sem-praca: derruba o marcador propsComplete da Praça → ela voltaria a herdar o pool.
    'sem-praca': ['return mapPropIds(mapa);', 'return mapPropIds({ props: mapa.props });'],
    'sem-props-mapa': ['preloadMapProps(menuProps(mapa))', 'preloadMapProps(MAP_PROPS)'],
    'sem-rebuild': ['return propsReady.then(() => {\n      rebuildCurrent();', 'return propsReady.then(() => {'],
    'sem-troca': ['setMapMode();\n  void loadMenuBackdrop();\n  renderMapScreen();', 'setMapMode();\n  renderMapScreen();'],
  };
  assert(Object.hasOwn(edits, mutation), 'mutante conhecido');
  const [before, after] = edits[mutation]; assert.equal(source.split(before).length - 1, 1, 'mutante aplica exatamente uma vez');
  source = source.replace(before, after); console.log(`Mutação aplicada: ${mutation}`);
}
const block = source.slice(source.indexOf('function menuProps(mapa) {'), source.indexOf('// Rotas compartilhadas,', source.indexOf('function menuProps(mapa) {')));
const go = source.slice(source.indexOf('function gotoMap('), source.indexOf('function stepMap(', source.indexOf('function gotoMap(')));
const sameIds = (actual, expected) => assert.deepEqual([...new Set(actual)].sort(), [...new Set(expected)].sort(), 'dependências declaradas sem pool extra ou GLB ausente');
const fixture = () => {
  const events = []; let release;
  const pending = new Promise(resolve => { release = resolve; });
  const context = vm.createContext({ MAP_PROPS: COMMON_MAP_PROPS, MAPS, currentMap: 'praca_poderes', events,
    mapPropIds,   // o main.js importa o módulo real; a régua testa a mesma dependência de produção
    comMapaCarregado: (id, callback) => callback(MAPS[id]),
    preloadMapProps: ids => { events.push({ kind: 'preload', ids: [...ids] }); return pending; },
    rebuildMenuBackdrop: map => events.push({ kind: 'build', map }),
    preloadMapAmbientLife: () => { events.push({ kind: 'fauna' }); return Promise.resolve(); },
    MAPAS_MENU: Object.keys(MAPS), mapIdx: 0, settings: {}, mapNameEl: {}, modoEscolhido: true,
    resolveMapId: id => id, saveSettings() {}, setMapThumb() {}, setMapMode() {}, renderMapScreen() {}, hubNavigate() {},
  });
  vm.runInContext(modoObjetivo + '\n' + block + '\n' + go, context);
  return { context, events, release };
};
await check('deps: Praça carrega somente seus props declarados', () => {
  const { context } = fixture(); context.map = MAPS.praca_poderes;
  sameIds(vm.runInContext('menuProps(map)', context), MAPS.praca_poderes.props);
});
await check('deps: mapas não auditados preservam pool e props locais', () => {
  const { context } = fixture();
  for (const map of [...Object.values(MAPS).filter(map => map !== MAPS.praca_poderes), {}, { props: null }, { props: [] }]) {
    const expected = [...COMMON_MAP_PROPS, ...(map.props || [])];
    context.map = map; sameIds(vm.runInContext('menuProps(map)', context), expected);
  }
});
await check('deps: getter legado é lido uma vez', () => {
  const { context } = fixture(); let reads = 0;
  context.map = { get props() { reads++; return ['prop-local']; } };
  sameIds(vm.runInContext('menuProps(map)', context), [...COMMON_MAP_PROPS, 'prop-local']);
  assert.equal(reads, 1);
});
await check('preload: dependências do mapa chegam ao carregador real', async () => {
  const { context, events, release } = fixture(); const ready = vm.runInContext('loadMenuBackdrop()', context);
  const preload = events.find(event => event.kind === 'preload');
  assert(preload, 'carregador foi chamado'); sameIds(preload.ids, MAPS.praca_poderes.props); release(); await ready;
});
await check('rebuild: conclusão dos props reconstrói o fundo', async () => {
  const { context, events, release } = fixture(); const ready = vm.runInContext('loadMenuBackdrop()', context);
  assert.equal(events.filter(event => event.kind === 'build').length, 1); assert(!events.some(event => event.kind === 'fauna'));
  release(); await ready; await Promise.resolve();
  const kinds = events.map(event => event.kind); const preload = kinds.indexOf('preload'), fauna = kinds.indexOf('fauna');
  assert(kinds.slice(preload + 1, fauna).includes('build'), 'rebuild definitivo precede fauna e sucede props');
});
await check('troca: mapa escolhido dispara carregamento do fundo', () => {
  const { context } = fixture(); let calls = 0;
  context.recordLoad = () => { calls++; return Promise.resolve(); };
  vm.runInContext('loadMenuBackdrop = recordLoad; gotoMap(1, false)', context);
  assert.equal(calls, 1); assert.equal(context.currentMap, Object.keys(MAPS)[1]);
});
await check('stale: props de mapa anterior não substituem o fundo atual', async () => {
  const { context, events, release } = fixture(); const ready = vm.runInContext('loadMenuBackdrop()', context);
  context.currentMap = 'piscina_treta'; release(); await ready; await Promise.resolve();
  assert.equal(events.filter(event => event.kind === 'build').length, 1);
});
if (failures) process.exitCode = 1;
