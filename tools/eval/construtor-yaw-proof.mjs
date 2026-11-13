// R1822: inverter o exit code aceitava falha de leitura antes da mutação.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const script = fileURLToPath(new URL('./construtor-yaw-check.mjs', import.meta.url));
const hash = text => createHash('sha256').update(text).digest('hex');
const html = readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const mark = html.slice(html.indexOf('function spawnMark('), html.indexOf('// ---- picking'));
const mutated = mark.replace('fx=-Math.sin', 'fx=Math.sin').replace('fz=-Math.cos', 'fz=Math.cos');
const ids = ['E0', 'E1', 'E2', 'E3', 'E4', 'B0', 'B1', 'B2', 'B3', 'B4'];
const run = (mutant, env = process.env) => spawnSync(process.execPath,
  [script, ...(mutant ? ['--mutante=' + mutant] : [])], { cwd: root, env, encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
function report(result, mutant) {
  if (!result || result.error || result.signal || result.status !== (mutant ? 1 : 0)
    || typeof result.stdout !== 'string' || typeof result.stderr !== 'string' || result.stderr.trim() !== ''
    || /YAW_INFRA:|TypeError|ReferenceError|SyntaxError|Multiple instances/.test(result.stdout + result.stderr)) return null;
  const lines = result.stdout.split('\n');
  const applied = lines.filter(line => line.startsWith('YAW_APPLIED:'));
  if (mutant ? applied.length !== 1 || applied[0] !== 'YAW_APPLIED:' + mutant : applied.length !== 0) return null;
  const records = lines.filter(line => line.startsWith('YAW_RESULT:'));
  if (records.length !== 1) return null;
  let data;
  try { data = JSON.parse(records[0].slice('YAW_RESULT:'.length)); } catch { return null; }
  if (data?.tool !== 'construtor-yaw' || data.mutant !== mutant || data.applied !== (mutant ? 1 : 0)
    || data.sourceUnchanged !== true || data.htmlSHA256 !== hash(html) || data.gameSHA256 !== hash(game)
    || data.originalMarkSHA256 !== hash(mark) || data.measuredMarkSHA256 !== hash(mutant ? mutated : mark)
    || JSON.stringify(data.cases) !== JSON.stringify(ids) || !Array.isArray(data.failed)) return null;
  return data;
}
function killed(result) {
  const data = report(result, 'seta-invertida');
  return !!data && data.failed.length === ids.length && data.failed.every((item, index) =>
    item.id === ids[index] && item.type === 'AssertionError' && item.clause === 'orientacao-camera'
    && Number.isFinite(item.dot) && item.dot < 0);
}
const nominal = run(null), base = report(nominal, null);
assert.ok(base && base.failed.length === 0, 'nominal deve medir dez orientações: ' + nominal.stdout + nominal.stderr);
const mutant = run('seta-invertida');
assert.ok(killed(mutant), 'mutante deve inverter as dez setas, mantendo bot/câmera: ' + mutant.stdout + mutant.stderr);
const negatives = [
  { ...mutant, status: 0 }, { ...mutant, status: 2 }, { ...mutant, signal: 'SIGTERM' },
  { ...mutant, error: { code: 'ETIMEDOUT' } },
  { ...mutant, stdout: mutant.stdout.replace('YAW_APPLIED:', 'não aplicado:') },
  { ...mutant, stdout: mutant.stdout + 'YAW_APPLIED:seta-invertida\n' },
  { ...mutant, stdout: mutant.stdout + mutant.stdout.split('\n').find(line => line.startsWith('YAW_RESULT:')) + '\n' },
  { ...mutant, stdout: mutant.stdout.replace('"applied":1', '"applied":0') },
  { ...mutant, stdout: mutant.stdout.replace('"E0"', '"X0"') },
  { ...mutant, stdout: mutant.stdout.replace('orientacao-camera', 'outra-clausula') },
  { ...mutant, stdout: mutant.stdout.replace('AssertionError', 'TypeError') },
  { ...mutant, stdout: mutant.stdout.replace(hash(html), '0'.repeat(64)) },
  { ...mutant, stdout: mutant.stdout.replace(hash(mutated), hash(mark)) },
  { ...mutant, stdout: 'YAW_RESULT:{invalid}\n' },
  { ...mutant, stderr: 'YAW_INFRA:Error:setup\n' },
];
for (const [index, result] of negatives.entries()) assert.equal(killed(result), false, 'falso verde recusado ' + index);
const dir = mkdtempSync(join(tmpdir(), 'cs-yaw-proof-'));
try {
  const probes = [
    "throw new Error('YAW_SETUP_READ_PROBE')",
    "return String(original.apply(this,args)).replace('function spawnMark(', 'function spawnMissing(')",
    "return String(original.apply(this,args))+'\\nfunction spawnMark('",
    "return String(original.apply(this,args)).replace('function spawnMark(', 'function spawnMark(}')",
  ];
  for (const [index, effect] of probes.entries()) {
    const preload = join(dir, 'probe-' + index + '.mjs');
    writeFileSync(preload, "import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';\n"
      + "const original=fs.readFileSync;fs.readFileSync=function(...args){if(String(args[0]).endsWith('/public/construtor.html')){"
      + effect + ";}return original.apply(this,args)};syncBuiltinESMExports();\n");
    const result = run('seta-invertida', { ...process.env,
      NODE_OPTIONS: (process.env.NODE_OPTIONS || '') + ' --import=' + pathToFileURL(preload).href });
    assert.ok(result.status === 2 && !result.error && !result.signal && result.stderr.includes('YAW_INFRA:')
      && !result.stdout.includes('YAW_RESULT:') && !killed(result), 'falha real de setup recusada ' + index);
  }
} finally { rmSync(dir, { recursive: true, force: true }); }
const unknown = run('desconhecido');
assert.ok(unknown.status === 2 && !killed(unknown), 'mutante desconhecido é infraestrutura');
assert.equal(hash(readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8')), hash(html));
assert.equal(hash(readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8')), hash(game));
console.log('CONSTRUTOR YAW PASS: dez orientações, mutante causal, quinze falsos verdes e cinco falhas reais de setup recusados');
