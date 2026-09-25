/* Córrego: carga DM/CTF determinística em 5x5 e 8x8, usando Game e bots de produção. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mutant = process.argv.includes('--mutante=times-fixos');
const here = path.dirname(fileURLToPath(import.meta.url));
const botsim = path.join(here, 'botsim.mjs');

function run(teamSize, mode) {
  const output = execFileSync(process.execPath, [botsim, '60', 'corrego'], {
    env: {
      ...process.env,
      SIM_TEAM_SIZE: String(mutant ? 4 : teamSize),
      SIM_CTF: mode === 'ctf' ? '1' : '0',
      SIM_SEEDS: '12345,777,4242,90210,31337,8675309,2718,1618,42',
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 1 << 24,
  });
  const begin = output.search(/^\[$/m), end = output.lastIndexOf(']');
  const label = `${mode.toUpperCase()} ${teamSize}x${teamSize}`;
  assert(begin >= 0 && end > begin, `${label}: JSON do botsim ausente`);
  const [result] = JSON.parse(output.slice(begin, end + 1));
  assert(result && !result.err, `${label}: ${result?.err || 'resultado ausente'}`);
  assert.match(output, new RegExp(`\\[times\\] TME ${teamSize} × ${teamSize} TMB`), `${label}: placar incorreto`);
  assert.equal(result.bots, teamSize * 2 - 1, `${label}: quantidade de bots incorreta`);
  assert(result.stuckPct < 8, `${label}: stuck ${result.stuckPct}% >= 8%`);
  assert(result.eff > .1, `${label}: eficiência ${result.eff} <= 0,10`);
  assert(result.spinRoam < .3, `${label}: spinRoam ${result.spinRoam} >= 0,30`);
  assert(result.laneSpread >= .6, `${label}: laneSpread ${result.laneSpread} < 0,60`);
  return { mode, teamSize, ...result };
}

const results = ['dm', 'ctf'].flatMap((mode) => [5, 8].map((size) => run(size, mode)));
console.log(`CÓRREGO CARGA: ${results.map((r) => `${r.mode.toUpperCase()} ${r.teamSize}x${r.teamSize} bots=${r.bots} stuck=${r.stuckPct}% eff=${r.eff} spinRoam=${r.spinRoam} laneSpread=${r.laneSpread}`).join(' · ')}`);
