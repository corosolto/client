/* claquete-verde-v5-motion.mjs — régua de movimento da Claquete Verde v5.
   ═══════════════════════════════════════════════════════════════════════════════
   POR QUE ELA EXISTE (defeito BUG-gate-v4, revisão adversarial da v4):

   O gate v4 (tmp/claquete-verde-native-gate.mjs) apenas RELIA um pose-inflate.json
   gravado. Rodado de verdade, tools/eval/pose-inflate.mjs deriva a pasta de clipes
   do NOME do arquivo e cai no fallback `public/models/anims/mixamo/` (linha ~165),
   medindo o candidato contra o pack ERRADO e devolvendo números diferentes dos
   gravados. Régua que não mede o artefato é decorativa.

   Esta régua recebe os clipes por CAMINHO EXPLÍCITO (--clips dir com os 11 .glb,
   ou --clips-dir alternativo para o mutante "pack errado") e mede o modelo com a
   mesma matemática de LBS do pose-inflate.mjs (sum_k w_k·M_k·IBM_k·v, razão de
   aresta simétrica max(L/L0,L0/L)−1), acrescentando SONDAGEM SEMÂNTICA por clipe:
   altura dos quadris, contato de pé com o piso e distância punho–punho — é o que
   permite dizer "walk anda" em vez de confiar no nome do arquivo (o frame chamado
   walk na v4 parecia ajoelhado; a revisão mandou verificar a semântica, não o rótulo).

   uso: node tmp/claquete-verde-v5-motion.mjs <modelo.glb> --clips <dir> [--out x.json]
   ═══════════════════════════════════════════════════════════════════════════════ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const model = args.find(a => !a.startsWith('-'));
const clipsDir = args[args.indexOf('--clips') + 1];
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
if (!model || !clipsDir) throw new Error('uso: node tmp/claquete-verde-v5-motion.mjs <modelo.glb> --clips <dir> [--out x.json]');

const AMOSTRAS = 8;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const qtl = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];

const trs = (n) => new THREE.Matrix4().compose(
  new THREE.Vector3().fromArray(n.getTranslation()),
  new THREE.Quaternion().fromArray(n.getRotation()),
  new THREE.Vector3().fromArray(n.getScale()));

function amostra(sampler, t, dim) {
  const inp = sampler.getInput().getArray();
  const out = sampler.getOutput().getArray();
  const n = inp.length;
  let i = 0;
  while (i < n - 1 && inp[i + 1] < t) i++;
  const j = Math.min(i + 1, n - 1);
  const span = inp[j] - inp[i];
  const a = span > 1e-9 ? Math.max(0, Math.min(1, (t - inp[i]) / span)) : 0;
  const v = [];
  for (let k = 0; k < dim; k++) v[k] = out[i * dim + k] + (out[j * dim + k] - out[i * dim + k]) * a;
  if (dim === 4) { const L = Math.hypot(...v) || 1; for (let k = 0; k < 4; k++) v[k] /= L; }
  return v;
}

const doc = await io.read(model);
const root = doc.getRoot();
const skin = root.listSkins()[0];
if (!skin) throw new Error('modelo sem skin: ' + model);
const joints = skin.listJoints();
const parent = new Map();
for (const n of root.listNodes()) for (const c of n.listChildren()) parent.set(c, n);
const ibmArr = skin.getInverseBindMatrices().getArray();
const IBM = joints.map((_, i) => new THREE.Matrix4().fromArray(Array.from(ibmArr.slice(i * 16, i * 16 + 16))));

const ordem = [];
{ const vis = new Set();
  const push = (n) => { if (!n || vis.has(n)) return; push(parent.get(n)); vis.add(n); ordem.push(n); };
  for (const j of joints) push(j); }

const verts = [], arestas = new Set();
for (const nd of root.listNodes()) {
  const mesh = nd.getMesh();
  if (!mesh || !nd.getSkin()) continue;
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
    if (!P || !J || !W) continue;
    const base = verts.length;
    const el = [], je = [], we = [];
    for (let i = 0; i < P.getCount(); i++) {
      P.getElement(i, el); J.getElement(i, je); W.getElement(i, we);
      verts.push({ p: new THREE.Vector3(el[0], el[1], el[2]), j: je.slice(0, 4), w: we.slice(0, 4) });
    }
    const idx = prim.getIndices();
    const N = idx ? idx.getCount() : P.getCount();
    const gi = (k) => base + (idx ? idx.getScalar(k) : k);
    for (let k = 0; k + 2 < N; k += 3) {
      const a = gi(k), b = gi(k + 1), c = gi(k + 2);
      for (const [x, y] of [[a, b], [b, c], [c, a]]) arestas.add(x < y ? `${x},${y}` : `${y},${x}`);
    }
  }
}
const E = [...arestas].map((s) => s.split(',').map(Number));
const Lbind = E.map(([a, b]) => verts[a].p.distanceTo(verts[b].p));

const mundo = (locais) => {
  const wm = new Map();
  for (const n of ordem) {
    const local = locais.get(n) || trs(n);
    const p = parent.get(n);
    wm.set(n, p && wm.has(p) ? new THREE.Matrix4().multiplyMatrices(wm.get(p), local) : local.clone());
  }
  return wm;
};
const pele = (wm) => {
  const M = joints.map((j, i) => new THREE.Matrix4().multiplyMatrices(wm.get(j), IBM[i]));
  return verts.map((v) => {
    const acc = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    for (let k = 0; k < 4; k++) {
      const w = v.w[k]; if (!w) continue;
      acc.add(tmp.copy(v.p).applyMatrix4(M[v.j[k]]).multiplyScalar(w));
    }
    return acc;
  });
};
const bind = pele(mundo(new Map()));
let errBind = 0;
for (let i = 0; i < verts.length; i += Math.max(1, (verts.length / 500) | 0)) errBind = Math.max(errBind, bind[i].distanceTo(verts[i].p));

// índices semânticos: ossos por nome (o skeleton nativo de 24 ossos usa nomes mixamo-like)
const porNome = new Map();
for (const nd of root.listNodes()) if (!porNome.has(nd.getName())) porNome.set(nd.getName(), nd);
const boneIdx = new Map(joints.map((j, i) => [j.getName(), i]));
const bonePos = (wm, name) => {
  const n = porNome.get(name);
  if (!n || !wm.has(n)) return null;
  const m = wm.get(n);
  return new THREE.Vector3().setFromMatrixPosition(m);
};
// vértices dos pés: peso dominante LeftFoot/RightFoot — piso medido na malha, não no osso
const footV = [], lwV = [], rwV = [];
verts.forEach((v, i) => {
  let bi = 0, bw = -1;
  for (let k = 0; k < 4; k++) if (v.w[k] > bw) { bw = v.w[k]; bi = v.j[k]; }
  const bn = joints[bi].getName();
  if (bn === 'LeftFoot' || bn === 'RightFoot' || bn === 'LeftToeBase' || bn === 'RightToeBase') footV.push(i);
  if (bn === 'LeftHand') lwV.push(i);
  if (bn === 'RightHand') rwV.push(i);
});

const clipFiles = fs.readdirSync(clipsDir).filter(f => f.endsWith('.glb')).sort();
if (!clipFiles.length) throw new Error('nenhum clipe em ' + clipsDir);
const res = { id: model, clipsDir, errBind: +errBind.toFixed(4), clipes: {} };
for (const cf of clipFiles) {
  const cl = cf.replace('.glb', '');
  const cd = await io.read(path.join(clipsDir, cf));
  const anim = cd.getRoot().listAnimations()[0];
  if (!anim) continue;
  let dur = 0;
  const canais = [];
  for (const ch of anim.listChannels()) {
    const alvo = porNome.get(ch.getTargetNode().getName());
    if (!alvo) continue;
    const s = ch.getSampler();
    const inp = s.getInput().getArray();
    dur = Math.max(dur, inp[inp.length - 1]);
    canais.push({ alvo, path: ch.getTargetPath(), s });
  }
  let piorP95 = 0, piorPct = 0, somaP95 = 0, n = 0;
  const sem = { hipsY: [], peMin: [], punhos: [], cabecaY: [], cruzados: 0, frames: 0, hipsX: [], kneeRatio: 0 };
  for (let a = 0; a < AMOSTRAS; a++) {
    const t = (dur * a) / AMOSTRAS;
    const compos = new Map();
    for (const c of canais) {
      if (!compos.has(c.alvo)) compos.set(c.alvo, { t: c.alvo.getTranslation().slice(), r: c.alvo.getRotation().slice(), s: c.alvo.getScale().slice() });
      const o = compos.get(c.alvo);
      if (c.path === 'translation') o.t = amostra(c.s, t, 3);
      else if (c.path === 'rotation') o.r = amostra(c.s, t, 4);
      else if (c.path === 'scale') o.s = amostra(c.s, t, 3);
    }
    const locais = new Map();
    for (const [nd, o] of compos) locais.set(nd, new THREE.Matrix4().compose(
      new THREE.Vector3().fromArray(o.t), new THREE.Quaternion().fromArray(o.r), new THREE.Vector3().fromArray(o.s)));
    const wm = mundo(locais);
    const pos = canais.length ? pele(wm) : bind;
    const st = [];
    let over = 0;
    for (let e = 0; e < E.length; e++) {
      const L0 = Lbind[e]; if (L0 < 1e-6) continue;
      const L = pos[E[e][0]].distanceTo(pos[E[e][1]]);
      const r = (L >= L0 ? L / L0 : L0 / Math.max(L, 1e-9)) - 1;
      st.push(r); if (r > 0.25) over++;
    }
    st.sort((x, y) => x - y);
    const p95 = qtl(st, 0.95);
    somaP95 += p95; n++;
    piorP95 = Math.max(piorP95, p95);
    piorPct = Math.max(piorPct, (100 * over) / st.length);
    if (canais.length) {
      const hips = bonePos(wm, 'Hips'), head = bonePos(wm, 'Head');
      const lw = bonePos(wm, 'LeftHand'), rw = bonePos(wm, 'RightHand');
      const lf = bonePos(wm, 'LeftFoot'), rf = bonePos(wm, 'RightFoot');
      const lk = bonePos(wm, 'LeftLeg'), rk = bonePos(wm, 'RightLeg');
      if (hips) { sem.hipsY.push(+hips.y.toFixed(3)); sem.hipsX.push(+hips.x.toFixed(3)); }
      if (head) sem.cabecaY.push(+head.y.toFixed(3));
      if (lw && rw) sem.punhos.push(+lw.distanceTo(rw).toFixed(3));
      // marcha de joelho alto ("sneak"): joelho máximo como fração da altura do quadril
      if (hips && lk && rk && hips.y > 0.05) sem.kneeRatio = Math.max(sem.kneeRatio, Math.max(lk.y, rk.y) / hips.y);
      // marcha cruzada: pé esquerdo anatômico (+X) à DIREITA do pé direito
      if (lf && rf) { sem.frames++; if (lf.x < rf.x - 0.02) sem.cruzados++; }
      let pe = 1e9;
      for (const vi of footV) pe = Math.min(pe, pos[vi].y);
      sem.peMin.push(+pe.toFixed(3));
    }
  }
  const mm = (arr) => arr.length ? { min: Math.min(...arr), max: Math.max(...arr), med: +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3) } : null;
  res.clipes[cl] = {
    dur: +dur.toFixed(2), canais: canais.length,
    esticP95med: +(somaP95 / n).toFixed(3), esticP95pior: +piorP95.toFixed(3), pctAcima25: +piorPct.toFixed(2),
    semantica: {
      hipsY: mm(sem.hipsY), cabecaY: mm(sem.cabecaY), peMinY: mm(sem.peMin), punhosDist: mm(sem.punhos),
      hipsX: mm(sem.hipsX),
      fracPesCruzados: sem.frames ? +(sem.cruzados / sem.frames).toFixed(3) : null,
      kneeRatioMax: +sem.kneeRatio.toFixed(3),
    },
  };
}
const txt = JSON.stringify(res, null, 1);
if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, txt + '\n'); }
console.log(txt);
