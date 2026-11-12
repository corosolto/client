#!/usr/bin/env node
/* ============================================================================
   retrato-hero-check.mjs — NENHUM CÓDIGO PEDE RETRATO QUE NÃO EXISTE
   ----------------------------------------------------------------------------
   O CASO (ops-diag #1231, 07/11/2026): o boot de produção pedia
   `/img/chars-hero/julia-zanatta.webp` e levava 404. O `portraitUrl` do main.js
   supunha hero para todo personagem ("os 44 têm arquivo" — comentário velho: o
   characters.js tem 63 ids e só 45 heros), e mais seis consumidores montavam a
   mesma URL na mão. A fonte única agora é `public/js/data/retratos.js`.

   O QUE MEDE (node puro, sem Chrome):
   RH1 · HERO_IDS == public/img/chars-hero/*.webp, nos dois sentidos;
   RH2 · RECORTE_IDS == public/img/chars/*.webp, nos dois sentidos;
   RH3 · todo id do characters.js tem busto em public/img/chars/avatars/ (a última
         fonte de retratoFontes, que por isso nunca termina em 404);
   RH4 · para TODO id do characters.js, cada URL de retratoFontes existe em disco, e o
         portraitUrl/portraitFallbackUrl REAIS do main.js (fatia rodada em vm) apontam
         para arquivo existente — personagem sem hero nunca pede /img/chars-hero/<id>;
   RH5 · nenhum fonte de public/js ou src monta URL de chars-hero fora do retratos.js.

   Mutantes: hero-fantasma (põe julia-zanatta no HERO_IDS), helper-cego (heroUrl
   ignora o conjunto) e consumidor-cru (main.js volta a montar o hero na mão).

   Uso: node tools/eval/retrato-hero-check.mjs [--mutante=hero-fantasma|helper-cego|consumidor-cru]
   ============================================================================ */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import vm from 'node:vm';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'hero-fantasma': 'RH1', 'helper-cego': 'RH4', 'consumidor-cru': 'RH4' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ROOT = join(import.meta.dirname, '../..');
const PUB = join(ROOT, 'public');
const ler = (p) => readFileSync(join(ROOT, p), 'utf8');

/* Mutações só em memória: o módulo mutado entra por data: URL, nada é escrito em disco. */
const trocar = (texto, de, para) => {
  if (texto.split(de).length !== 2) { console.error(`MUTAÇÃO NÃO APLICADA: ${MUT} (âncora "${de}")`); process.exit(4); }
  return texto.replace(de, para);
};
let fonteRetratos = ler('public/js/data/retratos.js');
if (MUT === 'hero-fantasma') fonteRetratos = trocar(fonteRetratos, 'export const HERO_IDS = new Set([', "export const HERO_IDS = new Set(['julia-zanatta', ");
if (MUT === 'helper-cego') fonteRetratos = trocar(fonteRetratos, '(HERO_IDS.has(id) ?', '(true ?');
const retratos = await import(`data:text/javascript,${encodeURIComponent(fonteRetratos)}`);
let fonteMain = ler('public/js/main.js');
if (MUT === 'consumidor-cru') fonteMain = trocar(fonteMain, '`${retratoFontes(def.id)[0]}?v=${VERSION}`', '`/img/chars-hero/${def.id}.webp?v=${VERSION}`');

const falhas = [];
const idsDe = (dir) => readdirSync(join(PUB, dir)).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
const comparar = (clausula, rotulo, conjunto, dir) => {
  const disco = new Set(idsDe(dir));
  for (const id of [...conjunto].sort()) if (!disco.has(id)) falhas.push(`${clausula} ${rotulo} tem ${id}, mas public/${dir}/${id}.webp não existe — 404 garantido`);
  for (const id of [...disco].sort()) if (!conjunto.has(id)) falhas.push(`${clausula} public/${dir}/${id}.webp existe e falta em ${rotulo} — arte no disco que ninguém usa`);
};

// ── RH1 / RH2 ────────────────────────────────────────────────────────────────
comparar('RH1', 'HERO_IDS', retratos.HERO_IDS, 'img/chars-hero');
comparar('RH2', 'RECORTE_IDS', retratos.RECORTE_IDS, 'img/chars');

// ── RH3 ──────────────────────────────────────────────────────────────────────
/* characters.js importa three e lê `location`: os ids saem do texto do array. */
const chars = ler('public/js/characters.js');
const bloco = chars.slice(chars.indexOf('export const CHARACTERS = ['), chars.indexOf('\n];', chars.indexOf('export const CHARACTERS = [')));
const ids = [...bloco.matchAll(/^ {2}\{\s*id:\s*'([a-z0-9_-]+)'/gm)].map((m) => m[1]);
if (ids.length < 50) falhas.push(`RH3 só ${ids.length} ids lidos do characters.js — o parser perdeu o array`);
for (const id of ids) if (!existsSync(join(PUB, 'img/chars/avatars', `${id}.webp`))) falhas.push(`RH3 ${id} sem busto em public/img/chars/avatars/ — retratoFontes termina em 404`);

// ── RH4 ──────────────────────────────────────────────────────────────────────
const existe = (url) => existsSync(join(PUB, url.split('?')[0]));
const ini = fonteMain.indexOf('const portraitUrl ='), fim = fonteMain.indexOf('let pvVidToken');
let main = null;
if (ini < 0 || fim < ini) falhas.push('RH4 fatia portraitUrl…pvVidToken não achada no main.js — régua cega');
else {
  main = new vm.Script(`${fonteMain.slice(ini, fim)}\n({portraitUrl,portraitFallbackUrl})`).runInNewContext({
    VERSION: 'regua', tretaSkinPresentation: () => null, retratoFontes: retratos.retratoFontes,
  });
}
const semHero = ids.filter((id) => !existsSync(join(PUB, 'img/chars-hero', `${id}.webp`)));
for (const id of ids) {
  for (const url of retratos.retratoFontes(id)) if (!existe(url)) falhas.push(`RH4 retratoFontes('${id}') inclui ${url}, que não existe`);
  if (!main) continue;
  const a = main.portraitUrl({ id }), b = main.portraitFallbackUrl({ id });
  for (const [nome, url] of [['portraitUrl', a], ['portraitFallbackUrl', b]]) {
    if (!url.endsWith('?v=regua')) falhas.push(`RH4 main.js ${nome}('${id}') perdeu o ?v=\${VERSION}: ${url}`);
    if (!existe(url)) falhas.push(`RH4 main.js ${nome}('${id}') pede ${url}, que não existe — o 404 do boot (#1231)`);
  }
  if (a === b && retratos.retratoFontes(id).length > 1) falhas.push(`RH4 main.js fallback de ${id} repete a fonte que acabou de falhar (${a})`);
}

// ── RH5 ──────────────────────────────────────────────────────────────────────
const MONTA_HERO = /chars-hero\/\$\{|['"`]chars-hero['"`]|chars-hero\/['"`]\s*\+/;
const fontes = [];
const anda = (dir) => {
  for (const nome of readdirSync(dir).sort()) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) anda(p);
    else if (/\.(m?js|astro|ts)$/.test(nome)) fontes.push(p);
  }
};
anda(join(PUB, 'js'));
anda(join(ROOT, 'src'));
for (const arquivo of fontes) {
  const rel = relative(ROOT, arquivo);
  if (rel === join('public', 'js', 'data', 'retratos.js')) continue;
  const texto = rel === join('public', 'js', 'main.js') ? fonteMain : readFileSync(arquivo, 'utf8');
  texto.split('\n').forEach((linha, i) => {
    if (MONTA_HERO.test(linha)) falhas.push(`RH5 ${rel}:${i + 1} monta URL de chars-hero na mão — use retratoFontes/heroUrl de data/retratos.js: ${linha.trim().slice(0, 100)}`);
  });
}

if (MUT) {
  const alvo = MUTANTES[MUT];
  const achada = falhas.find((f) => f.startsWith(alvo));
  if (achada) { console.log(`mutante ${MUT} reprovado como devia: ${achada}`); process.exit(0); }
  console.error(`MUTAÇÃO PASSOU — ${MUT} não acendeu ${alvo} (${falhas.map((f) => f.slice(0, 3)).join(',') || 'nenhuma falha'})`);
  process.exit(1);
}
for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mRETRATO-HERO ${falhas.length} VERMELHA(S)\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[32mRETRATO-HERO verde: ${retratos.HERO_IDS.size} heros e ${retratos.RECORTE_IDS.size} recortes = disco; ${ids.length} personagens (${semHero.length} sem hero) com portraitUrl/fallback existentes; ${fontes.length} fontes sem URL de hero na mão\x1b[0m`);
