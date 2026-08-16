/* escala-veiculo-check.mjs — PROCEDÊNCIA DA ESCALA DOS VEÍCULOS DO ESTACIONAMENTO.
   ═══════════════════════════════════════════════════════════════════════════════════
   DEFEITO DE ORIGEM (dono, 12/08): "no mapa da Havan a moto tá maior em escala que os
   outros carros, teríamos que acertar a escala de todos carros/motos pra tamanho real".

   O `placeCar` normalizava TODO veículo para `targetH: 1.55` — altura fixa. Normalizar é
   obrigatório, porque os .glb chegam em escalas de origem incompatíveis entre si (uns em
   cubo unitário, uns em centímetro, o s600 em ~500 unidades). O erro foi normalizar pela
   ALTURA: a razão altura/comprimento é justamente o que mais varia entre veículos (0,53
   numa CG contra 0,30 num Opala), então altura-alvo única multiplica cada modelo por um
   fator diferente — e quem tem a menor razão paga o maior aumento. A moto era esse extremo.

   ARQUIVO DE REFERÊNCIA: `CAR_DIM` em public/js/map_havan.js, ficha de fábrica de cada
   modelo. MEDIDA: bbox real do .glb, com o TRS de cada nó aplicado (não o accessor cru, que
   ignora escala de nó). O erro de um veículo é a média do erro de comprimento e de altura.

   REPRODUZ:  node tools/eval/escala-veiculo-check.mjs
   MUTAÇÃO QUE FAZ FICAR VERMELHA (AGENTS.md, regra 3):
     • trocar `targetLen: cl, targetH: ch` por `targetH: 1.55` no placeCar  -> V1 e V2 reprovam
     • pôr moto_cg: [4.20, 1.50] no CAR_DIM                                 -> V3 reprova */

import { readFileSync, existsSync } from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const src = readFileSync(new URL('public/js/map_havan.js', RAIZ), 'utf8');

/* ---- bbox real do .glb: chunk JSON + TRS dos nós ---- */
function parseGLB(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('não é glb');
  let off = 12, json = null;
  while (off < dv.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(buf.subarray(off + 8, off + 8 + len)));
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return json;
}
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
};
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0, tx, ty, tz, 1];
}
const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
function dims(path) {
  const g = parseGLB(readFileSync(path));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const walk = (ni, parent) => {
    const n = g.nodes[ni]; const m = mul(parent, trs(n));
    if (n.mesh != null) for (const prim of g.meshes[n.mesh].primitives) {
      const acc = g.accessors[prim.attributes.POSITION];
      if (!acc?.min || !acc?.max) continue;
      for (let i = 0; i < 8; i++) {
        const w = apply(m, [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]]);
        for (let k = 0; k < 3; k++) { if (w[k] < lo[k]) lo[k] = w[k]; if (w[k] > hi[k]) hi[k] = w[k]; }
      }
    }
    for (const c of n.children || []) walk(c, m);
  };
  for (const s of g.scenes[g.scene ?? 0].nodes) walk(s, ident());
  return { w: hi[0] - lo[0], h: hi[1] - lo[1], d: hi[2] - lo[2] };
}

/* ---- ficha e frota, lidas do próprio mapa (a régua não pode ter cópia dos números) ---- */
const bloco = src.slice(src.indexOf('const CAR_DIM = {'), src.indexOf('const CAR_DIM_PADRAO'));
const CAR_DIM = {};
for (const m of bloco.matchAll(/'?([\w.\-]+)'?\s*:\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/g)) CAR_DIM[m[1]] = [+m[2], +m[3]];
const foraDaFrota = [...src.slice(src.indexOf('const CARS = HAVAN_PROPS'), src.indexOf('const RY_FIX')).matchAll(/'([\w_]+)'/g)].map(m => m[1]);
// a fórmula é a do placeProp; se ela mudar lá sem mudar aqui, os números param de bater
const usaFicha = /targetLen:\s*cl,\s*targetH:\s*ch/.test(src);

const DIR = new URL('public/models/props/', RAIZ);
const err = (v, r) => Math.abs(v - r) / r;
const linhas = [];
for (const [id, [RL, RH]] of Object.entries(CAR_DIM)) {
  if (foraDaFrota.includes(id)) continue;
  const f = new URL(id + '.glb', DIR);
  if (!existsSync(f)) continue;
  const d = dims(f);
  const ml = Math.max(d.w, d.d) || 1, mh = d.h || 1;
  const s = usaFicha ? Math.sqrt((RL / ml) * (RH / mh)) : 1.55 / mh;
  const L = ml * s, H = mh * s;
  linhas.push({ id, L, H, e: (err(L, RL) + err(H, RH)) / 2 });
}
linhas.sort((a, b) => b.e - a.e);
const medio = linhas.reduce((s, l) => s + l.e, 0) / linhas.length;
const pior = linhas[0];
const moto = linhas.find(l => l.id === 'moto_cg');
const maisComprido = [...linhas].sort((a, b) => b.L - a.L)[0];

console.log(`${linhas.length} veículos medidos · fórmula: ${usaFicha ? 'ficha (comprimento × altura)' : 'altura fixa 1,55'}`);
console.log('piores 5:', linhas.slice(0, 5).map(l => `${l.id} ${(l.e * 100).toFixed(0)}%`).join(' · '));

let falhas = 0;
const chk = (id, ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${id}  ${msg}`); if (!ok) falhas++; };

// V1 — a frota inteira dentro de 6% da ficha. Altura fixa dava 10,3%.
chk('V1', medio <= 0.06, `erro médio ${(medio * 100).toFixed(1)}% [<= 6%]`);
// V2 — nenhum veículo isolado pode passar de 20%: é onde o olho começa a ver "está errado".
chk('V2', pior.e <= 0.20, `pior ${pior.id} ${(pior.e * 100).toFixed(0)}% [<= 20%] (${pior.L.toFixed(2)}×${pior.H.toFixed(2)} m)`);
// V3 — o defeito reportado, em forma de invariante: a moto é o MENOR veículo do pátio.
chk('V3', moto && moto.L === Math.min(...linhas.map(l => l.L)),
  `moto_cg ${moto ? moto.L.toFixed(2) : '?'} m é o menor comprimento da frota [menor que os ${linhas.length - 1} carros]`);
// V4 — nada de guarita: veículo de estacionamento não passa de 2,10 m de altura.
const altos = linhas.filter(l => l.H > 2.1);
chk('V4', altos.length === 0, `nenhum veículo acima de 2,10 m${altos.length ? `: ${altos.map(a => `${a.id} ${a.H.toFixed(2)}`).join(', ')}` : ''}`);
// V5 — nem caminhão: o mais comprido é um sedã grande, não um ônibus disfarçado.
chk('V5', maisComprido.L <= 5.5, `mais comprido ${maisComprido.id} ${maisComprido.L.toFixed(2)} m [<= 5,5 m]`);

console.log(falhas ? `\n${falhas} régua(s) de escala REPROVAM` : '\nESCALA  todas as réguas passam');
process.exit(falhas ? 1 : 0);
