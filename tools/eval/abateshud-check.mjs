#!/usr/bin/env node
/* ============================================================================
   abateshud-check.mjs — O JOGADOR CONSEGUE LER QUANTOS ABATES ELE TEM?
   ----------------------------------------------------------------------------
   O DEFEITO (pedido do dono: "adicionar contador de abates legível")
   O HUD tinha DOIS números grandes no topo — e nenhum dos dois é o abate do jogador.
   As plaquetas `#score-e`/`#score-b` imprimem `roundKills[side]`, que é o abate do TIME
   na RODADA; o número pessoal só existia atrás do TAB (`#scoreboard`) e na tela de fim
   de partida. Quem joga não solta o mouse pra conferir o próprio placar: na prática o
   dado não existia durante a partida.

   O QUE ESTA RÉGUA MEDE
   AB1 o elemento existe no HUD de verdade (`src/pages/index.astro`, dentro de `#hud`)
       com o número e um rótulo — número sem rótulo ao lado de outros dois números
       grandes é adivinhação, não leitura.
   AB2 ele é LEGÍVEL por medida, não por opinião: a folha declara corpo >= 24px para o
       algarismo fora de media query, e o contador não nasce `display:none`.
   AB3 o número é o ABATE DO JOGADOR e ele é o da PARTIDA, não o do time nem o da
       rodada — executando o Game de verdade e matando bots dos dois times.
   AB4 ele não zera na troca de rodada (o placar de fim de partida usa o mesmo número:
       dois dados com o mesmo nome e valores diferentes é pior que nenhum).

   NÃO É CÓPIA DO VALORANT: a referência é só o princípio (um número grande com rótulo
   miúdo, ancorado no bloco de estado do jogador). Layout, tipografia, cor e marcação
   são os tokens que esta casa já usa — nenhum asset de terceiro entrou.

   MEDIDO NA ÁRVORE ANTES DO CONSERTO: `#kill-count` não existia em lugar nenhum.

   Mutantes:
     time      — o contador passa a imprimir o abate do TIME (o erro mais provável)
     rodada    — o contador zera na virada de rodada
     congelado — o contador para de acompanhar os abates
     miudo     — o corpo do algarismo cai pra 12px (prova que AB2 morde)
   Uso: node tools/eval/abateshud-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['time', 'rodada', 'congelado', 'miudo'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const falhas = [];
const CORPO_MIN = 24;   // px: piso de legibilidade do algarismo (o HP usa 42, o rótulo 11)

/* ---------- AB1: o elemento existe no HUD, não num arquivo qualquer ---------- */
const ASTRO = readFileSync(path.join(ROOT, 'src', 'pages', 'index.astro'), 'utf8');
const hudIni = ASTRO.indexOf('<div id="hud"');
const hudFim = ASTRO.indexOf('<!-- Pause', hudIni);
const HUD = hudIni >= 0 && hudFim > hudIni ? ASTRO.slice(hudIni, hudFim) : '';
if (!HUD) falhas.push('AB1 não achei o bloco #hud em src/pages/index.astro — a régua envelheceu junto com a marcação');
if (!/id="kill-counter"/.test(HUD)) falhas.push('AB1 #kill-counter não existe dentro do #hud');
if (!/id="kill-count"/.test(HUD)) falhas.push('AB1 #kill-count (o algarismo) não existe dentro do #hud');
if (!/ABATES/.test(HUD)) falhas.push('AB1 o contador não tem rótulo "ABATES" — número solto ao lado de outros dois números grandes não se lê');

/* ---------- AB2: legibilidade medida na folha ----------
   Varredura com contador de chaves pra saber se a regra está DENTRO de uma @media
   (lá o corpo menor é legítimo: é outra tela) ou no corpo principal da folha. */
const CSS = readFileSync(path.join(ROOT, 'public', 'style.css'), 'utf8');
function regras(css) {
  const out = [];
  let i = 0, depth = 0, selIni = 0, atRule = false;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const f = css.indexOf('*/', i); i = f < 0 ? css.length : f + 2; if (depth === 0) selIni = i; continue; }
    if (c === '{') {
      if (depth === 0) { atRule = /@/.test(css.slice(selIni, i)); if (!atRule) { const fim = fechamento(css, i); out.push({ sel: css.slice(selIni, i), corpo: css.slice(i + 1, fim), media: false }); } }
      else if (depth === 1 && atRule) { const fim = fechamento(css, i); out.push({ sel: css.slice(selIni, i), corpo: css.slice(i + 1, fim), media: true }); i = fim; selIni = i + 1; depth = 1; i++; continue; }
      depth++;
    } else if (c === '}') { depth = Math.max(0, depth - 1); if (depth === 0) { atRule = false; selIni = i + 1; } else if (depth === 1) selIni = i + 1; }
    i++;
  }
  return out;
}
function fechamento(css, abre) {
  let d = 0;
  for (let j = abre; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (!d) return j; } }
  return css.length;
}
let cssAlvo = CSS;
if (MUT === 'miudo') cssAlvo = CSS.replace(/(#kill-count\{[^}]*?font-size:)\d+px/, '$112px');
/* `(?![\w-])` não é preciosismo: sem ele `#kill-count` casa dentro de `#kill-counter`, e a
   régua mediria o rótulo de 11px como se fosse o algarismo — vermelha em cima de um HUD
   correto. Foi o primeiro defeito que esta régua teve. */
const todas = regras(cssAlvo);
const doNumero = todas.filter((r) => /#kill-count(?![\w-])/.test(r.sel) && /font-size|font:/.test(r.corpo) && !r.media);
const doBloco = todas.filter((r) => /#kill-counter(?![\w-])/.test(r.sel));
if (!doBloco.length) falhas.push('AB2 #kill-counter não tem regra nenhuma em public/style.css — sem folha não há "legível"');
if (!doNumero.length) falhas.push('AB2 #kill-count não declara corpo de texto fora de @media — o tamanho ficaria por conta do herdado');
for (const r of doNumero) {
  const m = r.corpo.match(/font-size:\s*(\d+(?:\.\d+)?)px/) || r.corpo.match(/font:[^;]*?\b(\d+(?:\.\d+)?)px/);
  const px = m ? parseFloat(m[1]) : 0;
  if (px < CORPO_MIN) falhas.push(`AB2 o algarismo do contador tem ${px}px (piso ${CORPO_MIN}px) — ilegível ao lado de #hp-num (42px)`);
}
if (doBloco.some((r) => /display:\s*none/.test(r.corpo) && !r.media)) falhas.push('AB2 #kill-counter nasce display:none — existir escondido não é existir');

/* ---------- AB3/AB4: comportamento, com o Game rodando ---------- */
const h = await import('./harness.mjs');
const textures = h.initTextures(h.renderer);
const g = h.bootGame('praca_poderes', { textures, seed: 909, bots: 4 });

if (MUT === 'time') {
  const orig = g._updateHud.bind(g);
  g._updateHud = function () { orig(); if (g.el.killCount) g.el.killCount.textContent = String(g.roundKills[g.playerTeam] || 0); };
} else if (MUT === 'congelado') {
  const orig = g._updateHud.bind(g);
  g._updateHud = function () { orig(); if (g.el.killCount) g.el.killCount.textContent = '0'; };
} else if (MUT === 'rodada') {
  // O defeito de verdade não é o elemento zerar: é a virada de rodada zerar o ESTADO que a
  // tela de fim de partida também lê. O mutante mora no `_startRound`, não no textContent.
  const orig = g._startRound.bind(g);
  g._startRound = function (...a) { const r = orig(...a); g.player.kills = 0; return r; };
}

const lido = () => (g.el.killCount ? String(g.el.killCount.textContent) : '<sem elemento>');
g._updateHud();
if (lido() !== '0') falhas.push(`AB3 o contador não começa em 0 (leu "${lido()}")`);

/* Abates do JOGADOR (time B) e abates que NÃO são dele (aliado mata inimigo): o contador
   só pode andar nos primeiros. É esta mistura que derruba o mutante 'time'. */
const inimigos = g.bots.filter((b) => b.team !== g.playerTeam);
const aliado = g.bots.find((b) => b.team === g.playerTeam);
let meus = 0;
for (const alvo of inimigos.slice(0, 3)) { alvo.hp = 1; g._kill(alvo, g.player, 'AWP', false); meus++; }
if (aliado && inimigos[3]) { inimigos[3].hp = 1; g._kill(inimigos[3], aliado, 'AK', false); }
g._updateHud();
if (lido() !== String(meus)) falhas.push(`AB3 o contador leu "${lido()}" com ${meus} abates do jogador (player.kills=${g.player.kills}) — está imprimindo outro número`);

/* AB4: a virada de rodada zera o placar do TIME (roundKills), não o do jogador. */
const antes = g.player.kills;
g._startRound();
g._updateHud();
if (g.player.kills !== antes) falhas.push(`AB4 a rodada nova zerou player.kills (${antes} -> ${g.player.kills}) — o fim de partida usa esse número`);
if (lido() !== String(antes)) falhas.push(`AB4 o contador zerou na virada de rodada: leu "${lido()}", esperado "${antes}"`);

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m AB contador de abates existe, é legível (>= ${CORPO_MIN}px), imprime o abate do JOGADOR e sobrevive à virada de rodada — leu "${lido()}"`);
const mutacaoCega = !!MUT && !falhas.length;
if (mutacaoCega) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
process.exit(falhas.length ? 1 : 0);
