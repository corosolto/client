import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../public/vendor/three.module.js';
import { buildMapFromJSON, planFromJSON, validatePlan, propIdsFromSpec } from '../../public/js/map_json.js';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const html = readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8');
const begin = html.indexOf('let three=null;'), end = html.indexOf('// ---- boot', begin);
assert.ok(begin >= 0 && end > begin, 'preview real encontrado');
let source = html.slice(begin, end);
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
const mutations = {
  'revisao-viva': ["    if(JSON.stringify(clean())!==JSON.stringify(snapshot)) throw new Error('mapa editado durante a prévia — abra a prévia novamente');", ''],
  'sem-cancelamento': ["    await preloadMapProps(propIdsFromSpec(snapshot)).catch(()=>{});\n    if(token!==prevToken || prev.style.display!=='block') return;", '    await preloadMapProps(propIdsFromSpec(snapshot)).catch(()=>{});'],
  'erro-antigo': ["  }catch(e){\n    if(token!==prevToken || prev.style.display!=='block') return;", '  }catch(e){'],
  'sem-preload': ['    await preloadMapProps(propIdsFromSpec(snapshot)).catch(()=>{});', ''],
};
if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const [before, after] = mutations[mutant];
  assert.equal(source.split(before).length - 1, 1, 'mutação deve atingir alvo real único');
  source = source.replace(before, after);
  console.log('Mutação aplicada: ' + mutant);
}
for (const [before, after] of [
  ["await import('./js/textures.js')", 'await Promise.resolve(__modules.textures)'],
  ["await import('./js/mapprops.js')", 'await Promise.resolve(__modules.props)'],
]) {
  assert.equal(source.split(before).length - 1, 1, 'import real único');
  source = source.replace(before, after);
}
const fixture = JSON.parse(readFileSync(new URL('./mapjson_fixture.json', import.meta.url), 'utf8'));
const failed = [];
let cases = 0;
const check = async (clause, run) => {
  cases++;
  try { await run(); console.log('✓ ' + clause); }
  catch (error) { failed.push({ clause, type: error.name, message: error.message }); console.error('✗ ' + clause + ': ' + error.message.split('\n')[0]); }
};
function editor() {
  const ids = ['qa-preview-race-a', 'qa-preview-race-b'];
  ids.forEach(id => registerPropTemplate(id, null));
  const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const elements = new Map(), gates = [], builds = [], alerts = [], worlds = [];
  const candidate = structuredClone(fixture);
  candidate.props = [{ id: ids[0], x: 0, z: 0, h: 2 }];
  const prev = { style: { display: 'none' }, appendChild() {}, getBoundingClientRect: () => ({ width: 800, height: 600 }) };
  class Renderer {
    constructor() { this.shadowMap = {}; this.domElement = { addEventListener() {} }; }
    setSize() {} render() {}
  }
  const context = { THREE: { ...THREE, WebGLRenderer: Renderer }, spec: candidate,
    problemas: [], cv: { style: {} }, clean: () => structuredClone(context.spec),
    $: id => { if (id === 'prev') return prev; if (!elements.has(id)) elements.set(id, {}); return elements.get(id); },
    alert: message => alerts.push(message), requestAnimationFrame() {}, addEventListener() {},
    __modules: { textures: { initTextures: () => ({}) }, props: { preloadMapProps: ids => new Promise(resolve => {
      gates.push({ ids: [...ids], finish() { ids.forEach(id => registerPropTemplate(id, template)); resolve(); } });
    }) } }, propIdsFromSpec,
    revalidate() { context.problemas = validatePlan(planFromJSON(context.spec)); },
    buildMapFromJSON(scene, textures, spec) {
      builds.push(structuredClone(spec));
      const world = buildMapFromJSON(scene, textures, spec); worlds.push(world); return world;
    },
  };
  vm.createContext(context); vm.runInContext(source, context);
  return { context, ids, gates, builds, alerts, prev,
    click: () => context.$('prev-btn').onclick(),
    async ready(count = 1) { for (let i = 0; gates.length < count && i < 20; i++) await Promise.resolve(); assert.equal(gates.length, count, 'preload entrou na promessa adiada'); },
    dispose() { worlds.forEach(world => world.dispose()); ids.forEach(id => registerPropTemplate(id, null)); template.geometry.dispose(); template.material.dispose(); },
  };
}
await check('preview sem edição constrói somente após preload', async () => {
  const e = editor();
  try {
    const pending = e.click(); await e.ready();
    assert.equal(e.builds.length, 0, 'aguarda recursos reais');
    assert.deepEqual(e.gates[0].ids, [e.ids[0]]);
    e.gates[0].finish(); await pending;
    assert.equal(e.builds.length, 1, 'constrói revisão carregada');
    assert.equal(e.builds[0].props[0].id, e.ids[0]); assert.equal(e.alerts.length, 0);
  } finally { e.dispose(); }
});
for (const kind of ['mutação no inspetor', 'substituição por import']) await check(kind + ' durante preload invalida preview', async () => {
  const e = editor();
  try {
    const pending = e.click(); await e.ready();
    if (kind === 'substituição por import') e.context.spec = structuredClone(e.context.spec);
    const spawn = e.context.spec.spawns.E[0];
    e.context.spec.props[0] = { id: e.ids[1], x: spawn.x, z: spawn.z, h: 2, solid: true, cw: 4, cd: 4 };
    e.gates[0].finish(); await pending;
    assert.equal(e.builds.length, 0, 'edição durante espera não constrói revisão sem preload');
    assert.equal(e.prev.style.display, 'none', 'retorna ao editor para novo preview');
    assert.ok(e.alerts.some(message => /alter|edit|mud|atualiz/i.test(message)), 'explica edição concorrente');
  } finally { e.dispose(); }
});
await check('fechar preview cancela construção pendente', async () => {
  const e = editor();
  try {
    const pending = e.click(); await e.ready(); await e.click();
    e.gates[0].finish(); await pending;
    assert.equal(e.builds.length, 0, 'fechamento não publica mundo tardio');
    assert.equal(e.prev.style.display, 'none'); assert.equal(e.alerts.length, 0);
  } finally { e.dispose(); }
});
await check('abertura nova vence preload antigo fora de ordem', async () => {
  const e = editor();
  try {
    const first = e.click(); await e.ready(); await e.click();
    e.context.spec.name = 'Revisão nova';
    const second = e.click(); await e.ready(2);
    e.gates[1].finish(); await second;
    assert.equal(e.builds.length, 1); assert.equal(e.builds[0].name, 'Revisão nova');
    e.gates[0].finish(); await first;
    assert.equal(e.builds.length, 1, 'carga antiga não substitui preview novo');
    assert.equal(e.prev.style.display, 'block', 'carga antiga não fecha preview novo');
    assert.equal(e.alerts.length, 0);
  } finally { e.dispose(); }
});
await check('erro de import antigo não alerta nem fecha abertura nova', async () => {
  const e = editor();
  try {
    let rejectImport;
    e.context.__modules.textures = new Promise((resolve, reject) => { rejectImport = reject; });
    const first = e.click(); await Promise.resolve(); await e.click();
    e.context.__modules.textures = { initTextures: () => ({}) };
    const second = e.click(); await e.ready(); e.gates[0].finish(); await second;
    rejectImport(new Error('import antigo indisponível')); await first;
    assert.equal(e.builds.length, 1); assert.equal(e.prev.style.display, 'block');
    assert.equal(e.alerts.length, 0, 'erro de carga antiga não perturba revisão nova');
  } finally { e.dispose(); }
});
console.log(JSON.stringify({ mutant, applied: mutant ? 1 : 0, cases, failed }));
if (failed.length) process.exitCode = 1;
