#!/usr/bin/env node
/* ============================================================================
   vm-escala-check.mjs — CADA ARMA TEM O TAMANHO CERTO, MEDIDO CONTRA A AK.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O construtor escala toda arma por `comprimento/88` vezes fatores fixos
   (0.863, 0.62, 0.808) medidos NA AK — a quinta constante dela aplicada às
   treze. O dono relatou o efeito arma a arma: *"svd arma está pequena"*,
   *"mosin pequena"*, *"deagle arma e mão pequenas"*, *"revólver pequeno"*.

   O número absoluto do GLB não serve de régua: ele vive no espaço do rig doador,
   não em metros, e a AK aprovada mede 153,7 "cm" para 88 declarados. O que vale é
   a RAZÃO contra a AK, que é a única arma que o dono aprovou.

   E a correção não é proporcional: `trim_first_person_stock` corta por limiar
   FIXO, então mudar o comprimento muda o que é cortado, que muda o comprimento
   final. É um laço, e laço se fecha iterando com medida — a mp5 levou uma volta
   (1,30 → 1,00), a p90 e a lmg passaram do ponto na primeira.

   USO
     node tools/eval/vm-escala-check.mjs
     node tools/eval/vm-escala-check.mjs --mutante=inflar
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const MUT = arg('mutante');
const TOL = 0.10;   // ±10% da razão da AK; acima disso o dono enxerga na tela

const COMP = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const CORO = 'public/models/viewmodels/coro';

function abrir(p) {
  const b = fs.readFileSync(p);
  const l = b.readUInt32LE(12);
  return { j: JSON.parse(b.slice(20, 20 + l).toString('utf8')), bin: b.slice(20 + l + 8) };
}
function ler(g, i) {
  const a = g.j.accessors[i]; const bv = g.j.bufferViews[a.bufferView];
  const sz = COMP[a.componentType]; const n = NUM[a.type];
  const str = bv.byteStride || sz * n;
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = [];
  for (let k = 0; k < a.count; k += 1) {
    const v = [];
    for (let c = 0; c < n; c += 1) {
      const o = off + k * str + c * sz;
      v.push(a.componentType === 5126 ? g.bin.readFloatLE(o)
        : sz === 2 ? g.bin.readUInt16LE(o) : sz === 4 ? g.bin.readUInt32LE(o) : g.bin.readUInt8(o));
    }
    out.push(v);
  }
  return out;
}

// Comprimento declarado por arma: `len × vm` do CFG de weapons.js, em cm.
const src = fs.readFileSync('public/js/weapons.js', 'utf8');
const DECL = {};
for (const m of src.matchAll(/^\s{2}([a-z0-9_]+):\s*\{\s*len:\s*([\d.]+)([^}]*)\}/gm)) {
  const vm = /vm:\s*([\d.]+)/.exec(m[3]);
  DECL[m[1]] = +m[2] * (vm ? +vm[1] : 1) * 100;
}

// Só a malha da ARMA: as mãos vêm do doador e não entram na proporção.
const MAO = /Requests_Studio_Hands|armmesh|Cylinder|Icosphere/i;
function comprimento(arq) {
  const g = abrir(arq);
  const pts = [];
  for (const n of (g.j.nodes || [])) {
    if (n.mesh == null) continue;
    if (MAO.test(g.j.meshes[n.mesh].name || '')) continue;
    for (const prim of (g.j.meshes[n.mesh].primitives || [])) {
      if (prim.attributes.POSITION == null) continue;
      for (const p of ler(g, prim.attributes.POSITION)) pts.push(p);
    }
  }
  if (pts.length < 50) return null;
  const mn = [1e9, 1e9, 1e9]; const mx = [-1e9, -1e9, -1e9];
  for (const p of pts) for (let k = 0; k < 3; k += 1) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; }
  return Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * 100;
}

const linhas = [];
for (const f of fs.readdirSync(CORO).filter((n) => n.endsWith('-hires.glb')).sort()) {
  const arma = f.replace('-hires.glb', '');
  if (!DECL[arma]) continue;
  let L = comprimento(path.join(CORO, f));
  if (L === null) continue;
  if (MUT === 'inflar' && arma === 'm4') L *= 1.4;   // reintroduz arma fora de escala
  linhas.push({ arma, razao: L / DECL[arma] });
}
const ak = linhas.find((l) => l.arma === 'ak');
if (!ak) { console.error('  ✗ ESCALA sem a ak publicada — não há referência'); process.exit(1); }

const fora = [];
console.log('\n  ESCALA RELATIVA À AK (1,00 = proporção da arma aprovada)\n');
for (const l of linhas.sort((a, b) => Math.abs(b.razao / ak.razao - 1) - Math.abs(a.razao / ak.razao - 1))) {
  const v = l.razao / ak.razao;
  const ruim = Math.abs(v - 1) > TOL;
  if (ruim) fora.push(l.arma);
  console.log(`  ${ruim ? '✗' : '✓'} ${l.arma.padEnd(8)} ${v.toFixed(2)}×`);
}
console.log(`\n  ${linhas.length - fora.length}/${linhas.length} dentro de ±${TOL * 100}%${fora.length ? ` · fora: ${fora.join(', ')}` : ''}\n`);

if (MUT) {
  if (!fora.includes('m4')) { console.error(`MUTANTE ${MUT} PASSOU — a régua não morde`); process.exit(1); }
  console.log(`mutante ${MUT}: reprovou como devia`);
  process.exit(0);
}
process.exit(fora.length ? 1 : 0);
