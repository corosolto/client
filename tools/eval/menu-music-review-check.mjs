#!/usr/bin/env node
/* Gate do laboratório de curadoria. Não toca áudio: prova que a tela normal continua
   aleatória, o laboratório fixa a faixa e os vereditos não saem do navegador. */
import { readFileSync } from 'node:fs';

const MAIN = readFileSync('public/js/main.js', 'utf8');
const CSS = readFileSync('public/style.css', 'utf8');
const GENERATOR = readFileSync('tools/gen-audio-manifest.mjs', 'utf8');
const BUILDER = readFileSync('scripts/build-audio-pack.mjs', 'utf8');
const { MENU_MUSIC_ACTIVE_IDS } = await import('../../public/js/menu-music-selection.js');
const erros = [];
const expected = ['m03', 'm05', 'm10', 'm11', 'm14', 'm16', 'm17', 'm22'];

if (JSON.stringify(MENU_MUSIC_ACTIVE_IDS) !== JSON.stringify(expected)) {
  erros.push(`MMR0 curadoria ativa divergiu: ${MENU_MUSIC_ACTIVE_IDS.join(', ')}.`);
}

if (!MAIN.includes("get('menumusiclab') === '1'") || !MAIN.includes("get('menutrack')")) {
  erros.push('MMR1 query de revisão/faixa determinística ausente.');
}
if (!MAIN.includes("'csbr-menu-music-review-v1'") || !MAIN.includes("verdicts[id] = verdict")) {
  erros.push('MMR2 manter/remover não persiste localmente.');
}
if (!MAIN.includes("MANTER: ${list('manter')") || !MAIN.includes("REMOVER: ${list('remover')")) {
  erros.push('MMR3 resultado da curadoria não pode ser copiado.');
}
if (!MAIN.includes("if (!MENU_MUSIC_REVIEW) _pick('musica'")) {
  erros.push('MMR4 laboratório polui a telemetria de escolha musical.');
}
if (!MAIN.includes("import { MENU_MUSIC_ACTIVE_IDS } from './menu-music-selection.js'")
  || !MAIN.includes('active.has(_menuTrackId(url))')) {
  erros.push('MMR4c jogo normal não filtra o manifest pela curadoria nominal aprovada.');
}
if (!MAIN.includes('?review=${encodeURIComponent(VERSION)}')) {
  erros.push('MMR4b A/B pode reutilizar um MP3 antigo do cache com o mesmo mNN.');
}
if (!MAIN.includes("if (MENU_MUSIC_REVIEW) params.set('debug', '1')")
  || !MAIN.includes("const testMode = params.get('debug') === '1' || !!inspectionScreen")) {
  erros.push('MMR5 laboratório não desliga telemetria/presença da sessão de teste.');
}
for (const id of ['mmr-prev', 'mmr-next', 'mmr-restart', 'mmr-keep', 'mmr-reject', 'mmr-clear', 'mmr-copy']) {
  if (!MAIN.includes(`id=\"${id}\"`) || !MAIN.includes(`byId('${id}').onclick`)) erros.push(`MMR6 controle ${id} incompleto.`);
}
if (!MAIN.includes('id="mmr-list"')
  || !MAIN.includes('data-track-index="${index}"')
  || !MAIN.includes("item.onclick = () => play(Number(item.dataset.trackIndex))")) {
  erros.push('MMR6b catálogo completo não permite abrir cada faixa diretamente.');
}
if (!CSS.includes('#menu-music-review[data-verdict="manter"]')
  || !CSS.includes('#menu-music-review[data-verdict="remover"]')
  || !CSS.includes('.mmr-list-item[data-verdict="manter"]')
  || !CSS.includes('.mmr-list-item[data-verdict="remover"]')) {
  erros.push('MMR7 estado manter/remover não aparece visualmente.');
}
if (!GENERATOR.includes('menuMusic.filter((url) => activeMenuPaths.has(url))')) {
  erros.push('MMR8 gerador de produção não reduz o manifest às faixas aprovadas.');
}
if (!BUILDER.includes('const menuFiles = new Set((manifesto.menuMusic || [])')
  || !BUILDER.includes('if (!menuFiles.has(f)')) {
  erros.push('MMR9 empacotador ainda pode copiar faixas removidas da curadoria.');
}

if (erros.length) {
  console.error(`MENU MUSIC REVIEW: ${erros.length} falha(s)`);
  for (const erro of erros) console.error(`  x ${erro}`);
  process.exit(1);
}
console.log('MENU MUSIC REVIEW: verde - catálogo reversível e 8 faixas aprovadas na rotação/pack.');
