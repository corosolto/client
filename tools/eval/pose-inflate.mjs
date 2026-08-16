/* pose-inflate.mjs — "BALÃO" MEDIDO EM MOVIMENTO, não em bind pose.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   O C7 do char-probe mede `raioSkin` na BIND POSE e está escrito lá que "nada aqui
   depende de clipe". Isso deixou o defeito mais antigo em aberto sem régua: a queixa do
   dono é "postura de BALÃO", e balão é o que acontece quando o clipe roda — a malha
   INFLA. Bind pose não infla nada; ela é a pose em que o erro de skin vale exatamente
   zero por construção (v_bind = v).

   Esta régua faz o LBS na unha (as mesmas contas do three.js: sum_k w_k · M_k · IBM_k · v),
   aplica os clipes REAIS que o jogo usa (`public/models/anims/<id>/*.glb`) e mede, contra
   a bind, duas coisas:

     • esticamentoP95 — por ARESTA de triângulo, |L_posado / L_bind − 1|. É a métrica
       clássica de artefato de skinning: aresta que estica é malha sendo puxada por
       ossos que discordam. Um rig limpo fica quase todo abaixo de 0,10.
     • %arestas>25% — fração de arestas esticadas mais de um quarto. É o que o olho lê
       como membro derretendo/inflando.
     • volumeRel — bbox posada ÷ bbox bind (proxy barato de "encheu").

   ARMADILHA JÁ PAGA NESTA RODADA (não repita): medir raio de vértice até OSSO na bind
   não mede balão. 60% dos vértices dos funkeiros estão presos ao `head_end`, que é uma
   FOLHA rígida 29,5 cm acima do `Head` — e o char-probe, sem filho pra formar segmento,
   mede distância até o PONTO. Deformação de `head_end` é idêntica à de `Head`
   (M_filho·IBM_filho = M_pai·L·L⁻¹·IBM_pai = M_pai·IBM_pai, e as tracks de `head_end`
   nos clipes são CONSTANTES e iguais à rest — conferido), ou seja: aquele 0,171 × 0,087
   é rótulo, não pixel. Prova: remapear folha→pai leva raul de 0,171 para 0,074 SEM
   TOCAR EM UM VÉRTICE. Ver tools/raio-por-osso.mjs.

   uso: node tools/eval/pose-inflate.mjs [id ...]        (sem argumento = todos)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import fs from 'node:fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const CHARS = 'public/models/characters';
const ANIMS = 'public/models/anims';
const CLIPES = ['walk', 'run', 'idle', 'crouchwalk'];
const AMOSTRAS = 8;

const trs = (n) => new THREE.Matrix4().compose(
  new THREE.Vector3().fromArray(n.getTranslation()),
  new THREE.Quaternion().fromArray(n.getRotation()),
  new THREE.Vector3().fromArray(n.getScale()));

function lerNode(doc) {
  const parent = new Map();
  for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
  return parent;
}

// amostra um sampler glTF no tempo t (LINEAR; quaternion via slerp)
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
  if (dim === 4) { // renormaliza quaternion (lerp + normalize ≈ slerp para passos curtos)
    const L = Math.hypot(v[0], v[1], v[2], v[3]) || 1;
    for (let k = 0; k < 4; k++) v[k] /= L;
  }
  return v;
}

function metricas(id) {
  const file = `${CHARS}/${id}.glb`;
  if (!fs.existsSync(file)) return null;
  const doc = io.readSync ? io.readSync(file) : null; // placeholder, substituído abaixo
  return doc;
}

const TOP = process.argv.includes('--top');
const qtl = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];

async function medir(id) {
  // id pode ser um caminho de arquivo (para comparar variantes fora de public/).
  // Nesse caso os clipes vêm do prefixo antes do primeiro '_' do nome do arquivo.
  const eCaminho = id.includes('/') || id.endsWith('.glb');
  const file = eCaminho ? id : `${CHARS}/${id}.glb`;
  const animId = eCaminho ? id.split('/').pop().replace('.glb', '').split('_')[0] : id;
  if (!fs.existsSync(file)) return null;
  const doc = await io.read(file);
  const skin = doc.getRoot().listSkins()[0];
  if (!skin) return null;
  const joints = skin.listJoints();
  const jIdx = new Map(joints.map((j, i) => [j, i]));
  const parent = lerNode(doc);
  const ibmArr = skin.getInverseBindMatrices().getArray();
  const IBM = joints.map((_, i) => new THREE.Matrix4().fromArray(Array.from(ibmArr.slice(i * 16, i * 16 + 16))));

  // cadeia até a raiz (inclui a Armature de escala 0,01)
  const ordem = [];
  { // topológica: pais antes de filhos
    const vis = new Set();
    const push = (n) => { if (!n || vis.has(n)) return; push(parent.get(n)); vis.add(n); ordem.push(n); };
    for (const j of joints) push(j);
  }

  // vértices + arestas
  const verts = [], arestas = new Set();
  for (const nd of doc.getRoot().listNodes()) {
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

  const mundo = (locais) => {           // locais: Map(node -> Matrix4) sobrescrevendo o rest
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
  // sanidade: bind (sem clipe) tem que reproduzir a malha original
  const bind = pele(mundo(new Map()));
  let errBind = 0;
  for (let i = 0; i < verts.length; i += Math.max(1, (verts.length / 500) | 0)) errBind = Math.max(errBind, bind[i].distanceTo(verts[i].p));

  const res = { id: eCaminho ? id.split('/').slice(-2).join('/').replace('.glb', '') : id, errBind: +errBind.toFixed(4), clipes: {} };
  for (const cl of CLIPES) {
    // mesmo fallback do jogo (glbchars.js:277-279): sem pasta por personagem, cai no
    // pack compartilhado models/anims/mixamo/. É assim que os 8 palhaços andam.
    let cf = `${ANIMS}/${animId}/${cl}.glb`;
    if (!fs.existsSync(cf)) cf = `${ANIMS}/mixamo/${cl}.glb`;
    if (!fs.existsSync(cf)) continue;
    const cd = await io.read(cf);
    const anim = cd.getRoot().listAnimations()[0];
    if (!anim) continue;
    const porNome = new Map();
    for (const nd of doc.getRoot().listNodes()) if (!porNome.has(nd.getName())) porNome.set(nd.getName(), nd);
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
    if (!canais.length) continue;
    let piorP95 = 0, piorPct = 0, piorVol = 1, somaP95 = 0, n = 0;
    const culpa = new Map();
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
      const pos = pele(mundo(locais));
      const st = [];
      let over = 0;
      for (let e = 0; e < E.length; e++) {
        const L0 = Lbind[e]; if (L0 < 1e-6) continue;
        /* SIMÉTRICA. A primeira versão usava |L/L0 − 1|, que satura em 1,0 quando a
           aresta COLABA (L→0) mas é ilimitada quando estica. Isso fez a régua premiar
           malha rasgada: no jozo, o tronco ANTES abria num talho — colapso puro — e
           marcava 0,567 contra 0,760 do reskin, ao contrário do que a imagem mostra
           (/tmp/reskin/jozo_ANTES.png × jozo_DEPOIS.png). Razão simétrica
           max(L/L0, L0/L) − 1 pune encolher e esticar na mesma moeda. */
        const L = pos[E[e][0]].distanceTo(pos[E[e][1]]);
        const r = (L >= L0 ? L / L0 : L0 / Math.max(L, 1e-9)) - 1;
        st.push(r); if (r > 0.25) over++;
      }
      if (TOP) { // de ONDE vem o esticamento: par de ossos dominantes das pontas da aresta
        for (let e = 0; e < E.length; e++) {
          const L0 = Lbind[e]; if (L0 < 1e-6) continue;
          const L = pos[E[e][0]].distanceTo(pos[E[e][1]]);
          const r = (L >= L0 ? L / L0 : L0 / Math.max(L, 1e-9)) - 1;
          if (r < 0.25) continue;
          const dom = (vi) => { const v = verts[vi]; let bi = 0, bw = -1; for (let k = 0; k < 4; k++) if (v.w[k] > bw) { bw = v.w[k]; bi = v.j[k]; } return joints[bi].getName(); };
          const key = [dom(E[e][0]), dom(E[e][1])].sort().join(' × ');
          culpa.set(key, (culpa.get(key) || 0) + r);
        }
      }
      st.sort((x, y) => x - y);
      const p95 = qtl(st, 0.95);
      somaP95 += p95; n++;
      piorP95 = Math.max(piorP95, p95);
      piorPct = Math.max(piorPct, (100 * over) / st.length);
      const bb = (arr) => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const v of arr) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v.getComponent(k)); mx[k] = Math.max(mx[k], v.getComponent(k)); } return (mx[0] - mn[0]) * (mx[1] - mn[1]) * (mx[2] - mn[2]); };
      piorVol = Math.max(piorVol, bb(pos) / bb(bind));
    }
    if (TOP) {
      const top = [...culpa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
      console.log(`\n-- ${res.id} / ${cl}: pares de ossos que mais esticam (soma do excesso)`);
      for (const [k, v] of top) console.log('   ' + k.padEnd(34) + v.toFixed(0));
    }
    res.clipes[cl] = { esticP95med: +(somaP95 / n).toFixed(3), esticP95pior: +piorP95.toFixed(3), pctAcima25: +piorPct.toFixed(2), volRel: +piorVol.toFixed(2) };
  }
  return res;
}

const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const alvos = ids.length ? ids : fs.readdirSync(CHARS).filter((f) => f.endsWith('.glb')).map((f) => f.replace('.glb', ''));
const out = [];
for (const id of alvos) {
  const r = await medir(id);
  if (r) out.push(r);
}
console.log('\n=== BALÃO EM MOVIMENTO (LBS aplicado; bind = 0 por construção) ===');
console.log('id'.padEnd(16), 'errBind'.padStart(8), 'estic.P95'.padStart(10), '%>25%'.padStart(7), 'volRel'.padStart(7), '  (pior clipe)');
const linhas = out.map((r) => {
  const cs = Object.entries(r.clipes);
  if (!cs.length) return { id: r.id, p95: null };
  const pior = cs.reduce((a, b) => (b[1].esticP95pior > a[1].esticP95pior ? b : a));
  return { id: r.id, errBind: r.errBind, p95: pior[1].esticP95pior, pct: pior[1].pctAcima25, vol: pior[1].volRel, cl: pior[0] };
});
linhas.sort((a, b) => (b.p95 ?? -1) - (a.p95 ?? -1));
for (const l of linhas) {
  if (l.p95 == null) { console.log(l.id.padEnd(16), '— sem clipe'); continue; }
  console.log(l.id.padEnd(16), String(l.errBind).padStart(8), l.p95.toFixed(3).padStart(10), l.pct.toFixed(1).padStart(7), l.vol.toFixed(2).padStart(7), '  ' + l.cl);
}
fs.writeFileSync('tools/eval/pose_inflate.json', JSON.stringify({ gerado: new Date().toISOString(), amostras: AMOSTRAS, clipes: CLIPES, personagens: out }, null, 1));
console.log('\n-> tools/eval/pose_inflate.json');
