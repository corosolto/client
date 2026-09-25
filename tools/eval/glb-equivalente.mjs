#!/usr/bin/env node
/* ============================================================================
   glb-equivalente.mjs — DOIS GLB SÃO A MESMA ARMA? (E NÃO: "TÊM O MESMO HASH")
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Em 10/09 esta frente publicou um piloto por cima da AK aprovada porque comparou
   TAMANHO de arquivo: os dois tinham exatamente 3.414.520 bytes e conteúdo
   diferente. A regra que nasceu daquele erro foi *"toda publicação compara
   sha256"* — e em 11/09 ela se mostrou inútil: **o exportador glTF do Blender não
   é determinístico**. Duas construções da AK com o MESMO código deram
   `e03c2c18…` e `497b2e1c…`.

   Então nem tamanho nem hash respondem a pergunta que importa, que é: *mudar o
   construtor alterou a arma?* Isso se responde comparando a GEOMETRIA — nomes de
   malha, contagem de vértices, caixa de cada malha, a que osso cada vértice está
   presa, e os clipes. Ruído de exportação não move nenhum desses números.

   USO
     node tools/eval/glb-equivalente.mjs <a.glb> <b.glb>
   ========================================================================== */

import fs from 'node:fs';
import process from 'node:process';

const COMP = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

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

function retrato(p) {
  const g = abrir(p);
  const { j } = g;
  const malhas = {};
  for (const n of (j.nodes || [])) {
    if (n.mesh == null) continue;
    const m = j.meshes[n.mesh];
    const nome = m.name || `mesh${n.mesh}`;
    const e = malhas[nome] || (malhas[nome] = { verts: 0, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], ossos: {} });
    for (const prim of (m.primitives || [])) {
      const P = prim.attributes.POSITION;
      if (P == null) continue;
      const pos = ler(g, P);
      e.verts += pos.length;
      for (const q of pos) for (let k = 0; k < 3; k += 1) { if (q[k] < e.min[k]) e.min[k] = q[k]; if (q[k] > e.max[k]) e.max[k] = q[k]; }
      const I = prim.attributes.JOINTS_0; const W = prim.attributes.WEIGHTS_0;
      if (I == null || W == null || n.skin == null) continue;
      const juntas = j.skins[n.skin].joints || [];
      const idx = ler(g, I); const w = ler(g, W);
      for (let v = 0; v < idx.length; v += 1) {
        for (let c = 0; c < 4; c += 1) {
          const peso = w[v][c] > 1 ? w[v][c] / 65535 : w[v][c];
          if (peso <= 0.01) continue;
          const osso = (j.nodes[juntas[idx[v][c]]] || {}).name || '?';
          e.ossos[osso] = (e.ossos[osso] || 0) + 1;
        }
      }
    }
  }
  const clipes = {};
  for (const a of (j.animations || [])) {
    let dur = 0;
    for (const s of (a.samplers || [])) {
      const t = j.accessors[s.input];
      if (t?.max?.[0] > dur) dur = t.max[0];
    }
    clipes[a.name] = { canais: (a.channels || []).length, dur: +dur.toFixed(4) };
  }
  return { malhas, clipes, nos: (j.nodes || []).length };
}

const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error('uso: glb-equivalente.mjs <a.glb> <b.glb>'); process.exit(2); }
const a = retrato(A); const b = retrato(B);
const TOL = 1e-4;
const falhas = [];

if (a.nos !== b.nos) falhas.push(`nós: ${a.nos} × ${b.nos}`);
const nomes = [...new Set([...Object.keys(a.malhas), ...Object.keys(b.malhas)])].sort();
for (const nome of nomes) {
  const x = a.malhas[nome]; const y = b.malhas[nome];
  if (!x || !y) { falhas.push(`malha só em um dos dois: ${nome}`); continue; }
  if (x.verts !== y.verts) falhas.push(`${nome}: ${x.verts} × ${y.verts} vértices`);
  for (let k = 0; k < 3; k += 1) {
    if (Math.abs(x.min[k] - y.min[k]) > TOL || Math.abs(x.max[k] - y.max[k]) > TOL) {
      falhas.push(`${nome}: caixa difere no eixo ${'xyz'[k]} (${x.min[k].toFixed(5)}..${x.max[k].toFixed(5)} × ${y.min[k].toFixed(5)}..${y.max[k].toFixed(5)})`);
      break;
    }
  }
  const ossos = [...new Set([...Object.keys(x.ossos), ...Object.keys(y.ossos)])];
  for (const o of ossos) {
    if ((x.ossos[o] || 0) !== (y.ossos[o] || 0)) falhas.push(`${nome}: osso ${o} prende ${x.ossos[o] || 0} × ${y.ossos[o] || 0} vértices`);
  }
}
const cl = [...new Set([...Object.keys(a.clipes), ...Object.keys(b.clipes)])].sort();
for (const c of cl) {
  const x = a.clipes[c]; const y = b.clipes[c];
  if (!x || !y) { falhas.push(`clipe só em um dos dois: ${c}`); continue; }
  if (x.canais !== y.canais) falhas.push(`clipe ${c}: ${x.canais} × ${y.canais} canais`);
  if (Math.abs(x.dur - y.dur) > TOL) falhas.push(`clipe ${c}: ${x.dur}s × ${y.dur}s`);
}

console.log(`\n  ${A}\n  ${B}\n`);
if (!falhas.length) {
  console.log(`  ✓ GEOMETRICAMENTE IDÊNTICOS — ${nomes.length} malhas, ${cl.length} clipes, ${a.nos} nós\n`);
  process.exit(0);
}
for (const f of falhas.slice(0, 25)) console.log(`  ✗ ${f}`);
if (falhas.length > 25) console.log(`  … e mais ${falhas.length - 25}`);
console.log('');
process.exit(1);
