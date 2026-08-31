#!/usr/bin/env node
/* ============================================================================
   vm-goldsrc-check.mjs — PORTÃO da trilha CS 1.6 (goldsrc)

   Existe porque em 30/08 a tela estava errada e as réguas estavam verdes: três
   armas sem mãos, a shotgun sem a própria recarga, o pente preso em 16 de 26
   e a mira dentro do cano. Nenhum desses defeitos tinha régua — todos são
   verificáveis no GLB construído, sem browser.

   GS1 · mãos: todo runtime tem malha de mão (lhand/rhand ou GS_HANDS)
   GS2 · sockets: boca e alça existem, e a ALÇA fica ACIMA do eixo do cano
         (o `up * 0.0` mandava a câmera olhar para dentro do cano no ADS)
   GS3 · recarga: toda arma tem clipe de recarga (tactical ou o laço start/
         loop/end) — a shotgun perdeu o dela para um bug de iterador
   GS4 · limpo: zero clipe-lixo de silenciador vazando do molde
   GS5 · pente: família com reloadStyle 'mag' tem o pente como OBJETO
         (sem ele a mão esquerda agarra o vazio na recarga)
   GS6 · arsenal: um runtime por arma de WEAPON_IDS, sem sobra nem falta

   Mutantes (provam que a régua morde):
     --mutante=sem-maos · sem-alca · sem-recarga · com-lixo · sem-pente
   Uso: node tools/eval/vm-goldsrc-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WEAPON_IDS } from '../../public/js/weapons.js';
import { VM_FAMILY, VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = '/Users/ruben/csbrasil-private-assets/generated/viewmodels/goldsrc-vm';
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
const falhas = [];

if (!existsSync(DIR)) {
  console.log('GOLDSRC SKIP: private-assets ausentes nesta máquina (só o dono assa)');
  process.exit(0);
}

const lerGlb = (arquivo) => {
  const b = readFileSync(arquivo);
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + len).toString());
  const binOfs = 20 + len + 8;
  const acc = (i) => {
    const a = j.accessors[i];
    const bv = j.bufferViews[a.bufferView];
    const o = binOfs + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    const v = [];
    for (let k = 0; k < a.count * n; k += 1) v.push(b.readFloatLE(o + 4 * k));
    return { count: a.count, n, v };
  };
  return { j, acc };
};

// posição de mundo de um nó (cadeia de TRS locais; o molde não usa rotação nos
// empties de socket, então basta compor translação × escala do pai)
const mundoDoNo = (j, idx) => {
  const pais = new Array(j.nodes.length).fill(-1);
  j.nodes.forEach((n, i) => (n.children || []).forEach((c) => { pais[c] = i; }));
  const cadeia = [];
  for (let i = idx; i >= 0; i = pais[i]) cadeia.unshift(i);
  let p = [0, 0, 0];
  let e = [1, 1, 1];
  for (const i of cadeia) {
    const n = j.nodes[i];
    const t = n.translation || [0, 0, 0];
    p = [p[0] + t[0] * e[0], p[1] + t[1] * e[1], p[2] + t[2] * e[2]];
    const s = n.scale || [1, 1, 1];
    e = [e[0] * s[0], e[1] * s[1], e[2] * s[2]];
  }
  return p;
};

const armas = WEAPON_IDS.filter((w) => w !== 'knife');
const arquivos = readdirSync(DIR).filter((f) => f.endsWith('-runtime.glb'));

// GS6 — arsenal casado
const construidas = new Set(arquivos.map((f) => f.replace('-runtime.glb', '')));
const faltando = armas.filter((w) => !construidas.has(w));
const sobrando = [...construidas].filter((w) => w !== 'knife' && !armas.includes(w));
if (faltando.length) falhas.push(`GS6 sem runtime: ${faltando.join(', ')}`);
if (sobrando.length) falhas.push(`GS6 runtime órfão (arma cortada?): ${sobrando.join(', ')}`);

for (const arma of armas) {
  const arquivo = path.join(DIR, `${arma}-runtime.glb`);
  if (!existsSync(arquivo)) continue;
  const { j } = lerGlb(arquivo);
  const meshes = j.nodes.filter((n) => n.mesh !== undefined).map((n) => n.name || '');
  const anims = (j.animations || []).map((a) => a.name);

  // GS1 — mãos
  const temMaos = meshes.some((n) => /hand/i.test(n)) || meshes.includes('GS_HANDS');
  if (!temMaos || MUT === 'sem-maos') falhas.push(`GS1 ${arma}: runtime sem malha de mão`);

  // GS2 — sockets e alça acima do cano
  const iBoca = j.nodes.findIndex((n) => n.name === 'SOCKET_MINT_MUZZLE');
  const iAlca = j.nodes.findIndex((n) => n.name === 'SOCKET_MINT_SIGHT');
  if (iBoca < 0 || iAlca < 0) {
    falhas.push(`GS2 ${arma}: falta socket de boca/alça`);
  } else {
    const boca = mundoDoNo(j, iBoca);
    const alca = mundoDoNo(j, iAlca);
    // eixo do cano = boca − alça; a alça tem de estar acima dele (componente
    // vertical do vetor alça→eixo). No espaço do molde exportado, +Y é cima.
    const alturaRelativa = (alca[1] - boca[1]) / Math.max(1e-6,
      Math.hypot(boca[0] - alca[0], boca[1] - alca[1], boca[2] - alca[2]));
    const ok = MUT === 'sem-alca' ? false : alturaRelativa > 0.02;
    if (!ok) {
      falhas.push(`GS2 ${arma}: alça não está acima do cano (altura relativa ${alturaRelativa.toFixed(3)}; o bug de 30/08 dava 0)`);
    }
  }

  // GS3 — recarga presente
  const temRecarga = anims.some((n) => n === 'reload_tactical' || n === 'reload_empty')
    || (anims.includes('reload_start') && anims.includes('reload_loop'));
  if (!temRecarga || MUT === 'sem-recarga') falhas.push(`GS3 ${arma}: sem clipe de recarga (${anims.join(',') || 'nenhum'})`);

  // GS4 — sem clipe-lixo
  const lixo = anims.filter((n) => /silencer|_unsil|shootlast/.test(n));
  if (lixo.length || MUT === 'com-lixo') falhas.push(`GS4 ${arma}: clipe-lixo vazando (${lixo.join(',') || 'mutante'})`);

  // GS5 — pente como objeto nas famílias de pente
  const familia = VM_WEAPON[arma]?.family;
  const estilo = VM_FAMILY[familia]?.reloadStyle;
  if (estilo === 'mag') {
    const temPente = meshes.some((n) => /MAG/i.test(n));
    if (!temPente || MUT === 'sem-pente') {
      falhas.push(`GS5 ${arma} (${familia}): recarrega por pente e o pente não é objeto — a mão agarra o vazio`);
    }
  }
}

for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mGOLDSRC ${falhas.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}`);
  process.exit(1);
}
if (MUT) {
  console.error(`\x1b[31mMUTANTE ${MUT} PASSOU — a régua não morde\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[32mGOLDSRC verde: ${armas.length} armas com mãos, sockets, recarga e pente no lugar\x1b[0m`);
