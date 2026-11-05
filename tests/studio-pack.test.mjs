import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CLI = path.join(ROOT, 'scripts/studio-pack.mjs');
const FIXTURE = path.join(ROOT, 'tests/fixtures/studio-pack/valid');
const run = args => spawnSync(process.execPath, [CLI, ...args], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
  maxBuffer: 1024 * 1024,
});
const readManifest = directory => JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const writeManifest = (directory, manifest) => writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const makePack = t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'client-studio-pack-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const pack = path.join(directory, 'pack');
  cpSync(FIXTURE, pack, { recursive: true });
  return { directory, pack, manifest: path.join(pack, 'manifest.json'), installRoot: path.join(directory, 'installed') };
};
const expectFailure = (result, code) => {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(result.signal, null);
  assert.match(result.stderr, new RegExp(`^ERROR ${code} `), result.stderr);
};
const snapshot = root => {
  const rows = [];
  const visit = (directory, prefix = '') => {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) visit(absolute, `${relative}/`);
      else rows.push({
        path: relative,
        sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex'),
        executable: Boolean(statSync(absolute).mode & 0o111),
      });
    }
  };
  visit(root);
  return rows;
};

test('verify accepts the real valid fixture with deterministic machine output', () => {
  const args = ['verify', path.join(FIXTURE, 'manifest.json'), '--json'];
  const first = run(args);
  const second = run(args);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stderr, '');
  assert.equal(first.stdout, second.stdout);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(report, {
    operation: 'verify',
    status: 'verified',
    schemaVersion: 1,
    kind: 'map',
    id: 'contract-fixture',
    version: '0.1.0',
    fileCount: 9,
    totalBytes: 499,
    manifestSha256: report.manifestSha256,
  });
  assert.match(report.manifestSha256, /^[a-f0-9]{64}$/);
});

test('install is byte-deterministic, idempotent and independently verifiable', t => {
  const first = makePack(t);
  const second = makePack(t);
  for (const fixture of [first, second]) {
    const installed = run(['install', fixture.manifest, '--install-root', fixture.installRoot, '--json']);
    assert.equal(installed.status, 0, installed.stderr);
    const report = JSON.parse(installed.stdout);
    assert.equal(report.status, 'installed');
    assert.equal(report.installPath, 'map/contract-fixture/0.1.0');
  }
  assert.deepEqual(snapshot(first.installRoot), snapshot(second.installRoot));
  assert.ok(snapshot(first.installRoot).every(file => !file.executable));
  const before = snapshot(first.installRoot);
  const repeated = run(['install', first.manifest, '--install-root', first.installRoot, '--json']);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(repeated.stdout).status, 'unchanged');
  assert.deepEqual(snapshot(first.installRoot), before);
  const targetManifest = path.join(first.installRoot, 'map/contract-fixture/0.1.0/manifest.json');
  const verified = run(['verify', targetManifest]);
  assert.equal(verified.status, 0, verified.stderr);
});

test('a bad payload hash is rejected without creating an install', t => {
  const fixture = makePack(t);
  appendFileSync(path.join(fixture.pack, 'geometry/alley.fixture'), 'tampered\n');
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_SIZE');
  assert.equal(existsSync(fixture.installRoot), false);
});

test('a size-preserving bad payload hash is rejected by SHA-256', t => {
  const fixture = makePack(t);
  const payload = path.join(fixture.pack, 'geometry/alley.fixture');
  const bytes = readFileSync(payload);
  bytes[0] ^= 1;
  writeFileSync(payload, bytes);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_HASH');
  assert.equal(existsSync(fixture.installRoot), false);
});

test('a byte-size manifest mismatch is rejected before installation', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.files[0].bytes++;
  writeManifest(fixture.pack, manifest);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_SIZE');
  assert.equal(existsSync(fixture.installRoot), false);
});

test('parent traversal cannot read or install a file outside the package', t => {
  const fixture = makePack(t);
  const outside = path.join(fixture.directory, 'outside.fixture');
  const bytes = Buffer.from('outside secret fixture\n');
  writeFileSync(outside, bytes);
  const manifest = readManifest(fixture.pack);
  manifest.files[0] = {
    path: '../outside.fixture',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  writeManifest(fixture.pack, manifest);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_SCHEMA');
  assert.equal(readFileSync(outside, 'utf8'), 'outside secret fixture\n');
  assert.equal(existsSync(fixture.installRoot), false);
});

test('Windows drive paths are rejected by the portable path guard', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.files[0].path = 'C:/outside.fixture';
  writeManifest(fixture.pack, manifest);
  const result = run(['verify', fixture.manifest]);
  expectFailure(result, 'E_PATH');
});

test('NTFS alternate data stream paths are rejected on every platform', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.files[0].path = 'collision/alley.fixture:payload';
  writeManifest(fixture.pack, manifest);
  expectFailure(run(['verify', fixture.manifest]), 'E_PATH');
});

test('mixed-case manifest aliases are reserved on portable filesystems', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.files[0].path = 'Manifest.json';
  writeManifest(fixture.pack, manifest);
  expectFailure(run(['verify', fixture.manifest]), 'E_PATH');
});

test('custom schemas cannot authorize install-root traversal', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.id = '../../escape';
  writeManifest(fixture.pack, manifest);
  const schema = path.join(fixture.directory, 'allow-any.schema.json');
  writeFileSync(schema, 'true\n');
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot, '--schema', schema]);
  expectFailure(result, 'E_IDENTITY');
  assert.equal(existsSync(path.join(fixture.directory, 'escape')), false);
  assert.equal(existsSync(fixture.installRoot), false);
});

test('Windows trailing aliases and device names are rejected', async t => {
  for (const unsafePath of ['collision/alley.fixture.', 'collision/alley.fixture ', 'collision/NUL.fixture']) {
    await t.test(JSON.stringify(unsafePath), t => {
      const fixture = makePack(t);
      const manifest = readManifest(fixture.pack);
      manifest.files[0].path = unsafePath;
      writeManifest(fixture.pack, manifest);
      expectFailure(run(['verify', fixture.manifest]), 'E_PATH');
    });
  }
});

test('a schema-invalid manifest is rejected without creating an install', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  delete manifest.source;
  writeManifest(fixture.pack, manifest);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_SCHEMA');
  assert.equal(existsSync(fixture.installRoot), false);
});

test('a map role cannot reference an unhashed package path', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.collision = ['collision/missing.fixture'];
  writeManifest(fixture.pack, manifest);
  const result = run(['verify', fixture.manifest]);
  expectFailure(result, 'E_ROLE_REFERENCE');
});

test('map files require exactly one owning role', async t => {
  await t.test('shared role path', t => {
    const fixture = makePack(t);
    const manifest = readManifest(fixture.pack);
    manifest.collision = manifest.geometry;
    writeManifest(fixture.pack, manifest);
    expectFailure(run(['verify', fixture.manifest]), 'E_ROLE_REFERENCE');
  });
  await t.test('file without a role', t => {
    const fixture = makePack(t);
    const bytes = Buffer.from('unassigned map payload\n');
    writeFileSync(path.join(fixture.pack, 'extra.fixture'), bytes);
    const manifest = readManifest(fixture.pack);
    manifest.files.push({
      path: 'extra.fixture',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    writeManifest(fixture.pack, manifest);
    expectFailure(run(['verify', fixture.manifest]), 'E_ROLE_REFERENCE');
  });
});

test('malformed manifest JSON is reported as a consumer error', t => {
  const fixture = makePack(t);
  writeFileSync(fixture.manifest, '{not-json\n');
  const result = run(['verify', fixture.manifest]);
  expectFailure(result, 'E_MANIFEST_JSON');
});

test('executable JavaScript is rejected even with a valid hash and size', t => {
  const fixture = makePack(t);
  const bytes = Buffer.from('globalThis.compromised = true;\n');
  writeFileSync(path.join(fixture.pack, 'bootstrap.js'), bytes);
  const manifest = readManifest(fixture.pack);
  manifest.files.push({
    path: 'bootstrap.js',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  writeManifest(fixture.pack, manifest);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_EXECUTABLE');
  assert.equal(existsSync(fixture.installRoot), false);
});

test('role-owned script formats cannot bypass the inert asset allowlist', async t => {
  for (const extension of ['.vbs', '.applescript', '.lua']) {
    await t.test(extension, t => {
      const fixture = makePack(t);
      const executablePath = `geometry/execute${extension}`;
      renameSync(
        path.join(fixture.pack, 'geometry/alley.fixture'),
        path.join(fixture.pack, executablePath),
      );
      const manifest = readManifest(fixture.pack);
      manifest.geometry = [executablePath];
      manifest.files.find(file => file.path === 'geometry/alley.fixture').path = executablePath;
      writeManifest(fixture.pack, manifest);
      const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
      expectFailure(result, 'E_EXECUTABLE');
      assert.equal(existsSync(fixture.installRoot), false);
    });
  }
});

test('a shebang is executable content even with a data extension', t => {
  const fixture = makePack(t);
  const bytes = Buffer.from('#!/bin/sh\necho unsafe\n');
  const payload = path.join(fixture.pack, 'geometry/alley.fixture');
  writeFileSync(payload, bytes);
  const manifest = readManifest(fixture.pack);
  const entry = manifest.files.find(file => file.path === 'geometry/alley.fixture');
  entry.bytes = bytes.length;
  entry.sha256 = createHash('sha256').update(bytes).digest('hex');
  writeManifest(fixture.pack, manifest);
  expectFailure(run(['verify', fixture.manifest]), 'E_EXECUTABLE');
});

test('WebAssembly is executable content even with a data extension', t => {
  const fixture = makePack(t);
  const bytes = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
  writeFileSync(path.join(fixture.pack, 'geometry/alley.fixture'), bytes);
  const manifest = readManifest(fixture.pack);
  const entry = manifest.files.find(file => file.path === 'geometry/alley.fixture');
  entry.bytes = bytes.length;
  entry.sha256 = createHash('sha256').update(bytes).digest('hex');
  writeManifest(fixture.pack, manifest);
  expectFailure(run(['verify', fixture.manifest]), 'E_EXECUTABLE');
});

test('a symlinked payload cannot escape the package root', t => {
  const fixture = makePack(t);
  const payload = path.join(fixture.pack, 'geometry/alley.fixture');
  const outside = path.join(fixture.directory, 'outside.fixture');
  renameSync(payload, outside);
  symlinkSync(outside, payload);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_SYMLINK');
  assert.equal(readlinkSync(payload), outside);
  assert.equal(existsSync(fixture.installRoot), false);
});

test('portable aliases cannot make one path both a file and a directory', t => {
  const fixture = makePack(t);
  const manifest = readManifest(fixture.pack);
  manifest.geometry = ['A.fixture'];
  manifest.collision = ['a.fixture/b.fixture'];
  manifest.files.find(file => file.path === 'geometry/alley.fixture').path = 'A.fixture';
  manifest.files.find(file => file.path === 'collision/alley.fixture').path = 'a.fixture/b.fixture';
  writeManifest(fixture.pack, manifest);
  expectFailure(run(['verify', fixture.manifest]), 'E_PATH_CONFLICT');
});

test('undeclared and duplicate package entries are rejected', async t => {
  await t.test('undeclared file', t => {
    const fixture = makePack(t);
    writeFileSync(path.join(fixture.pack, 'rogue.fixture'), 'unlisted\n');
    expectFailure(run(['verify', fixture.manifest]), 'E_UNDECLARED');
  });
  await t.test('duplicate manifest path', t => {
    const fixture = makePack(t);
    const manifest = readManifest(fixture.pack);
    manifest.files.push(manifest.files[0]);
    writeManifest(fixture.pack, manifest);
    expectFailure(run(['verify', fixture.manifest]), 'E_DUPLICATE_PATH');
  });
});

test('an existing install is immutable and is never overwritten', t => {
  const fixture = makePack(t);
  const first = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  assert.equal(first.status, 0, first.stderr);
  const installedPayload = path.join(fixture.installRoot, 'map/contract-fixture/0.1.0/geometry/alley.fixture');
  appendFileSync(installedPayload, 'local tampering\n');
  const before = readFileSync(installedPayload);
  const result = run(['install', fixture.manifest, '--install-root', fixture.installRoot]);
  expectFailure(result, 'E_IMMUTABLE');
  assert.deepEqual(readFileSync(installedPayload), before);
});

test('invalid CLI usage fails closed with exit code 2', () => {
  const result = run(['install', path.join(FIXTURE, 'manifest.json')]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^ERROR E_USAGE /);
});
