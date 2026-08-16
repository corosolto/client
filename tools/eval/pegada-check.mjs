/* ============================================================================
   pegada-check.mjs — A RÉGUA DA PEGADA NA ALTURA DO CORPO (Brasília).
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Reprovação do dono (05/08): "o mapa de brasília ainda tem problemas com o box
   do ônibus e barracas" — DEPOIS de o obb-check ficar verde. O obb-check anda com
   o `_collide` de produção e compara com a CAIXA DECLARADA do colisor; ele é cego
   quando a caixa declarada é mais gorda que a malha visível. Era o caso: os
   colisores nasciam do Box3 do GLB INTEIRO, e o Box3 conta guarda-sol, telhado de
   barraquinha, saia de lona e retrovisor como parede na altura do peito.

   O CONSERTO que esta régua guarda: `PEGADA_CORPO` (map_brasilia.js) — frações do
   box local medidas por vértice na FAIXA DE COLISÃO do jogador (y 0,25–2,05 m),
   percentil 1–99 ponderado por área de triângulo — e `PEGADA_BUS` (meias-larguras
   do colRot do ônibus). Números baked desatualizam quando alguém troca o GLB:
   esta régua RECOMPUTA a pegada do arquivo e acusa a deriva.

   VERMELHA quando:
     · uma fração da tabela difere da recomputada em > 0,035 (≈ 8–11 cm nos props);
     · o hx/hz do ônibus difere em > 0,08 m;
     · um GLB da tabela não existe/não abre (tabela órfã é tabela morta).

   Uso: node tools/eval/pegada-check.mjs
   ============================================================================ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import path from 'node:path';
import url from 'node:url';
// harness primeiro (efeito colateral: DOM stubado + ponte `three`) — sem ele o import
// de map_brasilia.js morre em `location` dentro de textures.js.
await import('./harness.mjs');
const { PEGADA_CORPO, PEGADA_BUS } = await import('../../public/js/map_brasilia.js');

const RAIZ = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(RAIZ, 'public', 'models', 'props');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/* targetH usado pelo map_brasilia.js em cada putBuilding — a faixa de colisão em y é
   função dele. Se o mapa mudar o targetH de um prop, atualize AQUI também (a régua
   acusaria deriva de qualquer forma, mas com número enganoso). */
const TARGETH = { tent: 1.7, stall: 2.7, drinkstand: 3.2, bus: 3.1 };
const FAIXA = [0.25, 2.05];        // metros de mundo: tornozelo-ombro do corpo que colide
const TOL_FRACAO = 0.035;
const TOL_BUS = 0.12;              // m
const TOL_BUS_ANG = 0.04;          // rad — deriva do ângulo do corpo dentro da caixa

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function localMatrix(node) {
  const t = node.getTranslation(), r = node.getRotation(), s = node.getScale();
  const [x, y, z, w] = r; const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2,
    wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1];
}
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
const xf = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
function pct(vals, w, q) {
  const tot = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < vals.length; i++) { acc += w[i]; if (acc / tot >= q) return vals[i]; }
  return vals[vals.length - 1];
}

/* Recomputa, para um GLB, a pegada p1–99 (por área) na faixa de colisão.
   Devolve frações do box local + extensões em metros de mundo. */
async function pegadaDoGLB(id) {
  const doc = await io.read(path.join(DIR, id + '.glb'));
  const tris = [];
  const anda = (node, parent) => {
    const m = mul(parent, localMatrix(node));
    const mesh = node.getMesh();
    if (mesh) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const arr = pos.getArray(), idx = prim.getIndices();
      const ind = idx ? idx.getArray() : null;
      const n = ind ? ind.length : pos.getCount();
      for (let i = 0; i + 2 < n; i += 3) {
        tris.push([0, 1, 2].map((k) => {
          const vi = ind ? ind[i + k] : i + k;
          return xf(m, [arr[vi * 3], arr[vi * 3 + 1], arr[vi * 3 + 2]]);
        }));
      }
    }
    for (const c of node.listChildren()) anda(c, m);
  };
  for (const sc of doc.getRoot().listScenes()) for (const n of sc.listChildren()) anda(n, IDENT);

  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const t of tris) for (const p of t) for (let a = 0; a < 3; a++) {
    if (p[a] < mn[a]) mn[a] = p[a]; if (p[a] > mx[a]) mx[a] = p[a];
  }
  const s = TARGETH[id] / (mx[1] - mn[1]);
  const X = [], Z = [], W = [];
  for (const t of tris) {
    const worldY = ((t[0][1] + t[1][1] + t[2][1]) / 3 - mn[1]) * s;
    if (worldY < FAIXA[0] || worldY > FAIXA[1]) continue;
    const u = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const v = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    const a2 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    X.push((t[0][0] + t[1][0] + t[2][0]) / 3);
    Z.push((t[0][2] + t[1][2] + t[2][2]) / 3);
    W.push(Math.hypot(a2[0], a2[1], a2[2]) / 2);
  }
  const orden = (A) => {
    const o = A.map((v, i) => i).sort((a, b) => A[a] - A[b]);
    return { v: o.map((i) => A[i]), w: o.map((i) => W[i]) };
  };
  const sx = orden(X), sz = orden(Z);
  const x0 = pct(sx.v, sx.w, 0.01), x1 = pct(sx.v, sx.w, 0.99);
  const z0 = pct(sz.v, sz.w, 0.01), z1 = pct(sz.v, sz.w, 0.99);
  return {
    fx0: (x0 - mn[0]) / (mx[0] - mn[0]), fx1: (x1 - mn[0]) / (mx[0] - mn[0]),
    fz0: (z0 - mn[2]) / (mx[2] - mn[2]), fz1: (z1 - mn[2]) / (mx[2] - mn[2]),
    wx: (x1 - x0) * s, wz: (z1 - z0) * s,
  };
}

/* OBB do corpo por PCA (4ª passada do BUG-21): centróides dos triângulos na faixa,
   ponderados por área; devolve o ângulo do eixo principal no arquivo (normalizado em
   (-π/2, π/2]) e as meias-larguras p1–99 ao longo dos eixos do corpo, em metros de mundo. */
async function obbDoGLB(id) {
  const doc = await io.read(path.join(DIR, id + '.glb'));
  const tris = [];
  const anda = (node, parent) => {
    const m = mul(parent, localMatrix(node));
    const mesh = node.getMesh();
    if (mesh) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const arr = pos.getArray(), idx = prim.getIndices();
      const ind = idx ? idx.getArray() : null;
      const n = ind ? ind.length : pos.getCount();
      for (let i = 0; i + 2 < n; i += 3) {
        tris.push([0, 1, 2].map((k) => {
          const vi = ind ? ind[i + k] : i + k;
          return xf(m, [arr[vi * 3], arr[vi * 3 + 1], arr[vi * 3 + 2]]);
        }));
      }
    }
    for (const c of node.listChildren()) anda(c, m);
  };
  for (const sc of doc.getRoot().listScenes()) for (const n of sc.listChildren()) anda(n, IDENT);
  let mnY = 1e9, mxY = -1e9;
  for (const t of tris) for (const p of t) { mnY = Math.min(mnY, p[1]); mxY = Math.max(mxY, p[1]); }
  const s = TARGETH[id] / (mxY - mnY);
  const P = [], W = [];
  for (const t of tris) {
    const wy = ((t[0][1] + t[1][1] + t[2][1]) / 3 - mnY) * s;
    if (wy < FAIXA[0] || wy > FAIXA[1]) continue;
    const u = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const v = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    const a2 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    P.push([((t[0][0] + t[1][0] + t[2][0]) / 3) * s, ((t[0][2] + t[1][2] + t[2][2]) / 3) * s]);
    W.push(Math.hypot(a2[0], a2[1], a2[2]) / 2);
  }
  const tot = W.reduce((a, b) => a + b, 0);
  const cx = P.reduce((a, p, i) => a + p[0] * W[i], 0) / tot;
  const cz = P.reduce((a, p, i) => a + p[1] * W[i], 0) / tot;
  let sxx = 0, sxz = 0, szz = 0;
  for (let i = 0; i < P.length; i++) {
    const dx = P[i][0] - cx, dz = P[i][1] - cz;
    sxx += dx * dx * W[i]; sxz += dx * dz * W[i]; szz += dz * dz * W[i];
  }
  sxx /= tot; sxz /= tot; szz /= tot;
  const tr = sxx + szz, det = sxx * szz - sxz * sxz;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
  let theta = Math.atan2(l1 - sxx, sxz);
  while (theta > Math.PI / 2) theta -= Math.PI;
  while (theta <= -Math.PI / 2) theta += Math.PI;
  const c = Math.cos(theta), sn = Math.sin(theta);
  const us = [], vs = [], wu = [], wv = [];
  for (let i = 0; i < P.length; i++) {
    us.push((P[i][0] - cx) * c + (P[i][1] - cz) * sn); wu.push(W[i]);
    vs.push(-(P[i][0] - cx) * sn + (P[i][1] - cz) * c); wv.push(W[i]);
  }
  const ordU = us.map((v, i) => i).sort((a, b) => us[a] - us[b]);
  const ordV = vs.map((v, i) => i).sort((a, b) => vs[a] - vs[b]);
  const pu = { v: ordU.map((i) => us[i]), w: ordU.map((i) => wu[i]) };
  const pv = { v: ordV.map((i) => vs[i]), w: ordV.map((i) => wv[i]) };
  return { theta, hx: (pct(pu.v, pu.w, 0.99) - pct(pu.v, pu.w, 0.01)) / 2,
           hz: (pct(pv.v, pv.w, 0.99) - pct(pv.v, pv.w, 0.01)) / 2 };
}

let vermelho = 0;
for (const [id, peg] of Object.entries(PEGADA_CORPO)) {
  let m;
  try { m = await pegadaDoGLB(id); }
  catch (e) { console.log(`PEGADA VERMELHA  ${id}: GLB não abre (${e.message}) — tabela órfã`); vermelho++; continue; }
  const difs = [['x0', peg.x0, m.fx0], ['x1', peg.x1, m.fx1], ['z0', peg.z0, m.fz0], ['z1', peg.z1, m.fz1]]
    .map(([n, a, b]) => [n, Math.abs(a - b)]).filter(([, d]) => d > TOL_FRACAO);
  const mal = difs.length > 0;
  if (mal) vermelho++;
  console.log(`${mal ? 'PEGADA VERMELHA ' : 'PEGADA ok       '}${id.padEnd(11)} ` +
    `tabela (${peg.x0},${peg.x1})×(${peg.z0},${peg.z1}) | GLB (${m.fx0.toFixed(3)},${m.fx1.toFixed(3)})×(${m.fz0.toFixed(3)},${m.fz1.toFixed(3)})` +
    (mal ? ` | deriva: ${difs.map(([n, d]) => `${n}+${d.toFixed(3)}`).join(' ')}` : ''));
}
{
  /* 4ª PASSADA do BUG-21 (06/08): o corpo do ônibus é TORTO dentro da caixa do GLB
     (-16,1° do eixo x do arquivo), então a pegada no eixo da caixa ficava ~20° fora da
     lataria — 3,2 m de parede fantasma pra bala, medido no browser. A régua do ônibus
     agora é OBB: PCA dos centróides (ponderados por área) na faixa do corpo. */
  let m;
  try { m = await obbDoGLB('bus'); }
  catch (e) { console.log(`PEGADA VERMELHA  bus: GLB não abre (${e.message})`); vermelho++; m = null; }
  if (m) {
    const dth = Math.abs(m.theta + PEGADA_BUS.ryCorr);   // ryCorr = -θ do corpo no arquivo
    const dx = Math.abs(m.hx - PEGADA_BUS.hx), dz = Math.abs(m.hz - PEGADA_BUS.hz);
    const mal = dth > TOL_BUS_ANG || dx > TOL_BUS || dz > TOL_BUS;
    if (mal) vermelho++;
    console.log(`${mal ? 'PEGADA VERMELHA ' : 'PEGADA ok       '}bus         ` +
      `ryCorr ${PEGADA_BUS.ryCorr.toFixed(4)} hx ${PEGADA_BUS.hx.toFixed(3)} hz ${PEGADA_BUS.hz.toFixed(3)} | ` +
      `GLB θ ${m.theta.toFixed(4)} ${m.hx.toFixed(3)}×${m.hz.toFixed(3)}` +
      (mal ? ` | deriva dθ ${dth.toFixed(4)} dx ${dx.toFixed(3)} dz ${dz.toFixed(3)}` : ''));
  }
}
console.log(vermelho ? `PEGADACHECK ${vermelho} VERMELHA(S)` : 'PEGADACHECK verde');
if (vermelho) process.exitCode = 1;
