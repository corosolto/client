#!/usr/bin/env node
/* Importa, ESTADO A ESTADO, os clipes assados do Studio para os 74 BODIES legados.
   Um estado troca quando passa a regra de tools/eval/baked-states-metrics.mjs (sem reprovação
   nova no QA do Studio, sem piora > 10% num check que já reprovava, stretch `[rig]` não conta);
   os demais mantêm o clipe atual. O arquivo publicado é o `_baked/<estado>.glb` (float, sem
   meshopt): é o que `qa-uncompressed.json` mediu e o GLTFLoader do jogo lê sem decoder.
   Depois: npm run anims:merge && npm run anims && node tools/eval/char-probe.mjs && npm run feet
   && npm run gen:assetrev.
   Uso: node tools/import-baked-states.mjs --legacy-out=<dir> --legacy=<dir> [--check] */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { LEGENDA, falhasDe, motivosParaManter } from './eval/baked-states-metrics.mjs';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
if (!arg('legacy-out') || !arg('legacy')) throw new Error('uso: node tools/import-baked-states.mjs --legacy-out=<dir> --legacy=<dir> [--check]');
const NEW_ROOT = path.resolve(arg('legacy-out'));
const OLD_ROOT = path.resolve(arg('legacy'));
// --check: regenera a evidência em memória e compara byte a byte com a versionada; não escreve nada.
const CHECK = process.argv.includes('--check');
const ANIMS = path.resolve('public/models/anims');
const ALVO = path.resolve('tools/eval/baked-states.json');
const STATES = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire'];
// Estados cujo timeScale o jogo deriva da velocidade natural do clipe (glbchars.js, rate()).
const LOCO = ['walk', 'run', 'crouchwalk', 'walk1h'];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const h12 = (bytes) => sha(bytes).slice(0, 12);
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const io = new NodeIO();

/* Nada é escrito antes de TODOS os corpos validarem; um throw deixa public/ e tools/eval/ intactos. */
const pendentes = [];
const promote = () => {
  for (const [target, bytes] of pendentes) {
    if (fs.existsSync(target) && fs.readFileSync(target).equals(bytes)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, bytes);
    fs.renameSync(tmp, target);
  }
};

function glbJSON(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB inválido');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error(`GLB truncado: cabeçalho declara ${bytes.readUInt32LE(8)} bytes, arquivo tem ${bytes.length}`);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
}
/* O manifest do Studio não publica hash por `_baked/<estado>.glb`: a procedência vem da
   estrutura (GLB íntegro, um clipe com o nome do estado, duração e velocidade do manifest). */
function assertBaked(bytes, id, state, manifest) {
  let doc;
  try { doc = glbJSON(bytes); } catch (error) { throw new Error(`${id}/${state}: _baked ${error.message}`); }
  const anims = doc.animations || [];
  if (anims.length !== 1 || anims[0].name !== state) throw new Error(`${id}/${state}: _baked deveria ter só o clipe ${state}, tem ${anims.map((a) => a.name).join(', ') || 'nenhum'}`);
  const declarado = manifest.clips[state];
  if (!(declarado?.duration > 0)) throw new Error(`${id}/${state}: duração ausente no manifest`);
  const duration = Math.max(...anims[0].samplers.map((s) => doc.accessors[s.input]?.max?.[0] ?? -Infinity));
  if (!(Math.abs(duration - declarado.duration) <= 1e-3)) throw new Error(`${id}/${state}: _baked dura ${duration}s, manifest declara ${declarado.duration}s`);
  if (doc.extensionsRequired?.length) throw new Error(`${id}/${state}: _baked exige ${doc.extensionsRequired.join(', ')}; o loader do jogo não tem decoder`);
  const buffers = doc.buffers || [];
  const binLength = bytes.readUInt32LE(20 + bytes.readUInt32LE(12));
  if (buffers.length !== 1 || buffers[0].byteLength > binLength) throw new Error(`${id}/${state}: buffer binário incompleto`);
  const speed = anims[0].extras?.clip?.rootMotion?.speed;
  if (LOCO.includes(state) && !(speed > 0 && speed === declarado.speed)) throw new Error(`${id}/${state}: velocidade do clipe ${speed} != manifest ${declarado.speed}`);
}

/* Dados de animação por canal (nome do nó + caminho): o QA mediu cópias regravadas dos
   clipes do repo, então a prova de que o "atual" medido é o do repo é por DADO, não por byte. */
async function canais(file) {
  const anim = (await io.read(file)).getRoot().listAnimations()[0];
  if (!anim) throw new Error(`${file}: sem animação`);
  return new Map(anim.listChannels().map((c) => [`${c.getTargetNode().getName()}/${c.getTargetPath()}`,
    [c.getSampler().getInput().getArray(), c.getSampler().getOutput().getArray()]]));
}
async function mesmoClipe(a, b) {
  const [A, B] = await Promise.all([canais(a), canais(b)]);
  if (A.size !== B.size) return false;
  for (const [k, [ia, oa]] of A) {
    const x = B.get(k);
    if (!x || x[0].length !== ia.length || x[1].length !== oa.length) return false;
    for (let i = 0; i < ia.length; i++) if (ia[i] !== x[0][i]) return false;
    for (let i = 0; i < oa.length; i++) if (oa[i] !== x[1][i]) return false;
  }
  return true;
}

const resultados = (file) => new Map(readJSON(file).results.map((r) => [r.name, r]));
// Lado do registro: [piso cm] + {check: valor} só quando algo reprova.
const lado = (r, falhas) => (Object.keys(falhas).length ? [r.metrics.lowestVertex.minCm, falhas] : [r.metrics.lowestVertex.minCm]);
const legacy = readJSON(path.join(OLD_ROOT, 'summary.json'));
const bodies = legacy.filter((e) => e.kind === 'body');
if (bodies.length !== 74) throw new Error(`esperava 74 BODIES, fonte tem ${bodies.length}`);
const corpos = {};
let trocados = 0;
for (const { id } of bodies) {
  const files = {
    qaAtual: path.join(OLD_ROOT, id, 'qa-current.json'),
    qaNovo: path.join(NEW_ROOT, id, 'qa-uncompressed.json'),
    manifest: path.join(NEW_ROOT, id, 'manifest.json'),
  };
  const fontes = Object.values(files).map((f) => h12(fs.readFileSync(f)));
  const atualQa = resultados(files.qaAtual), novoQa = resultados(files.qaNovo);
  const manifest = readJSON(files.manifest);
  const origem = readJSON(path.join(OLD_ROOT, id, 'current', 'sources.json'));
  const estados = [], refs = {};
  for (const state of STATES) {
    const a = atualQa.get(state), n = novoQa.get(state);
    if (!a || !n) throw new Error(`${id}/${state}: ausente no QA atual ou no qa-uncompressed`);
    const fa = falhasDe(a), fn = falhasDe(n);
    const motivos = motivosParaManter(fa, fn);
    const copiaAtual = path.join(OLD_ROOT, id, 'current', `${state}.glb`);
    const repo = path.join(ANIMS, id, `${state}.glb`);
    const proprio = origem[state] === 'per-character';
    if (!proprio && origem[state] !== 'shared') throw new Error(`${id}/${state}: origem do clipe atual desconhecida: ${origem[state]}`);
    const novo = motivos.length ? null : fs.readFileSync(path.join(NEW_ROOT, id, '_baked', `${state}.glb`));
    if (novo) assertBaked(novo, id, state, manifest);
    // O clipe atual medido pelo QA tem que ser o do repo (ou o compartilhado, se o corpo não tem pasta).
    const noRepo = fs.existsSync(repo) ? fs.readFileSync(repo) : null;
    const jaTrocado = novo && noRepo?.equals(novo);
    if (!jaTrocado) {
      if (proprio && !noRepo) throw new Error(`${id}/${state}: clipe atual por personagem ausente no repo`);
      if (!proprio && noRepo) throw new Error(`${id}/${state}: QA mediu o compartilhado, mas o repo tem clipe próprio`);
      const medido = proprio ? repo : path.join(ANIMS, 'mixamo', `${state}.glb`);
      if (!(await mesmoClipe(copiaAtual, medido))) throw new Error(`${id}/${state}: o clipe atual no repo não é o que o QA mediu`);
    }
    const publicado = novo || noRepo;
    estados.push([novo ? 1 : 0, publicado ? h12(publicado) : null, lado(a, fa), lado(n, fn)]);
    if (novo) {
      trocados++;
      pendentes.push([repo, novo]);
      if (LOCO.includes(state)) refs[state] = manifest.clips[state].speed;
    }
  }
  corpos[id] = { f: fontes, v: refs, e: estados };
}

const proveniencia = {
  atual: 'anim-conv legacy/<id>/qa-current.json (clipes do client, conferidos por dado contra o repo)',
  novo: 'anim-conv legacy-out/<id>/qa-uncompressed.json (os _baked/<estado>.glb publicados) + manifest.json',
  f: 'sha256[0..12] de [qa-current.json, qa-uncompressed.json, manifest.json]',
  v: 'velocidade natural (m/s na escala do personagem) do manifest, só nos estados de locomoção substituídos',
  e: 'um registro por estado, na ordem de `estados`: [1 substitui | 0 mantém, sha256[0..12] do arquivo publicado (null = clipe compartilhado), atual [piso cm, {check: valor}?], novo [idem]]; `~` lista os stretch [rig], que não contam',
};
const limites = readJSON(path.join(NEW_ROOT, bodies[0].id, 'qa-uncompressed.json')).thresholds;
// Uma linha por corpo: diff legível e arquivo compacto (< 60 KB).
const linhas = Object.entries(corpos).map(([id, c]) => `    ${JSON.stringify(id)}: ${JSON.stringify(c)}`);
const evidencia = `{\n  "schema": "csbrasil/baked-body-states@2",\n  "proveniencia": ${JSON.stringify(proveniencia)},\n`
  + `  "legenda": ${JSON.stringify(LEGENDA)},\n  "limites": ${JSON.stringify(limites)},\n  "estados": ${JSON.stringify(STATES)},\n`
  + `  "corpos": {\n${linhas.join(',\n')}\n  }\n}\n`;
if (CHECK) {
  const atual = fs.existsSync(ALVO) ? fs.readFileSync(ALVO, 'utf8') : '';
  if (atual !== evidencia) { console.error(`ESTADOS-ASSADOS --check: ${ALVO} diverge da regeneração a partir do QA Studio`); process.exit(1); }
  console.log(`ESTADOS-ASSADOS --check ✓ evidência reproduzida: ${trocados}/${bodies.length * STATES.length} estados substituídos`);
  process.exit(0);
}
pendentes.push([ALVO, Buffer.from(evidencia)]);
promote();
console.log(`ESTADOS-ASSADOS: ${trocados}/${bodies.length * STATES.length} estados substituídos; evidência ${Buffer.byteLength(evidencia)} bytes`);
