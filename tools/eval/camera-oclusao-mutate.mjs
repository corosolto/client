// Mutantes do contrato de oclusão do boom da câmera (camera-oclusao-check.mjs). Muda a
// FONTE executada (cópia em artifacts/, imports relativos resolvidos pra file://) — nada
// do checkout é sobrescrito. Esperado: todo mutante KILLED com as falhas previstas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = 'public/js/game.js';
const OUT = 'artifacts/camera-oclusao';
mkdirSync(OUT, { recursive: true });
const source = readFileSync(SRC, 'utf8');
const BLOCO = /    \/\* OCLUSÃO DO BOOM[\s\S]*?\n    \}\n(?=    \/\/ Cruz no alvo)/.exec(source)?.[0];
if (!BLOCO) throw new Error('âncora da oclusão do boom não encontrada — mutante impossível');
const CAMBLOCO = /      if \(this\.world\.camBlockers\?\.length\) \{[\s\S]*?\n      \}\n/.exec(BLOCO)?.[0];
if (!CAMBLOCO) throw new Error('âncora do camBlockers não encontrada — mutante impossível');

const trials = [
  // o bug do relato de volta: boom entra dentro do prop e da tela atrás do jogador
  ['sem-pull-in', source.replace(BLOCO, ''),
    ['câmera para ANTES do prop (pull-in)', 'ombro: piso de 0,35 m com prop colado', 'câmera não entra no varal']],
  // pano do varal fora da régua da câmera: só o raycast de occluders fica
  ['ignora-camBlockers', source.replace(CAMBLOCO, ''), ['câmera não entra no varal']],
];

const results = [];
for (const [name, body, esperadas] of trials) {
  if (body === source) throw new Error(`mutação não aplicou: ${name}`);
  const file = resolve(`${OUT}/${name}.mjs`);
  writeFileSync(file, body.replace(/from '(\.\/[^']+)'/g,
    (_, p) => `from '${pathToFileURL(resolve(dirname(SRC), p)).href}'`));
  const run = spawnSync(process.execPath, ['tools/eval/camera-oclusao-check.mjs', `--game-module=${file}`],
    { encoding: 'utf8' });
  writeFileSync(`${OUT}/${name}.log`, run.stdout + run.stderr);
  let failed = [];
  try {
    const json = run.stdout.slice(run.stdout.indexOf('{'));
    failed = JSON.parse(json).failed;
  } catch { failed = ['<sem json>']; }
  const ok = run.status === 1 && esperadas.every((e) => failed.includes(e))
    && esperadas.length === failed.length;
  results.push({ name, status: run.status, failed, esperadas, ok });
  console.log(name, ok ? 'KILLED' : 'SURVIVED', JSON.stringify(failed));
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
if (results.some((r) => !r.ok)) process.exitCode = 1;
