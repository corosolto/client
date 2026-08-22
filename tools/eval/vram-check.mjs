#!/usr/bin/env node
/* ============================================================================
   vram-check.mjs — TEXTURA NÃO ENTRA CRUA, E A PARTIDA TEM ORÇAMENTO DE VRAM
   ----------------------------------------------------------------------------
   POR QUE EXISTE (medido em 21/08/2026)
   Textura em disco engana: `models/weapons` tinha 3,3 MB de WebP que viravam ~259 MB de
   VRAM (RGBA8 + mipmaps), mais que os ~89 MB dos 9 personagens de uma partida inteira.
   Duas armas novas da Mint (`g3`, `m92`) chegaram com três 2048² cada — 21,3 MB de VRAM
   POR textura, 128 MB pelas duas. Numa base onde 98% das sessões roda abaixo de 30 FPS,
   isso é o tipo de peso que ninguém vê no diff: o arquivo tem 1 MB.

   As pastas de personagem e de prop já passam por otimizador (optimize-tribos,
   optimize-props); `models/weapons` não passava por nenhum — daí o optimize-armas.mjs.
   Ferramenta, porém, não segura asset novo: o próximo GLB cru entra igual. Esta régua é
   o portão.

   O QUE ELA MEDE (lendo os GLBs, sem navegador)
   VRAM1 nenhuma textura de personagem ou arma acima de TETO_LADO (1024) — o que a arma
         mostra na mão não justifica 2K, e a diferença de cor medida foi ΔL* 0,05.
   VRAM2 a VRAM de uma partida (todas as armas + 9 personagens) abaixo de TETO_MB.

   Mutantes: textura-2k (injeta uma 2048²) e teto-estourado (injeta VRAM demais).
   Uso: node tools/eval/vram-check.mjs [--mutante=textura-2k|teto-estourado]
   ============================================================================ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['textura-2k', 'teto-estourado'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);

const TETO_LADO = 1024;
/* 260 MB = o medido hoje (164 de arma + ~89 de 9 personagens) com folga de ~7 MB para asset
   novo entrar sem virar portão vermelho de graça. Baixar este teto é melhoria, não regressão. */
const TETO_MB = 260;
const PERSONAGENS_NA_PARTIDA = 9;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const vramDe = (w, h) => w * h * 4 * 1.33;   // RGBA8 + cadeia de mipmaps

async function medir(pasta) {
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.glb')).sort();
  let vram = 0; const grandes = [];
  for (const f of arquivos) {
    let doc; try { doc = await io.read(path.join(pasta, f)); } catch { continue; }
    for (const t of doc.getRoot().listTextures()) {
      const [w, h] = t.getSize() || [0, 0];
      vram += vramDe(w, h);
      if (Math.max(w, h) > TETO_LADO) grandes.push(`${f} ${w}×${h}`);
    }
  }
  return { vram, grandes, n: arquivos.length };
}

const armas = await medir('public/models/weapons');
const chars = await medir('public/models/characters');
if (MUT === 'textura-2k') armas.grandes.push('mutante.glb 2048×2048');
if (MUT === 'teto-estourado') armas.vram += 200 * 1048576;

const mb = (b) => b / 1048576;
const vramPartida = mb(armas.vram) + (mb(chars.vram) / chars.n) * PERSONAGENS_NA_PARTIDA;
const falhas = [];
if (armas.grandes.length || chars.grandes.length)
  falhas.push(`VRAM1 textura acima de ${TETO_LADO}px: ${[...armas.grandes, ...chars.grandes].slice(0, 4).join(' · ')}`);
if (vramPartida > TETO_MB)
  falhas.push(`VRAM2 partida estoura o orçamento: ${vramPartida.toFixed(0)} MB (teto ${TETO_MB})`);

console.log(`  armas ${armas.n} arq → ${mb(armas.vram).toFixed(0)} MB · personagens ${chars.n} arq → ${mb(chars.vram).toFixed(0)} MB ` +
  `(${(mb(chars.vram) / chars.n).toFixed(1)} MB cada) · PARTIDA ≈ ${vramPartida.toFixed(0)} MB de ${TETO_MB}`);
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m VRAM textura no teto de ${TETO_LADO}px e partida dentro do orçamento`);
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
