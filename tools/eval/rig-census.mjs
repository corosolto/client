#!/usr/bin/env node
/* ============================================================================
   rig-census.mjs — CENSO DE DEFORMAÇÃO DE SKIN: NENHUM GLB DE PERSONAGEM
   OU SKIN PODE PIORAR, E O CONCERTADO FICA TRAVADO
   ----------------------------------------------------------------------------
   O PROGRAMA (rig 2026-11-09): conversão dos clipes Mixamo/Quaternius para o
   esqueleto meshy-28 e reparo de pesos no Studio. O `eval:pesos-braco-perna`
   (PR #1265) cobre só o vazamento braço→perna; nada cobria alongamento de
   corpo inteiro das SKINS (26 GLBs fora do `eval:select`, que só sobe os
   corpos do roster antigo). Um reparo de pesos pode regredir outro pedaço do
   corpo e nenhuma régua acendia.

   O QUE MEDE: para TODO GLB de `public/models/characters/` e TODO GLB do
   manifesto `public/models/skins/manifest.json`, skinna a malha na CPU (a
   mesma matemática do three.js SkinnedMesh) em 5 poses sintéticas (braços
   90°, braços à frente 60°, passo L/R, cabeça 60°) e nos clipes que o jogo
   roda no personagem — corpo: `models/anims/<id>.glb` mesclado, com os
   estados ausentes e quem não tem mesclado (cuca, gilbomes) caindo no pack
   compartilhado `models/anims/mixamo/`, como faz o glbchars.js; skin: os
   clipes EMBUTIDOS no próprio GLB — em 8 instantes de cada clipe. Métricas
   por pose: alongamento máximo de aresta (bind→posta), região das costas,
   mãos L/R e abertura de costura.

   PROCEDÊNCIA DO PORTE: a matemática de skinning/medição é porte de
   `tools/lib/character-rig.mjs` + `tools/characters/rig-pose-test.mjs` do
   Studio (repo irmão privado do mesmo dono; PR #4, branch
   feat/blender-character-rig-20261109; sem arquivo de licença próprio —
   porte autorizado pelo dono no programa rig 2026-11-09, com atribuição).
   Os tetos ESTRITOS (corpo/costas 3,5× · mãos 2,5× · costura 5 mm · bind
   2 mm) são os POSE_THRESHOLDS do Studio (tools/lib/character-rig.mjs):
   mesmo limiar pra quem mede a mesma coisa. O de mãos acompanha o RM1 (2,5×).

   OS TETOS (tools/eval/rig-census-tetos.json): congelamento do valor MEDIDO
   por GLB, chaveado por id com o sha256 do arquivo travado dentro.
     · sha bate    → medido ≤ teto × 1,05 (ruído de float, só aqui) E
                     teto ≤ medido × 1,05: o teto é cravado nos bytes, subir
                     número no arquivo sem trocar o GLB reprova.
     · sha difere  → GLB trocou: tem que passar nos tetos ESTRITOS (o id
                     legado que já passava deles usa o próprio teto) e não
                     pode piorar nenhum teto do id (reparo travado — só desce).
     · sem teto    → GLB novo: só os tetos ESTRITOS; ganhar entrada no
                     arquivo de tetos é proibido (diff contra a cópia da
                     origin/main via `git show`, quando disponível — no
                     checkout raso do CI ela não existe e o travamento por
                     sha + estrito continuam valendo).
     · no diff vs origin/main: valor que sobe, id novo no arquivo e id
                     removido com GLB ainda presente → tudo reprova.

   MUTAÇÕES (`--mutacoes`; fixture gerada em tmp, nunca commitada; cada
   mutação TEM que aplicar e a régua TEM que acender):
     teto-subiu                teto congelado sobe no arquivo → reprova
     glb-novo-sem-teto-frouxo  GLB novo sem teto acima do estrito → reprova
     pesos-trocados            peso da cabeça cai no vértice errado → reprova
     clipe-ignorado            sem medir clipes o fixture fica VERDE — prova
                               que a cobertura de clipes é o que reprova
     legado-reparado           id legado acima do estrito troca de bytes sem
                               piorar → verde; piorando o teto do id → reprova

   USO: node tools/eval/rig-census.mjs            # o portão (CI + check:fast)
        node tools/eval/rig-census.mjs --regen    # congela/recongela os tetos
        node tools/eval/rig-census.mjs --mutacoes # testa a régua contra mutantes
   ============================================================================ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THREE } from './three-node.mjs';

// ============================================================================
// PORTE do Studio tools/lib/character-rig.mjs (matemática idêntica; nomes
// originais mantidos pra diffar contra a origem). Do topo até o marcador
// CENSO é código portado, não criação local.
// ============================================================================

const localMatrix = (trs) => new THREE.Matrix4().compose(new THREE.Vector3(...trs.t), new THREE.Quaternion(...trs.r), new THREE.Vector3(...trs.s));

function loadRig(doc) {
  const nodes = doc.getRoot().listNodes();
  const parent = new Map();
  for (const n of nodes) for (const c of n.listChildren()) parent.set(c, n);
  const skinned = nodes.find((n) => n.getSkin() && n.getMesh());
  if (!skinned) throw new Error('no skinned mesh');
  const skin = skinned.getSkin();
  const joints = skin.listJoints();
  const ibm = joints.map((_, i) => new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i, [])));
  const trs = new Map(nodes.map((n) => [n, { t: n.getTranslation(), r: n.getRotation(), s: n.getScale() }]));
  const byName = new Map();
  for (const n of nodes) { const list = byName.get(n.getName()) || []; list.push(n); byName.set(n.getName(), list); }
  const prims = skinned.getMesh().listPrimitives().map((p) => ({
    pos: p.getAttribute('POSITION').getArray(), J: p.getAttribute('JOINTS_0').getArray(),
    W: p.getAttribute('WEIGHTS_0').getArray(), idx: p.getIndices()?.getArray() || null,
    count: p.getAttribute('POSITION').getCount(),
  }));
  return { nodes, parent, skin, joints, names: joints.map((j) => j.getName()), ibm, trs, byName, prims };
}

function worldMatrices(rig, overrides = new Map()) {
  const cache = new Map();
  const world = (n) => {
    if (cache.has(n)) return cache.get(n);
    const m = localMatrix(overrides.get(n) || rig.trs.get(n));
    const p = rig.parent.get(n);
    const result = p ? new THREE.Matrix4().multiplyMatrices(world(p), m) : m;
    cache.set(n, result);
    return result;
  };
  return world;
}

function skinPositions(rig, overrides = new Map()) {
  const world = worldMatrices(rig, overrides);
  const mats = rig.joints.map((j, i) => new THREE.Matrix4().multiplyMatrices(world(j), rig.ibm[i]).elements);
  const acc = new Float64Array(16);
  return rig.prims.map((p) => {
    const out = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v += 1) {
      acc.fill(0);
      for (let k = 0; k < 4; k += 1) {
        const w = p.W[v * 4 + k];
        if (!w) continue;
        const e = mats[p.J[v * 4 + k]];
        for (let q = 0; q < 16; q += 1) acc[q] += e[q] * w;
      }
      const x = p.pos[v * 3], y = p.pos[v * 3 + 1], z = p.pos[v * 3 + 2];
      out[v * 3] = acc[0] * x + acc[4] * y + acc[8] * z + acc[12];
      out[v * 3 + 1] = acc[1] * x + acc[5] * y + acc[9] * z + acc[13];
      out[v * 3 + 2] = acc[2] * x + acc[6] * y + acc[10] * z + acc[14];
    }
    return out;
  });
}

const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const deg = (d) => (d * Math.PI) / 180;

// Poses sintéticas como rotações WORLD (glTF: +Y cima, +Z frente, esquerda +X),
// pai antes do filho. Exercisam cada região forte e independente de retarget.
const SYNTHETIC_POSES = Object.freeze([
  { name: 'arms-up-90', steps: [['LeftArm', 'z', 90], ['RightArm', 'z', -90]] },
  { name: 'arms-forward-60', steps: [['LeftArm', 'y', -60], ['RightArm', 'y', 60]] },
  { name: 'step-left', steps: [['LeftUpLeg', 'x', -45], ['LeftLeg', 'x', 60]] },
  { name: 'step-right', steps: [['RightUpLeg', 'x', -45], ['RightLeg', 'x', 60]] },
  { name: 'head-turn-60', steps: [['neck', 'y', 30], ['Head', 'y', 30]] },
]);

function syntheticOverrides(rig, pose) {
  const overrides = new Map();
  for (const [jointName, axis, degrees] of pose.steps) {
    for (const node of rig.byName.get(jointName) || []) {
      const world = worldMatrices(rig, overrides);
      const q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
      world(node).decompose(p, q, s);
      const qp = new THREE.Quaternion();
      const parentNode = rig.parent.get(node);
      if (parentNode) world(parentNode).decompose(new THREE.Vector3(), qp, new THREE.Vector3());
      const target = new THREE.Quaternion().setFromAxisAngle(AXIS[axis], deg(degrees)).multiply(q);
      const local = qp.clone().invert().multiply(target).normalize();
      overrides.set(node, { ...(overrides.get(node) || rig.trs.get(node)), r: local.toArray() });
    }
  }
  return overrides;
}

/** Amostradores de TODAS as animações do doc (nome → sampler); a origem mede
    só a primeira — aqui o censo precisa das nomeadas (mesclado do corpo tem as
    11; skin embute as dela). LINEAR/STEP/CUBICSPLINE como na origem. */
function clipSamplers(doc, fallbackName) {
  const out = new Map();
  for (const anim of doc.getRoot().listAnimations()) {
    const channels = [];
    for (const ch of anim.listChannels()) {
      const s = ch.getSampler(), target = ch.getTargetNode();
      if (!s || !target || ch.getTargetPath() === 'weights') continue;
      const n = ch.getTargetPath() === 'rotation' ? 4 : 3;
      channels.push({ name: target.getName(), path: ch.getTargetPath(), times: s.getInput().getArray(), values: s.getOutput().getArray(), n, cubic: s.getInterpolation() === 'CUBICSPLINE', step: s.getInterpolation() === 'STEP' });
    }
    if (!channels.length) continue;
    const duration = Math.max(0, ...channels.map((c) => c.times[c.times.length - 1]));
    const value = (c, t) => {
      const T = c.times; let i = 0;
      while (i < T.length - 2 && T[i + 1] <= t) i += 1;
      const f = T.length > 1 && !c.step ? Math.min(1, Math.max(0, (t - T[i]) / ((T[i + 1] - T[i]) || 1))) : 0;
      const at = (k) => { const base = c.cubic ? (k * 3 + 1) * c.n : k * c.n; return Array.from(c.values.slice(base, base + c.n)); };
      const a = at(i), b = at(Math.min(i + 1, T.length - 1));
      if (c.n === 4) return new THREE.Quaternion().fromArray(a).slerp(new THREE.Quaternion().fromArray(b), f).toArray();
      return a.map((x, k) => x + (b[k] - x) * f);
    };
    out.set(anim.getName() || fallbackName || `(anim ${out.size})`, { duration, pose: (t) => channels.map((c) => ({ name: c.name, path: c.path, value: value(c, t) })) });
  }
  return out;
}

function clipOverrides(rig, sampler, t) {
  const overrides = new Map();
  for (const { name, path, value } of sampler.pose(t)) {
    for (const node of rig.byName.get(name) || []) {
      const base = overrides.get(node) || { ...rig.trs.get(node) };
      overrides.set(node, { ...base, [path === 'translation' ? 't' : path === 'rotation' ? 'r' : 's']: value });
    }
  }
  return overrides;
}

const MIN_EDGE = 5e-4; // arestas < 0,5 mm são ignoradas (razão de lasca é ruído)

/** Pré-computa arestas, regiões e grupos de costura a partir da pose bind. */
function measureSetup(rig) {
  const bind = skinPositions(rig);
  let bindError = 0;
  rig.prims.forEach((p, pi) => { for (let k = 0; k < p.pos.length; k += 1) bindError = Math.max(bindError, Math.abs(bind[pi][k] - p.pos[k])); });
  const world = worldMatrices(rig);
  const jointPos = (name) => { const n = rig.byName.get(name)?.[0]; return n ? new THREE.Vector3().setFromMatrixPosition(world(n)) : null; };
  const hips = jointPos('Hips'), neck = jointPos('neck'), spine01 = jointPos('Spine01'), lArm = jointPos('LeftArm'), rArm = jointPos('RightArm');
  const halfWidth = Math.max(Math.abs(lArm?.x ?? 0.2), Math.abs(rArm?.x ?? 0.2)) + 0.02;
  const handIdx = { L: new Set(), R: new Set() };
  rig.names.forEach((n, i) => { if (n === 'LeftHand' || n === 'Curl_L') handIdx.L.add(i); if (n === 'RightHand' || n === 'Curl_R') handIdx.R.add(i); });
  const prims = rig.prims.map((p, pi) => {
    const s = bind[pi];
    const idx = p.idx || Uint32Array.from({ length: p.count }, (_, i) => i);
    const seen = new Set();
    const edges = [];
    for (let t = 0; t + 2 < idx.length; t += 3) {
      for (const [a, b] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) {
        const key = a < b ? a * 4294967296 + b : b * 4294967296 + a;
        if (seen.has(key)) continue;
        seen.add(key);
        const L = Math.hypot(s[a * 3] - s[b * 3], s[a * 3 + 1] - s[b * 3 + 1], s[a * 3 + 2] - s[b * 3 + 2]);
        if (L > MIN_EDGE) edges.push([a, b, L]);
      }
    }
    const handWeight = (side, v) => { let w = 0; for (let k = 0; k < 4; k += 1) if (handIdx[side].has(p.J[v * 4 + k])) w += p.W[v * 4 + k]; return w; };
    const isBack = (v) => hips && neck && spine01 && s[v * 3 + 1] > hips.y && s[v * 3 + 1] < neck.y && s[v * 3 + 2] < spine01.z - 0.02 && Math.abs(s[v * 3]) < halfWidth;
    const regions = { back: [], handL: [], handR: [] };
    edges.forEach((e, ei) => {
      if (isBack(e[0]) && isBack(e[1])) regions.back.push(ei);
      if (handWeight('L', e[0]) >= 0.25 || handWeight('L', e[1]) >= 0.25) regions.handL.push(ei);
      if (handWeight('R', e[0]) >= 0.25 || handWeight('R', e[1]) >= 0.25) regions.handR.push(ei);
    });
    const groups = new Map();
    for (let v = 0; v < p.count; v += 1) {
      const key = `${Math.round(s[v * 3] * 1e5)},${Math.round(s[v * 3 + 1] * 1e5)},${Math.round(s[v * 3 + 2] * 1e5)}`;
      const list = groups.get(key); if (list) list.push(v); else groups.set(key, [v]);
    }
    const seams = [...groups.values()].filter((g) => g.length > 1);
    return { edges, regions, seams, bind: s };
  });
  return {
    bind, bindError, prims,
    hasBack: prims.some((p) => p.regions.back.length),
    hasHands: { L: prims.some((p) => p.regions.handL.length), R: prims.some((p) => p.regions.handR.length) },
  };
}

/** Métricas de alongamento de UM estado posado contra o bind. Diferença
    documentada da origem: sem os 10 piores vértices — o portão precisa do
    número e de qual pose estourou (o relatório por vértice fica no Studio). */
function measurePose(rig, setup, posed) {
  let maxEdge = 1, back = 1, handL = 1, handR = 1, seamGap = 0;
  setup.prims.forEach((sp, pi) => {
    const s = posed[pi];
    const ratios = new Float64Array(sp.edges.length);
    sp.edges.forEach(([a, b, L], ei) => {
      const ratio = Math.hypot(s[a * 3] - s[b * 3], s[a * 3 + 1] - s[b * 3 + 1], s[a * 3 + 2] - s[b * 3 + 2]) / L;
      ratios[ei] = ratio;
      if (ratio > maxEdge) maxEdge = ratio;
    });
    for (const ei of sp.regions.back) back = Math.max(back, ratios[ei]);
    for (const ei of sp.regions.handL) handL = Math.max(handL, ratios[ei]);
    for (const ei of sp.regions.handR) handR = Math.max(handR, ratios[ei]);
    for (const group of sp.seams) {
      const [a] = group;
      for (const b of group.slice(1)) seamGap = Math.max(seamGap, Math.hypot(s[a * 3] - s[b * 3], s[a * 3 + 1] - s[b * 3 + 1], s[a * 3 + 2] - s[b * 3 + 2]));
    }
  });
  return {
    maxEdge: +maxEdge.toFixed(3), backMaxEdge: setup.hasBack ? +back.toFixed(3) : null,
    handMaxEdge: { L: setup.hasHands.L ? +handL.toFixed(3) : null, R: setup.hasHands.R ? +handR.toFixed(3) : null },
    seamGapMax: +seamGap.toFixed(5),
  };
}

// ============================================================================
// CENSO: enumeração, medição, tetos e o portão. Daqui pra baixo é código
// local do client.
// ============================================================================

const CLIP_STATES = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire'];
const CLIP_SAMPLES = 8;
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/** Tetos estritos (GLB novo ou sha trocado): POSE_THRESHOLDS do Studio, menos o
    bind de 2 mm — os GLB Mint legados têm bindError de até 0,166 m medido no
    congelamento (curupira-cyborg); o teto de 2 mm é do pipeline do Studio pra
    rigs que ELE monta. Aqui o bindErro é congelado e travado por ratchet, não
    estrito. */
const ESTRITO = Object.freeze({
  maxEdge: 3.5, backMaxEdge: 3.5, handMaxEdge: 2.5, seamGapMax: 0.005,
});
const TOLERANCIA_RUIDO = 1.05; // só entre os mesmos bytes: ruído de float entre máquinas
const ARQ_TETOS = join(ROOT, 'tools/eval/rig-census-tetos.json');
const CHAVES_METRICAS = ['maxEdge', 'backMaxEdge', 'maoL', 'maoR', 'seamGapMax'];
const ROTULO_METRICA = { maxEdge: 'corpo', backMaxEdge: 'costas', maoL: 'mão L', maoR: 'mão R', seamGapMax: 'costura' };
const ROTULO_GRUPO = { sinteticas: 'poses sintéticas', clips: 'clipes' };

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Amostrador de UM estado do pack compartilhado (mixamo), com cache. */
const packCompartilhado = new Map();
async function samplerCompartilhado(estado) {
  if (!packCompartilhado.has(estado)) {
    const f = join(ROOT, `public/models/anims/mixamo/${estado}.glb`);
    if (!existsSync(f)) throw new Error(`censo não sabe medir: falta o clipe compartilhado ${f}`);
    const sams = clipSamplers(await io.read(f), estado);
    packCompartilhado.set(estado, sams.get(estado) ?? [...sams.values()][0]);
  }
  return packCompartilhado.get(estado);
}

/** Enumera corpos + skins com os clipes que o jogo roda em cada. */
async function enumeraCenso() {
  const itens = [];
  const animIdx = JSON.parse(readFileSync(join(ROOT, 'public/models/anims/index.json'), 'utf8')).clipes ?? {};
  for (const f of readdirSync(join(ROOT, 'public/models/characters'))) {
    if (!f.endsWith('.glb')) continue;
    const id = f.replace(/\.glb$/, '');
    // Mesma resolução do glbchars.js: mesclado → por-estado → compartilhado;
    // quem não está no índice (cuca, gilbomes) nem tenta mesclado.
    const disp = animIdx[id] ?? [];
    let mesclado = null;
    if (disp.length) {
      const fMesclado = join(ROOT, `public/models/anims/${id}.glb`);
      if (existsSync(fMesclado)) mesclado = clipSamplers(await io.read(fMesclado), id);
    }
    const clipes = new Map();
    for (const estado of CLIP_STATES) {
      if (disp.length && !disp.includes(estado)) { clipes.set(estado, await samplerCompartilhado(estado)); continue; }
      const noMesclado = mesclado?.get(estado);
      if (noMesclado) { clipes.set(estado, noMesclado); continue; }
      const fEstado = join(ROOT, `public/models/anims/${id}/${estado}.glb`);
      if (existsSync(fEstado)) {
        const sams = clipSamplers(await io.read(fEstado), estado);
        clipes.set(estado, sams.get(estado) ?? [...sams.values()][0]);
      } else clipes.set(estado, await samplerCompartilhado(estado));
    }
    itens.push({ id, tipo: 'corpo', caminho: `public/models/characters/${f}`, clipes });
  }
  const manifestoSkins = JSON.parse(readFileSync(join(ROOT, 'public/models/skins/manifest.json'), 'utf8')).skins ?? {};
  for (const [id, def] of Object.entries(manifestoSkins)) {
    // clipes embutidos: lidos junto com o modelo em medeItem
    itens.push({ id, tipo: 'skin', caminho: `public${def.model}`, clipes: null });
  }
  return itens;
}

/** Agregação por métrica: valor máximo + rótulo (pose ou clipe@instante). */
function agrupa(poses) {
  const destino = {};
  const considera = (chave, valor, rotulo) => {
    if (valor == null) return;
    if (!destino[chave] || valor > destino[chave].valor) destino[chave] = { valor, rotulo };
  };
  for (const p of poses) {
    const rotulo = p.time != null ? `${p.nome}@${p.time}s` : p.nome;
    for (const chave of ['maxEdge', 'backMaxEdge', 'seamGapMax']) considera(chave, p.metricas[chave], rotulo);
    considera('maoL', p.metricas.handMaxEdge?.L, rotulo);
    considera('maoR', p.metricas.handMaxEdge?.R, rotulo);
  }
  return destino;
}

/** Mede um item: 5 poses sintéticas + clipes em 8 instantes + erro de bind. */
function medeRig(rig, { amostradores }) {
  const setup = measureSetup(rig);
  const sinteticas = SYNTHETIC_POSES.map((pose) => ({
    nome: pose.name, time: null, metricas: measurePose(rig, setup, skinPositions(rig, syntheticOverrides(rig, pose))),
  }));
  const posesDeClipe = [];
  for (const [nome, sampler] of amostradores) {
    for (let k = 0; k < CLIP_SAMPLES; k += 1) {
      const time = +(sampler.duration * (k / (CLIP_SAMPLES - 1))).toFixed(4);
      posesDeClipe.push({ nome, time, metricas: measurePose(rig, setup, skinPositions(rig, clipOverrides(rig, sampler, time))) });
    }
  }
  return { sinteticas: agrupa(sinteticas), clips: agrupa(posesDeClipe), bindErro: +setup.bindError.toFixed(5) };
}

async function medeItem(item) {
  try {
    const doc = await io.read(join(ROOT, item.caminho));
    const rig = loadRig(doc);
    let amostradores = item.clipes;
    if (item.tipo === 'skin') {
      amostradores = clipSamplers(doc, item.id);
      if (!amostradores.size) throw new Error('skin sem clipes embutidos — o censo não sabe o que o jogo toca nela');
    }
    return { metricas: medeRig(rig, { amostradores }) };
  } catch (e) {
    throw new Error(`${item.id}: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Tetos.
// ---------------------------------------------------------------------------

function carregaTetos() {
  if (!existsSync(ARQ_TETOS)) throw new Error(`falta ${ARQ_TETOS} — rode \`node tools/eval/rig-census.mjs --regen\` e commite o congelamento`);
  return JSON.parse(readFileSync(ARQ_TETOS, 'utf8'));
}

/** Verifica UM GLB medido contra os tetos. Devolve as falhas (vazio = verde). */
function verificaItem(item, medido, tetos) {
  const falhas = [];
  const teto = tetos.tetos?.[item.id];
  const descreve = (grupo, chave, valor, porque) => {
    const rotulo = medido.metricas[grupo][chave]?.rotulo ?? '?';
    falhas.push(`${item.id} (${item.tipo}, ${item.caminho}): ${ROTULO_GRUPO[grupo]} ${ROTULO_METRICA[chave]} ${valor} em “${rotulo}” ${porque}`);
  };
  // Com teto congelado acima do estrito (legado), o limite do id é o próprio teto.
  const checaEstrito = (grupo, tetoId = null) => {
    for (const chave of ['maxEdge', 'backMaxEdge', 'maoL', 'maoR']) {
      const m = medido.metricas[grupo]?.[chave];
      if (m?.valor == null) continue;
      const global = chave.startsWith('mao') ? ESTRITO.handMaxEdge : chave === 'backMaxEdge' ? ESTRITO.backMaxEdge : ESTRITO.maxEdge;
      const congelado = tetoId?.metricas?.[grupo]?.[chave];
      const limite = congelado != null ? Math.max(congelado, global) : global;
      if (m.valor > limite) descreve(grupo, chave, `${m.valor}×`, limite > global ? `> teto legado do id ${limite}×` : `> teto estrito ${limite}×`);
    }
    const seam = medido.metricas[grupo]?.seamGapMax;
    const seamCongelado = tetoId?.metricas?.[grupo]?.seamGapMax;
    const seamLimite = seamCongelado != null ? Math.max(seamCongelado, ESTRITO.seamGapMax) : ESTRITO.seamGapMax;
    if (seam?.valor != null && seam.valor > seamLimite) {
      falhas.push(`${item.id}: ${ROTULO_GRUPO[grupo]} costura abre ${seam.valor} m em “${seam.rotulo}” > ${seamLimite} m`);
    }
  };

  if (!teto) {
    checaEstrito('sinteticas'); checaEstrito('clips');
    if (falhas.length) falhas.push(`  ↳ GLB novo sem teto: tem que passar nos tetos estritos (${ESTRITO.maxEdge}× corpo/costas, ${ESTRITO.handMaxEdge}× mãos, ${ESTRITO.seamGapMax} m costura); ganhar entrada em rig-census-tetos.json é proibido`);
    return falhas;
  }
  if (teto.sha256 === item.sha) {
    // Teto cravado nos bytes: medido ≤ teto×1,05 E teto ≤ medido×1,05.
    for (const grupo of ['sinteticas', 'clips']) for (const chave of CHAVES_METRICAS) {
      const m = medido.metricas[grupo]?.[chave], t = teto.metricas?.[grupo]?.[chave];
      if (m?.valor == null || t == null) continue;
      if (m.valor > t * TOLERANCIA_RUIDO) descreve(grupo, chave, `${m.valor}×`, `> teto congelado ${t}× (sha confere) — o GLB piorou ou o teto está velho; melhoria real se congela com --regen`);
      else if (t > m.valor * TOLERANCIA_RUIDO) descreve(grupo, chave, `${m.valor}×`, `mas o teto diz ${t}× — teto cravado nos bytes: subir número no arquivo não trava em nada`);
    }
    const be = medido.metricas.bindErro, tb = teto.metricas?.bindErro;
    if (tb != null && be > tb * TOLERANCIA_RUIDO + 1e-4) falhas.push(`${item.id}: erro de bind ${be} m > congelado ${tb} m (sha confere) — IBM/skin piorou`);
    return falhas;
  }
  // sha diferente = GLB trocado: estrito (ou o teto legado do id, se já passava
  // do estrito) E não pode piorar o teto do id (só desce).
  checaEstrito('sinteticas', teto); checaEstrito('clips', teto);
  for (const grupo of ['sinteticas', 'clips']) for (const chave of CHAVES_METRICAS) {
    const m = medido.metricas[grupo]?.[chave], t = teto.metricas?.[grupo]?.[chave];
    if (m?.valor == null || t == null) continue;
    if (m.valor > t * TOLERANCIA_RUIDO) descreve(grupo, chave, `${m.valor}×`, `> teto do id ${t}× — GLB trocou de sha (${teto.sha256.slice(0, 8)}→${item.sha.slice(0, 8)}) e piorou; teto só desce (--regen só se TODA métrica melhorou)`);
  }
  const be = medido.metricas.bindErro, tb = teto.metricas?.bindErro;
  if (tb != null && be > tb * TOLERANCIA_RUIDO + 1e-4) falhas.push(`${item.id}: erro de bind ${be} m > teto do id ${tb} m — GLB trocou de sha e o bind piorou; teto só desce`);
  return falhas;
}

/** Diff dos tetos contra outra cópia (origin/main quando existir): só desce,
    id novo não entra, id com GLB presente não sai. */
function diffTetos(de, para, idsPresentes) {
  const falhas = [];
  const d = de?.tetos ?? {}, p = para?.tetos ?? {};
  for (const [id, entrada] of Object.entries(p)) {
    const antiga = d[id];
    if (!antiga) { falhas.push(`tetos: id novo "${id}" no arquivo — GLB novo não ganha teto, tem que passar no estrito`); continue; }
    for (const grupo of ['sinteticas', 'clips']) for (const chave of CHAVES_METRICAS) {
      const novo = entrada.metricas?.[grupo]?.[chave], velho = antiga.metricas?.[grupo]?.[chave];
      if (novo == null || velho == null) continue;
      if (novo > velho) falhas.push(`tetos: ${id} ${ROTULO_GRUPO[grupo]} ${ROTULO_METRICA[chave]} SUBIU ${velho}→${novo} — teto só desce`);
    }
    const nb = entrada.metricas?.bindErro, vb = antiga.metricas?.bindErro;
    if (nb != null && vb != null && nb > vb + 1e-4) falhas.push(`tetos: ${id} erro de bind SUBIU ${vb}→${nb} — teto só desce`);
  }
  for (const id of Object.keys(d)) {
    if (!(id in p) && idsPresentes.has(id)) falhas.push(`tetos: entrada "${id}" removida com o GLB ainda presente — remover teto afrouxa o travamento do id`);
  }
  return falhas;
}

/** Lê a cópia dos tetos da origin/main (checkout raso do CI não tem: a nota
    avisa e o travamento por sha + estrito segue valendo). */
function tetosDaOrigin() {
  const rel = ARQ_TETOS.replace(`${ROOT}/`, '');
  for (const ref of ['origin/main', 'origin/HEAD']) {
    try {
      return { tetos: JSON.parse(execSync(`git show ${ref}:${JSON.stringify(rel)}`, { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })) };
    } catch { /* ref ou arquivo ausente neste checkout */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Portão principal.
// ---------------------------------------------------------------------------

async function rodaCenso() {
  const t0 = performance.now();
  const itens = await enumeraCenso();
  const tetos = existsSync(ARQ_TETOS) ? carregaTetos() : { tetos: {} };
  const falhas = [];
  let sobreEstrito = 0;
  for (const item of itens) {
    item.sha = sha256(readFileSync(join(ROOT, item.caminho)));
    let medido;
    try { medido = await medeItem(item); } catch (e) { falhas.push(e.message); continue; }
    falhas.push(...verificaItem(item, medido, tetos));
    const piorao = Math.max(medido.metricas.sinteticas.maxEdge?.valor ?? 1, medido.metricas.clips.maxEdge?.valor ?? 1);
    if (piorao > ESTRITO.maxEdge) sobreEstrito += 1;
  }
  const origin = tetosDaOrigin();
  if (!origin) console.log('  nota: sem cópia dos tetos na origin/main (checkout raso do CI?) — sha + estrito seguem valendo; o diff de tetos roda onde há fetch completo (local/pre-push).');
  else falhas.push(...diffTetos(origin, tetos, new Set(itens.map((i) => i.id))));
  return { itens, falhas, sobreEstrito, durou: ((performance.now() - t0) / 1000).toFixed(1) };
}

// ---------------------------------------------------------------------------
// --regen: congela os valores medidos. O diff contra a origin/main na corrida
// seguinte é o que impede o arquivo de subir.
// ---------------------------------------------------------------------------

async function regen() {
  const itens = await enumeraCenso();
  const tetos = {};
  for (const item of itens) {
    item.sha = sha256(readFileSync(join(ROOT, item.caminho)));
    const { metricas } = await medeItem(item);
    const compacta = (grupo) => Object.fromEntries(CHAVES_METRICAS.map((chave) => [chave, metricas[grupo][chave]?.valor ?? null]));
    tetos[item.id] = { tipo: item.tipo, sha256: item.sha, metricas: { sinteticas: compacta('sinteticas'), clips: compacta('clips'), bindErro: metricas.bindErro ?? null } };
  }
  const saida = {
    '//': 'Congelamento do censo de rig (tools/eval/rig-census.mjs --regen). Chave = id do GLB; sha256 trava em QUAIS bytes o teto foi medido. Regras: sha confere → medido <= teto*1.05 e teto <= medido*1.05; sha difere → tetos estritos E teto do id (só desce); GLB novo (id ausente) → só estritos, e entrar aqui é proibido. O diff contra a origin/main reprova valor que sobe, id novo e id removido com GLB presente. Não editar à mão: rode --regen.',
    versao: 1,
    toleranciaRuido: TOLERANCIA_RUIDO,
    tetos: Object.fromEntries(Object.keys(tetos).sort().map((id) => [id, tetos[id]])),
  };
  writeFileSync(ARQ_TETOS, `${JSON.stringify(saida, null, 2)}\n`);
  console.log(`congelados ${Object.keys(tetos).length} tetos em ${ARQ_TETOS}`);
}

// ---------------------------------------------------------------------------
// Fixture dos mutantes: esqueleto mínimo (Hips→…→Head + braços) e uma tira
// com dois vértices-gatilho — o do tronco (0.15,1.52,0) e o da cabeça
// (0.25,1.53,0) — cuja aresta (L≈0.1005) só estica quando a cabeça gira, com
// o vértice da cabeça a r≈0.25 do pivô (0,1.52,0): giro de 60° (pose
// sintética) → ~2.2×; giro de 180° (clipe) → ~4×. Gerada em tmp, nunca commitada.
// ---------------------------------------------------------------------------

async function montaFixtureBytes({ pesoTronco = [1, 0], pesoCabeca = [0.3, 0.7], giraClipe = 180 }) {
  const { Document } = await import('@gltf-transform/core');
  const doc = new Document();
  const buf = doc.createBuffer('bin');
  const juntas = [
    ['Hips', null, [0, 0.95, 0]], ['Spine', 'Hips', [0, 1.05, 0]], ['Spine01', 'Spine', [0, 1.15, 0]],
    ['neck', 'Spine01', [0, 1.42, 0]], ['Head', 'neck', [0, 1.52, 0]],
    ['LeftArm', 'Spine01', [-0.18, 1.3, 0]], ['RightArm', 'Spine01', [0.18, 1.3, 0]],
  ];
  const cena = doc.createScene('cena');
  const nos = new Map();
  for (const [nome, pai, t] of juntas) {
    const n = doc.createNode(nome).setTranslation(t);
    nos.set(nome, n);
    if (pai) nos.get(pai).addChild(n); else cena.addChild(n);
  }
  const pos = new Float32Array([0.15, 1.52, 0, 0.25, 1.53, 0, 0.15, 1.6, 0.05, 0.25, 1.45, 0.05]);
  const idx = [0, 1, 2, 0, 3, 1];
  const idxSpine01 = juntas.findIndex(([n]) => n === 'Spine01'), idxHead = juntas.findIndex(([n]) => n === 'Head');
  // Por vértice: [peso no Spine01, peso no Head] (soma 1). Vértices 2/3 de preenchimento presos ao tronco.
  const pesos = [pesoTronco, pesoCabeca, [1, 0], [1, 0]];
  const J = new Uint16Array(4 * 4), W = new Float32Array(4 * 4);
  pesos.forEach(([wS, wH], v) => {
    J[v * 4] = idxSpine01; J[v * 4 + 1] = idxHead;
    W[v * 4] = wS; W[v * 4 + 1] = wH;
  });
  const accPos = doc.createAccessor('pos').setType('VEC3').setArray(pos).setBuffer(buf);
  const accJ = doc.createAccessor('joints').setType('VEC4').setArray(J).setBuffer(buf);
  const accW = doc.createAccessor('weights').setType('VEC4').setArray(W).setBuffer(buf);
  const accIdx = doc.createAccessor('idx').setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute('POSITION', accPos).setAttribute('JOINTS_0', accJ).setAttribute('WEIGHTS_0', accW).setIndices(accIdx);
  const mesh = doc.createMesh('tira').addPrimitive(prim);
  // IBM exata da pose bind (rotações identidade): inverso da matriz mundo.
  const ibmArr = new Float32Array(juntas.length * 16);
  const localDe = (nome) => new THREE.Matrix4().makeTranslation(...nos.get(nome).getTranslation());
  juntas.forEach(([nome, pai], i) => {
    let world = localDe(nome);
    let p = pai;
    while (p) { world.premultiply(localDe(p)); p = juntas.find(([nm]) => nm === p)?.[1]; }
    ibmArr.set(world.clone().invert().elements, i * 16);
  });
  const accIbm = doc.createAccessor('ibm').setType('MAT4').setArray(ibmArr).setBuffer(buf);
  const skin = doc.createSkin('pele').setInverseBindMatrices(accIbm);
  for (const [nome] of juntas) skin.addJoint(nos.get(nome));
  cena.addChild(doc.createNode('malha').setMesh(mesh).setSkin(skin));
  // Clipe: gira a cabeça `giraClipe` graus em torno de Y ao longo de 1 s.
  const anim = doc.createAnimation('cabecada');
  const tempos = doc.createAccessor('t').setType('SCALAR').setArray(new Float32Array([0, 1])).setBuffer(buf);
  const quat = (g) => [0, Math.sin((g * Math.PI) / 360), 0, Math.cos((g * Math.PI) / 360)];
  const accRot = doc.createAccessor('rot').setType('VEC4').setArray(new Float32Array([...quat(0), ...quat(giraClipe)])).setBuffer(buf);
  const sampler = doc.createAnimationSampler().setInput(tempos).setOutput(accRot).setInterpolation('LINEAR');
  const canal = doc.createAnimationChannel().setTargetNode(nos.get('Head')).setTargetPath('rotation').setSampler(sampler);
  anim.addSampler(sampler); anim.addChannel(canal);
  return Buffer.from(await io.writeBinary(doc));
}

/** Mede um arquivo de fixture (fora do ROOT) no mesmo formato de medeItem. */
async function medeFixture(item) {
  const doc = await io.read(item.caminho);
  const amostradores = clipSamplers(doc, item.id);
  return { metricas: medeRig(loadRig(doc), { amostradores }) };
}

async function mutacoes() {
  const dir = mkdtempSync(join(tmpdir(), 'rig-census-mut-'));
  let cegas = 0;
  const morde = (cond, ok, ruim) => { if (cond) console.log(`  ✓ ${ok}`); else { console.error(`  ✗ ${ruim}`); cegas += 1; } };
  try {
    const grava = async (nome, bytes) => { const f = join(dir, nome); writeFileSync(f, bytes); return f; };
    const itemDe = (id, tipo, caminho) => ({ id, tipo, caminho, clipes: null });
    const comSha = async (item) => { item.sha = sha256(readFileSync(item.caminho)); return item; };
    const compacta = (metricas) => ({ sinteticas: Object.fromEntries(CHAVES_METRICAS.map((c) => [c, metricas.sinteticas[c]?.valor ?? null])), clips: Object.fromEntries(CHAVES_METRICAS.map((c) => [c, metricas.clips[c]?.valor ?? null])), bindErro: metricas.bindErro ?? null });
    const tetosDe = (id, item, metricas) => ({ tetos: { [id]: { tipo: item.tipo, sha256: item.sha, metricas: compacta(metricas) } } });

    console.log('mutante teto-subiu: teto congelado sobe no arquivo → tem que reprovar');
    {
      const f = await grava('bom.glb', await montaFixtureBytes({}));
      const item = await comSha(itemDe('fixture-b', 'corpo', f));
      const { metricas } = await medeFixture(item);
      const honestos = tetosDe('fixture-b', item, metricas);
      const subiu = JSON.parse(JSON.stringify(honestos));
      const antes = subiu.tetos['fixture-b'].metricas.clips.maxEdge;
      subiu.tetos['fixture-b'].metricas.clips.maxEdge = +(antes * 1.2).toFixed(3);
      morde(antes !== subiu.tetos['fixture-b'].metricas.clips.maxEdge, `mutação aplicou (clips.maxEdge ${antes}→${subiu.tetos['fixture-b'].metricas.clips.maxEdge})`, 'MUTAÇÃO NÃO APLICOU (valor não mudou)');
      const diff = diffTetos(honestos, subiu, new Set(['fixture-b']));
      morde(diff.some((x) => x.includes('SUBIU')), `diff de tetos reprova a subida (${diff.find((x) => x.includes('SUBIU'))})`, 'diff de tetos DEIXOU SUBIR teto congelado');
      const cravado = verificaItem(item, { metricas }, subiu);
      morde(cravado.length > 0, 'teto cravado nos bytes reprova o número inflado com sha batendo', 'teto inflado com sha batendo PASSOU — o arquivo não está cravado nos bytes');
      morde(verificaItem(item, { metricas }, honestos).length === 0, 'controle: teto honesto fica verde', 'controle verde falhou');
    }

    console.log('mutante glb-novo-sem-teto-frouxo: GLB novo, sem teto, deformando acima do estrito');
    {
      const f = await grava('frouxo.glb', await montaFixtureBytes({ pesoCabeca: [0, 1] })); // vértice da cabeça 100% no Head
      const item = await comSha(itemDe('fixture-novo', 'corpo', f));
      const { metricas } = await medeFixture(item);
      const r = verificaItem(item, { metricas }, { tetos: {} });
      morde(r.length > 0, `reprovou no estrito (${r[0]})`, 'GLB novo acima do estrito PASSOU sem teto');
    }

    console.log('mutante pesos-trocados: peso da cabeça cai no vértice errado → estrito + teto do id');
    {
      const bom = await montaFixtureBytes({});
      const trocado = await montaFixtureBytes({ pesoTronco: [0, 1], pesoCabeca: [1, 0] }); // vértice do tronco 100% no Head, o da cabeça preso ao Spine01
      morde(!bom.equals(trocado), 'mutação aplicou (bytes do GLB mudaram)', 'MUTAÇÃO NÃO APLICOU (GLBs idênticos)');
      const fBom = await grava('pt-bom.glb', bom);
      const item = await comSha(itemDe('fixture-pt', 'corpo', fBom));
      const { metricas } = await medeFixture(item);
      const tetos = tetosDe('fixture-pt', item, metricas);
      morde(verificaItem(item, { metricas }, tetos).length === 0, 'antes da troca: verde', 'controle verde falhou na troca de pesos');
      const fTroca = await grava('pt-trocado.glb', trocado);
      const itemTroca = await comSha(itemDe('fixture-pt', 'corpo', fTroca), trocado);
      const r = verificaItem(itemTroca, { metricas: (await medeFixture(itemTroca)).metricas }, tetos);
      morde(r.length > 0, `reprovou (${r[0]})`, 'pesos trocados PASSARAM — a régua não sente os pesos');
    }

    console.log('mutante clipe-ignorado: sem medir os clipes, o fixture fica VERDE (prova que clipes contam)');
    {
      const f = await grava('clipe.glb', await montaFixtureBytes({ pesoCabeca: [0, 1], giraClipe: 180 }));
      const item = await comSha(itemDe('fixture-cli', 'skin', f));
      const { metricas } = await medeFixture(item);
      const sint = metricas.sinteticas.maxEdge?.valor ?? 0, clip = metricas.clips.maxEdge?.valor ?? 0;
      // Sem teto: o estrito é o que vale, e o estouro deste fixture SÓ existe
      // nos clipes (sintéticas ≤ 3,5×; clipe de 180° > 3,5×).
      morde(sint <= ESTRITO.maxEdge && clip > ESTRITO.maxEdge,
        `o estouro mora nos clipes (clips ${clip}× > estrito; sintéticas ${sint}× ≤ estrito)`,
        'fixture não separa clipes de sintéticas — mutante não prova nada');
      const comClipes = verificaItem(item, { metricas }, { tetos: {} });
      morde(comClipes.some((x) => x.includes('estrito')), `com clipes medidos reprova no estrito (${comClipes[0]})`, 'com clipes medidos NÃO reprovou — nem o estrito sente os clipes');
      const cego = JSON.parse(JSON.stringify({ metricas }));
      cego.metricas.clips = {};
      morde(verificaItem(item, cego, { tetos: {} }).length === 0, 'régua cega (clipes apagados) ficaria VERDE — a cobertura de clipes é o que reprova', 'sem clipes a régua CONTINUOU reprovando — o fixture não exercita a cobertura');
    }

    console.log('mutante legado-reparado: id congelado acima do estrito troca de bytes sem piorar → verde; piorando → reprova');
    {
      const legado = await montaFixtureBytes({ pesoCabeca: [0, 1] });
      const reparado = await montaFixtureBytes({ pesoCabeca: [0.2, 0.8] });
      morde(!legado.equals(reparado), 'mutação aplicou (bytes do GLB mudaram)', 'MUTAÇÃO NÃO APLICOU (GLBs idênticos)');
      const itemLegado = await comSha(itemDe('fixture-leg', 'corpo', await grava('leg.glb', legado)));
      const medLegado = (await medeFixture(itemLegado)).metricas;
      const tetos = tetosDe('fixture-leg', itemLegado, medLegado);
      const itemRep = await comSha(itemDe('fixture-leg', 'corpo', await grava('leg-rep.glb', reparado)));
      const medRep = (await medeFixture(itemRep)).metricas;
      const antes = medLegado.clips.maxEdge?.valor, depois = medRep.clips.maxEdge?.valor;
      morde(antes > depois && depois > ESTRITO.maxEdge,
        `reparo baixa sem sair do legado (clips ${antes}× → ${depois}× > estrito ${ESTRITO.maxEdge}×)`,
        'fixture não exercita legado acima do estrito — mutante não prova nada');
      const r = verificaItem(itemRep, { metricas: medRep }, tetos);
      morde(r.length === 0, 'reparo que não piora passa no teto legado do id', `reparo que não piora REPROVOU (${r[0]})`);
      const tetosRep = tetosDe('fixture-leg', itemRep, medRep);
      const piora = verificaItem(itemLegado, { metricas: medLegado }, tetosRep);
      morde(piora.length > 0, `troca que piora reprova (${piora[0]})`, 'troca que piora o teto do id PASSOU');
    }

    if (cegas) { console.error(`mutações: ${cegas} régua(s) cega(s)/frouxa(s)`); process.exitCode = 1; }
    else console.log('mutações: as 5 morderam (teto-subiu, glb-novo-sem-teto-frouxo, pesos-trocados, clipe-ignorado, legado-reparado).');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
if (args.includes('--mutacoes')) await mutacoes();
else if (args.includes('--regen')) await regen();
else {
  const { falhas, sobreEstrito, durou, itens } = await rodaCenso();
  const corpos = itens.filter((i) => i.tipo === 'corpo').length, skins = itens.length - corpos;
  if (falhas.length) {
    console.error(`censo rig: ${falhas.length} problema(s) em ${corpos} corpos + ${skins} skins (${durou} s):`);
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`censo rig: ${corpos} corpos + ${skins} skins dentro dos tetos (${durou} s); ${sobreEstrito} acima do estrito ${ESTRITO.maxEdge}× segurados pelo congelamento — reparo que baixar o número recongela com --regen.`);
  }
}
