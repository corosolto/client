/* Contrato do manifest visual dos cinco mapas novos.

   Este gate NAO captura: ele falha fechado quando o PNG, a camera ou qualquer fonte
   visual mudou desde a captura. A imagem continua precisando ser olhada por um critico
   adversarial; aqui provamos somente que ele olhara o byte produzido pelo fonte atual.

   `--selftest --mutante=camera-drift` constrói um manifest bom em memoria e desloca a
   primeira camera; precisa ficar vermelho sem abrir browser.
*/
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const MANIFEST = 'tools/eval/asset-evidence/maps/manifest.json';
const SELFTEST = process.argv.includes('--selftest');
const MUTANTE = process.argv.includes('--mutante=camera-drift');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const plano = JSON.parse(execFileSync(process.execPath,
  ['tools/capture-map-evidence.mjs', '--plan'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
const esperados = plano.maps.flatMap(({ map, source, shots }) => shots.map((shot) => ({
  map, ...shot,
  file: `tools/eval/asset-evidence/maps/${map}/${shot.name}.png`,
  viewport: plano.viewport,
  sourceFiles: source.files,
  sourceSha256: source.sha256,
})));

let doc;
if (SELFTEST) {
  doc = {
    schemaVersion: plano.schemaVersion,
    viewport: plano.viewport,
    mapOrder: plano.mapOrder,
    shots: esperados.map((shot) => ({
      ...shot,
      imageSha256: existsSync(shot.file) ? sha(readFileSync(shot.file)) : 'arquivo-ausente',
      errors: [],
    })),
  };
} else {
  try { doc = JSON.parse(readFileSync(MANIFEST, 'utf8')); }
  catch (error) {
    console.error(`MAP-EVIDENCE FALHA: manifest ausente/invalido (${error.message}). Rode node tools/capture-map-evidence.mjs.`);
    process.exit(1);
  }
}

if (MUTANTE) {
  const alvo = esperados[0];
  const antes = alvo.from[0];
  alvo.from = [...alvo.from]; alvo.from[0] += 0.5;
  if (alvo.from[0] === antes) throw new Error('MUTANTE camera-drift nao aplicou');
}

const falhas = [];
if (doc.schemaVersion !== plano.schemaVersion) falhas.push(`schema ${doc.schemaVersion ?? 'ausente'} != ${plano.schemaVersion}`);
if (JSON.stringify(doc.viewport) !== JSON.stringify(plano.viewport)) falhas.push('viewport nao e 1536x1024 (3:2)');
if (JSON.stringify(doc.mapOrder) !== JSON.stringify(plano.mapOrder)) falhas.push('ordem dos mapas divergiu do roteiro');
if (!Array.isArray(doc.shots) || doc.shots.length !== esperados.length)
  falhas.push(`manifest tem ${doc.shots?.length ?? 0}/${esperados.length} quadros`);
if (!SELFTEST) {
  const esperadosPorMapa = new Map(plano.maps.map(({ map, shots }) =>
    [map, new Set(shots.map((shot) => `${shot.name}.png`))]));
  for (const [map, nomes] of esperadosPorMapa) {
    const dir = `tools/eval/asset-evidence/maps/${map}`;
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.png')))
      if (!nomes.has(file)) falhas.push(`${map}/${file}: PNG orfao fora do roteiro`);
  }
}

for (const esperado of esperados) {
  const atual = doc.shots?.find((shot) => shot.map === esperado.map && shot.name === esperado.name);
  if (!atual) { falhas.push(`${esperado.map}/${esperado.name}: ausente`); continue; }
  for (const field of ['from', 'look', 'proves', 'viewport', 'sourceFiles', 'sourceSha256', 'cameraSha256']) {
    if (JSON.stringify(atual[field]) !== JSON.stringify(esperado[field]))
      falhas.push(`${esperado.map}/${esperado.name}: ${field} divergiu`);
  }
  if (!existsSync(esperado.file)) falhas.push(`${esperado.map}/${esperado.name}: PNG ausente`);
  else if (atual.imageSha256 !== sha(readFileSync(esperado.file)))
    falhas.push(`${esperado.map}/${esperado.name}: SHA do PNG divergiu`);
  if (!Array.isArray(atual.errors) || atual.errors.length) falhas.push(`${esperado.map}/${esperado.name}: captura registrou erro`);
}

if (falhas.length) {
  console.error(`MAP-EVIDENCE FALHA: ${falhas.length} clausula(s).`);
  for (const falha of falhas.slice(0, 12)) console.error(`✗ ${falha}`);
  if (falhas.length > 12) console.error(`… +${falhas.length - 12}`);
  console.error('Recapture, nessa ordem: node tools/capture-map-evidence.mjs --plan; node tools/capture-map-evidence.mjs');
  process.exitCode = 1;
} else if (MUTANTE) {
  console.error('MUTANTE camera-drift sobreviveu.');
  process.exitCode = 1;
} else {
  console.log(`MAP-EVIDENCE OK: ${esperados.length} PNGs ligados ao fonte e cameras atuais${SELFTEST ? ' (selftest em memoria)' : ''}.`);
}
