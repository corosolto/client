import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sourcePath = path.join(root, 'public/js/netgame.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const before = 'return (version >= 10 ? V10_EMOTES : V9_EMOTES).has(id) ? id : null;';
const after = 'return V9_EMOTES.has(id) ? id : null;';
assert.equal(source.split(before).length, 2, 'âncora única do filtro de emote v10');
const rewritten = source.replace(before, after)
  .replace("from 'three'", `from ${JSON.stringify(import.meta.resolve('three'))}`)
  .replace(
    /from\s+(['"])(\.[^'"]+)\1/g,
    (_match, _quote, specifier) => `from ${JSON.stringify(new URL(specifier, pathToFileURL(sourcePath)).href)}`,
  );
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'netgame-emote-v10-'));
try {
  const modulePath = path.join(temp, 'netgame-mutant.mjs');
  fs.writeFileSync(modulePath, rewritten);
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/netgame-emote-v10.test.mjs'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, NETGAME_UNDER_TEST: pathToFileURL(modulePath).href },
  });
  if (run.error) throw run.error;
  const falhas = run.stdout.split(/\r?\n/).filter((line) => /^not ok \d+ - /.test(line));
  assert.equal(run.status, 1, `${run.stdout}\n${run.stderr}`);
  assert.deepEqual(falhas, [
    'not ok 1 - v10 sends a capture emote in live input and paused heartbeat',
  ], `${run.stdout}\n${run.stderr}`);
  console.log('PASS NET-EMOTE-V10: restaurar o filtro v9 perde só o emote capturado nos dois inputs');
} finally {
  fs.rmSync(temp, { recursive: true });
}
