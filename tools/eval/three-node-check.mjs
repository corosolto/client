import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = readFileSync(new URL('./three-node.mjs', import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const inventory = dir => {
  const entries = [], pending = [''];
  while (pending.length) {
    const parent = pending.pop();
    for (const name of readdirSync(path.join(dir, parent))) {
      const rel = path.join(parent, name), full = path.join(dir, rel), stat = lstatSync(full);
      entries.push([rel, stat.isSymbolicLink() ? ['link', readlinkSync(full)]
        : stat.isDirectory() ? ['directory'] : ['file', hash(readFileSync(full))]]);
      if (stat.isDirectory() && !stat.isSymbolicLink()) pending.push(rel);
    }
  }
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
};
const worker = `
  const {THREE} = await import('./tools/eval/three-node.mjs');
  const vendor = await import('./public/vendor/three.module.js');
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
  console.log(JSON.stringify({sameThree:THREE.Mesh===vendor.Mesh,loader:typeof GLTFLoader==='function'}));
`;
const child = (cwd, legacy = false) => new Promise((resolve, reject) => {
  const marker = "const {THREE} = await import('./tools/eval/three-node.mjs');";
  if (legacy) assert.equal(worker.split(marker).length, 2);
  const code = legacy ? worker.replace(marker, "const THREE = await import('three');") : worker;
  const proc = spawn(process.execPath, ['--input-type=module', '-e', code], { cwd, timeout: 15000 });
  let stdout = '', stderr = '';
  proc.stdout.on('data', data => { stdout += data; });
  proc.stderr.on('data', data => { stderr += data; });
  proc.on('error', reject);
  proc.on('close', (code, signal) => {
    try {
      assert.equal(signal, null); assert.equal(code, 0, stderr);
      assert.equal(stderr, '');
      assert.deepEqual(JSON.parse(stdout), { sameThree: true, loader: true });
      resolve();
    } catch (error) { reject(error); }
  });
});

async function measure(code, installed) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'cs-three-node-')));
  try {
    mkdirSync(path.join(dir, 'tools/eval'), { recursive: true });
    mkdirSync(path.join(dir, 'public'));
    cpSync(path.join(root, 'public/vendor'), path.join(dir, 'public/vendor'), { recursive: true });
    writeFileSync(path.join(dir, 'tools/eval/three-node.mjs'), code);
    if (installed) {
      mkdirSync(path.join(dir, 'node_modules/three/build'), { recursive: true });
      writeFileSync(path.join(dir, 'node_modules/three/package.json'), JSON.stringify({
        name: 'three', type: 'module', main: 'build/three.module.js',
        exports: { '.': './build/three.module.js' }, fixture: 'preserve',
      }));
      writeFileSync(path.join(dir, 'node_modules/three/build/three.module.js'), 'export const Mesh = null;');
    }
    const before = inventory(dir);
    await Promise.all([child(dir), child(dir)]);
    if (!installed) await child(dir, true);
    const after = inventory(dir);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (!installed) {
      const stage = readlinkSync(path.join(dir, 'node_modules/three'));
      assert.equal(path.dirname(stage), path.join(dir, 'node_modules'));
      assert.ok(path.basename(stage).startsWith('.cs-three-node-'));
      const prefix = 'node_modules/' + path.basename(stage);
      assert.deepEqual(changed.sort(), ['node_modules', prefix, prefix + '/addons',
        prefix + '/index.js', prefix + '/package.json', 'node_modules/three'].sort());
      return [];
    }
    return changed;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

assert.deepEqual(await measure(source, false), [], 'resolver criou arquivos sem pacote instalado');
assert.deepEqual(await measure(source, true), [], 'resolver alterou pacote instalado');
const marker = "import { register } from 'node:module';";
assert.equal(source.split(marker).length, 2, 'mutação sem âncora única');
const mutated = source.replace(marker, marker + `
import * as mutationFS from 'node:fs';
const target = new URL('../../node_modules/three/package.json', import.meta.url);
if (mutationFS.existsSync(target)) mutationFS.writeFileSync(target, '{"corrupted":true}');`);
assert.notEqual(hash(mutated), hash(source));
assert.deepEqual(await measure(mutated, true), ['node_modules/three/package.json'], 'mutação não detectada na fronteira exata');
console.log(JSON.stringify({ gate: 'three-node', sourceSHA: hash(source), concurrentChildren: 2,
  nominal: ['sem-pacote', 'pacote-instalado'], legacyConsumer: true,
  mutatedSourceSHA: hash(mutated), mutationDetected: 'package.json-alterado' }));
