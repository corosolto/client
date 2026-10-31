// Regression: invalid grid inputs exhausted a 64 MiB child; Backspace deleted objects from inputs.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { buildMapFromJSON, planFromJSON, propIdsFromSpec } from '../../public/js/map_json.js';
import * as THREE from '../../public/vendor/three.module.js';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./mapjson_fixture.json', import.meta.url), 'utf8'));
const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'ok' : 'FALHA'} ${name}: ${detail}`);
  if (!ok) failures.push(name);
};
const scratch = mkdtempSync(join(tmpdir(), 'corosolto-map-input-'));
try {
  const cases = [
    ['step-zero', s => { s.waypoints.step = 0; }],
    ['step-negative', s => { s.waypoints.step = -1; }],
    ['step-tiny', s => { s.waypoints.step = 1e-8; }],
    ['step-null', s => { s.waypoints.step = null; }],
    ['bounds-huge', s => { s.bounds = { x: 1e12, z: 1e12 }; }],
    ['bounds-overflow', s => { s.bounds.x = Number.MAX_VALUE; }],
    ['bounds-negative', s => { s.bounds.x = -20; }],
    ['inset-negative', s => { s.waypoints.inset = -1; }],
    ['inset-outside', s => { s.waypoints.inset = 100; }],
    ['sparse-huge-segments', s => { s.bounds = { x: 1e9, z: 1e9 }; s.waypoints.step = 1e9; }],
    ['quadratic-grid', s => { s.bounds = { x: 400, z: 400 }; s.waypoints.step = 1; }],
  ];
  for (const [name, mutate] of cases) {
    const spec = structuredClone(fixture); mutate(spec);
    const path = join(scratch, `${name}.json`); writeFileSync(path, JSON.stringify(spec));
    const result = spawnSync(process.execPath, ['--max-old-space-size=64', 'tools/eval/mapjson-check.mjs', path],
      { cwd: root, encoding: 'utf8', timeout: 2000, maxBuffer: 65536 });
    const output = result.stdout + result.stderr;
    check(name, !result.error && result.status === 1 && /MJ VERMELHA.*(bounds|waypoints|orçamento)/.test(output),
      `CLI exit=${result.status} signal=${result.signal ?? 'none'} error=${result.error?.code ?? 'none'}`);
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }

const html = readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8');
const ioStart = html.indexOf("$('snippet-btn').onclick=");
const ioEnd = html.indexOf("$('reset').onclick=", ioStart);
const normalizeStart = html.indexOf('function normaliza(');
const normalizeEnd = html.indexOf('// ---- preview 3D', normalizeStart);
if ([ioStart, ioEnd, normalizeStart, normalizeEnd].some(i => i < 0)) throw new Error('editor I/O handlers not found');
const ioSource = html.slice(ioStart, ioEnd) + html.slice(normalizeStart, normalizeEnd);
function editorIO() {
  const elements = new Map(), alerts = []; let clipboard;
  const scope = { spec: structuredClone(fixture), sel: { type: 'boxes', index: 0 },
    $: id => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); },
    pushTop() {}, renderInsp() {}, alert: message => alerts.push(message), setTimeout() {},
    planFromJSON, propIdsFromSpec, navigator: { clipboard: { writeText: async value => { clipboard = value; } } },
    revalidate: () => planFromJSON(scope.spec),
  };
  vm.runInNewContext(ioSource, scope);
  return { scope, elements, alerts, clipboard: () => clipboard };
}
{
  const e = editorIO(), prior = JSON.stringify(e.scope.spec), selection = e.scope.sel;
  e.elements.get('io') ?? e.scope.$('io');
  e.scope.$('io').value = JSON.stringify({ ...fixture, boxes: [null] });
  e.scope.$('imp').onclick();
  check('invalid-import-preserves-map', JSON.stringify(e.scope.spec) === prior && e.scope.sel === selection
    && e.alerts.length === 1, `preserved=${JSON.stringify(e.scope.spec) === prior} alerts=${e.alerts.length}`);
}
{
  const e = editorIO(), candidate = { ...structuredClone(fixture), name: 'Mapa importado' };
  e.scope.$('io').value = JSON.stringify(candidate);
  e.scope.$('imp').onclick();
  check('valid-import-commits-map', e.scope.spec.name === candidate.name && e.scope.sel === null
    && e.alerts.length === 0, `name=${e.scope.spec.name} alerts=${e.alerts.length}`);
}
{
  const e = editorIO(); e.scope.spec.name = "Arena D'Água\nCom barra \\ e acento";
  await e.scope.$('snippet-btn').onclick();
  const line = e.clipboard().split('\n').find(line => line.startsWith('//  MAPS.'));
  let actual, error;
  try { actual = vm.runInNewContext('(' + line.slice(line.indexOf('=') + 1).trim().replace(/;$/, '') + ')'); }
  catch (caught) { error = caught; }
  check('snippet-name-is-js-string', !error && actual.name === e.scope.spec.name,
    `parsed=${!error} name=${JSON.stringify(actual?.name)}`);
}

const drawStart = html.indexOf('function draw(){');
const drawEnd = html.indexOf('function rect(', drawStart);
if (drawStart < 0 || drawEnd < 0) throw new Error('editor draw not found');
const drawSource = html.slice(drawStart, drawEnd);
const drawCases = [
  ['normal', { x: 20, z: 20 }, {}, 42],
  ['huge', { x: 1e20, z: 1e20 }, {}, 58],
  ['overflow', { x: Number.MAX_VALUE, z: 20 }, {}, 54],
  ['zoom-minimum', { x: 1e20, z: 1e20 }, { scale: 3 }, 234],
  ['pan', { x: 1e20, z: 1e20 }, { px: 24, pz: -12 }, 59],
  ['pan-unsafe-index', { x: 1e20, z: 1e20 }, { px: 1e20, pz: 1e20 }, 0],
  ['invalid-tiny-scale', { x: 1e20, z: 1e20 }, { scale: 1e-20 }, 0],
  ['zero-scale', { x: 20, z: 20 }, { scale: 0 }, 0],
];
for (const [name, bounds, override, expected] of drawCases) {
  const spec = structuredClone(fixture); spec.bounds = bounds;
  for (const key of ['slow', 'ramps', 'boxes', 'props', 'pickups', 'ctf']) spec[key] = [];
  spec.spawns = { E: [], B: [] };
  let strokes = 0, error = null;
  const cv = { width: 800, height: 600 }, view = { scale: 12, px: 0, pz: 0, ...override };
  const context = { spec, cv, view, showGraph: false, plan: null, sel: null,
    cx: () => 400 + view.px, cz: () => 300 + view.pz,
    w2s: (x, z) => [400 + view.px + x * view.scale, 300 + view.pz + z * view.scale],
    s2w: (x, z) => [(x - 400 - view.px) / view.scale, (z - 300 - view.pz) / view.scale],
    ctx: new Proxy({}, { get: (_, key) => key === 'stroke' ? () => { strokes++; } : () => {} }),
  };
  try { vm.runInNewContext(drawSource + '\ndraw();', context, { timeout: 250 }); }
  catch (caught) { error = caught; }
  // 2m grid counts are measured on the 800x600 viewport, including pan and minimum UI zoom (3px/m).
  check(`draw-${name}`, !error && strokes === expected,
    `strokes=${strokes} expected=${expected} error=${error?.code ?? error?.message ?? 'none'}`);
}

const previewStart = html.indexOf('let three=null;');
const previewEnd = html.indexOf('// ---- boot', previewStart);
if (previewStart < 0 || previewEnd < 0) throw new Error('editor preview lifecycle not found');
let previewSource = html.slice(previewStart, previewEnd);
for (const [old, replacement] of [
  ["await import('./js/textures.js')", '__modules.textures'],
  ["await import('./js/mapprops.js')", '__modules.props'],
]) {
  if (previewSource.split(old).length !== 2) throw new Error('preview import fixture did not apply');
  previewSource = previewSource.replace(old, replacement);
}
{
  const elements = new Map(), listeners = new Map(), scenes = [], alerts = [];
  const size = { width: 800, height: 600 }, calls = [];
  const sharedGeometry = new THREE.BoxGeometry(1, 1, 1), sharedMaterial = new THREE.MeshBasicMaterial();
  let sharedDisposed = 0;
  sharedGeometry.addEventListener('dispose', () => sharedDisposed++);
  sharedMaterial.addEventListener('dispose', () => sharedDisposed++);
  const template = new THREE.Mesh(sharedGeometry, sharedMaterial);
  registerPropTemplate('qa-sdk-preview', template);
  const candidate = structuredClone(fixture);
  candidate.props = [{ id: 'qa-sdk-preview', x: 0, z: 0, h: 1, solid: false }];
  const prev = { style: { display: 'none' }, appendChild() {},
    getBoundingClientRect: () => prev.style.display === 'none' ? { width: 0, height: 0 } : { ...size } };
  class Renderer {
    constructor() { this.shadowMap = {}; this.domElement = { addEventListener() {} }; }
    setSize(width, height) { calls.push([width, height]); }
    render() {}
  }
  const context = { THREE: { ...THREE, WebGLRenderer: Renderer }, spec: candidate,
    problemas: [], cv: { style: {} }, clean: () => candidate,
    $: id => { if (id === 'prev') return prev; if (!elements.has(id)) elements.set(id, {}); return elements.get(id); },
    alert: message => alerts.push(message), requestAnimationFrame() {},
    addEventListener: (event, handler) => { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event).push(handler); },
    __modules: { textures: { initTextures: () => ({}) }, props: { preloadMapProps: async () => {} } },
    propIdsFromSpec,
    buildMapFromJSON(scene, textures, spec) {
      const world = buildMapFromJSON(scene, textures, spec);
      const resources = new Set(), disposed = new Set(), disposeCounts = new Map();
      scene.traverse(o => {
        for (const resource of [o.geometry, ...(Array.isArray(o.material) ? o.material : [o.material])]) {
          if (!resource || resource === sharedGeometry || resource === sharedMaterial) continue;
          resources.add(resource); resource.addEventListener('dispose', () => {
            disposed.add(resource); disposeCounts.set(resource, (disposeCounts.get(resource) ?? 0) + 1);
          });
        }
      });
      let shadowDisposals = 0, shadowPassDisposals = 0;
      world.sun.shadow.map = { dispose: () => { shadowDisposals++; } };
      world.sun.shadow.mapPass = { dispose: () => { shadowPassDisposals++; } };
      scenes.push({ world, scene, resources, disposed, disposeCounts,
        shadowDisposals: () => shadowDisposals, shadowPassDisposals: () => shadowPassDisposals });
      return world;
    },
  };
  vm.createContext(context); vm.runInContext(previewSource, context);
  await context.$('prev-btn').onclick();
  await context.$('prev-btn').onclick();
  for (const handler of listeners.get('resize') ?? []) handler();
  size.width = 640; size.height = 480;
  await context.$('prev-btn').onclick();
  const state = vm.runInContext('three', context);
  check('preview-resize-reopen', alerts.length === 0 && calls.every(([w, h]) => w > 0 && h > 0)
    && JSON.stringify(calls.at(-1)) === '[640,480]' && state.cam.aspect === 640 / 480,
    `sizes=${JSON.stringify(calls)} aspect=${state.cam.aspect} alerts=${JSON.stringify(alerts)}`);
  check('preview-disposes-replaced-scene', scenes.length === 2 && scenes[0].resources.size > 0
    && scenes[0].disposed.size === scenes[0].resources.size && scenes[0].shadowDisposals() === 1
    && scenes[0].shadowPassDisposals() === 1 && scenes[0].scene.children.length === 0,
    `scenes=${scenes.length} disposed=${scenes[0]?.disposed.size}/${scenes[0]?.resources.size} shadow=${scenes[0]?.shadowDisposals()}/${scenes[0]?.shadowPassDisposals()}`);
  scenes[0].world.dispose();
  check('preview-dispose-idempotent', [...scenes[0].disposeCounts.values()].every(count => count === 1)
    && scenes[0].shadowDisposals() === 1 && scenes[0].shadowPassDisposals() === 1,
    `owned=${scenes[0].disposed.size} shadow=${scenes[0].shadowDisposals()}/${scenes[0].shadowPassDisposals()}`);
  check('preview-preserves-shared-props', sharedDisposed === 0, `shared disposals=${sharedDisposed}`);
  registerPropTemplate('qa-sdk-preview', null);
}

const start = html.indexOf("addEventListener('keydown',");
const end = html.indexOf('function delSel()', start);
if (start < 0 || end < 0) throw new Error('editor keydown handler not found');
const source = html.slice(start, end);
for (const editable of ['input', 'textarea', 'select', 'contentEditable', 'canvas']) {
  for (const key of ['Backspace', 'Delete', 'ArrowLeft']) {
    let handler, deletions = 0, prevented = 0;
    vm.runInNewContext(source, { sel: { type: 'boxes', index: 0 },
      addEventListener: (name, callback) => { if (name === 'keydown') handler = callback; },
      delSel: () => { deletions++; } });
    handler({ key, target: {
      isContentEditable: editable === 'contentEditable',
      closest: selector => ['input', 'textarea', 'select'].includes(editable) && selector.includes(editable) ? {} : null,
    }, preventDefault: () => { prevented++; } });
    const expected = editable === 'canvas' && key !== 'ArrowLeft' ? 1 : 0;
    check(`${editable}-${key}`, deletions === expected && prevented === expected,
      `delete=${deletions} preventDefault=${prevented} expected=${expected}`);
  }
}
if (failures.length) { console.log(`CONSTRUTOR VERMELHO: ${failures.join(', ')}`); process.exit(1); }
console.log('CONSTRUTOR VERDE: invalid inputs fail controllably; text editing preserves selected objects');
