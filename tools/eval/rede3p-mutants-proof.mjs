// Uma medição defeituosa não pode transformar mutantes em aprovação do portão.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temp = mkdtempSync(path.join(tmpdir(), 'rede3p-base-'));
const run = file => spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
const receipt = result => {
  const lines = result.stdout?.split('\n').filter(line => line.startsWith('REDE3P_RESULT ')) || [];
  assert.equal(lines.length, 1, `medição real sem veredito único\n${result.stderr}`);
  return JSON.parse(lines[0].slice('REDE3P_RESULT '.length));
};
try {
  const folder = path.join(temp, 'tools', 'eval');
  mkdirSync(folder, { recursive: true });
  symlinkSync(path.join(root, 'public'), path.join(temp, 'public'), 'dir');
  symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
  symlinkSync(path.join(root, 'tools', 'eval', 'harness.mjs'), path.join(folder, 'harness.mjs'));
  const check = path.join(folder, 'rede3p-check.mjs');
  const gate = path.join(folder, 'rede3p-mutants-check.mjs');
  const source = readFileSync(new URL('./rede3p-check.mjs', import.meta.url), 'utf8');
  writeFileSync(check, source);
  writeFileSync(gate, readFileSync(new URL('./rede3p-mutants-check.mjs', import.meta.url), 'utf8'));
  const healthy = run(check);
  assert.equal(healthy.status, 0, `${healthy.stdout}\n${healthy.stderr}`);
  assert.deepEqual(receipt(healthy).failed, []);
  // O rig continua real; só o instrumento de altura fica defeituoso em todos os processos.
  const anchor = /^const headY =[^\n]+$/gm;
  assert.equal([...source.matchAll(anchor)].length, 1, 'alvo de falha do instrumento deve ser único');
  writeFileSync(check, source.replace(anchor, 'const headY = () => 0;'));
  const broken = run(check);
  assert.equal(broken.status, 1, `${broken.stdout}\n${broken.stderr}`);
  assert.deepEqual(receipt(broken).failed, ['R3P1']);
  const verdict = run(gate);
  assert.equal(verdict.status, 1, `portão aprovou base vermelha\n${verdict.stdout}\n${verdict.stderr}`);
  console.log('REDE3P_BASE_PROOF ' + JSON.stringify({ healthy: healthy.status, broken: broken.status, failed: receipt(broken).failed, gate: verdict.status }));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
