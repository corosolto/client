/* Posto: matriz determinística de navegação em DM/CTF, 5x5/8x8.
   O teto de stuck é a pior célula da alpha.262 (4,067%) com 10% de folga: 4,5%.
   A contraprova recoloca seis pilhas de pneus nas rotas e deve ultrapassar o teto. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const botsim = path.join(here, 'botsim.mjs');
const seeds = '12345,777,4242,90210,31337,8675309,2718,1618,42';

function run(teamSize, ctf, query = '') {
  const output = execFileSync(process.execPath, [botsim, '60', 'posto_treta'], {
    env: {
      ...process.env,
      SIM_TEAM_SIZE: String(teamSize),
      SIM_CTF: ctf ? '1' : '0',
      SIM_QS: query,
      SIM_SEEDS: seeds,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 1 << 24,
  });
  const begin = output.search(/^\[$/m);
  const end = output.lastIndexOf(']');
  assert(begin >= 0 && end > begin, 'JSON do botsim ausente');
  const [result] = JSON.parse(output.slice(begin, end + 1));
  assert(result && !result.err, result?.err || 'resultado ausente');
  return result;
}

const cells = [];
for (const teamSize of [5, 8]) {
  for (const ctf of [false, true]) {
    const result = run(teamSize, ctf);
    assert.equal(result.bots, teamSize * 2 - 1, `${teamSize}x${teamSize}: bots incorretos`);
    assert(result.stuckPct <= 4.5, `${teamSize}x${teamSize} ${ctf ? 'CTF' : 'DM'}: stuck ${result.stuckPct}% > 4,5%`);
    assert(result.eff >= .15, `${teamSize}x${teamSize} ${ctf ? 'CTF' : 'DM'}: eficiência ${result.eff} < 0,15`);
    assert(result.spinRoam <= .1, `${teamSize}x${teamSize} ${ctf ? 'CTF' : 'DM'}: spinRoam ${result.spinRoam} > 0,10`);
    assert(result.laneSpread >= .6, `${teamSize}x${teamSize} ${ctf ? 'CTF' : 'DM'}: laneSpread ${result.laneSpread} < 0,60`);
    cells.push({ teamSize, mode: ctf ? 'CTF' : 'DM', ...result });
  }
}

const base5dm = cells.find((cell) => cell.teamSize === 5 && cell.mode === 'DM');
const mutant = run(5, false, '?postoPneusCorredor=1');
assert(mutant.stuckPct > 4.5, `mutante pneus-corredor não ficou vermelho: ${mutant.stuckPct}%`);
assert(mutant.stuckPct - base5dm.stuckPct >= .5, `mutante pneus-corredor moveu só ${(mutant.stuckPct - base5dm.stuckPct).toFixed(3)} p.p.`);

for (const cell of cells) {
  console.log(`POSTO BOTS ${cell.teamSize}x${cell.teamSize} ${cell.mode}: stuck=${cell.stuckPct}% eff=${cell.eff} spinRoam=${cell.spinRoam} laneSpread=${cell.laneSpread}`);
}
console.log(`POSTO BOTS MUTANTE pneus-corredor: 5x5 DM stuck=${mutant.stuckPct}% (+${(mutant.stuckPct - base5dm.stuckPct).toFixed(3)} p.p.) — vermelho`);
