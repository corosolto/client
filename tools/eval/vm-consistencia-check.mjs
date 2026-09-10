#!/usr/bin/env node
/* ============================================================================
   vm-consistencia-check.mjs — A ARMA SEGUE A ANIMAÇÃO, OU A MÃO PUXA O NADA?
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O dono jogou as 26 armas autoradas e descreveu o defeito com precisão que
   nenhuma régua desta casa cobrava: *"vários rifles puxam o carregador mas ele
   não sai, então fica só a mão puxando o nada"*.

   A causa não é a animação. Medido nos GLBs de família: TODAS as 15 famílias
   animam a peça na recarga — `ak` move Charge e Mag, `ar` move Bolt,
   BoltRelease e ChargingHandle, `bolt` move oito cartuchos. A animação está
   certa e sempre esteve.

   O que falta é o VÍNCULO. A arma do pack é substituída pela nossa Mint, e a
   Mint é uma malha MONOLÍTICA: um nó só, sem pente, sem ferrolho, sem nada
   nomeado (medido: 1 nó em ak, m4, m92, uzi, lmg, scar, revolver38, p90, svd).
   Para o pente sair da arma, alguém precisa recortá-lo por CAIXA no espaço da
   arma e prendê-lo ao osso que a animação move:

       parts: { mag: { box: { min: [...], max: [...] }, bone: 'Mag' } }

   Duas armas declaram isso — `ak` e `akm`. As outras 22 não, e é exatamente
   nelas que a mão puxa o nada. A régua abaixo cobra a caixa onde a família
   move um osso de peça, e só aí.

   O QUE ELA NÃO FAZ, DE PROPÓSITO
   Não julga se a caixa está no lugar certo — isso é pixel, é
   `vm-arsenal-frames.mjs` + revisão humana. Ela cobra a existência do vínculo e
   a sanidade dele: caixa que não pega vértice nenhum é decorativa, e caixa que
   pega a arma inteira arranca o corpo junto com o pente. Régua que passa por
   vacuidade não mede nada — é a armadilha nº 1 desta casa.

   USO
     node tools/eval/vm-consistencia-check.mjs
     node tools/eval/vm-consistencia-check.mjs --json
     node tools/eval/vm-consistencia-check.mjs --mutante=<nome>

   MUTANTES (a régua denuncia a si mesma: sai 1 se o mutante PASSAR)
     semparts   apaga o `parts` da ak — VM-C1 tem de reprovar
     caixavazia encolhe a caixa da ak a zero — VM-C2 tem de reprovar
     caixatudo  infla a caixa da ak para o mundo — VM-C3 tem de reprovar
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const RAIZ = process.cwd();
const PRIV = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

/* Nós de peça móvel que a animação de recarga costuma mexer. Lista aberta: o
   pack nomeia em inglês e varia (Mag, Magazine, Charger, Charge, Bolt…). */
const RE_PECA = /mag|magazine|clip|charger?|bolt|slide|slider|pump|cylind|lever|cartridge/i;

function glbJson(p) {
  const b = fs.readFileSync(p);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.slice(20, 20 + len).toString('utf8'));
}

/** Ossos de peça que a recarga da família realmente move. */
export function pecasMovidas(familia) {
  const p = path.join(PRIV, familia, `${familia}-runtime.glb`);
  if (!fs.existsSync(p)) return null;
  const j = glbJson(p);
  const nomes = new Map((j.nodes || []).map((n, i) => [i, n.name || '']));
  const recarga = (j.animations || []).filter((a) => /reload|pump|cylind/i.test(a.name || ''));
  const movidos = new Set();
  for (const a of recarga) {
    for (const c of a.channels || []) {
      const nome = nomes.get(c.target?.node);
      if (nome && RE_PECA.test(nome)) movidos.add(nome);
    }
  }
  return [...movidos];
}

/** Fração dos vértices da arma que caem dentro da caixa declarada. */
export function fracaoNaCaixa(armaGlb, box) {
  if (!fs.existsSync(armaGlb)) return null;
  const b = fs.readFileSync(armaGlb);
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + len).toString('utf8'));
  const binOff = 20 + len + 8;
  let dentro = 0;
  let total = 0;
  for (const m of j.meshes || []) {
    for (const pr of m.primitives || []) {
      const acc = j.accessors[pr.attributes.POSITION];
      if (!acc || acc.componentType !== 5126 || acc.type !== 'VEC3') continue;
      const bv = j.bufferViews[acc.bufferView];
      const passo = bv.byteStride || 12;
      const base = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
      for (let i = 0; i < acc.count; i += 1) {
        const o = base + i * passo;
        const x = b.readFloatLE(o);
        const y = b.readFloatLE(o + 4);
        const z = b.readFloatLE(o + 8);
        total += 1;
        if (x >= box.min[0] && x <= box.max[0] && y >= box.min[1] && y <= box.max[1]
          && z >= box.min[2] && z <= box.max[2]) dentro += 1;
      }
    }
  }
  return total ? { dentro, total, fracao: dentro / total } : null;
}

/* Pisos e tetos: um pente é uma minoria clara da arma. A ak aprovada mede a
   referência; abaixo de VAZIA a caixa é decorativa, acima de TUDO ela arranca o
   corpo junto. Números conferidos contra a ak em 11/09/2026. */
const VAZIA = 0.005;
const TUDO = 0.60;

export async function medir() {
  const modUrl = pathToFileURL(path.join(RAIZ, 'public/js/data/vmconfig.js')).href;
  const { VM_WEAPON, VM_FAMILY } = await import(modUrl);
  const linhas = [];

  for (const [arma, cfg] of Object.entries(VM_WEAPON)) {
    const familia = cfg.family;
    if (VM_FAMILY[familia]?.ready !== true) continue;
    const movidas = pecasMovidas(familia) ?? [];
    let parts = cfg.parts;
    if (MUT === 'semparts' && arma === 'ak') parts = null;
    if (MUT === 'caixavazia' && arma === 'ak') parts = { mag: { box: { min: [0, 0, 0], max: [0, 0, 0] }, bone: 'Mag' } };
    if (MUT === 'caixatudo' && arma === 'ak') parts = { mag: { box: { min: [-9, -9, -9], max: [9, 9, 9] }, bone: 'Mag' } };

    const glb = path.join(RAIZ, 'public/models/weapons', `${arma}.glb`);
    let frac = null;
    if (parts?.mag?.box) frac = fracaoNaCaixa(glb, parts.mag.box);

    linhas.push({ arma, familia, movidas, temParts: Boolean(parts?.mag?.box), fracao: frac?.fracao ?? null });
  }
  return linhas;
}

function avaliar(linhas) {
  const falhas = [];
  for (const l of linhas) {
    if (l.movidas.length === 0) continue; // família sem peça móvel não deve nada
    if (!l.temParts) {
      falhas.push({ regra: 'VM-C1', arma: l.arma, msg: `família ${l.familia} move ${l.movidas.join('/')} na recarga, mas a arma não declara parts.mag — a mão puxa o nada` });
      continue;
    }
    if (l.fracao === null) {
      falhas.push({ regra: 'VM-C2', arma: l.arma, msg: 'caixa declarada mas o GLB da arma não pôde ser medido' });
      continue;
    }
    if (l.fracao < VAZIA) {
      falhas.push({ regra: 'VM-C2', arma: l.arma, msg: `caixa pega ${(l.fracao * 100).toFixed(2)}% dos vértices (< ${VAZIA * 100}%) — decorativa` });
    }
    if (l.fracao > TUDO) {
      falhas.push({ regra: 'VM-C3', arma: l.arma, msg: `caixa pega ${(l.fracao * 100).toFixed(1)}% dos vértices (> ${TUDO * 100}%) — arranca o corpo junto` });
    }
  }
  return falhas;
}

const linhas = await medir();
const falhas = avaliar(linhas);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ mutante: MUT || null, armas: linhas.length, falhas }, null, 2));
} else {
  console.log('\n  arma         família    peças movidas na recarga        parts  vértices na caixa');
  console.log('  ' + '-'.repeat(84));
  for (const l of linhas) {
    const f = l.fracao === null ? '—' : `${(l.fracao * 100).toFixed(2)}%`;
    console.log(`  ${l.arma.padEnd(12)} ${l.familia.padEnd(10)} ${(l.movidas.join(',') || '—').slice(0, 30).padEnd(31)} ${(l.temParts ? 'sim' : 'NÃO').padEnd(6)} ${f}`);
  }
  console.log('');
  for (const f of falhas) console.log(`  ✗ ${f.regra} ${f.arma}: ${f.msg}`);
  console.log(`\n  ${linhas.length - new Set(falhas.map((f) => f.arma)).size}/${linhas.length} armas com o vínculo de peça móvel íntegro\n`);
}

if (MUT) {
  // A régua denuncia a si mesma: o mutante TEM de reprovar.
  if (!falhas.some((f) => f.arma === 'ak')) {
    console.error(`MUTANTE ${MUT} PASSOU — a régua não morde`);
    process.exit(1);
  }
  console.log(`mutante ${MUT}: reprovou como devia`);
  process.exit(0);
}

process.exit(falhas.length ? 1 : 0);
