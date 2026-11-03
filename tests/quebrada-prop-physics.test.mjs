import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const MUTANT = process.env.CSBR_PROP_PHYSICS_MUTANT || '';
const MUTANTS = ['drop-box', 'drop-tent'];
assert.ok(!MUTANT || MUTANTS.includes(MUTANT), 'unknown physics mutant');
const H = await import('../tools/eval/harness.mjs');
const { registerPropTemplate } = await import('../public/js/mapprops.js');
const sourceFile = new URL('../public/js/map_quebrada.js', import.meta.url);
const original = fs.readFileSync(sourceFile, 'utf8');
let source = original;
if (MUTANT) {
  const from = MUTANT === 'drop-box'
    ? 'if (opts.collide !== false) col(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);'
    : '      colRot(sx2, sz2, 3.0, 2.4, 0, 2.4, ry2, 3, 2);';
  const to = MUTANT === 'drop-box' ? 'if (false) col(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);'
    : "      if (!hasProp('tent')) colRot(sx2, sz2, 3.0, 2.4, 0, 2.4, ry2, 3, 2);";
  assert.equal(source.split(from).length, 2, 'unique causal source anchor');
  source = source.replace(from, to).replace(/(from\s*['"]|import\s*\(\s*['"])(\.[^'"]+)(['"])/g,
    (_, a, spec, z) => a + new URL(spec, sourceFile).href + z);
}
const { buildQuebrada } = await import(MUTANT ? 'data:text/javascript;base64,' + Buffer.from(source).toString('base64') : sourceFile.href);
const IDS = ['arquibancada', 'pilha_pneus', 'stall', 'tires', 'drinkstand', 'churrasqueira', 'dumpster', 'tent', 'kombi', 'botijao_gas', 'arara_roupas', 'moto_cg', 'caixa_som_baile'];
const template = new H.THREE.Mesh(new H.THREE.BoxGeometry(1, 1, 1), new H.THREE.MeshStandardMaterial());
const textures = H.initTextures();
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function capture(loaded) {
  IDS.forEach(id => registerPropTemplate(id, loaded.includes(id) ? template : null));
  H.seedRandom(12345);
  const scene = new H.THREE.Scene(), world = buildQuebrada(scene, textures);
  const result = { count: world.colliders.length, colliders: hash(world.colliders), waypoints: hash(world.waypoints),
    spawns: hash(world.spawns), ctf: hash(world.ctfPoints) };
  const drawn = new Set(); scene.traverse(o => { if (o.userData?.mapPropId) drawn.add(o.userData.mapPropId); });
  return { ...result, loaded: [...drawn].filter(id => IDS.includes(id)).sort() };
}

test('Quebrada physical proxies do not depend on optional GLB availability', () => {
  const baseline = capture([]), failed = [];
  try {
    for (const ids of [...IDS.map(id => [id]), IDS]) {
      const actual = capture(ids);
      for (const id of ids) assert.ok(actual.loaded.includes(id), `actual template must enter scene: ${id}`);
      if (['count', 'colliders', 'waypoints', 'spawns', 'ctf'].some(key => actual[key] !== baseline[key]))
        failed.push({ ids, count: actual.count, expectedCount: baseline.count });
    }
    assert.equal(failed.length, 0, JSON.stringify(failed));
  } finally { IDS.forEach(id => registerPropTemplate(id, null)); }
});

if (!MUTANT) for (const mutant of MUTANTS) test(`causal optional prop physics: ${mutant}`, () => {
  const env = { ...process.env, CSBR_PROP_PHYSICS_MUTANT: mutant }; delete env.NODE_TEST_CONTEXT;
  const child = spawnSync(process.execPath, ['--test', fileURLToPath(import.meta.url)], { env, encoding: 'utf8', timeout: 30000, maxBuffer: 128 * 1024 });
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.stderr, '');
  assert.equal(child.status, 1); assert.match(child.stdout, /name: 'AssertionError'/);
  assert.doesNotMatch(child.stdout, /SyntaxError|ReferenceError|TypeError|Multiple instances of Three/);
  assert.match(child.stdout, /# tests 1\n# suites 0\n# pass 0\n# fail 1\n# cancelled 0\n# skipped 0/);
  assert.equal(fs.readFileSync(sourceFile, 'utf8'), original);
});
