import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const MUTANT = process.env.CSBR_VM_LIFECYCLE_MUTANT || '';
const MUTANTS = ['late-install', 'shared-dispose', 'cap-template'];
assert.ok(!MUTANT || MUTANTS.includes(MUTANT), 'unknown lifecycle mutant');
process.env.SIM_QS = '?vmauthored=1&vmready=ak';
const H = await import('../tools/eval/harness.mjs');
const THREE = H.THREE;
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const file = new URL('../public/js/authoredvm.js', import.meta.url);
const original = fs.readFileSync(file, 'utf8');
let serial = 0;
function resources(scene) {
  const result = new Set(); scene.traverse(o => {
    if (o.geometry) result.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) result.add(m);
  }); return result;
}
function fixture() {
  const scene = new THREE.Group();
  scene.add(new THREE.PerspectiveCamera(60, 1.5, .01, 10));
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .6), new THREE.MeshStandardMaterial()));
  const geometry = new THREE.CylinderGeometry(.04, .04, .2, 8, 1, true);
  const n = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
  const weights = new Float32Array(n * 4); for (let i = 0; i < n; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const material = new THREE.MeshStandardMaterial(); material.name = 'CoroSolto_Mandrake_Sleeves';
  const sleeve = new THREE.SkinnedMesh(geometry, material); sleeve.name = 'sleeve';
  const bone = new THREE.Bone(); bone.name = 'hand.R_metarig'; sleeve.add(bone);
  sleeve.bind(new THREE.Skeleton([bone])); scene.add(sleeve);
  return { scene, animations: [], sleeve };
}
async function runtime(duringClone) {
  let source = original;
  const replace = (from, to) => { assert.equal(source.split(from).length, 2, 'unique causal anchor'); source = source.replace(from, to); };
  if (MUTANT === 'late-install') replace('const scene = await skeletonCloneOf(gltf.scene);\n      if (this._disposed) return null;', 'const scene = await skeletonCloneOf(gltf.scene);');
  if (MUTANT === 'shared-dispose') replace('        discard(object.geometry);\n        for (const material of materialsOf(object)) discard(material);', '        if (object.geometry) object.geometry.dispose();\n        for (const material of materialsOf(object)) material?.dispose?.();');
  if (MUTANT === 'cap-template') {
    const capURL = new URL('../public/js/vmsleeve.js', import.meta.url);
    let cap = fs.readFileSync(capURL, 'utf8');
    const target = '  const geo = ownVmResource(source.clone());\n  mesh.geometry = geo;';
    assert.equal(cap.split(target).length, 2);
    cap = cap.replace(target, '  const geo = source;');
    cap = cap.replace(/(from\s*['"]|import\s*\(\s*['"])(\.[^'"]+)(['"])/g, (_, a, spec, z) => a + new URL(spec, capURL).href + z);
    replace("'./vmsleeve.js'", JSON.stringify('data:text/javascript;base64,' + Buffer.from(cap).toString('base64')));
  }
  const nodeGuard = "const NODE_RUNTIME = typeof process !== 'undefined' && Boolean(process.versions?.node);";
  assert.equal(source.split(nodeGuard).length, 2);
  source = source.replace(nodeGuard, 'const NODE_RUNTIME = false;');
  const clone = 'const scene = await skeletonCloneOf(gltf.scene);';
  assert.equal(source.split(clone).length, 2);
  source = source.replace(clone, 'const scene = await globalThis.__vmLifecycleClone(skeletonCloneOf(gltf.scene));');
  source = source.replace(/(from\s*['"]|import\s*\(\s*['"])(\.[^'"]+)(['"])/g,
    (_, a, spec, z) => a + new URL(spec, file).href + z);
  globalThis.__vmLifecycleClone = p => p.then(scene => { duringClone?.(); return scene; });
  const module = await import('data:text/javascript;base64,' + Buffer.from(source + '\n// case ' + ++serial).toString('base64'));
  assert.equal(module.AUTHORED_VM_ENABLED, true);
  return module;
}

test('actual family continuation stays cancelled across clone await', async () => {
  const template = fixture(), old = GLTFLoader.prototype.loadAsync; let calls = 0, ready = 0, controller;
  GLTFLoader.prototype.loadAsync = async () => { calls++; return template; };
  try {
    const { AuthoredViewModels } = await runtime(() => controller.dispose());
    const parent = new THREE.Group(); controller = new AuthoredViewModels(parent, () => ready++);
    const entry = await controller._loadFamily('gold#ak');
    assert.equal(calls, 1);
    assert.equal(entry === null, true, 'cancelled clone returns no entry');
    assert.equal(parent.children.length, 0);
    assert.equal(controller.entries.size, 0);
    assert.equal(ready, 0);
  } finally { controller?.dispose(); GLTFLoader.prototype.loadAsync = old; delete globalThis.__vmLifecycleClone; }
});

test('two actual family controllers preserve cache and release private resources once', async () => {
  const template = fixture(), shared = resources(template.scene), old = GLTFLoader.prototype.loadAsync;
  const shape = () => [template.sleeve.geometry.attributes.position.count, template.sleeve.geometry.index.count];
  const originalShape = shape(); let calls = 0; const controllers = [], counts = new Map();
  const observe = r => { if (!counts.has(r)) { counts.set(r, 0); r.addEventListener('dispose', () => counts.set(r, counts.get(r) + 1)); } };
  shared.forEach(observe); GLTFLoader.prototype.loadAsync = async () => { calls++; return template; };
  try {
    const { AuthoredViewModels } = await runtime();
    for (let i = 0; i < 2; i++) {
      const controller = new AuthoredViewModels(new THREE.Group(), null, { faction: 'E' }); controllers.push(controller);
      await controller._loadFamily('gold#ak');
    }
    assert.equal(calls, 1, 'both controllers consume the actual GLTF_CACHE');
    const first = controllers[0].entries.get('gold#ak'), second = controllers[1].entries.get('gold#ak');
    const privateFirst = [...resources(first.scene)].filter(r => !shared.has(r));
    const privateSecond = [...resources(second.scene)].filter(r => !shared.has(r));
    [...privateFirst, ...privateSecond].forEach(observe);
    const duplicate = first.handMeshes[0].clone(); first.scene.add(duplicate);
    controllers[0].dispose(); controllers[0].dispose();
    assert.equal([...shared].reduce((sum, r) => sum + counts.get(r), 0), 0, 'cache-owned resources survive disposal');
    assert.ok(privateFirst.some(r => r.isBufferGeometry) && privateFirst.some(r => r.isMaterial));
    assert.ok(privateFirst.every(r => counts.get(r) === 1), 'each first-controller private resource disposed once');
    assert.ok(privateSecond.every(r => counts.get(r) === 0), 'other controller private resources survive');
    assert.equal(second.mount.parent, controllers[1].parent);
    assert.deepEqual(shape(), originalShape, 'runtime caps do not mutate cached sleeve geometry');
    controllers[1].dispose();
    assert.ok(privateSecond.every(r => counts.get(r) === 1));
    assert.ok([...shared].every(r => counts.get(r) === 0));
  } finally { controllers.forEach(c => c.dispose()); GLTFLoader.prototype.loadAsync = old; delete globalThis.__vmLifecycleClone; }
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), createHash('sha256').update(original).digest('hex'));
});

if (!MUTANT) for (const mutant of MUTANTS) test(`causal source regression: ${mutant}`, () => {
  const env = { ...process.env, CSBR_VM_LIFECYCLE_MUTANT: mutant };
  delete env.NODE_TEST_CONTEXT;
  const child = spawnSync(process.execPath, ['--test', fileURLToPath(import.meta.url)], {
    env, encoding: 'utf8', timeout: 15000, maxBuffer: 256 * 1024,
  });
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.stderr, '');
  assert.equal(child.status, 1);
  assert.doesNotMatch(child.stdout, /SyntaxError|ReferenceError|TypeError|Multiple instances of Three/);
  assert.match(child.stdout, /# tests 2\n# suites 0\n# pass 1\n# fail 1\n# cancelled 0\n# skipped 0/);
  const expected = mutant === 'late-install' ? 'not ok 1 - actual family continuation' : 'not ok 2 - two actual family controllers';
  assert.ok(child.stdout.includes(expected));
  assert.match(child.stdout, /name: 'AssertionError'/);
});
