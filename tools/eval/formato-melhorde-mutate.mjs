// Mutantes do contrato de formato no banner (formato-melhorde-check.mjs). Muda a FONTE
// executada (cópias em artifacts/, imports relativos resolvidos pra file://) — nada do
// checkout é sobrescrito. Esperado: todo mutante KILLED com as falhas previstas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = 'public/js/game.js';
const NET = 'public/js/netgame.js';
const OUT = 'artifacts/formato-melhorde';
mkdirSync(OUT, { recursive: true });
const source = readFileSync(SRC, 'utf8');
const netSource = readFileSync(NET, 'utf8');
const absoluto = (body, base) => body.replace(/from '(\.\/[^']+)'/g,
  (_, p) => `from '${pathToFileURL(resolve(dirname(base), p)).href}'`);
const roda = (gameBody, netBody) => {
  const gf = resolve(`${OUT}/game-${Math.random().toString(36).slice(2, 8)}.mjs`);
  const nf = resolve(`${OUT}/netgame-${Math.random().toString(36).slice(2, 8)}.mjs`);
  writeFileSync(gf, absoluto(gameBody, SRC));
  writeFileSync(nf, absoluto(netBody, NET));
  const run = spawnSync(process.execPath, ['tools/eval/formato-melhorde-check.mjs',
    `--game-module=${gf}`, `--netgame-module=${nf}`], { encoding: 'utf8' });
  let failed = [];
  try { failed = JSON.parse(run.stdout.slice(run.stdout.indexOf('{'))).failed; } catch { failed = ['<sem json>']; }
  return { failed, log: run.stdout + run.stderr };
};

const trials = [
  // o bug do relato de volta: banner do round 1 sem formato (só o modo)
  ['sem-formato-sp', source.replace(
    /this\.roundNum === 1 \? `\$\{subRound\} · \$\{frase\('formatoMelhorDe', this\.roundsMax, this\.roundsToWin\)\}` : subRound/, 'subRound'), netSource,
    ['round 1 padrão declara MELHOR DE 5', 'round 1 padrão diz PRIMEIRO A 3', 'teto 3 declara MELHOR DE 3 e PRIMEIRO A 2', 'ctf round 1 declara bandeiras E formato']],
  // MP fica sem o formato na transição replicada
  ['sem-formato-mp', source, netSource.replace(
    /game\.roundNum === 1 \? `\$\{subRound\} · \$\{frase\('formatoMelhorDe', game\.roundsMax, game\.roundsToWin\)\}` : subRound/, 'subRound'),
    ['mp countdown declara o formato no round 1']],
  // cartilha em todo round: o formato repete no round 2
  ['formato-todo-round', source.replace(
    /this\.roundNum === 1 \? `\$\{subRound\} · \$\{frase\('formatoMelhorDe', this\.roundsMax, this\.roundsToWin\)\}` : subRound/,
    '`${subRound} · ${frase(\'formatoMelhorDe\', this.roundsMax, this.roundsToWin)}`'), netSource,
    ['round 2 não repete o formato']],
];

const results = [];
for (const [name, gameBody, netBody, esperadas] of trials) {
  const { failed, log } = roda(gameBody, netBody);
  const ok = esperadas.every((e) => failed.includes(e)) && esperadas.length === failed.length;
  writeFileSync(`${OUT}/${name}.log`, log);
  results.push({ name, failed, esperadas, ok });
  console.log(name, ok ? 'KILLED' : 'SURVIVED', JSON.stringify(failed));
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
if (results.some((r) => !r.ok)) process.exitCode = 1;
