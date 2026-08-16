// rig-from-donor.mjs — give an UNRIGGED Mint mesh a working Meshy skeleton by
// transplanting a DONOR character's skeleton (same bone names the shared clips were
// baked against) and auto-skinning the mesh by bone-segment proximity.
//
// Why: Mint's humanoid classifier stalled (humanoidRiggable=null) so animate_generated_model
// refuses these meshes. But every Meshy rig shares identical bone names, and the shared
// clips (idle/walk/run/...) were baked on ONE reference rig (mst). So we clone mst's
// skeleton onto the clown mesh → the shared clips drive it directly, no per-char retarget.
//
// CRITICAL: the donor skeleton lives under an `Armature` node scaled 0.01 (bones are in cm,
// Hips.y≈82). The shared clips animate the Hips translation in that cm space. We MUST
// recreate that Armature (and any ancestor chain) so the clip's Hips translation is scaled
// back to metres — dropping it makes the mesh shoot ~82m up (or, with unit bones, explode).
//
// Alignment: donor MESH is in metres (H≈1.7, feet≈0); the Mint "normalized" mesh is a unit
// box centred at origin. Uniform-scale the mesh to donorH and translate feet→donorFootY,
// centre X/Z. mst's inverseBindMatrices map that metre mesh-space to the cm joint-space, so
// reusing them on our metre-aligned mesh is consistent.
//
// Skinning: per vertex, distance to every bone SEGMENT (jointWorld→childWorld, PROXIMAL —
// ver o bloco "SEGMENTO DE OSSO" abaixo); nearest 4 por JUNTA, weight ∝ 1/d^1.5 (normalised).
// Rigid-ish but smooth enough for distant bots.
//
// usage: node tools/rig-from-donor.mjs <donor.glb> <mesh.glb> <out.glb>
//
// ─────────────────────────────────────────────────────────────────────────────────────
// ESTADO EM 04/08 — O DEFEITO DO "BALÃO" FOI ACHADO E CONSERTADO
// Este arquivo GERA ASSET: mexer aqui não muda nada em runtime até um GLB ser regerado.
// A causa raiz do "balão" era a CONVENÇÃO DE SEGMENTO deste auto-skin (ver o bloco
// "SEGMENTO DE OSSO" abaixo). Os 17 GLB que já estavam em disco NÃO foram regerados por
// aqui — foram repintados no lugar por `tools/reskin-glb.mjs`, que preserva malha,
// textura, esqueleto, IBM e o finger-curl. Medido antes/depois com
// `tools/eval/pose-inflate.mjs` (esticamento de aresta com o clipe rodando):
// mediana do lote 1,152 -> 0,535; oakley 1,835 -> 0,591; raul 1,131 -> 0,424.
// Referência do elenco: mandrake 0,402 (rigado no Mint), mst 0,312 (doador).
//
// NÃO era o MAX_R: o sweep 0,22→0,09 já tinha sido refutado com número (KNOWN-BUGS).
// NÃO era o `raioSkin` do C7 sozinho: 60% dos vértices caíam no `head_end`, folha RÍGIDA
// 29,5 cm acima do `Head`, e o C7 mede folha como PONTO — rótulo, não pixel.
//
// COMO REGERAR DO ZERO (só se a malha crua mudar; senão use o reskin-glb):
//   1) node tools/eval/char-probe.mjs --silhuetas      # ANTES, com os GLB no lugar
//      cp tools/eval/char_probe.json /tmp/char_ANTES.json
//   2) para cada personagem rigado por transplante (os 8 palhaços e os 8 funkeiros que
//      não vieram rigados do Mint — ver a lista em glbchars.js:29-40):
//         node tools/rig-from-donor.mjs \
//              public/models/characters/mst.glb \
//              <malha-crua>.glb \
//              public/models/characters/<id>.glb
//   3) node tools/retarget-glb.mjs ...                 # se os clipes precisarem refazer
//   4) node tools/eval/char-probe.mjs --silhuetas      # DEPOIS
//      node tools/eval/invariants.mjs                  # CHR1..CHR6 têm que ficar verdes
//   5) OLHE as silhuetas em /tmp/charsil/. A régua não substitui o olho — é a mesma
//      regra do ref-measure.py ("não confie numa segmentação que você não olhou").
//
// SE PIORAR: MAX_R é o único parâmetro novo. 0,22 m é o raio típico de ombro-a-mão num
// corpo de 1,7 m; num mascote de braço-toco pode precisar ser menor (0,15) e num
// personagem com capa/vestido, maior (0,30). O char-probe mede o efeito no C1/C3/C6.
// ─────────────────────────────────────────────────────────────────────────────────────
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../public/vendor/three.module.js';

const [, , donorPath, meshPath, outPath] = process.argv;
if (!donorPath || !meshPath || !outPath) { console.error('usage: rig-from-donor <donor.glb> <mesh.glb> <out.glb>'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function worldMap(doc) {
  const info = new Map();
  for (const n of doc.getRoot().listNodes()) info.set(n, new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(n.getTranslation()), new THREE.Quaternion().fromArray(n.getRotation()), new THREE.Vector3().fromArray(n.getScale())));
  const parent = new Map();
  for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
  const wm = new Map();
  const world = (n) => { if (wm.has(n)) return wm.get(n); const p = parent.get(n); const m = p ? new THREE.Matrix4().multiplyMatrices(world(p), info.get(n)) : info.get(n).clone(); wm.set(n, m); return m; };
  for (const n of doc.getRoot().listNodes()) world(n);
  return { wm, parent };
}
function meshBBox(doc) {
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], any = false, el = [];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION'); if (!a) continue; any = true;
    for (let i = 0; i < a.getCount(); i++) { a.getElement(i, el); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], el[k]); mx[k] = Math.max(mx[k], el[k]); } }
  }
  return any ? { mn, mx } : null;
}

// ================= DONOR: extract skeleton + armature chain =================
const donor = await io.read(donorPath);
const dSkin = donor.getRoot().listSkins()[0];
if (!dSkin) { console.error('donor has no skin'); process.exit(1); }
const dJoints = dSkin.listJoints();
const jSet = new Set(dJoints);
const dIBM = dSkin.getInverseBindMatrices().getArray();
const { wm: dWM, parent: dParent } = worldMap(donor);

const rootJoint = dJoints.find(j => !jSet.has(dParent.get(j)));   // joint whose parent is not a joint
// ancestor (armature) chain of the root joint: nearest-first up to scene
const armChain = [];
for (let a = dParent.get(rootJoint); a; a = dParent.get(a)) armChain.push({ name: a.getName(), t: a.getTranslation(), r: a.getRotation(), s: a.getScale() });

const jointInfo = dJoints.map((j) => {
  const p = dParent.get(j);
  return { name: j.getName(), t: j.getTranslation(), r: j.getRotation(), s: j.getScale(),
    parentName: jSet.has(p) ? p.getName() : null, world: new THREE.Vector3().setFromMatrixPosition(dWM.get(j)) };
});
const nameToIdx = new Map(jointInfo.map((j, i) => [j.name, i]));
/* SEGMENTO DE OSSO — CONVENÇÃO PROXIMAL (corrigido em 04/08; era a causa do "balão").
   A versão anterior era `{ a: junta_i, b: PAI_i }`, e num rig Meshy o osso aponta pro
   filho: `LeftArm` é o OMBRO, `LeftForeArm` o COTOVELO, `LeftHand` o PUNHO. Com
   [junta→pai], o segmento de `LeftForeArm` virava [cotovelo, ombro] = o BRAÇO, e o de
   `LeftHand` virava [punho, cotovelo] = o ANTEBRAÇO. Resultado: TODO membro pintado com
   a junta DISTAL, um osso adiante do certo — dobrar o cotovelo girava o braço inteiro,
   dobrar o joelho girava a coxa inteira. É isso que o olho lê como boneco inflando.
   Medido por `tools/eval/skin-offbyone.mjs`: raul (transplantado) junta→PAI 15 × 0;
   mandrake (rigado no Mint) 0 × junta→FILHO 17.
   Aqui o osso i cobre a carne entre a junta i e CADA filho dela — a mesma convenção que
   o `char-probe.mjs` usa pra medir `raioSkin`. Ponta de cadeia (mão, pé, folha) ganha um
   TOCO na direção do próprio osso, senão a mão não teria segmento nenhum.
   Os 17 GLB já em disco foram consertados sem regerar, por `tools/reskin-glb.mjs`. */
const MIN_SEG = 0.02;                                     // < 2 cm é degenerado (Hand→Curl tem 1 mm)
const kidsDe = jointInfo.map(() => []);
jointInfo.forEach((j, i) => { if (j.parentName != null) kidsDe[nameToIdx.get(j.parentName)].push(i); });
const segs = [];
jointInfo.forEach((j, i) => {
  if (/^curl_/i.test(j.name)) return;                     // folha de dedo não domina carne
  let usou = 0;
  for (const c of kidsDe[i]) {
    if (j.world.distanceTo(jointInfo[c].world) < MIN_SEG) continue;
    segs.push({ a: j.world, b: jointInfo[c].world, idx: i }); usou++;
  }
  if (!usou) {
    const pi = j.parentName != null ? nameToIdx.get(j.parentName) : null;
    const dir = pi != null ? new THREE.Vector3().subVectors(j.world, jointInfo[pi].world) : new THREE.Vector3(0, -1, 0);
    const L = Math.min(0.12, Math.max(0.04, dir.length() * 0.5));
    segs.push({ a: j.world, b: j.world.clone().addScaledVector(dir.normalize(), L), idx: i });
  }
});
const dBox = meshBBox(donor);
const donorH = dBox.mx[1] - dBox.mn[1], donorFootY = dBox.mn[1];

// ================= MESH: read + align =================
const doc = await io.read(meshPath);
const mBox = meshBBox(doc);
const scale = donorH / (mBox.mx[1] - mBox.mn[1]);
const cx = (mBox.mn[0] + mBox.mx[0]) / 2, cz = (mBox.mn[2] + mBox.mx[2]) / 2;
const tx = -cx * scale, tz = -cz * scale, ty = donorFootY - mBox.mn[1] * scale;
const alignPt = (v) => new THREE.Vector3(v[0] * scale + tx, v[1] * scale + ty, v[2] * scale + tz);
const buffer = doc.getRoot().listBuffers()[0] || doc.createBuffer();
const scene = doc.getRoot().listScenes()[0];

// ---- recreate armature chain (top-of-chain under scene, nested down) ----
const armNodes = armChain.map(a => doc.createNode(a.name).setTranslation(a.t).setRotation(a.r).setScale(a.s));
for (let i = armChain.length - 1; i > 0; i--) armNodes[i].addChild(armNodes[i - 1]);
if (armNodes.length) scene.addChild(armNodes[armNodes.length - 1]);
const armParent = armNodes.length ? armNodes[0] : scene;

// ---- rebuild joints with ORIGINAL local TRS ----
const newNodes = jointInfo.map(j => doc.createNode(j.name).setTranslation(j.t).setRotation(j.r).setScale(j.s));
jointInfo.forEach((j, i) => { if (j.parentName != null) newNodes[nameToIdx.get(j.parentName)].addChild(newNodes[i]); });
armParent.addChild(newNodes[nameToIdx.get(rootJoint.getName())]);

const ibmAcc = doc.createAccessor().setType('MAT4').setArray(Float32Array.from(dIBM)).setBuffer(buffer);
const skin = doc.createSkin('rig').setInverseBindMatrices(ibmAcc).setSkeleton(newNodes[nameToIdx.get(rootJoint.getName())]);
newNodes.forEach(n => skin.addJoint(n));

// ---- skin every primitive (align positions + proximity weights) ----
function segDist(p, s) {
  const ab = new THREE.Vector3().subVectors(s.b, s.a), ap = new THREE.Vector3().subVectors(p, s.a);
  let t = ab.lengthSq() > 1e-9 ? ap.dot(ab) / ab.lengthSq() : 0; t = Math.max(0, Math.min(1, t));
  return new THREE.Vector3().copy(s.a).addScaledVector(ab, t).distanceToSquared(p);
}
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const posA = prim.getAttribute('POSITION'); if (!posA) continue;
    const n = posA.getCount();
    const posArr = Float32Array.from(posA.getArray());
    const JI = new Uint16Array(n * 4), JW = new Float32Array(n * 4), el = [];
    for (let i = 0; i < n; i++) {
      posA.getElement(i, el);
      const p = alignPt(el);
      posArr[i * 3] = p.x; posArr[i * 3 + 1] = p.y; posArr[i * 3 + 2] = p.z;
      // nearest-4 bone segments com falloff suave (potência 1.5): mistura ao longo da
      // articulação em vez de pular entre 2 ossos (nearest-2 rígido pinçava cotovelo/joelho).
      // melhor distância POR JUNTA, não por segmento: com a convenção proximal uma junta
      // pode ter vários segmentos (o `Head` tem head_end e headfront), e sem o dedup os
      // 4 slots de peso iam todos para o mesmo osso.
      const porJunta = new Map();
      for (const s of segs) {
        const d = segDist(p, s);
        const cur = porJunta.get(s.idx);
        if (cur === undefined || d < cur) porJunta.set(s.idx, d);
      }
      const best = [...porJunta.entries()].sort((a, b) => a[1] - b[1]).slice(0, 4).map(([i, d]) => ({ i, d }));
      while (best.length < 4) best.push({ i: best[0].i, d: best[0].d });
      /* RAIO MÁXIMO DE INFLUÊNCIA — o auto-skin não tinha nenhum (rodada da RÉGUA).
         Os pesos são 1/d^1.5 NORMALIZADOS, e normalizar apaga a distância absoluta: um
         vértice a 4 cm do osso mais próximo e um vértice a 60 cm recebem exatamente o
         mesmo peso total 1,0 nos seus 4 ossos. Consequência concreta nestes assets: a aba
         de um chapéu, a ponta de uma corrente, um balão, o cabelo de um palhaço — tudo que
         está LONGE de qualquer osso — acaba 100% preso ao osso que por acaso ficou mais
         perto, que muitas vezes é um osso de BRAÇO. Aí o clipe move o braço e o adereço
         voa junto, esticando a malha: é assim que um personagem vira "balão" em movimento
         mesmo tendo bind pose correta.
         Teto = MAX_R (em metros, no espaço já alinhado do doador). Além dele o peso decai
         em vez de ser renormalizado pra 1, e o vértice fica preso ao osso mais próximo com
         peso quase RÍGIDO — que é o comportamento certo pra adereço: ele acompanha o osso,
         não é esticado entre quatro.
         Este arquivo GERA ASSET: mexer aqui não muda nada em runtime. Para valer, os GLB
         precisam ser regerados na máquina do dono (ver o relatório da rodada). */
      /* MAX_R virou PARÂMETRO (04/08). Era 0,22 fixo, e a medição mostrou que esse número é
         a causa do "balão" dos funkeiros: com raio de influência de 22 cm, metade dos
         vértices (raioSkin50) fica presa a osso de 13,5-17,1 cm de distância — contra
         0,087 do mandrake, que NÃO passou por este caminho (veio rigado). Cada grau de
         rotação empurra a malha o dobro pra fora, e é isso que lê como boneco inflando.
         Critério de aceite (char-probe C7): raioSkin50 ≤ 0,10 m.
         Sweep: MAX_R=0.12 node tools/rig-from-donor.mjs <doador> <malha> <saida> */
      const MAX_R = +(process.env.MAX_R || 0.22);
      const d0 = Math.sqrt(best[0].d);
      let ws = 0; const w = best.map((b) => { const x = 1 / Math.pow(b.d + 1e-5, 1.5); ws += x; return x; });
      if (d0 > MAX_R) {
        // fora do alcance de qualquer osso: rígido no mais próximo (sem mistura), senão
        // a normalização inventa influência de ossos que estão ainda mais longe.
        JI[i * 4] = best[0].i; JW[i * 4] = 1;
        for (let k = 1; k < 4; k++) { JI[i * 4 + k] = best[0].i; JW[i * 4 + k] = 0; }
        continue;
      }
      for (let k = 0; k < 4; k++) { JI[i * 4 + k] = best[k].i; JW[i * 4 + k] = w[k] / ws; }
    }
    posA.setArray(posArr);
    prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(JI).setBuffer(buffer));
    prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(JW).setBuffer(buffer));
  }
  for (const nd of doc.getRoot().listNodes()) if (nd.getMesh() === mesh) nd.setSkin(skin).setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
}

await io.write(outPath, doc);
console.log(`ok: ${outPath.split('/').pop()}  ${jointInfo.length} bones + ${armChain.length} armature node(s) from ${donorPath.split('/').pop()}  (scale ${scale.toFixed(3)})`);
