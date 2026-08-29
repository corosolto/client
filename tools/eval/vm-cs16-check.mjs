#!/usr/bin/env node
/* ============================================================================
   vm-cs16-check.mjs — RÉGUA da frente cs16 (revisão 29/08: conserto sem régua
   não está pronto).
   1) VM_FAMILY[*].cs16 ↔ cs16-timings.json (familias derivadas do extrator):
      número copiado à mão que divergir da fonte reprova. Roda em QUALQUER
      máquina (só arquivos do repo).
   2) Com os private-assets presentes: no ak-baked-runtime.glb, a excursão do
      pente MINT_WEAPON_MAG_AK relativa ao corpo da arma durante o
      reload_tactical fica ≤ 0,40 m (o bug do pivô do rebase dava 0,65 m;
      o valor são é ~0,28 m) e o último frame fecha no rest (Δ ≤ 1e-3).
      Sem os assets, o passo 2 é SKIP explícito — nunca verde silencioso.
   Uso: node tools/eval/vm-cs16-check.mjs
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VM_FAMILY } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRIVATE_GLB = '/Users/ruben/csbrasil-private-assets/generated/viewmodels/ak/ak-baked-runtime.glb';
let falhas = 0;
const falha = (m) => { falhas += 1; console.error(`✗ CS16 ${m}`); };

// ---- 1: vmconfig ↔ tabela extraída
const tabela = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/cs16-timings.json'), 'utf8'));
for (const [familia, info] of Object.entries(tabela.familias)) {
  const cs16 = VM_FAMILY[familia]?.cs16;
  if (!cs16) { falha(`família ${familia} tem doador ${info.doador} mas o vmconfig não tem cs16`); continue; }
  for (const [estado, dur] of Object.entries(info.cs16)) {
    if (Math.abs((cs16[estado] ?? NaN) - dur) > 0.001) {
      falha(`${familia}.${estado}: vmconfig=${cs16[estado]} tabela=${dur} (doador ${info.doador})`);
    }
  }
  for (const estado of Object.keys(cs16)) {
    if (!(estado in info.cs16)) falha(`${familia}.${estado}: no vmconfig mas sem sequência no doador ${info.doador}`);
  }
}
for (const [familia, config] of Object.entries(VM_FAMILY)) {
  if (config.cs16 && !tabela.familias[familia]) falha(`família ${familia} tem cs16 sem doador na tabela`);
}
console.log(`CS16-1 vmconfig↔tabela: ${Object.keys(tabela.familias).length} famílias conferidas`);

// ---- 2: pente no pivô certo dentro do GLB assado
if (!fs.existsSync(PRIVATE_GLB)) {
  console.log('CS16-2 SKIP: private-assets ausentes nesta máquina (só o dono assa)');
} else {
  const b = fs.readFileSync(PRIVATE_GLB);
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + len).toString());
  const binOfs = 20 + len + 8;
  const acc = (i) => { const a = j.accessors[i]; const bv = j.bufferViews[a.bufferView]; const o = binOfs + (bv.byteOffset || 0) + (a.byteOffset || 0); const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type]; const v = []; for (let k = 0; k < a.count * n; k++) v.push(b.readFloatLE(o + 4 * k)); return { count: a.count, n, v }; };
  const qRot = (q, v) => { const [x, y, z, w] = q; const u = [x, y, z]; const cr = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]]; const c1 = cr(u, v); const c2 = cr(u, c1); return [v[0] + 2 * (w * c1[0] + c2[0]), v[1] + 2 * (w * c1[1] + c2[1]), v[2] + 2 * (w * c1[2] + c2[2])]; };
  const compor = (p, l) => { const t = qRot(p.q, [l.t[0] * p.s[0], l.t[1] * p.s[1], l.t[2] * p.s[2]]); return { t: [p.t[0] + t[0], p.t[1] + t[1], p.t[2] + t[2]], q: [p.q[3] * l.q[0] + p.q[0] * l.q[3] + p.q[1] * l.q[2] - p.q[2] * l.q[1], p.q[3] * l.q[1] - p.q[0] * l.q[2] + p.q[1] * l.q[3] + p.q[2] * l.q[0], p.q[3] * l.q[2] + p.q[0] * l.q[1] - p.q[1] * l.q[0] + p.q[2] * l.q[3], p.q[3] * l.q[3] - p.q[0] * l.q[0] - p.q[1] * l.q[1] - p.q[2] * l.q[2]], s: [p.s[0] * l.s[0], p.s[1] * l.s[1], p.s[2] * l.s[2]] }; };
  const pais = new Array(j.nodes.length).fill(-1);
  j.nodes.forEach((n, i) => (n.children || []).forEach((c) => { pais[c] = i; }));
  const rel = j.animations.find((a) => a.name === 'reload_tactical');
  const canais = new Map();
  for (const c of rel.channels) { const s = rel.samplers[c.sampler]; canais.set(`${c.target.node}:${c.target.path}`, { T: acc(s.input), V: acc(s.output) }); }
  const amostra = (key, t, fallback) => { const c = canais.get(key); if (!c) return fallback; const { T, V } = c; let i = 0; while (i < T.count - 1 && T.v[i + 1] <= t) i += 1; return V.v.slice(i * V.n, (i + 1) * V.n); };
  const localDe = (ni, t) => { const n = j.nodes[ni]; return { t: amostra(`${ni}:translation`, t, n.translation || [0, 0, 0]), q: amostra(`${ni}:rotation`, t, n.rotation || [0, 0, 0, 1]), s: amostra(`${ni}:scale`, t, n.scale || [1, 1, 1]) }; };
  const mundo = (ni, t) => { const cadeia = []; for (let i = ni; i >= 0; i = pais[i]) cadeia.unshift(i); let w = { t: [0, 0, 0], q: [0, 0, 0, 1], s: [1, 1, 1] }; for (const i of cadeia) w = compor(w, localDe(i, t)); return w; };
  const idx = (nome) => j.nodes.findIndex((n) => n.name === nome);
  const magNode = idx('MINT_WEAPON_MAG_AK');
  const corpo = idx('MINT_WEAPON_AK');
  if (magNode < 0 || corpo < 0) falha('GLB assado sem MINT_WEAPON_MAG_AK / MINT_WEAPON_AK');
  else {
    const mesh = j.meshes[j.nodes[magNode].mesh];
    const pos = acc(mesh.primitives[0].attributes.POSITION);
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < pos.count; i++) { cx += pos.v[3 * i]; cy += pos.v[3 * i + 1]; cz += pos.v[3 * i + 2]; }
    const cent = [cx / pos.count, cy / pos.count, cz / pos.count];
    const dur = Math.max(...rel.samplers.map((s) => acc(s.input).v.at(-1)));
    const distEm = (t) => {
      const wm = mundo(magNode, t);
      const p = qRot(wm.q, [cent[0] * wm.s[0], cent[1] * wm.s[1], cent[2] * wm.s[2]]);
      const wc = mundo(corpo, t).t;
      return Math.hypot(wm.t[0] + p[0] - wc[0], wm.t[1] + p[1] - wc[1], wm.t[2] + p[2] - wc[2]);
    };
    const rest = distEm(0);
    let excMax = 0;
    for (let t = 0; t <= dur; t += dur / 60) excMax = Math.max(excMax, Math.abs(distEm(t) - rest));
    const fecho = Math.abs(distEm(dur) - rest);
    if (excMax > 0.40) falha(`pente orbita ${excMax.toFixed(2)} m da arma no reload (pivô do rebase regrediu; são é ~0,28)`);
    if (fecho > 0.001) falha(`pente não fecha no rest ao fim do reload (Δ ${fecho.toFixed(4)} m)`);
    console.log(`CS16-2 pente: excursão máx ${excMax.toFixed(3)} m (teto 0,40) · fecho Δ ${fecho.toExponential(1)}`);
  }
}

if (falhas > 0) { console.error(`CS16: ${falhas} falha(s)`); process.exit(1); }
console.log('CS16 OK');
