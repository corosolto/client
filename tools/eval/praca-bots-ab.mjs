/* Praça R2 — A/B causal das dez jardineiras laterais.
   O caso `sem-colliders` mantém exatamente as mesmas 20 malhas (base + vegetação), água,
   horizonte, defensas e densidade; somente os dez colliders `pracaR2` deixam de existir.
   Assim a comparação não confunde navegação com custo visual ou sequência de RNG. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const botsim = path.join(here, 'botsim.mjs');
const mutante = process.argv.includes('--mutante=regressao');

function roda(nome, query) {
  const run = spawnSync(process.execPath, [botsim, '30', 'praca_poderes'], {
    cwd: path.resolve(here, '../..'), encoding: 'utf8',
    env: { ...process.env, SIM_TEAM_SIZE: '8', SIM_CTF: '0', SIM_QS: query },
  });
  if (run.status !== 0) throw new Error(`${nome}: botsim saiu ${run.status}\n${run.stderr}`);
  const inicio = run.stdout.indexOf('[\n {');
  const fim = run.stdout.indexOf('\n]\nMEDIA', inicio);
  if (inicio < 0 || fim < 0) throw new Error(`${nome}: JSON do botsim ausente`);
  const row = JSON.parse(run.stdout.slice(inicio, fim + 2))[0];
  return { nome, stuck: row.stuckPct, eff: row.eff, flips: row.latFlips + row.fwdFlips };
}

const candidato = roda('candidato', '');
const semColliders = roda('sem-colliders', '?coberturaCol=0');
const baselineAlpha262 = 7.067;
const tetoDelta = mutante ? -1.0 : 0.15;
const delta = candidato.stuck - semColliders.stuck;
const checks = [
  ['PB1', candidato.stuck <= baselineAlpha262,
    `stuck ${candidato.stuck.toFixed(3)}% <= alpha.262 ${baselineAlpha262.toFixed(3)}%`],
  ['PB2', delta <= tetoDelta,
    `A/B só colliders delta ${delta >= 0 ? '+' : ''}${delta.toFixed(3)} p.p. <= ${tetoDelta.toFixed(3)} p.p.`],
  ['PB3', candidato.eff >= semColliders.eff - 0.04,
    `eff ${candidato.eff.toFixed(3)} vs ${semColliders.eff.toFixed(3)} sem colliders`],
];
for (const [id, ok, detalhe] of checks) console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} ${detalhe}`);
if (mutante) console.log('MUTANTE regressao aplicou');
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
