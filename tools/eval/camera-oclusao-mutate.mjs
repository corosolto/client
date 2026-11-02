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
const BLOCO = /    \/\* OCLUSÃO DO BOOM[\s\S]*?    tp\.selfOccluded = selfOccluded;\n/.exec(source)?.[0];
if (!BLOCO) throw new Error('âncora da oclusão do boom não encontrada — mutante impossível');
const CAMBLOCO = /        if \(this\.world\.camBlockers\?\.length\) \{[\s\S]*?\n        \}\n/.exec(BLOCO)?.[0];
if (!CAMBLOCO) throw new Error('âncora do camBlockers não encontrada — mutante impossível');

const VOLUME = ['direita', 'esquerda', 'topo', 'base'].map((lado) => `volume da câmera cobre ${lado}`);
const REUSE = 'probes reutilizam array de interseções';

const trials = [
  ['sem-pull-in', source.replace(BLOCO, ''),
    ['câmera para ANTES do prop (pull-in)', 'ombro: câmera fica antes do prop colado',
      'ombro: malhas próprias somem só dentro da cápsula', 'câmera não entra no varal', ...VOLUME, REUSE]],
  ['ignora-camBlockers', source.replace(CAMBLOCO, ''), ['câmera não entra no varal', ...VOLUME]],
  ['piso-antigo', source.replace('Math.max(0, claro - 0.18)', 'Math.max(0.35, claro - 0.18)'),
    ['ombro: câmera fica antes do prop colado']],
  ['sem-auto-oclusao', source.replace(
    'const selfOccluded = (this._tpBoomClear ?? boomLen) < 0.38 + cam.near;',
    'const selfOccluded = false;'), ['ombro: malhas próprias somem só dentro da cápsula']],
  ['raio-sem-volume', source.replace('probe < 5', 'probe < 1'), [...VOLUME, REUSE]],
  ['sem-probe-direito', source.replace('probe === 1 ? 0.12', 'probe === 1 ? 0'),
    ['volume da câmera cobre direita']],
  ['sem-probe-esquerdo', source.replace('probe === 2 ? -0.12', 'probe === 2 ? 0'),
    ['volume da câmera cobre esquerda']],
  ['sem-probe-topo', source.replace('probe === 3 ? 0.10', 'probe === 3 ? 0'),
    ['volume da câmera cobre topo']],
  ['sem-probe-base', source.replace('probe === 4 ? -0.10', 'probe === 4 ? 0'),
    ['volume da câmera cobre base']],
  ['sem-reuso-de-hits', source.replace(
    'this.ray.intersectObjects(this.world.occluders, true, hits);',
    'this.ray.intersectObjects(this.world.occluders, true);'),
    ['câmera para ANTES do prop (pull-in)', 'ombro: câmera fica antes do prop colado',
      'ombro: malhas próprias somem só dentro da cápsula', REUSE]],
  ['ombro-fixo', source.replace(
    'this._tpShoulderSide = -(this._tpShoulderSide || 1);',
    'this._tpShoulderSide = 1;'), ['Shift+N inverte lado do enquadramento']],
  ['shift-ignorado', source.replace(
    'if (e.shiftKey) this._swapShoulder();',
    'if (e.shiftKey) this._toggleCamView();'),
    ['Shift+N mantém câmera de ombro', 'Shift+N inverte lado do enquadramento']],
  ['repeat-aceito', source.replace(
    "if (e.code === 'KeyN' && !e.repeat) {",
    "if (e.code === 'KeyN') {"),
    ['repeat de Shift+N não troca de novo']],
  ['volta-b', source.replace(
    "if (e.code === 'KeyN' && !e.repeat) {",
    "if ((e.code === 'KeyN' || e.code === 'KeyB') && !e.repeat) {"),
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
