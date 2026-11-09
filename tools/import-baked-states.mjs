#!/usr/bin/env node
/* Importa os 11 estados assados por corpo, preservando o pack meshopt e os fallbacks
   por estado. Um corpo só entra se NENHUMA métrica QA comparável piorar contra o clipe
   atual, mesmo quando antes e depois continuam do mesmo lado do threshold do Studio.
   Uso: node tools/import-baked-states.mjs --legacy-out=<dir> --legacy=<dir> */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { QA_METRICS } from './eval/baked-states-metrics.mjs';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const NEW_ROOT = path.resolve(arg('legacy-out') || '');
const OLD_ROOT = path.resolve(arg('legacy') || '');
// --check: regenera a evidência em memória e compara byte a byte com a versionada; não escreve nada.
const CHECK = process.argv.includes('--check');
if (!arg('legacy-out') || !arg('legacy')) throw new Error('uso: node tools/import-baked-states.mjs --legacy-out=<dir> --legacy=<dir> [--check]');
const ANIMS = path.resolve('public/models/anims');
// Evidência do gate, não asset servido: nada em public/ a consome.
const EVIDENCIA = path.resolve('tools/eval');
const STATES = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire'];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
// Nada é escrito em public/ antes de o corpo inteiro validar: um throw no meio não deixa pack parcial.
const publish = (bytes, target) => {
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
};

function glbJSON(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB inválido');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error(`GLB truncado: cabeçalho declara ${bytes.readUInt32LE(8)} bytes, arquivo tem ${bytes.length}`);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
}
/* O manifest do Studio não publica hash por `_baked/<estado>.glb`; a procedência do
   fallback vem da própria estrutura: GLB íntegro, um clipe com o nome do estado e a
   duração declarada no manifest. Só depois disso o hash entra no índice. */
function assertFallback(bytes, id, state, manifest) {
  let doc;
  try { doc = glbJSON(bytes); } catch (error) { throw new Error(`${id}/${state}: fallback ${error.message}`); }
  const anims = doc.animations || [];
  if (anims.length !== 1 || anims[0].name !== state) throw new Error(`${id}/${state}: fallback deveria ter só o clipe ${state}, tem ${anims.map((a) => a.name).join(', ') || 'nenhum'}`);
  const expected = manifest.clips[state]?.duration;
  if (!(expected > 0)) throw new Error(`${id}/${state}: duração ausente no manifest`);
  const duration = Math.max(...anims[0].samplers.map((s) => doc.accessors[s.input]?.max?.[0] ?? -Infinity));
  if (!(Math.abs(duration - expected) <= 1e-3)) throw new Error(`${id}/${state}: fallback dura ${duration}s, manifest declara ${expected}s`);
  const buffers = doc.buffers || [];
  const binLength = bytes.readUInt32LE(20 + bytes.readUInt32LE(12));
  if (buffers.length !== 1 || buffers[0].byteLength > binLength) throw new Error(`${id}/${state}: buffer binário incompleto`);
}
function assertPacked(bytes, id) {
  const doc = glbJSON(bytes);
  if (!doc.extensionsRequired?.includes('EXT_meshopt_compression')) throw new Error(`${id}: states.glb sem EXT_meshopt_compression obrigatória`);
  const rotations = new Set((doc.animations || []).flatMap((a) => a.channels.filter((c) => c.target.path === 'rotation').map((c) => a.samplers[c.sampler].output)));
  if (!rotations.size) throw new Error(`${id}: nenhuma rotação encontrada`);
  for (const index of rotations) {
    const a = doc.accessors[index];
    if (a.componentType !== 5122 || a.normalized !== true) throw new Error(`${id}: rotação do accessor ${index} não é int16 normalizado`);
  }
  const names = (doc.animations || []).map((a) => a.name).sort();
  if (JSON.stringify(names) !== JSON.stringify([...STATES].sort())) throw new Error(`${id}: clipes divergentes: ${names.join(', ')}`);
}

function qaValue(result, path) {
  let value = result?.metrics;
  for (const key of path) value = value?.[key];
  return Number.isFinite(value) ? value : null;
}
function qaRegressions(state, current, packed) {
  const regressions = [];
  for (const [metric, path, direction] of QA_METRICS) {
    const before = qaValue(current, path), after = qaValue(packed, path);
    if (before === null || after === null) continue;
    if (direction * (after - before) > 1e-9) regressions.push({ state, metric, current: before, next: after, delta: after - before });
  }
  return regressions;
}

const RUNTIME_EXCLUSIONS = {
  canarinho: { state: 'idle/pistol+knife', kinds: ['runtime:COTOVELO'], current: ['55°..150°'], next: ['41.8°'] },
  ministro: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['p99 1.261; ruins/1e4 135.7'], next: ['p99 1.295; ruins/1e4 153.7'] },
  'marina-silva': { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['p99 0.948; ruins/1e4 89.5'], next: ['p99 0.989; ruins/1e4 97.2'] },
  gotinha: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['p99 0.670; ruins/1e4 38.4'], next: ['p99 0.734; ruins/1e4 48.4'] },
  reggae: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['p99 0.460; ruins/1e4 26.9'], next: ['p99 0.563; ruins/1e4 30.6'] },
  bombado: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['p99 0.548; ruins/1e4 28.7'], next: ['p99 0.609; ruins/1e4 25.8'] },
  palhacomal: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['p99 0.531; ruins/1e4 25.4'], next: ['p99 0.534; ruins/1e4 21.7'] },
  padata: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.552; ruins/1e4 40.2'] },
  lampiao: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.628; ruins/1e4 35.1'] },
  mst: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.647; ruins/1e4 29.4'] },
  et: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.607; ruins/1e4 29.2'] },
  titica: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.644; ruins/1e4 28.7'] },
  jozo: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.467; ruins/1e4 26.2'] },
  mariabonita: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.628; ruins/1e4 25.6'] },
  funkraiz: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.424; ruins/1e4 23.8'] },
  hipster: { state: 'idle/select', kinds: ['runtime:INFLATE'], current: ['teto global 0.675/23.6'], next: ['p99 0.617; ruins/1e4 23.7'] },
};
const legacy = readJSON(path.join(OLD_ROOT, 'summary.json'));
const bodies = legacy.filter((e) => e.kind === 'body');
if (bodies.length !== 74) throw new Error(`esperava 74 BODIES, fonte tem ${bodies.length}`);
const selected = [], excluded = [];
const sources = {};
for (const entry of bodies) {
  const id = entry.id;
  const files = {
    qaCurrent: path.join(OLD_ROOT, id, 'qa-current.json'),
    qaPacked: path.join(NEW_ROOT, id, 'qa-packed.json'),
    manifest: path.join(NEW_ROOT, id, 'manifest.json'),
  };
  // Hash das fontes: quem tiver o QA do Studio reproduz a evidência com `--check`.
  sources[id] = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, sha(fs.readFileSync(f))]));
  const qa = readJSON(files.qaPacked);
  const currentQa = readJSON(files.qaCurrent);
  const manifest = readJSON(files.manifest);
  const results = new Map(qa.results.map((r) => [r.name, r]));
  const currentResults = new Map(currentQa.results.map((r) => [r.name, r]));
  const regressions = [];
  for (const state of STATES) {
    const result = results.get(state), current = currentResults.get(state);
    if (!result || !current) throw new Error(`${id}/${state}: ausente no QA atual ou no qa-packed`);
    const packedVerdict = result.failures.length ? 'fail' : 'pass';
    if (packedVerdict !== entry.newStates[state].verdict) throw new Error(`${id}/${state}: verdict mudou no packing`);
    regressions.push(...qaRegressions(state, current, result));
  }
  const record = { id, regressions };
  // Regressão de runtime é anotação: a exclusão só vale com piora numérica medida.
  if (regressions.length && RUNTIME_EXCLUSIONS[id]) regressions.push(RUNTIME_EXCLUSIONS[id]);
  if (regressions.length) { excluded.push(record); continue; }
  if (RUNTIME_EXCLUSIONS[id]) throw new Error(`${id}: exclusão de runtime sem piora numérica medida; refaça a medição em vez de excluir à mão`);

  const packed = fs.readFileSync(path.join(NEW_ROOT, id, 'states.glb'));
  assertPacked(packed, id);
  const declared = manifest.files['states.glb'];
  if (sha(packed) !== declared.sha256 || packed.length !== declared.bytes) throw new Error(`${id}: hash/bytes divergem do manifest`);
  const fallbacks = new Map();
  for (const state of STATES) {
    const bytes = fs.readFileSync(path.join(NEW_ROOT, id, '_baked', `${state}.glb`));
    assertFallback(bytes, id, state, manifest);
    fallbacks.set(state, bytes);
  }
  const refs = {};
  for (const state of ['walk', 'run', 'crouchwalk', 'walk1h', 'walkfire']) {
    const speed = manifest.clips[state]?.speed;
    if (!(speed > 0)) throw new Error(`${id}/${state}: velocidade ausente`);
    refs[state] = speed;
  }
  const states = {};
  for (const state of STATES) {
    const r = results.get(state), m = r.metrics;
    const sourceMax = m.hips.sourceRatio?.[1] ?? null;
    states[state] = {
      sha256: sha(fallbacks.get(state)),
      bytes: fallbacks.get(state).length,
      airborne: r.airborne,
      lowestVertexCm: m.lowestVertex.minCm,
      heelCm: m.lowestVertex.byRegionCm?.heel ?? null,
      hipsMaxRatio: m.hips.maxRatio,
      hipsSourceMaxRatio: sourceMax,
      hipsLimitRatio: Math.max(qa.thresholds.hipsMaxRatio, (sourceMax ?? -Infinity) + qa.thresholds.hipsOverSourceRatio),
      failures: r.failures,
    };
  }
  if (!CHECK) {
    publish(packed, path.join(ANIMS, `${id}.glb`));
    for (const [state, bytes] of fallbacks) publish(bytes, path.join(ANIMS, id, `${state}.glb`));
  }
  selected.push({ id, sha256: sha(packed), bytes: packed.length, gzipBytes: declared.gzipBytes, refs, states });
}

const out = {
  schema: 'csbrasil/baked-body-states@1',
  provenance: {
    packs: 'anim-conv legacy-out/<id>/{states.glb,manifest.json,qa-packed.json}',
    currentQA: 'anim-conv legacy/summary.json (client 6ae417eeb)',
    selection: 'exclui qualquer piora numérica por estado nas métricas QA comparáveis; threshold não esconde magnitude',
    compression: 'EXT_meshopt_compression; rotações int16 normalizadas; fallbacks por estado sem compressão',
  },
  thresholds: { lowestVertexCm: -3, hipsMaxRatio: 1.08, hipsOverSourceRatio: 0.08 },
  states: STATES,
  sources,
  bodies: Object.fromEntries(selected.map((b) => [b.id, b])),
  excluded: Object.fromEntries(excluded.map((b) => [b.id, b.regressions])),
};
const evidencia = JSON.stringify(out, null, 2) + '\n';
const alvo = path.join(EVIDENCIA, 'baked-states.json');
if (CHECK) {
  const atual = fs.existsSync(alvo) ? fs.readFileSync(alvo, 'utf8') : '';
  if (atual !== evidencia) { console.error(`ESTADOS-ASSADOS --check: ${alvo} diverge da regeneração a partir do QA Studio`); process.exit(1); }
  console.log(`ESTADOS-ASSADOS --check ✓ evidência reproduzida: ${selected.length} substituídos, ${excluded.length} excluídos`);
  process.exit(0);
}
fs.writeFileSync(alvo, evidencia);
const doc = `# Estados assados por corpo\n\nGerado por \`tools/import-baked-states.mjs\` a partir dos packs meshy-28 e do QA Studio. `
  + `Os arquivos \`<id>.glb\` preservam meshopt + rotações int16; as pastas \`<id>/\` guardam o fallback por estado.\n\n`
  + `- ${selected.length} BODIES substituídos; ${excluded.length} excluídos por pelo menos uma métrica QA pior.\n`
  + `- Nenhum arquivo de \`public/models/skins/\` participa deste pipeline.\n`
  + `- Piso mínimo aceito: -3 cm; quadril: limite do Studio por estado (1,08× ou fonte +0,08).\n`
  + (selected.some((b) => b.id === 'cuca')
    ? `- A cuca entra com \`--passive-knees\`: o qa-packed final zera floor/heel e mantém quadril dentro do limite; stretch do rig permanece declarado.\n`
    : `- A cuca permanece fora: o pacote final piora métricas QA apesar de melhorar piso e quadril.\n`)
  + `\nFontes Mixamo/Quaternius e licenças seguem a procedência registrada nos manifests do Studio. `
  + `O índice \`baked-states.json\` contém hashes, velocidades, números de QA e todas as exclusões.\n`;
fs.writeFileSync(path.join(EVIDENCIA, 'baked-states.SOURCES.md'), doc);
console.log(`ESTADOS-ASSADOS: ${selected.length} substituídos, ${excluded.length} excluídos`);
console.log(`excluídos: ${excluded.map((b) => b.id).join(', ')}`);
