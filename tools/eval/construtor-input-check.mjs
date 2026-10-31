// Regression: invalid grid inputs exhausted a 64 MiB child; Backspace deleted objects from inputs.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

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
