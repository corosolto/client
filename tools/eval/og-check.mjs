#!/usr/bin/env node
// ============================================================================
// OG CARDS — renderiza e MEDE os cards de og:image em node puro.
//
// POR QUE NÃO TESTAR PELA ROTA: o dev server do Astro não consegue carregar
// resvg-wasm. A rota da badge, que é código antigo, quebra igual em dev:
//
//     /api/badge/abc.png  -> 500   ("Maximum call stack size exceeded" no Vite)
//     /api/og/mapas.png   -> 500   (mesma causa)
//     /api/online         -> 200   (rota SSR sem resvg: funciona)
//
// Ou seja, em dev NÃO DÁ pra verificar nenhuma rota que renderiza PNG. Como o
// SVG mora em src/lib/og-card.ts, este arnês importa o MESMO código da rota,
// renderiza com o MESMO resvg e mede o PNG resultante — sem Astro no caminho.
//
// USO
//   node tools/eval/og-check.mjs           # verifica os 3 cards
//   node tools/eval/og-check.mjs --salvar  # grava os PNG em /tmp pra olhar
//
// Sai 1 se qualquer card não render 1200×630, então serve de portão.
// ============================================================================
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { CARDS, cardSvg, OG_W, OG_H } from '../../src/lib/og-card.ts';

// A FONTE É LIDA COMO TEXTO, NÃO IMPORTADA. src/lib/font-data.ts tem 996 KB e
// 7.844 linhas de base64 num único literal, e isso ESTOURA A PILHA de qualquer
// parser de TypeScript — testado nos dois:
//
//   node --experimental-strip-types + import de font-data.ts
//     -> ERR_INTERNAL_ASSERTION: Maximum call stack size exceeded  (parseTypeScript)
//   dev server do Astro, qualquer rota que importe font-data.ts
//     -> 500                     Maximum call stack size exceeded  (Vite/isFunction)
//
// `astro build` passa porque rollup/esbuild aguentam o literal — então PRODUÇÃO
// funciona e o DEV não. É a razão pela qual /api/badge/*.png responde 500 no dev
// local, e isso é bug pré-existente, não desta issue. Extrair o base64 por regex
// evita o parser por completo.
const FONT_BOLD_B64 = (() => {
  const src = readFileSync(new URL('../../src/lib/font-data.ts', import.meta.url), 'utf8');
  const i = src.indexOf('FONT_BOLD_B64');
  if (i < 0) throw new Error('não achei FONT_BOLD_B64 em src/lib/font-data.ts');
  // O valor são MILHARES de literais 'xxx' concatenados com +, um por linha —
  // não um literal só. Pegar apenas o primeiro devolve 90 bytes: cabeçalho de
  // fonte válido, zero glifo, e o resvg renderiza o card SEM NENHUM TEXTO sem
  // reclamar. Foi o que aconteceu na primeira tentativa, e só apareceu ao OLHAR
  // o PNG — a checagem de 1200×630 passava igual. Por isso este arnês também
  // confere se a fonte decodificada tem tamanho plausível.
  const pedacos = src.slice(i).match(/'[A-Za-z0-9+/=]*'/g) || [];
  const b64 = pedacos.map((p) => p.slice(1, -1)).join('');
  if (!b64) throw new Error('não achei os literais de base64 da fonte');
  return b64;
})();

const SALVAR = process.argv.includes('--salvar');
const require = createRequire(import.meta.url);

let wasmPath = null;
for (const c of ['@resvg/resvg-wasm/index_bg.wasm', '@resvg/resvg-wasm/dist/index_bg.wasm']) {
  try { wasmPath = require.resolve(c); break; } catch { /* tenta o próximo */ }
}
if (!wasmPath) { console.error('✗ OG0  resvg.wasm não encontrado no node_modules'); process.exit(1); }
await initWasm(readFileSync(wasmPath));

const fonte = Buffer.from(FONT_BOLD_B64, 'base64');
// Uma DejaVu Sans Bold completa tem ~700 KB. Qualquer coisa muito menor é
// extração truncada, que renderiza card em branco sem erro nenhum.
if (fonte.length < 200_000) {
  console.error(`✗ OG0  fonte decodificada com só ${fonte.length} bytes — extração truncada`);
  process.exit(1);
}
const fontBuffers = [fonte];
const dims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];

const falhas = [];
console.log('\n=============== OG CARDS — CORO SOLTO ===============');
console.log(`fonte: DejaVu Sans Bold, ${Math.round(fonte.length / 1024)} KB decodificados\n`);
for (const [tipo, monta] of Object.entries(CARDS)) {
  let motivo = null, w = 0, h = 0, kb = 0, card = null;
  try {
    card = monta();
    const png = Buffer.from(new Resvg(cardSvg(card), {
      font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' },
      background: '#0c0e11',
    }).render().asPng());
    kb = Math.round(png.length / 1024);
    if (png.subarray(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') motivo = 'saída não é PNG';
    else {
      [w, h] = dims(png);
      if (w !== OG_W || h !== OG_H) motivo = `${w}×${h}, esperado ${OG_W}×${OG_H}`;
    }
    if (!motivo && !card.itens.length) motivo = 'card sem nenhuma linha de item';
    if (SALVAR && !motivo) {
      const p = `/tmp/og-${tipo}.png`;
      const { writeFileSync } = await import('node:fs');
      writeFileSync(p, png);
      console.log(`         salvo em ${p}`);
    }
  } catch (e) {
    motivo = `exceção: ${String(e.message).slice(0, 90)}`;
  }
  if (motivo) falhas.push(tipo);
  console.log(`${motivo ? '✗ FALHA' : '✓ PASSA'} /api/og/${tipo}.png  ${w}×${h}  ${kb} KB`);
  if (card) console.log(`         "${card.titulo}" · ${card.etiqueta} · ${card.itens.length} linhas: ${card.itens.map(([n]) => n).join(', ').slice(0, 70)}`);
  if (motivo) console.log(`         └─ ${motivo}`);
}
console.log('\n----------------------------------------------------');
console.log(`${Object.keys(CARDS).length - falhas.length}/${Object.keys(CARDS).length} cards renderizam` +
  (falhas.length ? `  ← ${falhas.join(', ')} VERMELHOS` : '  ← tudo verde'));
console.log('----------------------------------------------------\n');
process.exit(falhas.length ? 1 : 0);
