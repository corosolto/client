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

const VOLUME = ['direita', 'esquerda', 'topo', 'base'].map((lado) => `volume da câmera cobre ${lado}`);
const QUINA = ['quina que fecha um ombro usa o outro sem ocultar o jogador',
  'uma abertura curta não faz a câmera pular de ombro'];
const REUSE = 'probes reutilizam array de interseções';

const trials = [
  ['sem-pull-in', source.replace(
    'if (!world.occluders?.length && !world.camBlockers?.length) return length;',
    'return length;'),
    ['câmera para ANTES do prop (pull-in)', 'ombro: câmera fica antes do prop colado',
      'ombro: malhas próprias somem só dentro da cápsula', 'câmera não entra no varal', ...VOLUME, ...QUINA, REUSE,
      'boom da Piscina para antes do fundo do armário']],
  ['ignora-camBlockers', source.replace('if (world.camBlockers?.length) {', 'if (false) {'),
    ['câmera não entra no varal', ...VOLUME, ...QUINA]],
  ['piso-antigo', source.replace('Math.max(0, claro - 0.18)', 'Math.max(0.35, claro - 0.18)'),
    ['ombro: câmera fica antes do prop colado']],
  ['sem-auto-oclusao', source.replace(
    'const selfOccluded = (this._tpBoomClear ?? boomLen) < minBodyGap;',
    'const selfOccluded = false;'), ['ombro: malhas próprias somem só dentro da cápsula']],
  ['raio-sem-volume', source.replace(
    'for (let i = 0; i < 5; i++) {\n    const x = i === 1',
    'for (let i = 0; i < 1; i++) {\n    const x = i === 1'), [...VOLUME, REUSE]],
  ['sem-probe-direito', source.replace('i === 1 ? 0.12', 'i === 1 ? 0'),
    ['volume da câmera cobre direita']],
  ['sem-probe-esquerdo', source.replace('i === 2 ? -0.12', 'i === 2 ? 0'),
    ['volume da câmera cobre esquerda']],
  ['sem-probe-topo', source.replace('i === 3 ? 0.10', 'i === 3 ? 0'),
    ['volume da câmera cobre topo']],
  ['sem-probe-base', source.replace('i === 4 ? -0.10', 'i === 4 ? 0'),
    ['volume da câmera cobre base']],
  ['sem-reuso-de-hits', source.replace(
    'ray.intersectObjects(world.occluders, true, hits);',
    'ray.intersectObjects(world.occluders, true);'),
    ['câmera para ANTES do prop (pull-in)', 'ombro: câmera fica antes do prop colado',
      'ombro: malhas próprias somem só dentro da cápsula', REUSE]],
  ['ombro-fixo', source.replace(
    'this._tpShoulderSide = -(this._tpShoulderSide || 1);',
    'this._tpShoulderSide = 1;'),
    ['primeiro quadro da troca continua no ombro que está saindo', 'Shift+N inverte lado do enquadramento']],
  ['shift-ignorado', source.replace(
    'if (e.shiftKey) this._swapShoulder();',
    'if (e.shiftKey) this._toggleCamView();'),
    ['Shift+N mantém câmera de ombro', 'Shift+N inverte lado do enquadramento']],
  ['repeat-aceito', source.replace(
    "if (e.code === 'KeyN' && !e.repeat) {",
    "if (e.code === 'KeyN') {"),
    ['repeat de Shift+N não troca de novo']],
  ['volta-b', source.replace(
    "if (e.code === 'KeyB') { this._compra?.alternar(); return; }",
    "if (e.code === 'KeyB') { this._toggleCamView(); return; }"),
    ['B e Shift+B não mexem na câmera']],
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
