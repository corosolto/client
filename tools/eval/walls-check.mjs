/* RÉGUA DOS WALLPAPERS — os arrays WALLS/LOADING_WALLS do main.js apontam pra arquivo
   que EXISTE no disco e é .webp.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Dois achados com número, um de cada ponta:

   1. KNOWN-BUGS.md (BUG-08 e o 404 de 04/08): lista hardcoded já engoliu arte nova em
      silêncio, e `wall-1.png` respondia 404 em produção existindo commitado "só aqui".
      Se a entrada aponta pra arquivo que não existe, ninguém descobre até olhar.

   2. A conversão WebP de 07/08 (medida pelo boot-waterfall: 22 MB de PNG no boot):
      wall-N/loading-N de 2–2,6 MB viraram ~250 KB. Se uma entrada voltar pra .png —
      arte nova commitada como PNG, o fluxo documentado no main.js — o peso volta
      em silêncio. PNG na pasta é FONTE; o que o jogo serve é .webp.

   uso: node tools/eval/walls-check.mjs [--mutante=fantasma|png]
     --mutante=fantasma  injeta entrada que não existe no disco (prova a cláusula 1)
     --mutante=png       injeta entrada .png (prova a cláusula 2)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';

const MAIN = 'public/js/main.js';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

const fonte = fs.readFileSync(MAIN, 'utf8');
const listaDe = (nome) => {
  const m = fonte.match(new RegExp(`const ${nome} = \\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
};
const entradas = [...listaDe('WALLS'), ...listaDe('LOADING_WALLS')];
if (!entradas.length) { console.error(`WALLS/LOADING_WALLS não achados em ${MAIN}`); process.exit(1); }
if (MUT === 'fantasma') entradas.push('/img/wall-999.webp');
if (MUT === 'png') entradas[0] = entradas[0].replace(/\.webp$/, '.png');

const falhas = [];
for (const e of entradas) {
  if (!e.endsWith('.webp')) falhas.push(`${e} não é .webp — PNG é fonte, o jogo serve webp (2 MB × 15 no boot)`);
  if (!fs.existsSync(`public${e}`)) falhas.push(`${e} referenciado no main.js e NÃO existe no disco — 404 em produção`);
}

console.log(`WALLS-CHECK: ${entradas.length} entradas (WALLS + LOADING_WALLS)`);
if (falhas.length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
console.log('  ✓ toda entrada existe no disco e é .webp');
