// #1160: default legado e JSON sem perda, medidos pelo codec importado em processos novos.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = path.join(root, 'public/js/netcodec.js');
const original = fs.readFileSync(target, 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const cases = [
  ['default-v8', 'version = 7', 'version = CURRENT_VERSION', ['unversioned producers retain v7 and refuse objective/J']],
  ['negative-zero', ' && !Object.is(v, -0)', '', [
    'EN1 rejects negative-zero JSON root', 'EN2 rejects negative-zero JSON object',
    'EN3 rejects negative-zero JSON array', 'EN4 rejects negative-zero JSON nested',
    'EN5 rejects negative-zero JSON null-prototype', 'EN6 rejects negative-zero JSON shared-not-cyclic',
    'DE1 rejects negative-zero JSON root', 'DE2 rejects negative-zero JSON object',
    'DE3 rejects negative-zero JSON array', 'DE4 rejects negative-zero JSON nested',
    'DE5 rejects negative-zero JSON decimal', 'DE6 rejects negative-zero JSON exponent',
  ]],
];
let failures = 0;
const run = (name, codecPath, expected) => {
  const child = spawnSync(process.execPath, ['--test', 'tests/netcodec-v8.test.mjs'], {
    cwd: root, encoding: 'utf8', timeout: 15000,
    env: { ...process.env, CODEC_UNDER_TEST: pathToFileURL(codecPath).href },
  });
  const output = child.stdout || '';
  const actual = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]).sort();
  const infra = child.error || child.signal || child.stderr || !/^# tests 31$/m.test(output);
  const pass = !infra && child.status === (expected.length ? 1 : 0)
    && JSON.stringify(actual) === JSON.stringify([...expected].sort());
  console.log(JSON.stringify({ name, pass, exit: child.status, infra: !!infra, failed: actual }));
  if (!pass) failures++;
};
try {
  if (process.argv.length !== 2) throw Error('uso: sem argumentos');
  run('nominal', target, []);
  for (const [name, before, after, expected] of cases) {
    if (original.split(before).length !== 2) throw Error(`INFRA: âncora ${name} ausente/ambígua`);
    const source = original.replace(before, after);
    if (source === original) throw Error(`INFRA: mutante ${name} não aplicou`);
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'coro-codec-v8-'));
    try {
      fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"module"}');
      fs.mkdirSync(path.join(temp, 'data'));
      fs.copyFileSync(path.join(root, 'public/js/data/weapons.js'), path.join(temp, 'data/weapons.js'));
      const file = path.join(temp, 'netcodec.js');
      fs.writeFileSync(file, source);
      run(name, file, expected);
    } finally { fs.rmSync(temp, { recursive: true }); }
  }
  if (hash(fs.readFileSync(target)) !== hash(original)) throw Error('INFRA: produto alterado no disco');
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 3;
}
