/* Mansão do Joá: carga CTF em 5x5 e 8x8 no Game real, via botsim determinístico.
   O botsim continua 4x4 por padrão; SIM_TEAM_SIZE só abre esta matriz de carga.

   Mutante: --mutante=times-fixos ignora os tamanhos pedidos e prova que a régua
   detecta uma implementação presa em 4x4.
*/
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mutant = process.argv.includes('--mutante=times-fixos');
const HERE = import.meta.dirname;
const BOTSIM = path.join(HERE, 'botsim.mjs');
const cases = [5, 8];

function run(teamSize) {
  const requested = mutant ? 4 : teamSize;
  const output = execFileSync(process.execPath, [BOTSIM, '30', 'mansao'], {
    env: {
      ...process.env,
      SIM_TEAM_SIZE: String(requested),
      SIM_CTF: '1',
      SIM_SEEDS: '12345,777,4242',
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 1 << 24,
  });
  const begin = output.search(/^\[$/m), end = output.lastIndexOf(']');
  assert(begin >= 0 && end > begin, `${teamSize}x${teamSize}: JSON do botsim ausente`);
  const [result] = JSON.parse(output.slice(begin, end + 1));
  assert(result && !result.err, `${teamSize}x${teamSize}: ${result?.err || 'resultado ausente'}`);
  assert.match(output, new RegExp(`\\[times\\] TME ${teamSize} × ${teamSize} TMB`), `${teamSize}x${teamSize}: placar de gente incorreto`);
  assert.equal(result.bots, teamSize * 2 - 1, `${teamSize}x${teamSize}: quantidade de bots incorreta`);
  assert(result.stuckPct < 5, `${teamSize}x${teamSize}: stuck ${result.stuckPct}% >= 5%`);
  assert(result.eff > .25, `${teamSize}x${teamSize}: eficiência ${result.eff} <= 0,25`);
  assert(result.spinRoam < .3, `${teamSize}x${teamSize}: spinRoam ${result.spinRoam} >= 0,30`);
  return result;
}

const results = cases.map(run);
console.log(`JOA CARGA: ${results.map((r, i) => `${cases[i]}x${cases[i]} bots=${r.bots} stuck=${r.stuckPct}% eff=${r.eff} spinRoam=${r.spinRoam}`).join(' · ')}`);
