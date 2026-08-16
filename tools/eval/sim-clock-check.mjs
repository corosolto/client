/* ============================================================================
   sim-clock-check.mjs — FPS BAIXO NÃO PODE DESACELERAR O RELÓGIO DO JOGO
   ----------------------------------------------------------------------------
   POR QUE EXISTE (issue #295)
   Relatos de jogadores: o jogo entra em câmera lenta quando o FPS cai. Causa no
   código: o loop entregava `Math.min(0.05, clock.getDelta())` — em cadência
   sustentada abaixo de 20 FPS, cada frame real de 100 ms entregava só 50 ms à
   simulação. Tempo de partida, round, recarga, respawn e bots andavam na metade
   da velocidade do relógio de parede. O clamp é um bom TETO POR PASSO (passos
   gigantes estouram colisão e IA), mas como teto POR FRAME ele descarta tempo
   real em silêncio.

   O QUE EXIGE (lê o fonte de produção, sem browser — o mesmo contrato das
   réguas estruturais como media-net):
     · SC1  o delta REAL entra inteiro na simulação: o loop FATIA o frame em
            passos de no máximo 50 ms (mesma semântica por passo de hoje) e
            chama game.update uma vez por fatia. `game.update(Math.min(0.05,
            delta))` — o mundo antigo — é a violação.
     · SC2  a fatio tem TETO de fatias por frame (guard de espiral da morte:
            máquina que não acompanha descarta o excesso em vez de acumular
            dívida infinita de tempo).
     · SC3  o ramo de preview/menu continua por frame (cosmético) — a fatio é
            só do game.update.

   Mutantes (desfazem o conserto em memória e têm que acender):
     --mutante=clamp-frame  devolve game.update(Math.min(0.05, dt)) por frame → SC1
     --mutante=sem-teto     tira o teto de fatias → SC2

   Uso: node tools/eval/sim-clock-check.mjs [--mutante=clamp-frame|sem-teto]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['clamp-frame', 'sem-teto'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);

let main = readFileSync('public/js/main.js', 'utf8');
/* Mutações por ÂNCORA + detecção de não-aplicação (lição do bug-hunt/KNOWN-BUGS:
   mutação que não casa o texto e roda igual é lida como "o guarda funciona").
   As âncoras são símbolos estáveis do loop (PASSO_TETO/resto/game.update), não
   formatação — reformatar o loop não pode cegar o mutante. */
let aplicou = false;
if (MUT === 'clamp-frame') {
  const antes = main;
  main = main.replace(
    /let resto = dtReal;[\s\S]{0,600}?(const passo = Math\.min\(0\.05, resto\);[\s\S]{0,400}?)?}/,
    (m) => { aplicou = true; return 'game.update(Math.min(0.05, dtReal)); }'; },
  );
  if (!aplicou) { console.error('MUTANTE NÃO APLICOU (clamp-frame): âncoras do loop de fatiamento sumiram — atualizar o mutante junto com o main.js'); process.exit(1); }
}
if (MUT === 'sem-teto') {
  main = main.replace(/const PASSO_TETO = \d+;/, () => { aplicou = true; return 'const PASSO_TETO = 1e9;   // mutante: sem teto'; });
  if (!aplicou) { console.error('MUTANTE NÃO APLICOU (sem-teto): declaração de PASSO_TETO sumiu do main.js'); process.exit(1); }
}

const i0 = main.indexOf('function loop()');
const trecho = main.slice(i0, main.indexOf('loop();', i0));
const falhas = [];

/* SC1: fatio do delta real — consome um resto com passos de no máx 0.05,
   chamando game.update por fatia. */
const fatio = /resto/.test(trecho)
  && /Math\.min\(0\.05,\s*resto\)/.test(trecho)
  && /game\.update\(passo/.test(trecho)
  && /dtReal/.test(trecho);
if (!fatio) falhas.push('SC1 o loop não fatia o delta real em passos de ≤ 50 ms — FPS < 20 volta a rodar em câmera lenta (issue #295)');
/* SC2: teto de fatias por frame (espiral da morte) — e o teto tem VALOR: nome
   existindo com 1e9 passa na asserção de nome (furo medido pelo mutante
   sem-teto), então o número é lido da declaração. */
const teto = Number((main.match(/const PASSO_TETO = (\d+);/) || [])[1]);
if (!/PASSO_TETO/.test(trecho) || !teto) falhas.push('SC2 fatio sem teto de passos por frame — máquina lenta acumula dívida de tempo em espiral');
else if (teto > 8) falhas.push(`SC2 teto de fatias é ${teto} — frame longo volta a simular meio segundo de uma vez (passo teto 0.05 × ${teto})`);
/* SC3: o ramo de jogo NÃO pode chamar game.update com clamp solto por frame. */
if (/game\.update\(Math\.min\(0\.05/.test(trecho)) falhas.push('SC1 game.update voltou a receber clamp por frame (mundo pré-#295)');

for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mSIM-CLOCK ${falhas.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}`);
  process.exit(1);
}
console.log('\x1b[32mSIM-CLOCK verde: o relógio do jogo acompanha o de parede em qualquer FPS\x1b[0m');
