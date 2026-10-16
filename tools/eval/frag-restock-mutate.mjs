// Mutantes do contrato de frag por sequência (frag-restock-check.mjs). Muda a FONTE
// executada (cópias em artifacts/, imports relativos resolvidos pra file://) — nada do
// checkout é sobrescrito. Esperado: todo mutante KILLED com as falhas previstas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = 'public/js/game.js';
const OUT = 'artifacts/frag-restock';
mkdirSync(OUT, { recursive: true });
const source = readFileSync(SRC, 'utf8');

const trials = [
  // o pedido some: _kill não dá o passo de sequência
  ['sem-restock', source.replace('this._fragRestockStep(attacker);', ''),
    ['3º abate repõe a frag', 'teto 1: 6º abate não empilha segunda', 'gastou depois: nova sequência devolve',
     'round novo: 3 abates frescos repõem', 'slot remoto reposto no servidor']],
  // restock vira empilhamento: quem já tem granada ganha outra
  ['restock-empilha', source.replace('(attacker.frags | 0) >= 1) return;', 'false) return;')
    .replace('attacker.frags = 1;', 'attacker.frags = (attacker.frags | 0) + 1;'),
    ['teto 1: 6º abate não empilha segunda', 'com frag na mão, sequência não empilha']],
  // contador atravessa o round: 2 abates do round anterior adiantam o 1º do novo
  ['sequencia-atravessa-round', source.replace('for (const c of this.combatants || []) c._fragSeq = 0;', 'for (const c of this.combatants || []) ;').replace('this.player._fragSeq = 0;', ';'),
    ['sequência zera no round novo']],
];

const results = [];
for (const [name, body, esperadas] of trials) {
  if (body === source) throw new Error(`mutação não aplicou: ${name}`);
  const file = resolve(`${OUT}/${name}.mjs`);
  writeFileSync(file, body.replace(/from '(\.\/[^']+)'/g,
    (_, p) => `from '${pathToFileURL(resolve(dirname(SRC), p)).href}'`));
  const run = spawnSync(process.execPath, ['tools/eval/frag-restock-check.mjs', `--game-module=${file}`],
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
