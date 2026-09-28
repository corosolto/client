import { findMovingLoops, inspectMovingLoops } from './bot-moving-loops.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mutantTurns = process.argv.includes('--mutante=sem-voltas');
const mutantArea = process.argv.includes('--mutante=sem-area');
const options = mutantTurns ? { minTurns: 99 } : mutantArea ? { minAreaToPathSquared: 0 } : {};
if ((mutantTurns || mutantArea) && !Object.keys(options).length) throw new Error('mutante não aplicado');
const samples = (fn, engaged = false) => Array.from({ length: 41 }, (_, i) => {
  const t = i * 0.15, [x, z] = fn(i / 40, t);
  return { t, x, z, yaw: t, engaged, alive: true };
});
const circle = samples((f) => [1.4 * Math.cos(f * Math.PI * 2), 1.4 * Math.sin(f * Math.PI * 2)]);
const fixtures = [
  ['sem alvo circular completo', circle, 'target-absent', 1],
  ['órbita com alvo separada', circle.map((p) => ({ ...p, engaged: true })), 'target-present', 1],
  ['giro parado', samples(() => [0, 0]), null, 0],
  ['ida e volta', samples((f) => [Math.sin(f * Math.PI * 2) * 2, 0]), null, 0],
  ['ida e volta em faixas próximas', samples((f) => [f <= 0.5 ? 6 * f : 6 * (1 - f), f <= 0.5 ? 0.01 : -0.01]), null, 0],
  ['oito sem volta consistente', samples((f) => [2 * Math.sin(f * Math.PI * 2), 1.4 * Math.sin(f * Math.PI * 4)]), null, 0],
  ['reta longa', samples((f) => [f * 8, 0]), null, 0],
  ['teleporte entre dois meios-círculos', circle.map((p, i) => i === 20 ? { ...p, x: p.x + 30 } : p), null, 0],
];
let failures = 0;
for (const [name, track, kind, count] of fixtures) {
  const found = findMovingLoops(track, options);
  const pass = found.length === count && (count === 0 || found[0].kind === kind);
  console.log(`${pass ? 'PASSA' : 'FALHA'} ${name}: ${found.length} candidato(s)`);
  if (!pass) failures++;
}
try {
  findMovingLoops([{ t: 1, x: 0, z: 0, alive: true }, { t: 0, x: 1, z: 0, alive: true }]);
  console.log('FALHA tempo inválido foi aceito'); failures++;
} catch { console.log('PASSA tempo inválido reprova'); }
const interrupted = circle.map((point, index) => index === 20 ? { ...point, alive: false } : point);
const coverage = inspectMovingLoops(interrupted);
if (coverage.eligibleWindows === 0 && coverage.events.length === 0)
  console.log('PASSA duas vidas curtas não simulam janela contínua');
else { console.log('FALHA cobertura descontínua parece janela válida'); failures++; }
const botsim = path.join(path.dirname(fileURLToPath(import.meta.url)), 'botsim.mjs');
const run = spawnSync(process.execPath, [botsim, '8', 'praca_poderes'], {
  encoding: 'utf8', maxBuffer: 1_000_000,
  env: { ...process.env, SIM_SEEDS: '12345', SIM_TEAM_SIZE: '5', SIM_MOVING_LOOPS: '1', SIM_LOOP_FIXTURE: '1' },
});
const marker = run.stderr?.split('\n').find((line) => line.startsWith('MOVING_LOOPS '));
let output = null;
try { output = JSON.parse(marker?.slice('MOVING_LOOPS '.length) || 'null'); } catch { /* falha abaixo */ }
if (run.status === 0 && output?.map === 'praca_poderes' && output?.seed === 12345
  && output.bots?.length > 0 && output.bots.some((b) => b.eligibleWindows > 0)
  && output.targetAbsent >= 1 && Number.isInteger(output.targetPresent))
  console.log(`PASSA botsim real mede círculo de controle entre ${output.bots.length} bots`);
else { console.log(`FALHA botsim não emitiu diagnóstico válido: ${run.stderr?.slice(0, 180)}`); failures++; }
if (failures) process.exitCode = 1;
