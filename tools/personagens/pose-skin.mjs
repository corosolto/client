/* ============================================================================
   pose-skin.mjs — pose test numérico e rasgo entre peças de um GLB com skin,
   na CPU, igual ao three.js.
   ----------------------------------------------------------------------------
   Porte do pose test do Studio (tools/lib/character-rig.mjs + tools/characters/
   rig-pose-test.mjs, repo coro-solto-studio): mesmas 5 poses sintéticas, os
   11 clipes de estado EMBUTIDOS no GLB amostrados em 8 instantes, mesmas
   métricas (estiramento de aresta, costas, mãos, costura soldada) e mesmos
   limites. Conferido contra o Studio nos três Lula: summary e contagem de
   falhas idênticos.

   RASGO: pares de vértices de PEÇAS diferentes da malha (sem aresta entre
   elas, nem solda a 1e-5 m) a ≤ 1 cm no bind. Em cada pose, o rasgo é a maior
   distância (cm) entre os dois vértices de um par; nos clipes, o máximo dos 8
   instantes. Peça colada com pesos diferentes se afasta quando o osso gira.
   ============================================================================ */
import * as THREE from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

export const POSES_SINTETICAS = Object.freeze([
  { name: 'arms-up-90', steps: [['LeftArm', 'z', 90], ['RightArm', 'z', -90]] },
  { name: 'arms-forward-60', steps: [['LeftArm', 'y', -60], ['RightArm', 'y', 60]] },
  { name: 'step-left', steps: [['LeftUpLeg', 'x', -45], ['LeftLeg', 'x', 60]] },
  { name: 'step-right', steps: [['RightUpLeg', 'x', -45], ['RightLeg', 'x', 60]] },
  { name: 'head-turn-60', steps: [['neck', 'y', 30], ['Head', 'y', 30]] },
]);
export const CLIPES = Object.freeze(['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire']);
export const AMOSTRAS = 8;
export const LIMITES = Object.freeze({ maxEdge: 3.5, backMaxEdge: 3.5, handMaxEdge: 2.5, seamGapMax: 0.005, bindError: 0.002 });
const RAIO_COLAGEM = 0.01;
const ARESTA_MIN = 5e-4; // arestas < 0,5 mm ficam de fora (razão de lasca é ruído)
const EIXO = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const local = (trs) => new THREE.Matrix4().compose(new THREE.Vector3(...trs.t), new THREE.Quaternion(...trs.r), new THREE.Vector3(...trs.s));
const dist = (A, a, B, b) => Math.hypot(A[a * 3] - B[b * 3], A[a * 3 + 1] - B[b * 3 + 1], A[a * 3 + 2] - B[b * 3 + 2]);

function carregar(doc) {
  const nodes = doc.getRoot().listNodes();
  const pai = new Map();
  for (const n of nodes) for (const c of n.listChildren()) pai.set(c, n);
  const malha = nodes.find((n) => n.getSkin() && n.getMesh());
  if (!malha) throw new Error('GLB sem malha com skin');
  const skin = malha.getSkin(), juntas = skin.listJoints();
  const ibm = juntas.map((_, i) => new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i, [])));
  const trs = new Map(nodes.map((n) => [n, { t: n.getTranslation(), r: n.getRotation(), s: n.getScale() }]));
  const porNome = new Map();
  for (const n of nodes) porNome.set(n.getName(), [...(porNome.get(n.getName()) || []), n]);
  const prims = malha.getMesh().listPrimitives().map((p) => ({
    pos: p.getAttribute('POSITION').getArray(), J: p.getAttribute('JOINTS_0').getArray(), W: p.getAttribute('WEIGHTS_0').getArray(),
    idx: p.getIndices()?.getArray() || null, count: p.getAttribute('POSITION').getCount(),
  }));
  return { doc, pai, juntas, nomes: juntas.map((j) => j.getName()), ibm, trs, porNome, prims };
}

function mundo(rig, sobre = new Map()) {
  const cache = new Map();
  const w = (n) => {
    if (cache.has(n)) return cache.get(n);
    const m = local(sobre.get(n) || rig.trs.get(n)), p = rig.pai.get(n);
    const r = p ? new THREE.Matrix4().multiplyMatrices(w(p), m) : m;
    cache.set(n, r);
    return r;
  };
  return w;
}

function posar(rig, sobre = new Map()) {
  const w = mundo(rig, sobre);
  const mats = rig.juntas.map((j, i) => new THREE.Matrix4().multiplyMatrices(w(j), rig.ibm[i]).elements);
  const acc = new Float64Array(16);
  return rig.prims.map((p) => {
    const out = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      acc.fill(0);
      for (let k = 0; k < 4; k++) { const peso = p.W[v * 4 + k]; if (!peso) continue; const e = mats[p.J[v * 4 + k]]; for (let q = 0; q < 16; q++) acc[q] += e[q] * peso; }
      const x = p.pos[v * 3], y = p.pos[v * 3 + 1], z = p.pos[v * 3 + 2];
      out[v * 3] = acc[0] * x + acc[4] * y + acc[8] * z + acc[12];
      out[v * 3 + 1] = acc[1] * x + acc[5] * y + acc[9] * z + acc[13];
      out[v * 3 + 2] = acc[2] * x + acc[6] * y + acc[10] * z + acc[14];
    }
    return out;
  });
}

function sintetica(rig, pose) {
  const sobre = new Map();
  for (const [nome, eixo, graus] of pose.steps) for (const n of rig.porNome.get(nome) || []) {
    const w = mundo(rig, sobre), q = new THREE.Quaternion(), qp = new THREE.Quaternion();
    w(n).decompose(new THREE.Vector3(), q, new THREE.Vector3());
    if (rig.pai.get(n)) w(rig.pai.get(n)).decompose(new THREE.Vector3(), qp, new THREE.Vector3());
    const alvo = new THREE.Quaternion().setFromAxisAngle(EIXO[eixo], (graus * Math.PI) / 180).multiply(q);
    sobre.set(n, { ...(sobre.get(n) || rig.trs.get(n)), r: qp.clone().invert().multiply(alvo).normalize().toArray() });
  }
  return sobre;
}

function amostrador(anim) {
  const canais = [];
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler(), alvo = ch.getTargetNode();
    if (!s || !alvo || ch.getTargetPath() === 'weights') continue;
    canais.push({ nome: alvo.getName(), path: ch.getTargetPath(), T: s.getInput().getArray(), V: s.getOutput().getArray(), n: ch.getTargetPath() === 'rotation' ? 4 : 3, cubic: s.getInterpolation() === 'CUBICSPLINE', step: s.getInterpolation() === 'STEP' });
  }
  const duracao = Math.max(0, ...canais.map((c) => c.T[c.T.length - 1]));
  const valor = (c, t) => {
    let i = 0; while (i < c.T.length - 2 && c.T[i + 1] <= t) i++;
    const f = c.T.length > 1 && !c.step ? Math.min(1, Math.max(0, (t - c.T[i]) / ((c.T[i + 1] - c.T[i]) || 1))) : 0;
    const j = Math.min(i + 1, c.T.length - 1);
    // CUBICSPLINE guarda [tangente de entrada, valor, tangente de saída] por chave: Hermite do glTF.
    const em = (k, slot = 1) => { const b = c.cubic ? (k * 3 + slot) * c.n : k * c.n; return Array.from(c.V.slice(b, b + c.n)); };
    if (c.cubic) {
      const dt = c.T[j] - c.T[i], f2 = f * f, f3 = f2 * f;
      const v0 = em(i), b0 = em(i, 2), v1 = em(j), a1 = em(j, 0);
      const out = v0.map((_, k) => (2 * f3 - 3 * f2 + 1) * v0[k] + dt * (f3 - 2 * f2 + f) * b0[k] + (-2 * f3 + 3 * f2) * v1[k] + dt * (f3 - f2) * a1[k]);
      return c.n === 4 ? new THREE.Quaternion().fromArray(out).normalize().toArray() : out;
    }
    const a = em(i), b = em(j);
    if (c.n === 4) return new THREE.Quaternion().fromArray(a).slerp(new THREE.Quaternion().fromArray(b), f).toArray();
    return a.map((x, k) => x + (b[k] - x) * f);
  };
  return { duracao, sobre: (rig, t) => {
    const sobre = new Map();
    for (const c of canais) for (const n of rig.porNome.get(c.nome) || []) {
      const base = sobre.get(n) || { ...rig.trs.get(n) };
      sobre.set(n, { ...base, [c.path === 'translation' ? 't' : c.path === 'rotation' ? 'r' : 's']: valor(c, t) });
    }
    return sobre;
  } };
}

function preparar(rig) {
  const bind = posar(rig);
  let bindError = 0;
  rig.prims.forEach((p, pi) => { for (let k = 0; k < p.pos.length; k++) bindError = Math.max(bindError, Math.abs(bind[pi][k] - p.pos[k])); });
  const w = mundo(rig);
  const junta = (nome) => { const n = rig.porNome.get(nome)?.[0]; return n ? new THREE.Vector3().setFromMatrixPosition(w(n)) : null; };
  const hips = junta('Hips'), neck = junta('neck'), spine01 = junta('Spine01'), lArm = junta('LeftArm'), rArm = junta('RightArm');
  const meiaLargura = Math.max(Math.abs(lArm?.x ?? 0.2), Math.abs(rArm?.x ?? 0.2)) + 0.02;
  const mao = { L: new Set(), R: new Set() };
  rig.nomes.forEach((n, i) => { if (n === 'LeftHand' || n === 'Curl_L') mao.L.add(i); if (n === 'RightHand' || n === 'Curl_R') mao.R.add(i); });
  const prims = rig.prims.map((p, pi) => {
    const s = bind[pi], idx = p.idx || Uint32Array.from({ length: p.count }, (_, i) => i);
    const visto = new Set(), arestas = [];
    for (let t = 0; t + 2 < idx.length; t += 3) for (const [a, b] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) {
      const k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
      if (visto.has(k)) continue; visto.add(k);
      const L = dist(s, a, s, b); if (L > ARESTA_MIN) arestas.push([a, b, L]);
    }
    const pesoMao = (lado, v) => { let x = 0; for (let k = 0; k < 4; k++) if (mao[lado].has(p.J[v * 4 + k])) x += p.W[v * 4 + k]; return x; };
    const costas = (v) => hips && neck && spine01 && s[v * 3 + 1] > hips.y && s[v * 3 + 1] < neck.y && s[v * 3 + 2] < spine01.z - 0.02 && Math.abs(s[v * 3]) < meiaLargura;
    const reg = { back: [], L: [], R: [] };
    arestas.forEach(([a, b], ei) => {
      if (costas(a) && costas(b)) reg.back.push(ei);
      if (pesoMao('L', a) >= 0.25 || pesoMao('L', b) >= 0.25) reg.L.push(ei);
      if (pesoMao('R', a) >= 0.25 || pesoMao('R', b) >= 0.25) reg.R.push(ei);
    });
    // Costura soldada (mesma posição a 1e-5 m) e peças (componentes ligados por aresta ou solda).
    const grupos = new Map(), solda = new Map(), raiz0 = Int32Array.from({ length: p.count }, (_, i) => i);
    const raiz = (x) => { while (raiz0[x] !== x) { raiz0[x] = raiz0[raiz0[x]]; x = raiz0[x]; } return x; };
    const unir = (a, b) => { a = raiz(a); b = raiz(b); if (a !== b) raiz0[Math.max(a, b)] = Math.min(a, b); };
    for (let t = 0; t + 2 < idx.length; t += 3) { unir(idx[t], idx[t + 1]); unir(idx[t], idx[t + 2]); }
    for (let v = 0; v < p.count; v++) {
      const k = `${Math.round(s[v * 3] * 1e5)},${Math.round(s[v * 3 + 1] * 1e5)},${Math.round(s[v * 3 + 2] * 1e5)}`;
      grupos.set(k, [...(grupos.get(k) || []), v]);
      const kp = [0, 1, 2].map((c) => Math.round(p.pos[v * 3 + c] * 1e5)).join();
      if (solda.has(kp)) unir(solda.get(kp), v); else solda.set(kp, v);
    }
    const grade = new Map(), pares = [];
    const celula = (v) => [0, 1, 2].map((c) => Math.floor(p.pos[v * 3 + c] / RAIO_COLAGEM));
    for (let v = 0; v < p.count; v++) { const k = celula(v).join(); grade.set(k, [...(grade.get(k) || []), v]); }
    for (let v = 0; v < p.count; v++) {
      const c = celula(v);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
        for (const u of grade.get(`${c[0] + dx},${c[1] + dy},${c[2] + dz}`) || []) if (u > v && raiz(u) !== raiz(v) && dist(s, u, s, v) <= RAIO_COLAGEM) pares.push([v, u]);
    }
    return { arestas, reg, costuras: [...grupos.values()].filter((g) => g.length > 1), pares };
  });
  return { bindError, prims, temCostas: prims.some((p) => p.reg.back.length), temMao: { L: prims.some((p) => p.reg.L.length), R: prims.some((p) => p.reg.R.length) } };
}

function medir(prep, posado) {
  let maxEdge = 1, back = 1, L = 1, R = 1, seam = 0, rasgo = 0;
  prep.prims.forEach((sp, pi) => {
    const s = posado[pi], r = new Float32Array(sp.arestas.length);
    sp.arestas.forEach(([a, b, comp], ei) => { r[ei] = dist(s, a, s, b) / comp; if (r[ei] > maxEdge) maxEdge = r[ei]; });
    for (const ei of sp.reg.back) back = Math.max(back, r[ei]);
    for (const ei of sp.reg.L) L = Math.max(L, r[ei]);
    for (const ei of sp.reg.R) R = Math.max(R, r[ei]);
    for (const [a, ...resto] of sp.costuras) for (const b of resto) seam = Math.max(seam, dist(s, a, s, b));
    for (const [a, b] of sp.pares) rasgo = Math.max(rasgo, dist(s, a, s, b));
  });
  return {
    maxEdge: +maxEdge.toFixed(3), backMaxEdge: prep.temCostas ? +back.toFixed(3) : null,
    handMaxEdge: { L: prep.temMao.L ? +L.toFixed(3) : null, R: prep.temMao.R ? +R.toFixed(3) : null },
    seamGapMax: +seam.toFixed(5), rasgoCm: +(rasgo * 100).toFixed(2),
  };
}

// Uma falha por cláusula estourada em cada pose/instante, como o evaluatePoseReport do Studio.
const contar = (m) => (m.maxEdge > LIMITES.maxEdge) + (m.backMaxEdge > LIMITES.backMaxEdge)
  + ['L', 'R'].filter((lado) => m.handMaxEdge[lado] != null && m.handMaxEdge[lado] > LIMITES.handMaxEdge).length + (m.seamGapMax > LIMITES.seamGapMax);

/** Pose test + rasgo de um GLB (bytes). Devolve falhas (contagem do Studio) e rasgo em cm por pose. */
export async function medirPoses(bytes) {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  const rig = carregar(doc), prep = preparar(rig);
  const rasgo = {};
  let falhas = prep.bindError <= LIMITES.bindError ? 0 : 1;
  for (const pose of POSES_SINTETICAS) { const m = medir(prep, posar(rig, sintetica(rig, pose))); falhas += contar(m); rasgo[pose.name] = m.rasgoCm; }
  const anims = new Map(doc.getRoot().listAnimations().map((a) => [a.getName(), a]));
  for (const clipe of CLIPES) {
    if (!anims.has(clipe)) throw new Error(`clipe embutido ${clipe} ausente`);
    const a = amostrador(anims.get(clipe));
    rasgo[clipe] = 0;
    for (let k = 0; k < AMOSTRAS; k++) {
      const m = medir(prep, posar(rig, a.sobre(rig, +(a.duracao * k / (AMOSTRAS - 1)).toFixed(4))));
      falhas += contar(m); rasgo[clipe] = Math.max(rasgo[clipe], m.rasgoCm);
    }
  }
  return { falhas, rasgo, pares: prep.prims.reduce((t, p) => t + p.pares.length, 0) };
}
