import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, symlinkSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
test('CLI executes via directory alias, checks real record, refuses overwrite; import stays passive', () => {
  const directory = mkdtempSync(join(tmpdir(), 'garment-cli-')), source = new URL('./garment/', import.meta.url);
  const record = readFileSync(new URL('example-record.mjs', source));
  try {
    const alias = join(directory, 'directory alias'); symlinkSync(fileURLToPath(source), alias, 'dir');
    const script = join(alias, 'build-example-record.mjs'), run = args => spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});
    const invalid = run(['--invalid']); assert.equal(invalid.status, 1); assert.match(invalid.stderr, /usage: build-example-record/);
    const check = run(['--check']); assert.equal(check.status, 0, check.stderr);
    const overwrite = run(['--write']); assert.equal(overwrite.status, 1); assert.match(overwrite.stderr, /EEXIST/);
    assert.deepEqual(readFileSync(new URL('example-record.mjs', source)), record);
    const imported = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(new URL('build-example-record.mjs', source).href)})`], {encoding: 'utf8'});
    assert.equal(imported.status, 0, imported.stderr); assert.equal(imported.stdout, ''); assert.equal(imported.stderr, '');
  } finally {rmSync(directory, {recursive: true, force: true});}
});
