// Retarget already-baked Meshy-rig GLB clips -> a SPECIFIC character's Meshy rig, via
// WORLD-ROTATION DELTAS (same math as retarget-mixamo.mjs, but the SOURCE is a baked GLB
// clip instead of a Mixamo FBX — no FBX/LFS download needed).
//
// Why: the shared mixamo pack was baked against ONE reference rig. Meshy auto-rigs each
// character with slightly different bone lengths/rest, so the single clip distorts chars
// that diverge (doutora squats, dollynho bends). Re-baking per character fixes it.
//
// For every mapped bone + frame: desiredW = srcWorld ⊗ srcRestWorld⁻¹ ⊗ tgtRestWorld,
// tgtLocal = tgtParentWorld⁻¹ ⊗ desiredW. Hips translation keeps target rest XZ (in-place;
// bots move in code) and scales Y bob by the hips-height ratio.
//
// usage: node tools/retarget-glb.mjs <srcClipsDir> <targetChar.glb> <outDir> [states...]
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from '../public/vendor/three.module.js';

const [, , srcDir, tgtPath, outDir, ...stateArgs] = process.argv;
if (!srcDir || !tgtPath || !outDir) { console.error('usage: retarget-glb <srcClipsDir> <tgtChar.glb> <outDir> [states...]'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const STATES = stateArgs.length ? stateArgs : ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'walk1h', 'walkfire', 'idle1h'];
const FPS = 30;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// --- graph helpers (identical to retarget-mixamo) ---------------------------------
function buildGraph(doc) {
  const nodes = new Map();
  for (const n of doc.getRoot().listNodes()) {
    nodes.set(n.getName(), {
      n, name: n.getName(), parent: null, children: [],
      restP: new THREE.Vector3().fromArray(n.getTranslation()),
      restQ: new THREE.Quaternion().fromArray(n.getRotation()),
      restS: new THREE.Vector3().fromArray(n.getScale()),
    });
  }
  for (const g of nodes.values()) for (const c of g.n.listChildren()) {
    const cg = nodes.get(c.getName()); if (cg) { cg.parent = g; g.children.push(cg); }
  }
  return nodes;
}
function restWorldQ(g) {
  if (g._rq) return g._rq;
  g._rq = g.parent ? restWorldQ(g.parent).clone().multiply(g.restQ) : g.restQ.clone();
  return g._rq;
}
function worldPos(g) {
  const chain = []; for (let n = g; n; n = n.parent) chain.unshift(n);
  let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
  for (const n of chain) { pos.add(n.restP.clone().multiply(scl).applyQuaternion(quat)); quat.multiply(n.restQ); scl.multiply(n.restS); }
  return pos;
}
function parentInverse(g) {
  const chain = []; for (let n = g.parent; n; n = n.parent) chain.unshift(n);
  let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
  for (const n of chain) { pos.add(n.restP.clone().multiply(scl).applyQuaternion(quat)); quat.multiply(n.restQ); scl.multiply(n.restS); }
  return { pos, quat, scl };
}
// world quat of a source node given a map of animated LOCAL quats for this frame
function srcWorldQ(g, localById) {
  const chain = []; for (let n = g; n; n = n.parent) chain.unshift(n);
  let q = new THREE.Quaternion();
  for (const n of chain) q.multiply(localById.get(n.name) || n.restQ);
  return q;
}
function srcWorldPos(g, localById, posById) {
  const chain = []; for (let n = g; n; n = n.parent) chain.unshift(n);
  let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
  for (const n of chain) {
    const p = posById.get(n.name) || n.restP;
    pos.add(p.clone().multiply(scl).applyQuaternion(quat));
    quat.multiply(localById.get(n.name) || n.restQ);
    scl.multiply(n.restS);
  }
  return pos;
}
// sample a channel's output (VEC4 quat or VEC3) at time t by linear interpolation
function sampleAt(times, arr, stride, t) {
  const n = times.length; if (!n) return null;
  if (t <= times[0]) return arr.slice(0, stride);
  if (t >= times[n - 1]) return arr.slice((n - 1) * stride, n * stride);
  let i = 0; while (i < n - 1 && times[i + 1] < t) i++;
  const t0 = times[i], t1 = times[i + 1], f = (t - t0) / (t1 - t0 || 1);
  const a = arr.slice(i * stride, (i + 1) * stride), b = arr.slice((i + 1) * stride, (i + 2) * stride);
  if (stride === 4) { const qa = new THREE.Quaternion().fromArray(a), qb = new THREE.Quaternion().fromArray(b); qa.slerp(qb, f); return [qa.x, qa.y, qa.z, qa.w]; }
  return a.map((v, k) => v + (b[k] - v) * f);
}

// --- target skeleton --------------------------------------------------------------
const tgtDoc = await io.read(tgtPath);
const TG = buildGraph(tgtDoc);
const tgtOrder = [];
/* A RAIZ É A DO ESQUELETO, NÃO A PRIMEIRA DA LISTA.
   Bug que custou os 8 palhaços: `filter(x => !x.parent)[0]` pegava o PRIMEIRO nó sem pai.
   Nos 8 GLB de palhaço o glTF tem DUAS raízes — o nó da malha ("Spiked Ringmaster Clown",
   0 filhos) vem ANTES de "Armature" — então a varredura andava só pelo nó da malha,
   `mappedTgt` saía com 0 ossos e o tool gravava 11 clipes SEM UMA ÚNICA TRACK, dizendo
   "RETARGET-GLB COMPLETO". Nos 36 personagens de raiz única ("Armature" sozinha) o acaso
   acertava. Agora a raiz é o ancestral do `Hips`, que é o osso que define o esqueleto. */
const raizEsqueleto = (() => {
  const h = TG.get('Hips');
  if (h) { let n = h; while (n.parent) n = n.parent; return n; }
  return [...TG.values()].filter(x => !x.parent).sort((a, b) => b.children.length - a.children.length)[0];
})();
(function walk(g) { if (g) { tgtOrder.push(g); for (const c of g.children) walk(c); } })(raizEsqueleto);
const tgtNames = new Set(tgtOrder.map(g => g.name));
const hipsT = TG.get('Hips');
const tgtHipsRestW = hipsT ? worldPos(hipsT) : new THREE.Vector3();
const tgtHipsParentInv = hipsT ? parentInverse(hipsT) : null;

for (const state of STATES) {
  const srcPath = join(srcDir, `${state}.glb`);
  if (!existsSync(srcPath)) continue;
  const srcDoc = await io.read(srcPath);
  const SG = buildGraph(srcDoc);
  const anim = srcDoc.getRoot().listAnimations()[0];
  if (!anim) { console.warn('sem anim:', state); continue; }
  // gather per-node channels (rotation local quats + hips translation)
  const rotCh = new Map(), posCh = new Map(); let tmax = 0;
  for (const ch of anim.listChannels()) {
    const node = ch.getTargetNode(); if (!node) continue;
    const name = node.getName(); const s = ch.getSampler();
    const times = Array.from(s.getInput().getArray()), out = s.getOutput().getArray();
    tmax = Math.max(tmax, times[times.length - 1] || 0);
    if (ch.getTargetPath() === 'rotation') rotCh.set(name, { times, out });
    else if (ch.getTargetPath() === 'translation') posCh.set(name, { times, out });
  }
  const dur = tmax || (1 / FPS);
  const frames = Math.max(2, Math.round(dur * FPS) + 1);
  // source rest hips world Y (standing) for crouch-depth scaling
  const hipsS = SG.get('Hips');
  const srcBindY = hipsS ? worldPos(hipsS).y || 1 : 1;
  // precompute source rest world quats
  const srcRestW = new Map(); for (const g of SG.values()) srcRestW.set(g.name, restWorldQ(g));

  /* `Curl_*` FORA DO RETARGET, SEMPRE. Esses ossos não são de animação: são o atuador do
     fechamento da mão, escrito UMA vez pelo `buildCharacterModel` (glbchars.js, bloco
     "Grip curl") com o ângulo medido da espessura da arma. Canal de clipe neles é
     sobrescrita por quadro — o grip curl morre e a arma fica na mão aberta.
     Nos rigs humanos o estrago parava aí, porque o rest do `Curl_*` da fonte e do alvo
     coincidem e o delta de mundo saía IDENTIDADE (medido: 0,0000 rad nos 13). Na pata do
     Lobisomem os rests divergem e a mesma fórmula assou 0,8763 rad de TORÇÃO (y=-0,544,
     z=-0,621) numa folha que carrega 12,55% do peso de skin: p99 0,694 e ruins/1e4 36,2
     no `npm run eval:select`, contra teto de 0,675 e 23,6. Excluir aqui é no-op para os
     13 rigs humanos (o canal que eles perdem é identidade) e barra a recorrência na
     origem. O conserto dos GLB já no disco é o `tools/strip-curl-tracks.mjs`. */
  const OSSOS_DE_RUNTIME = /^Curl_/;
  const mappedTgt = tgtOrder.filter(g => SG.has(g.name) && !OSSOS_DE_RUNTIME.test(g.name));   // identity map: same Meshy bone names
  /* CLIPE SEM OSSO É ARQUIVO MENTINDO. Sem esta guarda o tool gravava GLB válido, sem
     nenhuma track de rotação, e imprimia "COMPLETO" — o personagem carregava o clipe e
     ficava congelado em bind. Falhar alto vale mais que 11 arquivos inúteis no disco. */
  if (mappedTgt.length < 8) {
    console.error(`FALHOU: ${state} mapeou ${mappedTgt.length} ossos (mínimo 8). ` +
      `A raiz do esqueleto do alvo é "${raizEsqueleto && raizEsqueleto.name}" com ${tgtOrder.length} nós; ` +
      `a fonte tem ${SG.size}. Nomes de osso não batem, ou a raiz está errada.`);
    process.exit(1);
  }
  const times = [], tracksQ = new Map(mappedTgt.map(g => [g.name, []])), trackP = [];

  for (let fi = 0; fi < frames; fi++) {
    const t = Math.min(dur, fi / FPS); times.push(t);
    // sampled source LOCAL quats + positions for this frame
    const localById = new Map(), posById = new Map();
    for (const [name, c] of rotCh) { const v = sampleAt(c.times, c.out, 4, t); if (v) localById.set(name, new THREE.Quaternion().fromArray(v)); }
    for (const [name, c] of posCh) { const v = sampleAt(c.times, c.out, 3, t); if (v) posById.set(name, new THREE.Vector3().fromArray(v)); }
    const parentComputed = new Map();
    for (const tg of mappedTgt) {
      const sg = SG.get(tg.name); if (!sg) continue;
      const srcW = srcWorldQ(sg, localById);
      /* BRAÇOS EM ROTAÇÃO ABSOLUTA (05/08). O delta (linha abaixo) PRESERVA o offset do
         rest do alvo — correto para comprimento de osso, desastroso quando o BIND do alvo
         não é T-pose: coach (mão/cabeça 0,60), dollynho (0,70), trapfunk (0,70) e jozo
         (0,71) têm bind em A-pose, e todo clipe saía com o braço 30–40° fora do lugar —
         era o "posturas bizarras" que sobreviveu a re-rig, porte e clamp, porque morava
         nos CLIPES gerados aqui. Nos braços, o mundo que o clipe fonte pede é o mundo que
         o alvo deve ter (mesma família Meshy, mesmos eixos de osso). Para os 40 rigs em T,
         srcRest ≈ tgtRest e delta ≡ absoluto — mudança é no-op neles (conferido na razão
         mão/cabeça: todos ≥ 0,83). Perna/coluna seguem no delta, que é o que consertou
         "doutora agachada" e "dollynho dobrado". */
      const desiredW = /Shoulder|Arm|Hand/.test(tg.name)
        ? srcW.clone()
        : srcW.clone().multiply(srcRestW.get(tg.name).clone().invert()).multiply(restWorldQ(tg));
      const parentW = tg.parent && parentComputed.has(tg.parent.name) ? parentComputed.get(tg.parent.name) : (tg.parent ? restWorldQ(tg.parent) : new THREE.Quaternion());
      const local = parentW.clone().invert().multiply(desiredW);
      parentComputed.set(tg.name, desiredW.clone());
      tracksQ.get(tg.name).push(local);
    }
    if (hipsT && tgtHipsParentInv && hipsS) {
      const srcW = srcWorldPos(hipsS, localById, posById);
      const tgtW = tgtHipsRestW.clone();
      tgtW.y = tgtHipsRestW.y * (srcW.y / srcBindY);
      const inv = tgtHipsParentInv;
      const local = tgtW.sub(inv.pos).applyQuaternion(inv.quat.clone().invert()).divide(inv.scl);
      trackP.push(local);
    }
  }

  // write target-clip GLB (target hierarchy, no mesh)
  const out = new Document(); const buf = out.createBuffer(); out.createScene('s');
  const idMap = new Map();
  for (const tg of tgtOrder) idMap.set(tg.name, out.createNode(tg.name).setTranslation(tg.restP.toArray()).setRotation(tg.restQ.toArray()).setScale(tg.restS.toArray()));
  for (const tg of tgtOrder) if (tg.parent && idMap.has(tg.parent.name)) idMap.get(tg.parent.name).addChild(idMap.get(tg.name));
  for (const tg of tgtOrder) if (!tg.parent || !idMap.has(tg.parent.name)) out.getRoot().listScenes()[0].addChild(idMap.get(tg.name));
  const outAnim = out.createAnimation(state);
  const timeAcc = out.createAccessor().setType('SCALAR').setBuffer(buf).setArray(new Float32Array(times));
  const addTrack = (bn, path, elemSize, arr) => {
    const samp = out.createAnimationSampler().setInput(timeAcc).setOutput(out.createAccessor().setType(elemSize === 4 ? 'VEC4' : 'VEC3').setBuffer(buf).setArray(arr)).setInterpolation('LINEAR');
    outAnim.addSampler(samp);
    outAnim.addChannel(out.createAnimationChannel().setTargetNode(idMap.get(bn)).setTargetPath(path).setSampler(samp));
  };
  for (const [bn, quats] of tracksQ) {
    if (!quats.length) continue;
    const arr = new Float32Array(quats.length * 4);
    quats.forEach((q, i) => { arr[i * 4] = q.x; arr[i * 4 + 1] = q.y; arr[i * 4 + 2] = q.z; arr[i * 4 + 3] = q.w; });
    addTrack(bn, 'rotation', 4, arr);
  }
  if (trackP.length) {
    const arr = new Float32Array(trackP.length * 3);
    trackP.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    addTrack('Hips', 'translation', 3, arr);
  }
  await io.write(`${outDir}/${state}.glb`, out);
  console.log('ok:', state, `(${frames}f, ${dur.toFixed(2)}s, ${mappedTgt.length} bones)`);
}
console.log('RETARGET-GLB COMPLETO ->', outDir);
