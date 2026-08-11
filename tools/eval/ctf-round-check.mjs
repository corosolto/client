/* CTF-ROUND-CHECK — a RODADA de captura tem que fechar por OBJETIVO, não pela rede de
   segurança de tempo da PARTIDA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Sintoma do dono: *"o jogo tá reiniciando do nada, estava num CTF no ferro velho do Zé"*.

   O bloco de doutrina do modo (game.js:84-104) declara, por escrito:
     "a RODADA fecha por ALVO DE CAPTURAS (CTF_CAPS_TO_WIN) ou por dominação das
      bandeiras (_ctfWin) — nunca por tempo"
   e o teto CTF_MATCH_TIME é chamado, na mesma frase, de **rede de segurança**.

   Só que quem implementa "fecha por alvo de capturas" é o `_checkPace()`, e ele começa
   com `if (!PACE || ...) return`, sendo `PACE = QS.get('pace') === '1'` — DESLIGADO por
   padrão. O `_updatePlayer` ainda o chama sob `if (PACE)`. Ou seja: numa partida normal
   a condição declarada NUNCA é avaliada, a rodada 1 não fecha nunca, e a partida inteira
   morre de uma vez quando `ctfMatchLeft` zera — `_endRound()` e `_endMatch()` no mesmo
   frame, com o jogador no meio de um tiroteio e sem cronômetro na tela (o relógio só
   aparece nos últimos CTF_CLOCK_SHOW = 60 s). Do lado de cá isso é exatamente
   "o jogo reiniciou do nada".

   A UI4 não pega isso porque ela cobra que a PARTIDA feche — e ela fecha, pela rede de
   segurança. Ninguém cobrava a RODADA.

   CLÁUSULAS
     CTF-R1  o alvo de capturas é avaliado FORA do gate de PACE (lido do fonte)
     CTF-R2  simulando a partida, a rodada fecha por objetivo antes do teto de tempo
     CTF-R3  o teto de tempo continua existindo como rede de segurança

   uso: node tools/eval/ctf-round-check.mjs [--mutante=pace|semteto]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import { bootGame, MAPS, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const falhas = [];

/* ── CTF-R1: leitura do FONTE ─────────────────────────────────────────────────────── */
let fonte = fs.readFileSync('public/js/game.js', 'utf8');
if (MUT === 'pace') {
  // devolve o defeito: o alvo de capturas volta pra dentro do gate de PACE
  fonte = fonte.replace(/_checkCtfAlvo\(\)\s*\{/, '_checkCtfAlvo() { if (!PACE) return;');
}
if (MUT === 'semteto') fonte = fonte.replace(/const CTF_MATCH_TIME = \d+;/, 'const CTF_MATCH_TIME = Infinity;');

{
  // o corpo da função que decide o fim da rodada de captura não pode depender de PACE
  const m = fonte.match(/_checkCtfAlvo\(\)\s*\{[\s\S]*?\n  \}/);
  if (!m) falhas.push('CTF-R1 não existe `_checkCtfAlvo()` em game.js — quem fecha a rodada de captura?');
  else if (/\bPACE\b/.test(m[0])) falhas.push('CTF-R1 `_checkCtfAlvo()` depende de PACE (?pace=1), que é DESLIGADO por padrão — a rodada nunca fecha por objetivo');
  // e ele tem que ser CHAMADO fora de um `if (PACE)`
  const chamada = fonte.match(/.*_checkCtfAlvo\(\).*/g) || [];
  const soDentroDePace = chamada.filter((l) => !/_checkCtfAlvo\(\)\s*\{/.test(l)).every((l) => /if \(PACE\)/.test(l));
  if (chamada.length < 2) falhas.push('CTF-R1 `_checkCtfAlvo()` é declarado e nunca chamado');
  else if (soDentroDePace) falhas.push('CTF-R1 `_checkCtfAlvo()` só é chamado sob `if (PACE)`');
  const teto = fonte.match(/const CTF_MATCH_TIME = ([^;]+);/);
  if (!teto || !Number.isFinite(parseFloat(teto[1]))) falhas.push('CTF-R3 CTF_MATCH_TIME não é um teto finito — a rede de segurança sumiu');
}

/* ── CTF-R2/R3: SIMULA a partida (o motor de verdade, não a declaração) ───────────── */
const textures = initTextures();
const MAPA = process.env.CTF_MAPA || 'ferro_velho';
const g = bootGame(MAPA, { textures, ctf: true, seed: 4242 });
/* MUTAÇÃO `pace`: reproduz EXATAMENTE o estado anterior ao conserto — com `PACE` off, o
   alvo de capturas não era avaliado nunca. Desligar `_checkCtfAlvo` na instância é o
   mesmo efeito, e prova que a CTF-R2 mede o motor, não a declaração. */
if (MUT === 'pace') g._checkCtfAlvo = () => {};
/* MUTAÇÃO `semteto`: tira a rede de segurança de tempo da PARTIDA. */
if (MUT === 'semteto') g.ctfMatchLeft = Infinity;
const DT = 1 / 30;
let rodadasFechadas = 0, primeiroFecho = null, capsNoFecho = null;
let t = 0;
const TETO = 900;   // 480 s de partida + folga
const rodadaInicial = g.roundNum;
while (t < TETO) {
  // as capturas do harness são lentas demais para caber num teste de portão: injeta o
  // PROGRESSO de captura direto (é o mesmo contador que o modo lê), sem tocar na lógica
  // de fim de rodada, que é o que está sob julgamento.
  if (Math.abs(t % 25) < DT && g.state === 'live') g.roundCaps.B++;
  g.update(DT);
  t += DT;
  if (g.roundNum > rodadaInicial + rodadasFechadas) {
    rodadasFechadas++;
    if (primeiroFecho === null) { primeiroFecho = t; capsNoFecho = g.roundCaps.B; }
  }
  if (g.state === 'matchEnd') break;
}
const alvo = g.capsToWin;
console.log(`CTF-ROUND-CHECK (${MAPA}, semente 4242): alvo de capturas ${alvo} · ` +
  `bandeiras ${g.world.ctfPoints ? g.world.ctfPoints.length : '?'} · rodadas fechadas ${rodadasFechadas} · ` +
  `1º fecho em ${primeiroFecho === null ? 'NUNCA' : primeiroFecho.toFixed(1) + ' s'} · fim em ${t.toFixed(1)} s (${g.state})`);

if (primeiroFecho === null) {
  falhas.push(`CTF-R2 a RODADA nunca fechou: ${t.toFixed(0)} s de partida com capturas chegando e roundNum parado em ${g.roundNum}`);
} else if (primeiroFecho > 470) {
  falhas.push(`CTF-R2 a rodada só fechou em ${primeiroFecho.toFixed(0)} s — é o teto de PARTIDA, não o objetivo`);
}
if (g.state !== 'matchEnd' && t >= TETO) falhas.push(`CTF-R3 a partida não fechou em ${TETO} s — a rede de segurança sumiu`);

if (falhas.length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
console.log('  ✓ a rodada de captura fecha por OBJETIVO e a partida tem rede de segurança');
