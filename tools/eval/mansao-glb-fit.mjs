// BUG-56: mede bbox real dos GLBs do pack/jardim escalados como o jogo escala
// (placeProp: targetH só, ou targetLen+targetH média geométrica) e compara com o
// colisor declarado no map_mansao.js. Malha maior que colisor = corpo dentro de
// geometria visível no browser (MAP1 do mundo GLB é cego em node — Lição 3).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const bbox = async (id, yFrac = 1) => {
  const doc = await io.read(`public/models/props/${id}.glb`);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let yMin = Infinity, yMax = -Infinity;
  const verts = [];
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const arr = pos.getArray();
    const n = pos.getCount();
    for (let i = 0; i < n; i++) {
      const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
      verts.push([x, y, z]);
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
    }
  }
  const corte = yMin + (yMax - yMin) * yFrac;
  for (const [x, y, z] of verts) {
    if (y > corte) continue;
    if (x < min[0]) min[0] = x; if (y < min[1]) min[1] = y; if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x; if (y > max[1]) max[1] = y; if (z > max[2]) max[2] = z;
  }
  return { h: yMax - yMin, lx: max[0] - min[0], lz: max[2] - min[2] };
};
// [id, targetH, colHalfX, colHalfZ, folhagemNonSolid]
// Vaso: colisor 0,7 = base rígida medida 0,67 + folga de roupa; o col antigo
// (0,6) deixava 7 cm de cerâmica atravessável — foi o primeiro vermelho desta
// régua (BUG-56). Teto NÃO afrouxou: malha ≤ col + 0,02 continua valendo.
const PROPS = [
  ['banco_jardim', .82, .95, .35, false],
  ['poste_jardim', 2.4, .18, .18, false],
  ['escultura_jardim', 2.2, .6, .6, false],
  ['vaso_tropical', 1.05, .35, .35, true],
  ['lounge_externo', 1.05, .95, .95, false],
];
// Mutante glb2x (lei 3 do AGENTS.md): dobra a malha de mundo medida — props e
// carros 2× maiores que o colisor TÊM que ficar vermelhos. Se algum dia passar,
// esta régua virou decoração. Aplica por construção (aritmética pós-medida).
const MUT_2X = process.argv.includes('--mutante=glb2x');
let ruim = 0;
for (const [id, th, cx, cz, folha] of PROPS) {
  const b = await bbox(id);
  const s = th / b.h;
  const mx = (b.lx * s) / 2, mz = (b.lz * s) / 2;
  let okWorst, medido;
  if (folha) {
    // só a BASE (40% inferiores) é rígida: vaso. O resto é folhagem nonSolid.
    const base = await bbox(id, 0.4);
    let bx = (base.lx * s) / 2, bz = (base.lz * s) / 2;
    if (MUT_2X) { bx *= 2; bz *= 2; }
    okWorst = bx <= Math.max(cx, cz) + 0.02 && bz <= Math.max(cx, cz) + 0.02;
    medido = `base rígida ${(2 * bx).toFixed(2)}x${(2 * bz).toFixed(2)} (folha ${(2 * mx).toFixed(2)})`;
  } else {
    const wx = MUT_2X ? mx * 2 : mx, wz = MUT_2X ? mz * 2 : mz;
    okWorst = wx <= Math.max(cx, cz) + 0.02 && wz <= Math.max(cx, cz) + 0.02;
    medido = `mundo ${(2 * wx).toFixed(2)}m x ${(2 * wz).toFixed(2)}m`;
  }
  if (!okWorst) ruim++;
  console.log(`${okWorst ? '✓' : '✗'} ${id.padEnd(18)} glb ${b.lx.toFixed(2)}x${b.h.toFixed(2)}x${b.lz.toFixed(2)} -> ${medido} | col ${2 * cx}x${2 * cz}${okWorst ? '' : ' — ESTOURA'}`);
}
/* A frota vem do USO (GARAGEM do map_mansao.js), não de cópia local: régua que lê
   a própria declaração fica verde quando o mapa muda (o buraco que o mutante
   glb2x não cobre). */
const mansaoSrc = (await import('node:fs')).readFileSync('public/js/map_mansao.js', 'utf8');
const CARS = [...mansaoSrc.matchAll(/\['([a-z0-9_.]+)',\s*([\d.]+),\s*([\d.]+)\]/g)]
  .map((m) => [m[1], parseFloat(m[2]), parseFloat(m[3])]);
if (!CARS.length) { console.error('✗ GARAGEM não encontrada em map_mansao.js — régua lendo o lugar errado'); process.exit(1); }
// Teto de comprimento 4,30: o carro PROCEDURAL original tinha malha 4,25 sobre o
// col de 4,10 — para-choque/mirror além do col era o desenho aceito. Largura tem
// que caber (2,00) porque vaga é o espelho da parede. PISO 1,30 m: GLB em unidade
// quebrada (escort: bbox 31×47×90) encolhe a largura p/ ~1,12 m e a régua só
// tinha teto — o mais estreito do CAR_DIM é o uno (1,44).
for (const [id, cl, ch] of CARS) {
  const b = await bbox(id);
  const len = Math.max(b.lx, b.lz), wid = Math.min(b.lx, b.lz);
  const s = Math.sqrt((cl / len) * (ch / b.h));
  const w = MUT_2X ? wid * s * 2 : wid * s;
  const ok = w <= 2.0 && w >= 1.30 && cl <= 4.30;
  if (!ok) ruim++;
  console.log(`${ok ? '✓' : '✗'} ${id.padEnd(31)} mundo ${w.toFixed(2)}m larg × ${cl.toFixed(2)}m comp | teto 2,00×4,30 (procedural: 4,25 sobre col 4,10) ${ok ? 'CABE' : 'ESTOURA'}`);
}
process.exitCode = ruim ? 1 : 0;
