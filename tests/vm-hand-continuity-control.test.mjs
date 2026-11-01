import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureLocalThree, hashHandInputs, readHandWeaponIds } from '../tools/eval/vm-hand-continuity-support.mjs';
import { HAND_CASES, expectedHandMutation, runHandControl } from '../tools/eval/vm-hand-continuity-control.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = (args, options = {}) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 10000, ...options });
const ownFixture = fn => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vm-hands-owner-')));
  const wt = path.join(root, 'wt'), external = path.join(root, 'external');
  for (const dir of [wt, external]) fs.mkdirSync(dir);
  for (const file of ['three.module.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/SkeletonUtils.js']) {
    const target = path.join(wt, 'public/vendor', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, '// local fixture');
  }
  try { fn({ root, wt, external }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
};
const snapshot = root => {
  const out = {};
  const walk = dir => { for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name), stat = fs.lstatSync(file), relative = path.relative(root, file);
    if (stat.isSymbolicLink()) out[relative] = { link: fs.readlinkSync(file) };
    else if (stat.isDirectory()) { out[relative] = 'directory'; walk(file); }
    else out[relative] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } };
  walk(root); return out;
};
const refusesUnchanged = ({ root, wt }) => { const before = snapshot(root); assert.throws(() => ensureLocalThree(wt), /ownership/); assert.deepEqual(snapshot(root), before); };

test('ownership: creates local marked shim, repeat is inert, missing own link can be restored', () => ownFixture(({ root, wt }) => {
  const topology = ensureLocalThree(wt), before = snapshot(root);
  assert.equal(topology.index, 'public/vendor/three.module.js'); ensureLocalThree(wt); assert.deepEqual(snapshot(root), before);
  fs.unlinkSync(path.join(wt, 'node_modules/three/index.js')); ensureLocalThree(wt); assert.deepEqual(snapshot(root), before);
  assert.equal(fs.realpathSync(path.join(wt, 'node_modules/three/index.js')), path.join(wt, topology.index));
}));
test('ownership: exact local legacy shim is used read-only without adoption', () => ownFixture(f => {
  ensureLocalThree(f.wt); const shim = path.join(f.wt, 'node_modules/three');
  fs.unlinkSync(path.join(shim, '.csbrasil-owned-shim.json'));
  for (const [name, vendor] of [['index.js', 'three.module.js'], ['addons', 'addons']]) {
    fs.unlinkSync(path.join(shim, name)); fs.symlinkSync(path.join(f.wt, 'public/vendor', vendor), path.join(shim, name));
  }
  const before = snapshot(f.root), topology = ensureLocalThree(f.wt);
  assert.equal(topology.owner, 'verified-local-legacy-readonly/1'); assert.deepEqual(snapshot(f.root), before);
}));
for (const entry of ['index.js', 'addons']) test(`ownership: incomplete or foreign legacy ${entry} is refused read-only`, () => ownFixture(f => {
  ensureLocalThree(f.wt); const shim = path.join(f.wt, 'node_modules/three');
  fs.unlinkSync(path.join(shim, '.csbrasil-owned-shim.json')); fs.unlinkSync(path.join(shim, entry));
  refusesUnchanged(f); fs.symlinkSync(f.external, path.join(shim, entry)); refusesUnchanged(f);
}));
for (const existingIndex of [false, true]) test(`ownership: external three package is untouched (index=${existingIndex})`, () => ownFixture(f => {
  fs.writeFileSync(path.join(f.external, 'package.json'), '{"name":"unknown"}');
  fs.mkdirSync(path.join(f.external, 'addons')); fs.writeFileSync(path.join(f.external, 'addons/keep'), 'keep');
  if (existingIndex) fs.writeFileSync(path.join(f.external, 'index.js'), 'keep');
  fs.mkdirSync(path.join(f.wt, 'node_modules')); fs.symlinkSync(f.external, path.join(f.wt, 'node_modules/three'));
  refusesUnchanged(f);
}));
test('ownership: node_modules symlink is untouched', () => ownFixture(f => {
  fs.symlinkSync(f.external, path.join(f.wt, 'node_modules')); refusesUnchanged(f);
}));
test('ownership: real unknown installed package is untouched', () => ownFixture(f => {
  fs.mkdirSync(path.join(f.wt, 'node_modules/three'), { recursive: true });
  fs.writeFileSync(path.join(f.wt, 'node_modules/three/package.json'), '{"name":"three","version":"unknown"}'); refusesUnchanged(f);
}));
for (const entry of ['index.js', 'addons']) test(`ownership: marked shim with foreign ${entry} is untouched`, () => ownFixture(f => {
  ensureLocalThree(f.wt); const link = path.join(f.wt, 'node_modules/three', entry);
  fs.unlinkSync(link); fs.symlinkSync(f.external, link); refusesUnchanged(f);
}));
test('ownership: marked shim with real addons directory is never removed', () => ownFixture(f => {
  ensureLocalThree(f.wt); const addons = path.join(f.wt, 'node_modules/three/addons');
  fs.unlinkSync(addons); fs.mkdirSync(addons); fs.writeFileSync(path.join(addons, 'keep'), 'keep'); refusesUnchanged(f);
}));
test('ownership: invalid vendor is refused even when index already exists', () => ownFixture(f => {
  ensureLocalThree(f.wt); fs.unlinkSync(path.join(f.wt, 'public/vendor/three.module.js'));
  fs.writeFileSync(path.join(f.external, 'module.js'), '// foreign');
  fs.symlinkSync(path.join(f.external, 'module.js'), path.join(f.wt, 'public/vendor/three.module.js')); refusesUnchanged(f);
}));
test('CLI validation precedes all bootstrap writes', () => ownFixture(f => {
  fs.mkdirSync(path.join(f.wt, 'tools/eval'), { recursive: true }); fs.mkdirSync(path.join(f.wt, 'public/js'), { recursive: true });
  for (const name of ['check', 'support']) fs.copyFileSync(path.join(ROOT, `tools/eval/vm-hand-continuity-${name}.mjs`), path.join(f.wt, `tools/eval/vm-hand-continuity-${name}.mjs`));
  fs.copyFileSync(path.join(ROOT, 'public/js/weapons.js'), path.join(f.wt, 'public/js/weapons.js'));
  for (const flags of [['--bogus'], ['--json', '--json'], ['--mutante=unknown'], ['--arma=unknown']]) {
    const before = snapshot(f.root), result = child([path.join(f.wt, 'tools/eval/vm-hand-continuity-check.mjs'), ...flags]);
    assert.equal(result.status, 2); assert.equal(JSON.parse(result.stdout).status, 'CLI_ERROR'); assert.deepEqual(snapshot(f.root), before);
  }
}));

// Protocolo exercitado com denominador do nominal real; os controles não são kills semânticos.
const nominalResult = child(['tools/eval/vm-hand-continuity-check.mjs', '--json']);
assert.equal(nominalResult.status, 0, nominalResult.stderr);
const nominal = JSON.parse(nominalResult.stdout);
const spec = HAND_CASES[0];
const controlled = supplied => runHandControl({ invoke: ({ spec: current, nonce }) => {
  const data = structuredClone(nominal); data.nonce = nonce; data.sources = hashHandInputs(ROOT);
  if (!current) return { status: 0, signal: null, stdout: JSON.stringify(data) };
  return supplied({ data, nonce, current });
} });
const mutantEnvelope = data => {
  data.mutante = spec.name; data.arma = spec.arma;
  const expected = expectedHandMutation(nominal, spec);
  data.application = { count: expected.count, routes: expected.routes, notApplied: false };
  return data;
};
test('controller rejects an applied surviving mutant as RED, not a kill', () => {
  const report = controlled(({ data }) => ({ status: 0, signal: null, stdout: JSON.stringify(mutantEnvelope(data)) }));
  assert.equal(report.status, 'RED'); assert.match(report.error, /survived/); assert.equal(report.runs.length, 2);
});
for (const [name, args] of [
  ['CLI', ['tools/eval/vm-hand-continuity-check.mjs', '--bogus']],
  ['import', ['--input-type=module', '-e', "await import('./nonexistent-r805-module.mjs')"]],
  ['IO', ['--input-type=module', '-e', "import fs from 'node:fs';fs.readFileSync('./nonexistent-r805-file')"]],
  ['infra', ['--input-type=module', '-e', "console.log(JSON.stringify({status:'INFRA'}));process.exit(3)"]],
]) test(`controller gives no kill credit to actual ${name} process failure`, () => {
  const failed = child(args); assert.notEqual(failed.status, 0);
  const report = controlled(() => failed); assert.equal(report.status, 'INFRA'); assert.equal(report.runs.length, 2);
});
test('controller gives no kill credit to actual process timeout', () => {
  const failed = child(['-e', 'while(true){}'], { timeout: 50 }); assert.ok(failed.error);
  const report = controlled(() => failed); assert.equal(report.status, 'INFRA'); assert.match(report.error, /process\/timeout/);
});
test('controller rejects a stale nonce and a changed source receipt as INFRA', () => {
  for (const edit of [data => { data.nonce = 'stale'; }, data => { data.sources = {}; }]) {
    const report = controlled(({ data }) => { mutantEnvelope(data); edit(data); return { status: 1, signal: null, stdout: JSON.stringify(data) }; });
    assert.equal(report.status, 'INFRA'); assert.match(report.error, /nonce\/source/);
  }
});
test('controller rejects a non-applied mutant as RED', () => {
  const report = controlled(({ data }) => { mutantEnvelope(data); data.application.count = 0; data.application.notApplied = true; return { status: 0, signal: null, stdout: JSON.stringify(data) }; });
  assert.equal(report.status, 'RED'); assert.match(report.error, /not applied/);
});
assert.equal(readHandWeaponIds(ROOT).length, nominal.weaponIds.length);
