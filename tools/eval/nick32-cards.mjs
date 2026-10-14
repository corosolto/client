/* Nick de 32 W cabe no cartão de perfil (OG 1200x630) e na badge (840x440), renderizados com o
   resvg e a fonte embutida de produção. Mede a caixa do texto do nick e cobra que ela termina
   antes do retrato (x=650) e do avatar da badge (x=692). Grava os PNGs em OUT.
   Mutante: --mutante=badge-54 volta a badge para 54 px fixos e tem de reprovar. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import { profileCardSvg } from '../../src/lib/profile-card.mjs';

const OUT = process.env.OUT || '/tmp/nick32';
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
mkdirSync(OUT, { recursive: true });
const font = readFileSync('src/lib/font-data.ts', 'utf8');
const fontBuffers = [Buffer.from([...font.matchAll(/'([A-Za-z0-9+/=]+)'/g)].map((m) => m[1]).join(''), 'base64')];
const opts = { font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' } };
const W32 = 'W'.repeat(32);

let badgeSrc = readFileSync('src/pages/api/badge/[...path].png.ts', 'utf8');
if (mutante === 'badge-54') { const antes = badgeSrc; badgeSrc = badgeSrc.replace('font-size="${nickSize}"', 'font-size="54"'); assert.notEqual(badgeSrc, antes, 'mutação aplicou'); }
else if (mutante) throw new Error(`mutante desconhecido: ${mutante}`);
const corpo = badgeSrc.slice(badgeSrc.indexOf('function badgeSvg'), badgeSrc.indexOf('export const GET'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const badgeSvg = new Function('esc', 'fmtTime', 'charName', 'CHARS', 'charSvg', `${stripTypeScriptTypes(corpo)}; return badgeSvg;`)(esc, (s) => `${s}s`, () => null, {}, () => '');

function caixaDoNick(svg, re) {
  const linhas = svg.match(re);
  assert(linhas?.length, 'texto do nick não achado no SVG');
  const [, w, h] = svg.match(/<svg[^>]*width="(\d+)" height="(\d+)"/);
  const so = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g font-family="DejaVu Sans">${linhas.join('')}</g></svg>`;
  return new Resvg(so, opts).getBBox();
}

const falhas = [];
const casos = [
  // cartão: o nick quebra em até duas linhas a partir de x=300 e termina com elipse (profile-card.mjs nickLines)
  ['cartao-perfil', profileCardSvg({ source: 'server_verified', visibility: 'public', nick: W32, handle: 'fixture_w', level: 3, points: 248, position: 17, kills: 180, deaths: 92, kd: 1.96, play_seconds: 7380 }, null, null, 'https://corosolto.com.br'), /<text x="300"[^>]*fill="#f2ead8">[^<]*<\/text>/g, 650],
  ['badge', badgeSvg({ nick: W32, points: 248, kills: 180, deaths: 92, matches: 30, wins: 12, headshots: 40, rounds: 90, play_seconds: 7380, social: null }, null, null), /<text x="56" y="132"[^>]*>[^<]*<\/text>/g, 692],
];
for (const [nome, svg, re, limite] of casos) {
  const bb = caixaDoNick(svg, re);
  writeFileSync(`${OUT}/${nome}.png`, new Resvg(svg, opts).render().asPng());
  const ok = bb && bb.x + bb.width <= limite - 4 && bb.x >= 0;
  console.log(`  ${ok ? 'ok' : 'XX'}   ${nome}: nick de 32 W vai de x=${Math.round(bb.x)} a x=${Math.round(bb.x + bb.width)} (limite ${limite})`);
  if (!ok) falhas.push(nome);
}
if (falhas.length) { console.log(`\x1b[31mNICK32 CARTÕES VERMELHO: ${falhas.join(', ')}\x1b[0m`); process.exit(1); }
if (mutante) throw new Error(`mutante ${mutante} não deixou a régua vermelha`);
console.log(`\x1b[32mNICK32 cartões verde: cartão de perfil e badge cabem 32 W. PNGs em ${OUT}\x1b[0m`);
