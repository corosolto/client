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
