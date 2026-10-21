#!/usr/bin/env node
/* arma-orientacao-check.mjs — A ARMA APONTA PRO LADO CERTO?
   POR QUE EXISTE: o dono reportou (21/10/2026) "a lendária AK-47 está bugada", nos dois
   modos. `CFG.rot` (public/js/weapons.js) é escrito à mão por arma e é a ÚNICA coisa que
   decide para onde o cano aponta depois da normalização do `weaponModel()`; a `ak` usa
   270° enquanto a `akm` — mesmo comprimento 0,88 e mesma origem Mint — usa 90°. Uma das
   duas está girada, e nenhuma régua lia a GEOMETRIA para dizer qual.

   O QUE MEDE (no GLB em disco, com o `rot` da CFG aplicado — o espaço em que o
   weaponModel normaliza escala e grip; cano DEVE ficar em +Z):
   AO1  a ponta +Z é mais FINA que a ponta -Z em toda arma de cano (razão coronha/boca > 1).
        É a assinatura geométrica de um cano: a boca é a seção mais estreita da peça.
   AO2  a boca medida como o jogo mede (centroide dos 2% mais avançados em +Z, que é a
        origem do flash e do tracer) cai na metade dianteira da caixa.

   REPRODUZ: node tools/eval/arma-orientacao-check.mjs [--json] [--mutante=inverte-m4]
   MUTANTE:  --mutante=inverte-m4 soma 180° ao rot da M4. AO1 fica vermelha nela; se
             continuar verde, a régua está cega. */
import { existsSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { WEAPON_IDS, weaponCFG } from '../../public/js/weapons.js';

const ROOT = new URL('../../', import.meta.url);
const JSON_OUT = process.argv.includes('--json');
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const D2R = Math.PI / 180;
// Matrizes 4x4 em ordem de coluna (mesma convenção do glTF).
const mul = (a, b) => {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    out[c * 4 + r] = s;
  }
  return out;
};
const apply = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
const rotY = (deg) => {
  const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R);
  return new Float64Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};

// Nuvem de pontos do GLB inteiro já com o `rot` da CFG aplicado — é o que o
// weaponModel() faz antes de normalizar (public/js/weapons.js:329).
function cloud(doc, rotDeg) {
  const pts = [];
  const base = rotY(rotDeg);
  const walk = (node, parent) => {
    const world = mul(parent, Float64Array.from(node.getMatrix()));
    const mesh = node.getMesh();
    if (mesh) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const n = pos.getCount();
      const step = Math.max(1, Math.ceil(n / 20000));
      const el = [0, 0, 0];
      for (let i = 0; i < n; i += step) {
        pos.getElement(i, el);
        pts.push(apply(world, el[0], el[1], el[2]));
      }
    }
    for (const child of node.listChildren()) walk(child, world);
  };
  for (const scene of doc.getRoot().listScenes()) for (const node of scene.listChildren()) walk(node, base);
  return pts;
}

// Espessura média: raio no plano XY em torno do eixo da peça, numa fatia de Z.
function espessura(pts, zLo, zHi) {
  let sx = 0, sy = 0, n = 0;
  for (const p of pts) if (p[2] >= zLo && p[2] <= zHi) { sx += p[0]; sy += p[1]; n++; }
  if (!n) return null;
  const cx = sx / n, cy = sy / n;
  let acc = 0;
  for (const p of pts) if (p[2] >= zLo && p[2] <= zHi) acc += Math.hypot(p[0] - cx, p[1] - cy);
  return acc / n;
}

const resultados = [];
for (const id of WEAPON_IDS) {
  const file = new URL(`public/models/weapons/${id}.glb`, ROOT);
  if (!existsSync(file)) continue;
  let rot = weaponCFG(id).rot[1];
  if (MUTANTE === 'inverte-m4' && id === 'm4') rot += 180;
  const doc = await io.read(file.pathname);
  const pts = cloud(doc, rot);
  if (pts.length < 64) continue;
  let zmin = Infinity, zmax = -Infinity;
  for (const p of pts) { if (p[2] < zmin) zmin = p[2]; if (p[2] > zmax) zmax = p[2]; }
  const L = zmax - zmin;
  const fatia = L * 0.12;
  const boca = espessura(pts, zmax - fatia, zmax);
  const coronha = espessura(pts, zmin, zmin + fatia);
  const corte = zmax - L * 0.02;
  let mz = 0, mn = 0;
  for (const p of pts) if (p[2] >= corte) { mz += p[2]; mn++; }
  resultados.push({
    id, rot: ((rot % 360) + 360) % 360,
    boca: +(boca / L).toFixed(4), coronha: +(coronha / L).toFixed(4),
    razao: +(coronha / Math.max(1e-9, boca)).toFixed(2),
    muzzleZ: +(((mn ? mz / mn : zmax) - zmin) / L).toFixed(3),
  });
}

let falhas = 0;
const chk = (ok, id, msg) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${msg}`); if (!ok) falhas++; };

console.log('arma        rot   boca/L  coronha/L  razão  muzzle(frac)');
for (const r of resultados) {
  console.log(`${r.id.padEnd(11)} ${String(r.rot).padStart(3)}  ${r.boca.toFixed(4)}   ${r.coronha.toFixed(4)}    ${r.razao.toFixed(2).padStart(5)}   ${r.muzzleZ.toFixed(3)}`);
}
// A faca não tem cano: lâmina/cabo entram só como evidência, fora da cláusula.
const CANO = resultados.filter((r) => r.id !== 'knife');
const invertidas = CANO.filter((r) => r.razao <= 1);
chk(invertidas.length === 0, 'AO1',
  invertidas.length
    ? `ponta +Z mais GROSSA que a coronha em: ${invertidas.map((r) => `${r.id} (razão ${r.razao}, rot ${r.rot}°)`).join(', ')}`
    : `${CANO.length} armas com a boca mais fina que a coronha`);
const bocaAtras = resultados.filter((r) => r.muzzleZ <= 0.5);
chk(bocaAtras.length === 0, 'AO2',
  bocaAtras.length ? `boca medida na metade TRASEIRA em: ${bocaAtras.map((r) => r.id).join(', ')}` : 'boca na metade dianteira em todas');

if (JSON_OUT) console.log(JSON.stringify({ versao: 1, mutante: MUTANTE || null, resultados, falhas }, null, 2));
process.exit(falhas ? 1 : 0);
