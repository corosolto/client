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
/* r2: a mobília do kit Mint `mansao_interior` entra na MESMA conta. Ela é servida por
   `mobilia()` no map_mansao.js, que troca a caixa procedural pelo molde e MANTÉM o
   colisor do procedural — então "malha <= colisor" é exatamente a pergunta certa: se o
   sofá de 2,20 m entrasse num colisor de 4,00 m sobraria parede invisível dos dois lados,
   e se o colisor encolhesse demais o corpo entraria no couro.
   A altura-alvo NÃO é copiada de cabeça: `alturaAlvo` é lida do próprio map_mansao.js
   logo abaixo, e divergir do que está tabelado aqui é vermelho. */
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
  // mobília r2 — colisor declarado no map_mansao.js (estar 2,30x1,10; recliner 1,08x1,02;
  // poltrona de luxo 0,95x0,92; mesa de centro 1,00x0,60). Vale o MENOR colisor de cada id.
  ['mansao_sofa', .95, 1.15, .55, false],
  ['mansao_poltrona', .98, .54, .46, false],
  ['mansao_mesa_centro', .45, .50, .30, false],
];
const mansaoSrc = (await import('node:fs')).readFileSync('public/js/map_mansao.js', 'utf8');
/* A altura-alvo tem de bater com o USO. Régua que guarda cópia da declaração fica verde
   quando o mapa muda — foi o BUG-02 desta base. */
const usos = new Map();
for (const m of mansaoSrc.matchAll(/mobilia\(\s*'([a-z0-9_]+)'\s*,\s*\{([^}]*)\}/g)) {
  const alt = m[2].match(/alturaAlvo:\s*([\d.]+)/);
  if (!alt) continue;
  if (!usos.has(m[1])) usos.set(m[1], []);
  usos.get(m[1]).push(parseFloat(alt[1]));
}
// Mutante glb2x (lei 3 do AGENTS.md): dobra a malha de mundo medida — props e
// carros 2× maiores que o colisor TÊM que ficar vermelhos. Se algum dia passar,
// esta régua virou decoração. Aplica por construção (aritmética pós-medida).
// `--mutante=coqueiro-reto` é o par disso para a cláusula do coqueiro (r2).
const MUT_2X = process.argv.includes('--mutante=glb2x');
let ruim = 0;
for (const [id, th, cx, cz, folha] of PROPS) {
  const usados = usos.get(id);
  if (usados && usados.some((v) => Math.abs(v - th) > 1e-6)) {
    ruim++;
    console.log(`✗ ${id.padEnd(18)} tabela diz targetH ${th} mas map_mansao.js usa ${[...new Set(usados)].join('/')} — régua desalinhada do uso`);
    continue;
  }
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
/* COQUEIRO (r2, dono: "coqueiros low poly"). A cláusula B3 do mansao-beach-check mede a
   inclinação da palma PROCEDURAL, porque ela roda em node e nenhum GLB carrega ali. Se o
   molde que o navegador mostra fosse um poste reto, B3 seguiria verde sobre um coqueiro
   errado. Aqui a inclinação é medida NO ARQUIVO: centróide dos 15% de cima da malha (a
   copa) contra o centróide dos 15% de baixo (o pé do tronco). Mesmo limiar de B3 (8°),
   porque as duas medem a mesma coisa em lugares diferentes — limiar compartilhado. */
{
  const doc = await io.read('public/models/props/coqueiro.glb');
  const pts = [];
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'); if (!pos) continue;
    const arr = pos.getArray();
    for (let i = 0; i < pos.getCount(); i++) pts.push([arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]]);
  }
  let yMin = Infinity, yMax = -Infinity;
  for (const v of pts) { if (v[1] < yMin) yMin = v[1]; if (v[1] > yMax) yMax = v[1]; }
  const faixa = (yMax - yMin) * 0.15;
  const centro = (filtra) => {
    const sel = pts.filter(filtra);
    return [0, 1, 2].map((k) => sel.reduce((a, v) => a + v[k], 0) / sel.length);
  };
  const pe = centro((v) => v[1] <= yMin + faixa);
  const copa = centro((v) => v[1] >= yMax - faixa);
  /* Mutante próprio: `--mutante=coqueiro-reto` endireita a copa por construção (projeta o
     centróide de cima sobre o de baixo). Poste reto TEM que ficar vermelho, senão a
     cláusula é decoração — é o mesmo mutante que a B3 aplica na palma procedural. */
  const reto = process.argv.includes('--mutante=coqueiro-reto');
  if (reto) { copa[0] = pe[0]; copa[2] = pe[2]; }
  const dh = Math.hypot(copa[0] - pe[0], copa[2] - pe[2]), dv = Math.max(1e-6, copa[1] - pe[1]);
  const graus = Math.atan2(dh, dv) * 180 / Math.PI;
  const ok = graus >= 8;
  if (!ok) ruim++;
  console.log(`${ok ? '✓' : '✗'} ${'coqueiro'.padEnd(18)} copa desloca ${dh.toFixed(3)} em ${dv.toFixed(3)} de altura = ${graus.toFixed(1)}° com a vertical | mínimo 8° (mesmo limiar da cláusula B3 do mansao-beach)`);
}

/* A frota vem do USO (GARAGEM do map_mansao.js), não de cópia local: régua que lê
   a própria declaração fica verde quando o mapa muda (o buraco que o mutante
   glb2x não cobre). */
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
