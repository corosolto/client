// Mede os seletores reais com malha sintética; não aprova anatomia, contato ou arte.
// A cópia temporária muda imports/exports de inspeção e é removida mesmo se o gate falhar.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const options = {};
for (const argument of process.argv.slice(2)) {
  const match = argument.match(/^--(root|source|mutate)=(.+)$/);
  assert.ok(match && !(match[1] in options), `argumento inválido/duplicado: ${argument}`);
  options[match[1]] = match[2];
}
assert.ok(!options.mutate || ['palm', 'torso'].includes(options.mutate), 'mutação deve ser palm ou torso');
const root = path.resolve(options.root || fileURLToPath(new URL('../../', import.meta.url)));
const sourcePath = path.resolve(options.source || path.join(root, 'public/js/glbchars.js'));
const original = fs.readFileSync(sourcePath, 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const sourceSha256 = sha(original);
let source = original;
if (options.mutate) {
  const calls = {
    palm: ['const owned = withBoneDescendants(bones, new Set([hi, ...ci]));', 'const owned = new Set([hi, ...ci]);'],
    torso: ['const excluded = withBoneDescendants(bones, arm);', 'const excluded = arm;'],
  };
  const [before, after] = calls[options.mutate];
  assert.equal(source.split(before).length - 1, 1, 'mutante não aplicado: caller ausente/ambíguo');
  source = source.replace(before, after);
  assert.notEqual(source, original, 'mutante não aplicado');
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-hand-ownership-'));
const failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error.message).slice(0, 500)}`); }
}
try {
  let imports = 0;
  source = source.replace(/^import (.+?) from ['"]([^'"]+)['"];$/gm, (_, declaration, specifier) => {
    let target;
    if (specifier === 'three') target = path.join(root, 'public/vendor/three.module.js');
    else if (specifier.startsWith('three/addons/')) target = path.join(root, 'public/vendor/addons', specifier.slice(13));
    else if (specifier.startsWith('./')) target = path.join(root, 'public/js', specifier);
    else throw Error(`import não suportado na fixture: ${specifier}`);
    imports++;
    return `import ${declaration} from ${JSON.stringify(pathToFileURL(target).href)};`;
  });
  assert.ok(imports > 0, 'nenhum import real encontrado');
  source += '\nexport { torsoProfile as __torsoProbe };\n';
  if (/function withBoneDescendants\(/.test(source)) source += 'export { withBoneDescendants as __ownershipProbe };\n';
  const fixture = path.join(temporary, 'glbchars-fixture.mjs');
  fs.writeFileSync(fixture, source, { flag: 'wx' });
  process.env.SIM_QS = '';
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    get: () => async () => { throw Error('gate sintético sem rede'); },
    set() {},
  });
  const { THREE } = await import(pathToFileURL(path.join(root, 'tools/eval/harness.mjs')));
  const G = await import(pathToFileURL(fixture));
  const ownership = (...args) => {
    assert.equal(typeof G.__ownershipProbe, 'function', 'helper de ancestralidade ausente');
    return G.__ownershipProbe(...args);
  };
  let profileId = 0;
  const torso = (model) => G.__torsoProbe(`ownership-${profileId++}`, model);
  function bone(name, parent = null) {
    const result = new THREE.Bone();
    result.name = name;
    result.parent = parent;
    result.position.set(0, 10, 0);
    return result;
  }
  const row = (x, joints, weights, y = 1) => ({ position: [x, y, 0], joints, weights });
  function model(bones, rows) {
    const geometry = new THREE.BufferGeometry();
    for (const [name, size, field] of [['position', 3, 'position'], ['skinIndex', 4, 'joints'], ['skinWeight', 4, 'weights']]) {
      geometry.setAttribute(name, new THREE.BufferAttribute(new Float64Array(rows.flatMap((item) => item[field])), size));
    }
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    mesh.skeleton = new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4()));
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }
  check('cycle after expansion preserves whole legacy set', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), bad = bone('Bad'), seeds = new Set([0]);
    bad.parent = bad;
    assert.equal(ownership([hand, child, bad], seeds), seeds);
    assert.deepEqual([...seeds], [0]);
  });
  check('duplicate bone identity preserves whole legacy set', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), seeds = new Set([0]);
    assert.equal(ownership([hand, child, child], seeds), seeds);
    assert.deepEqual([...seeds], [0]);
  });
  check('duplicate Curl roots and spacer ancestry are retained', () => {
    const hand = bone('RightHand'), a = bone('Curl_R', hand), b = bone('Curl_R_1', hand);
    const child = bone('Novel', { parent: b });
    assert.deepEqual([...ownership([hand, a, b, child], new Set([0, 1, 2]))], [0, 1, 2, 3]);
  });
  check('palm descendant caller: strict .5 and summed influences', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), hips = bone('Hips');
    const fixture = model([hand, child, hips], [
      row(1, [1, 2, 2, 2], [.5, .5, 0, 0]),
      row(5, [1, 2, 2, 2], [.5000000000000001, .4999999999999999, 0, 0]),
      row(7, [0, 1, 2, 2], [.3, .3, .4, 0]),
    ]);
    assert.deepEqual(G.measurePalmLocal(fixture, hand, []).toArray(), [6, 1, 0], 'descendentes perderam ownership da palma');
  });
  check('torso descendant caller: strict .3, stride and bounded range', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), hips = bone('Hips');
    const profile = torso(model([hand, child, hips], [
      row(2, [1, 2, 2, 2], [.3, .7, 0, 0]),
      row(99, [2, 2, 2, 2], [1, 0, 0, 0]), row(99, [2, 2, 2, 2], [1, 0, 0, 0]),
      row(7, [1, 2, 2, 2], [.30000000000000004, .69999999999999996, 0, 0]),
      row(0, [0, 0, 0, 0], [1, 0, 0, 0]), row(0, [0, 0, 0, 0], [1, 0, 0, 0]),
      row(99, [2, 2, 2, 2], [1, 0, 0, 0], 3.2),
    ]));
    assert.equal(profile.length, 64);
    assert.equal(profile[20], 2, 'descendentes da mão vazaram para o perfil do torso');
    assert.equal(Math.max(...profile), 2);
  });
  check('cycle fallback reaches actual palm caller without partial set', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), bad = bone('Bad');
    bad.parent = bad;
    const fixture = model([hand, child, bad], [row(1, [0, 0, 0, 0], [1, 0, 0, 0]), row(5, [1, 0, 0, 0], [1, 0, 0, 0])]);
    assert.deepEqual(G.measurePalmLocal(fixture, hand, []).toArray(), [1, 1, 0]);
  });
  check('duplicate identity fallback reaches actual palm caller', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand);
    const fixture = model([hand, child, child], [row(1, [0, 0, 0, 0], [1, 0, 0, 0]), row(5, [1, 0, 0, 0], [1, 0, 0, 0])]);
    assert.deepEqual(G.measurePalmLocal(fixture, hand, []).toArray(), [1, 1, 0]);
  });
  check('cycle fallback reaches actual torso caller', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), bad = bone('Bad');
    bad.parent = bad;
    assert.equal(torso(model([hand, child, bad], [row(7, [1, 0, 0, 0], [1, 0, 0, 0])]))[20], 7);
  });
  check('first mesh and missing hand fallback remain unchanged', () => {
    const hand = bone('RightHand'), fixture = model([hand], [row(1, [0, 0, 0, 0], [1, 0, 0, 0])]);
    fixture.add(model([hand], [row(8, [0, 0, 0, 0], [1, 0, 0, 0])]).children[0]);
    assert.deepEqual(G.measurePalmLocal(fixture, hand, []).toArray(), [1, 1, 0]);
    assert.deepEqual(G.measurePalmLocal(fixture, bone('RightHand'), []).toArray(), [0, 2.5, 0]);
  });
  check('lever guard and empty selection keep fallback', () => {
    const hand = bone('RightHand'), child = bone('Lobe', hand), hips = bone('Hips');
    assert.deepEqual(G.measurePalmLocal(model([hand, child], [row(99, [1, 0, 0, 0], [1, 0, 0, 0])]), hand, []).toArray(), [0, 2.5, 0]);
    assert.deepEqual(G.measurePalmLocal(model([hand, hips], [row(1, [1, 0, 0, 0], [1, 0, 0, 0])]), hand, []).toArray(), [0, 2.5, 0]);
  });
  check('torso cache retains existing same-ID behavior', () => {
    const hips = bone('Hips'), id = `cache-${profileId++}`;
    const first = G.__torsoProbe(id, model([hips], [row(1, [0, 0, 0, 0], [1, 0, 0, 0])]));
    const second = G.__torsoProbe(id, model([hips], [row(8, [0, 0, 0, 0], [1, 0, 0, 0])]));
    assert.equal(first, second);
    assert.equal(second[20], 1);
  });
  check('known limit: weighted same-mesh accessory inherits hand ownership', () => {
    const hand = bone('RightHand'), accessory = bone('AttachedCharm', hand);
    assert.deepEqual(G.measurePalmLocal(model([hand, accessory], [row(5, [1, 0, 0, 0], [1, 0, 0, 0])]), hand, []).toArray(), [5, 1, 0]);
  });
  assert.equal(sha(fs.readFileSync(sourcePath, 'utf8')), sourceSha256, 'fonte alterada durante o gate');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
  assert.equal(fs.existsSync(temporary), false, 'fixture temporária não removida');
}
console.log(JSON.stringify({ checks, passed: checks - failures.length, failures, sourceSha256, mutation: options.mutate || null, temporaryRemoved: true }));
if (failures.length) process.exitCode = 1;
