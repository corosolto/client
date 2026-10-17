// Mutantes do contrato de cadência das pistolas (pistola-cadencia-check.mjs). Muda a
// FONTE executada (cópia em artifacts/, imports relativos resolvidos pra file://) — nada
// do checkout é sobrescrito. Esperado: todo mutante KILLED com as falhas previstas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = 'public/js/data/weapons.js';
const OUT = 'artifacts/pistola-cadencia';
mkdirSync(OUT, { recursive: true });
const source = readFileSync(SRC, 'utf8');

const trials = [
  // o bug do relato de volta: cadência lerda de antes do ajuste
  ['rate-antigo', source
    .replace('reserve: 35, rate: 0.24, reload: 2.0', 'reserve: 35, rate: 0.28, reload: 2.0')
    .replace('reserve: 48, rate: 0.17, reload: 1.6', 'reserve: 48, rate: 0.24, reload: 1.6'),
    ['PT-38 na faixa de semi (0,12-0,18 s)', 'Deagle na faixa de canhão de mão (0,18-0,26 s)', 'PT-38 TTK de corpo < 0,40 s (o alvo do ajuste)']],
  // pistola-laser: quebra a ORDEM de TTK (vira meta na frente da MP5)
  ['pistola-laser', source.replace('reserve: 48, rate: 0.17, reload: 1.6', 'reserve: 48, rate: 0.08, reload: 1.6'),
    ['PT-38 na faixa de semi (0,12-0,18 s)', 'pistola continua perdendo a curto prazo pra MP5']],
];

const results = [];
for (const [name, body, esperadas] of trials) {
  if (body === source) throw new Error(`mutação não aplicou: ${name}`);
  const file = resolve(`${OUT}/${name}.mjs`);
  writeFileSync(file, body.replace(/from '(\.\/[^']+)'/g,
    (_, p) => `from '${pathToFileURL(resolve(dirname(SRC), p)).href}'`));
  const run = spawnSync(process.execPath, ['tools/eval/pistola-cadencia-check.mjs', `--weapons-module=${file}`],
    { encoding: 'utf8' });
  writeFileSync(`${OUT}/${name}.log`, run.stdout + run.stderr);
  let failed = [];
  try { failed = JSON.parse(run.stdout.slice(run.stdout.indexOf('{'))).failed; } catch { failed = ['<sem json>']; }
  const ok = run.status === 1 && esperadas.every((e) => failed.includes(e)) && esperadas.length === failed.length;
  results.push({ name, status: run.status, failed, esperadas, ok });
  console.log(name, ok ? 'KILLED' : 'SURVIVED', JSON.stringify(failed));
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
if (results.some((r) => !r.ok)) process.exitCode = 1;
