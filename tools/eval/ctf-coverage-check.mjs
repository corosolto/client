import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MAPS } from './harness.mjs';

// ctfMode escolhe o modo inicial; só objectiveMode retira o mapa do CTF comum.
const expected = Object.entries(MAPS).filter(([, map]) => !map.objectiveMode).map(([id]) => id);
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('PASS '+name); } catch (e) { failed++; console.error('FAIL '+name+': '+e.message); } };
const run = (script, args = []) => spawnSync(process.execPath,
  [fileURLToPath(new URL(script, import.meta.url)), ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
for (const script of ['./ctf-labels-check.mjs', './ctf-win-check.mjs']) check(script+' cobre mapas com CTF opcional', () => {
  const r = run(script);
  assert.equal(r.status, 0, 'régua normal deve passar');
  for (const id of expected) assert.ok(r.stdout.includes(id), 'mapa elegível omitido: '+id);
  assert.ok(!r.stdout.includes('operacao_flavio'), 'objetivo dedicado não participa de CTF');
});
check('mutante vaza aplica no piscina_treta e reprova a cláusula CTFL1', () => {
  const r = run('./ctf-labels-check.mjs', ['--mutante=vaza']);
  assert.equal(r.status, 1, 'mutante deve reprovar por conteúdo');
  assert.match(r.stdout, /Mutação aplicada: vaza/);
  assert.match(r.stdout, /CTFL VERMELHA\s+piscina_treta.*CTFL1/);
});
if (failed) process.exitCode = 1;
