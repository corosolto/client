import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureLocalThree, hashHandInputs, readHandWeaponIds } from '../tools/eval/vm-hand-continuity-support.mjs';
import { HAND_CASES, expectedHandMutation, runHandControl } from '../tools/eval/vm-hand-continuity-control.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = path.join(ROOT, 'tools/eval/vm-hand-three-register.mjs');
const child = (args, options = {}) => spawnSync(process.execPath, ['--import', REGISTER, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 10000, ...options });
const ownFixture = fn => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vm-hands-vendor-')));
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
const packageAt = dir => {
  fs.mkdirSync(path.join(dir, 'addons/loaders'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'addons/utils'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'three', version: '999.0.0', type: 'module', exports: { '.': './index.js', './addons/*': './addons/*' } }));
  for (const file of ['index.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/SkeletonUtils.js'])
    fs.writeFileSync(path.join(dir, file), "throw Error('foreign package must not be loaded');");
};
for (const kind of ['missing', 'npm-directory', 'three-symlink', 'modules-symlink', 'foreign-addons', 'modules-file'])
  test(`vendor hooks accept ${kind} without changing any package`, () => ownFixture(f => {
    const modules = path.join(f.wt, 'node_modules');
    if (kind === 'npm-directory' || kind === 'foreign-addons') packageAt(path.join(modules, 'three'));
    if (kind === 'foreign-addons') fs.writeFileSync(path.join(modules, 'three/addons/keep'), 'must survive');
    if (kind === 'three-symlink') { packageAt(f.external); fs.mkdirSync(modules); fs.symlinkSync(f.external, path.join(modules, 'three')); }
    if (kind === 'modules-symlink') { packageAt(path.join(f.external, 'three')); fs.symlinkSync(f.external, modules); }
    if (kind === 'modules-file') fs.writeFileSync(modules, 'unrelated file');
    const specifiers = ['three', 'three/addons/loaders/GLTFLoader.js', 'three/addons/utils/SkeletonUtils.js'];
    const files = ['three.module.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/SkeletonUtils.js'].map(s => path.join(ROOT, 'public/vendor', s));
    const entry = path.join(f.wt, 'probe.mjs');
    fs.writeFileSync(entry, `import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
      const specs=${JSON.stringify(specifiers)}, files=${JSON.stringify(files)};
      const resolved=specs.map(s=>fileURLToPath(import.meta.resolve(s)));assert.deepEqual(resolved,files);
      const bare=await Promise.all(specs.map(s=>import(s)));
      const direct=await Promise.all(${JSON.stringify(files.map(f => pathToFileURL(f).href))}.map(s=>import(s)));
      for(let i=0;i<bare.length;i++)assert.equal(bare[i],direct[i]);console.log(JSON.stringify(resolved));`);
    const before = snapshot(f.root); ensureLocalThree(f.wt);
    const result = child([entry]); assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), files); assert.deepEqual(snapshot(f.root), before);
  }));
for (const entry of ['three.module.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/SkeletonUtils.js'])
  test(`vendor rejects missing or foreign ${entry} before writes`, () => ownFixture(f => {
    const file = path.join(f.wt, 'public/vendor', entry); fs.unlinkSync(file);
    let before = snapshot(f.root); assert.throws(() => ensureLocalThree(f.wt), /vendor local/); assert.deepEqual(snapshot(f.root), before);
    const foreign = path.join(f.external, 'module.js'); fs.writeFileSync(foreign, '// foreign'); fs.symlinkSync(foreign, file);
    before = snapshot(f.root); assert.throws(() => ensureLocalThree(f.wt), /vendor local/); assert.deepEqual(snapshot(f.root), before);
  }));
test('vendor rejects a foreign addons directory before writes', () => ownFixture(f => {
  const addons = path.join(f.wt, 'public/vendor/addons'); fs.rmSync(addons, { recursive: true }); fs.symlinkSync(f.external, addons);
  const before = snapshot(f.root); assert.throws(() => ensureLocalThree(f.wt), /vendor local/); assert.deepEqual(snapshot(f.root), before);
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
