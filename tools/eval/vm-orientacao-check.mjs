#!/usr/bin/env node
/* ============================================================================
   vm-orientacao-check.mjs — A MALHA DA ARMA ESTÁ DE TRÁS PARA FRENTE?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Crítico cego L1/L3–L5 (23/09): "arma invertida" na SKS, Mosin, SVD e M400 — a
   boca da malha na câmera e o socket MUZZLE na soleira. O ICP de
   `precisao-final-build.py` convergiu girado 180°; `precisao-visual-contract.py`
   passava antes e depois (VM-FIX-MAGS.md).

   O QUE MEDE
   Todo produto dos manifestos com malha MINT principal e socket MUZZLE (skinados ficam
   em `fora`). Pose idle t=0 do produto servido. Eixo longo da malha principal da arma (PCA),
   orientado para o socket MUZZLE; altura da seção em 10 fatias. Arma longa tem a
   soleira/receptor alto atrás e o cano fino na frente: razão
   altura(2 fatias de trás) / altura(2 fatias da boca) >= PISO.

   PISO COM PROCEDÊNCIA (medido por esta régua, 23/09, 17 produtos do overlay L3–L5,
   fatias vazias fora da média): corretas 1,16 (akm) … 5,37 (famas); invertidas do
   catálogo Codex 0,31 (svd), 0,47 (mosin), 0,53 (m400), 0,79 (sks). Piso 1,0 = meio do vão.

   MUTANTE
     --mutante=original   lê o catálogo Codex (antes de desvira-malha/sks-desvira):
                          mosin, svd, m400 e sks têm de ficar VERMELHAS.
     --mutantes           roda base + mutante: base verde e o mutante reprovando EXATAMENTE
                          mosin, svd, m400 e sks por inversão (ausência/crash não contam).
   Pede os ativos privados (fica fora do check:fast e do CI, como as réguas K).
   ========================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE } from '../viewmodels/prep/fk-gltf.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PISO = 1.0;
// Varre todo produto dos manifestos com malha MINT principal (GEO_MINT_* ou MINT_WEAPON_*) e socket MUZZLE;
// produto skinado ou sem MINT fica fora e aparece na lista `fora`.
const INVERTIDAS_NO_CATALOGO = ['mosin', 'svd', 'm400', 'sks'];
const ORIGINAL = path.join(os.homedir(), 'csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');

if (process.argv.includes('--mutantes')) {
  const me = fileURLToPath(import.meta.url);
  const base = spawnSync(process.execPath, [me], { encoding: 'utf8' });
  const mut = spawnSync(process.execPath, [me, '--mutante=original'], { encoding: 'utf8' });
  // O mutante só prova se reprovar EXATAMENTE as invertidas conhecidas, por inversão (não por ausência/crash).
  const linha = (mut.stdout.match(/^VM_ORIENTACAO=(.*)$/m) || [])[1];
  const falhasMut = linha ? JSON.parse(linha).falhas : ['sem saída'];
  const invertidas = falhasMut.filter((f) => /arma invertida/.test(f)).map((f) => f.split(':')[0]).sort();
  const mutOk = mut.status !== 0 && falhasMut.length === invertidas.length && JSON.stringify(invertidas) === JSON.stringify([...INVERTIDAS_NO_CATALOGO].sort());
  const ok = base.status === 0 && mutOk;
  console.log(base.stdout.trim()); console.log(mut.stdout.trim().split('\n').filter((l) => /^VM_ORIENTACAO/.test(l)).join('\n'));
  console.log(JSON.stringify({ ok, base: base.status === 0, mutanteOriginal: { vermelho: mut.status !== 0, invertidas, esperado: INVERTIDAS_NO_CATALOGO } }));
  process.exit(ok ? 0 : 1);
}
const MUT = arg('mutante');
if (MUT && MUT !== 'original') throw new Error(`mutante desconhecido ${MUT}`);
const RAIZ = MUT === 'original' ? ORIGINAL : path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || path.join(ROOT, 'public/private-assets'));

const arquivos = {};
for (const f of fs.readdirSync(path.join(ROOT, 'tools/viewmodels')).filter((x) => x.endsWith('-candidates.json'))) {
  const acha = (o) => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (typeof v?.file === 'string' && /\.glb$/.test(v.file)) arquivos[k] = v.file; else acha(v); } };
  acha(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels', f), 'utf8')));
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const V = (...a) => new THREE.Vector3(...a);
const falhas = []; const linhas = []; const fora = [];
const ARMAS = Object.keys(arquivos).sort();
for (const arma of ARMAS) {
  const file = path.join(RAIZ, arquivos[arma] || '');
  // No mutante (catálogo antigo) produto que ainda não existia lá (ak/faca K) só sai da conta.
  if (!arquivos[arma] || !fs.existsSync(file)) { if (MUT) fora.push(arma); else falhas.push(`${arma}: produto ausente (${file})`); continue; }
  const doc = await io.read(file); const P = new Pose(doc);
  const nodes = doc.getRoot().listNodes();
  if (doc.getRoot().listAnimations().some((a) => a.getName() === 'idle')) P.set('idle', 0);
  let geo = nodes.filter((n) => n.getMesh() && /^GEO_MINT_[A-Z0-9]+$/.test(n.getName()));
  if (!geo.length) geo = nodes.filter((n) => n.getMesh() && /^MINT_WEAPON_[A-Z0-9]+$/.test(n.getName()));
  const pts = [];
  for (const g of geo) { const M = P.world(g); for (const pr of g.getMesh().listPrimitives()) { const p = pr.getAttribute('POSITION'); for (let i = 0; i < p.getCount(); i += 2) pts.push(V(...p.getElement(i, [])).applyMatrix4(M)); } }
  const boca = nodes.find((n) => /^SOCKET_MINT_MUZZLE$/.test(n.getName()));
  if (!pts.length || !boca) { fora.push(arma); continue; }
  const c = V(); pts.forEach((p) => c.add(p)); c.divideScalar(pts.length);
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j]; }
  let ax = V(1, 0.3, 0.2).normalize();
  for (let k = 0; k < 60; k++) ax = V(cov[0][0] * ax.x + cov[0][1] * ax.y + cov[0][2] * ax.z, cov[1][0] * ax.x + cov[1][1] * ax.y + cov[1][2] * ax.z, cov[2][0] * ax.x + cov[2][1] * ax.y + cov[2][2] * ax.z).normalize();
  if (V().setFromMatrixPosition(P.world(boca)).sub(c).dot(ax) < 0) ax.negate();
  const up = V(0, 1, 0).sub(ax.clone().multiplyScalar(ax.y)).normalize();
  const t = pts.map((p) => p.clone().sub(c).dot(ax)); const t0 = Math.min(...t), t1 = Math.max(...t);
  const fat = Array.from({ length: 10 }, () => [Infinity, -Infinity]);
  pts.forEach((p, i) => { const b = Math.min(9, Math.floor((t[i] - t0) / (t1 - t0) * 10)); const y = p.clone().sub(c).dot(up); fat[b][0] = Math.min(fat[b][0], y); fat[b][1] = Math.max(fat[b][1], y); });
  const h = fat.map(([a, b]) => (b > a ? b - a : 0));
  // Fatia vazia (vão na malha) não entra na média.
  const media = (xs) => { const v = xs.filter((x) => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  const razao = media([h[0], h[1]]) / Math.max(1e-4, media([h[8], h[9]]));
  linhas.push(`${arma.padEnd(8)} ${razao.toFixed(2).padStart(6)}  ${h.map((x) => x.toFixed(3)).join(' ')}`);
  if (!(razao >= PISO)) falhas.push(`${arma}: arma invertida — altura atrás/boca ${razao.toFixed(2)} < ${PISO}`);
}
console.log(`arma      razão  perfil de altura (trás → boca), m\n${linhas.join('\n')}`);
const medidas = linhas.length;
if (medidas < 10) falhas.push(`só ${medidas} produtos medidos (esperado ≥ 10): raiz errada ou catálogo ausente`);
console.log(`VM_ORIENTACAO=${JSON.stringify({ ok: !falhas.length, mutante: MUT || null, raiz: RAIZ, piso: PISO, medidas, fora, falhas })}`);
if (falhas.length) process.exitCode = 1;
