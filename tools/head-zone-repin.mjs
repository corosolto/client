/* head-zone-repin.mjs — TIRA o peso de BRAÇO da zona da cabeça, cirurgicamente.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE ESTE ARQUIVO CONSERTA (17/09, portão vermelho da main — 14 reprovados
   num portão que declara 12; select-inflate com teto 23,6 ruins/1e4)

   Lampião (43,2) e Maria Bonita (31,3) entraram na main (PR #570) com a malha do
   CHAPÉU pintada em osso de BRAÇO. A aba larga do chapéu de cangaceiro fica, no bind
   T-pose, mais perto do segmento ombro→cotovelo do que do segmento curto da cabeça;
   o auto-skin por proximidade do rig-from-donor cravou "rígido no mais próximo" e a
   aba virou carne de LeftArm/RightArm (medido: toda aresta ruinosa era Head↔Arm,
   L0 1,4 → L 23,8, r = 15,9). No idle o braço abana e a aba fica.

   A REGRA, REVISTA APÓS MEDIÇÃO: vértice acima da junta do pescoço (menos 1 cm de
   folga pro maxilar) não pode carregar peso em OSSO DE SUBTREE DE BRAÇO
   ({Left,Right}Shoulder → Arm → ForeArm → Hand → Curl). Cada slot assim transfere o
   peso para o osso mais próximo da CADEIA DA CABEÇA (neck → Head → folhas), por
   distância de segmento — a mesma métrica do reskin-glb. O TRONCO (Hips/Spine*)
   continua permitido no peito superior: a primeira versão bania todo osso fora da
   cadeia do pescoço, travava o peito na cabeça e PIORAVA medido (lampiao 43,2 → 62,2,
   máx 45,9; o peito superior passa da linha do pescoço e obedece ao Spine).

   POR QUE REPIN E NÃO RESKIN INTEIRO (medido): rodar o reskin-glb com a guarda de
   zona recalcularia TODOS os pesos com parâmetros default e perderia o tuning que
   trouxe lampiao de 121,5 a 42,3 — nesta sessão, 43,2 → 57,7. O repin preserva byte a
   byte todo peso que não é de braço-na-zona-da-cabeça.

   REVERSIBILIDADE: `git checkout` do GLB devolve os 14 reprovados na hora.

   uso: node tools/head-zone-repin.mjs <in.glb> <out.glb>
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('uso: head-zone-repin <in.glb> <out.glb>'); process.exit(1); }

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const skin = doc.getRoot().listSkins()[0];
if (!skin) { console.error('GLB sem skin'); process.exit(1); }
const joints = skin.listJoints();
const jIdx = new Map(joints.map((j, i) => [j, i]));

const parent = new Map();
for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
const local = new Map();
for (const n of doc.getRoot().listNodes()) local.set(n, new THREE.Matrix4().compose(
  new THREE.Vector3().fromArray(n.getTranslation()),
  new THREE.Quaternion().fromArray(n.getRotation()),
  new THREE.Vector3().fromArray(n.getScale())));
const wm = new Map();
const world = (n) => {
  if (wm.has(n)) return wm.get(n);
  const p = parent.get(n);
  const m = p ? new THREE.Matrix4().multiplyMatrices(world(p), local.get(n)) : local.get(n).clone();
  wm.set(n, m); return m;
};
for (const n of doc.getRoot().listNodes()) world(n);

const jp = joints.map((j) => new THREE.Vector3().setFromMatrixPosition(wm.get(j)));
const nomes = joints.map((j) => j.getName());
const kids = joints.map(() => []);
joints.forEach((j, i) => j.listChildren().forEach((c) => { if (jIdx.has(c)) kids[i].push(jIdx.get(c)); }));

/* Zona: acima do pescoço. Cadeia da cabeça: neck + descendentes. */
const neckIdx = nomes.findIndex((s) => /^neck$/i.test(s));
if (neckIdx < 0) { console.error('rig sem junta neck — zona de cabeça indefinida'); process.exit(1); }
const cadeiaCabeca = new Set();
{ const f = [neckIdx]; while (f.length) { const i = f.pop(); if (cadeiaCabeca.has(i)) continue; cadeiaCabeca.add(i); for (const c of kids[i]) f.push(c); } }
const yZona = jp[neckIdx].y - 0.01;

/* Proibidos na zona: subtrees de ombro (braço inteiro, Curl incluído). */
const armado = new Set();
nomes.forEach((nm, i) => {
  if (!/^(left|right)(shoulder|arm)$/i.test(nm)) return;
  const f = [i];
  while (f.length) { const j = f.pop(); if (armado.has(j)) continue; armado.add(j); for (const c of kids[j]) f.push(c); }
});

/* Segmentos da cadeia da cabeça (junta → cada filho não-degenerado; sem filho, toco). */
const MIN_SEG = 0.02;
const segsCabeca = [];
for (const i of cadeiaCabeca) {
  let usou = 0;
  for (const c of kids[i]) {
    if (jp[i].distanceTo(jp[c]) < MIN_SEG) continue;
    segsCabeca.push({ a: jp[i].clone(), b: jp[c].clone(), idx: i }); usou++;
  }
  if (!usou) {
    const filhos = joints[i].listChildren();
    const dir = filhos.length
      ? new THREE.Vector3().subVectors(new THREE.Vector3().setFromMatrixPosition(wm.get(filhos[0])), jp[i])
      : new THREE.Vector3(0, 0.06, 0);
    const L = Math.min(0.08, Math.max(0.03, dir.length() || 0.05));
    segsCabeca.push({ a: jp[i].clone(), b: jp[i].clone().addScaledVector(dir.normalize(), L), idx: i });
  }
}
if (!segsCabeca.length) { console.error('cadeia da cabeça sem segmentos'); process.exit(1); }

const _ab = new THREE.Vector3(), _ap = new THREE.Vector3();
function segDist2(p, s) {
  _ab.subVectors(s.b, s.a);
  const L = _ab.lengthSq();
  let t = L > 1e-12 ? _ap.subVectors(p, s.a).dot(_ab) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return _ap.copy(p).sub(s.a.clone().addScaledVector(_ab, t)).lengthSq();
}
const POT = 1.5;
function blendCabeca(p) {
  const m = new Map();
  for (const s of segsCabeca) {
    const d2 = segDist2(p, s);
    m.set(s.idx, (m.get(s.idx) || 0) + 1 / Math.pow(d2 + 1e-5, POT));
  }
  return m;
}
const maisPerto = (p) => {
  let melhor = segsCabeca[0].idx, d = segDist2(p, segsCabeca[0]);
  for (const s of segsCabeca) { const dd = segDist2(p, s); if (dd < d) { d = dd; melhor = s.idx; } }
  return melhor;
};

let totVerts = 0, naZona = 0, vertsTocados = 0, slotsMovidos = 0;
for (const nd of doc.getRoot().listNodes()) {
  const mesh = nd.getMesh();
  if (!mesh || !nd.getSkin()) continue;
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
    if (!P || !J || !W) continue;
    const n = P.getCount();
    totVerts += n;
    const JI = new Uint16Array(n * 4), JW = new Float32Array(n * 4);
    const elX = new Float32Array(n), elY = new Float32Array(n), elZ = new Float32Array(n), zonaFlag = new Uint8Array(n);
    const el = [], je = [], we = [], p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      P.getElement(i, el); J.getElement(i, je); W.getElement(i, we);
      p.set(el[0], el[1], el[2]);
      elX[i] = el[0]; elY[i] = el[1]; elZ[i] = el[2];
      if (p.y > yZona) { zonaFlag[i] = 1;
        naZona++;
        // peso de tronco (fora da cadeia da cabeça e não-braço) é PRESERVADO
        let wTronco = 0;
        const troncoSlots = [];
        for (let k = 0; k < 4; k++) {
          if (we[k] <= 0) continue;
          if (cadeiaCabeca.has(je[k])) continue;
          if (armado.has(je[k])) { slotsMovidos++; continue; }   // braço na zona: some
          wTronco += we[k]; troncoSlots.push([je[k], we[k]]);
        }
        // blend POT (inverso-distância^1.5, a mesma mistura do reskin-glb) sobre os
        // segmentos da cadeia da cabeça — gradiente neck→Head na costura em vez de
        // fronteira rígida 1.0/1.0, que o balanço da cabeça no idle rasga.
        const cab = blendCabeca(p);
        const ord = [...cab.entries()].sort((a, b) => b[1] - a[1]).slice(0, wTronco > 0.001 ? 3 : 4);
        const tot = ord.reduce((a, b) => a + b[1], 0) || 1;
        let s = 0;
        for (let k = 0; k < ord.length; k++, s++) { JI[i*4+k] = ord[k][0]; JW[i*4+k] = (ord[k][1] / tot) * (1 - wTronco); }
        for (const [jb, wb] of troncoSlots) { if (s >= 4) break; JI[i*4+s] = jb; JW[i*4+s] = wb; s++; }
        for (; s < 4; s++) { JI[i*4+s] = JI[i*4]; JW[i*4+s] = 0; }
        vertsTocados++;
        continue;
      }
      for (let k = 0; k < 4; k++) { JI[i*4+k] = je[k]; JW[i*4+k] = we[k]; }
    }
    /* SUAVIZAÇÃO — média com a vizinhança do triângulo, a mesma do reskin-glb: sem ela
       a fronteira da zona é um degrau (blend em cima, rígido embaixo) e o degrau rasga
       (medido: repin sem suavização 27,9/26,6 contra teto 23,6). Adjacência por POSIÇÃO
       quantizada, não por índice, porque costura de UV duplica vértice. Só vértices DA
       ZONA entram na média (o corpo abaixo fica byte a byte como está), mas a média puxa
       os pesos dos vizinhos DE FORA — é isso que cria a pena na fronteira. */
    const SUAVIZA = +(process.env.SUAVIZA ?? 3);
    if (SUAVIZA > 0) {
      const chave = (x, y, z) => `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;
      const porPos = new Map();
      for (let i = 0; i < n; i++) { const k = chave(elX[i], elY[i], elZ[i]); if (!porPos.has(k)) porPos.set(k, []); porPos.get(k).push(i); }
      const canon = new Array(n);
      for (const [, arr] of porPos) for (const i of arr) canon[i] = arr[0];
      const viz = new Map();
      const liga = (a, b) => { const x = canon[a], y = canon[b]; if (x === y) return; if (!viz.has(x)) viz.set(x, new Set()); viz.get(x).add(y); };
      const ind = prim.getIndices();
      const NI = ind ? ind.getCount() : n;
      const gi = (k) => (ind ? ind.getScalar(k) : k);
      for (let k = 0; k + 2 < NI; k += 3) {
        const a = gi(k), b = gi(k + 1), c = gi(k + 2);
        liga(a, b); liga(b, a); liga(b, c); liga(c, b); liga(c, a); liga(a, c);
      }
      const naZonaArr = zonaFlag;
      /* anel de fronteira: vizinhos de fora da zona também entram na média — o degrau
         rasga dos DOIS lados (medido: 25,2 -> alvo 23,6 faltava só isso). */
      const anel = new Uint8Array(n);
      for (const [c, vz] of viz) {
        if (!naZonaArr[c]) continue;
        for (const v of vz) if (!naZonaArr[v]) anel[v] = 1;
      }
      for (let it = 0; it < SUAVIZA; it++) {
        const novo = new Map();
        for (const [c, vz] of viz) {
          if (!naZonaArr[c] && !anel[c]) continue;
          const m = new Map();
          const addW = (ji, w, f) => m.set(ji, (m.get(ji) || 0) + w * f);
          for (let k = 0; k < 4; k++) if (JW[c*4+k] > 0) addW(JI[c*4+k], JW[c*4+k], 0.5);
          const f = 0.5 / vz.size;
          for (const v of vz) for (let k = 0; k < 4; k++) if (JW[v*4+k] > 0) addW(JI[v*4+k], JW[v*4+k], f);
          novo.set(c, m);
        }
        for (const [c, m] of novo) {
          const ord = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
          const tot = ord.reduce((a, b) => a + b[1], 0) || 1;
          for (let k = 0; k < 4; k++) {
            if (k < ord.length) { JI[c*4+k] = ord[k][0]; JW[c*4+k] = ord[k][1] / tot; }
            else { JI[c*4+k] = ord[0][0]; JW[c*4+k] = 0; }
          }
        }
      }
    }
    const buffer = doc.getRoot().listBuffers()[0] || doc.createBuffer();
    prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(JI).setBuffer(buffer));
    prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(JW).setBuffer(buffer));
    J.dispose(); W.dispose();
  }
}
await io.write(outPath, doc);
console.log(`${inPath.split('/').pop()} -> ${outPath.split('/').pop()}  | ${totVerts} verts, ${naZona} na zona, ${vertsTocados} repintados (${slotsMovidos} slots de braço realocados para a cadeia da cabeça)`);
