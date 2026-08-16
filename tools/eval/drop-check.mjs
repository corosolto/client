/* drop-check.mjs — PROCEDÊNCIA DE `DROP_TTL` E `DROP_MAX` (game.js).
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   O drop de arma na morte já existiu neste jogo e foi RETIRADO a pedido do dono: "o arsenal
   completo já está no respawn, então drops pelo mapa viravam lixo espalhado". A volta dele só
   se sustenta se o acúmulo tiver teto — e teto sem procedência é opinião (AGENTS.md, regra 2).

   O que se mede aqui NÃO é pixel: é ACÚMULO EM REGIME. A pergunta é "quantas armas ficam
   vivas no chão ao mesmo tempo, em regime permanente, dado o ritmo de morte da partida?".
   Isso é fila M/D/∞ clássica: cada morte gera um item que vive exatamente DROP_TTL segundos,
   então em regime o número de itens vivos é `mortes_por_segundo × DROP_TTL`.

   O ritmo de morte sai das CONSTANTES REAIS do jogo, não de chute: 8 jogadores num 4v4, cada
   um em ciclo de (tempo de vida + RESPAWN_DELAY). O tempo de vida é o único parâmetro livre,
   e por isso ele é VARRIDO — de 6 s (partida frenética, corredor de piscina) a 25 s (partida
   de mapa grande e jogo lento). O teto tem que segurar a ponta frenética.

   REPRODUZ:  node tools/eval/drop-check.mjs
   MUTAÇÃO QUE FAZ FICAR VERMELHA (AGENTS.md, regra 3):
     • DROP_TTL = 120  -> D1 reprova (regime de 80+ armas vivas: o tapete de volta)
     • DROP_MAX = 3    -> D2 reprova (o teto passa a despejar arma recém-caída no caso comum)
     • DROP_TTL = 2    -> D3 reprova (a arma some antes de dar tempo de alguém chegar nela) */

import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const num = (nome) => {
  const m = new RegExp(`${nome}\\s*=\\s*([\\d.]+)`).exec(src);
  if (!m) throw new Error(`não achei ${nome} em public/js/game.js`);
  return +m[1];
};
const DROP_TTL = num('DROP_TTL'), DROP_MAX = num('DROP_MAX');
const RESPAWN_DELAY = num('RESPAWN_DELAY');

const JOGADORES = 8;                       // 4v4
const VIDAS = [6, 8, 10, 12, 15, 20, 25];  // tempo de vida médio varrido, em segundos
// regime permanente: mortes/s × TTL. Cada morte gera no máximo 1 drop (faca não dropa).
const vivos = (vidaMedia, ttl) => (JOGADORES / (vidaMedia + RESPAWN_DELAY)) * ttl;

console.log(`constantes lidas de game.js: DROP_TTL=${DROP_TTL}s DROP_MAX=${DROP_MAX} RESPAWN_DELAY=${RESPAWN_DELAY}s\n`);
console.log('vida média  mortes/s  armas vivas em regime  teto morde?');
const regimes = [];
for (const v of VIDAS) {
  const mps = JOGADORES / (v + RESPAWN_DELAY);
  const n = vivos(v, DROP_TTL);
  regimes.push(n);
  console.log(`${String(v).padStart(7)} s ${mps.toFixed(2).padStart(10)} ${n.toFixed(1).padStart(22)}   ${n > DROP_MAX ? 'SIM' : 'não'}`);
}

let falhas = 0;
const chk = (id, ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${id}  ${msg}`); if (!ok) falhas++; };

/* D1 — TETO DE ACÚMULO. Mesmo no cenário mais frenético, o número de armas vivas tem que
   ficar na ordem de grandeza de "algumas", não de "tapete". 20 é o limite: acima disso o
   pátio da Havan (59 vagas) e o deck da piscina passam a ter arma em toda linha de visão. */
const pior = Math.max(...regimes);
chk('D1', pior <= 20, `pior regime ${pior.toFixed(1)} armas vivas [<= 20] (vida ${VIDAS[regimes.indexOf(pior)]}s)`);

/* D2 — O TETO É REDE DE SEGURANÇA, NÃO REGRA. Se DROP_MAX mordesse no caso comum, ele
   estaria apagando arma recém-caída — que é justamente a informação de combate que o drop
   existe pra dar. Ele só pode morder na cauda frenética, não na vida média típica (12 s). */
const tipico = vivos(12, DROP_TTL);
chk('D2', DROP_MAX >= tipico, `no ritmo típico (vida 12s) o regime é ${tipico.toFixed(1)} e o teto é ${DROP_MAX} [teto >= regime]`);

/* D3 — A ARMA TEM QUE SER ALCANÇÁVEL. De nada adianta dropar se ela some antes de alguém
   atravessar o mapa até ela. O maior mapa do jogo é a Havan (76×116 m); a diagonal é ~139 m
   e a velocidade de corrida do jogo é ~5,2 m/s, então a travessia completa leva ~27 s. Exigir
   TTL >= metade disso garante que a arma sobrevive a uma aproximação de meio mapa. */
const TRAVESSIA = Math.hypot(76, 116) / 5.2;
chk('D3', DROP_TTL >= TRAVESSIA / 2, `TTL ${DROP_TTL}s [>= ${(TRAVESSIA / 2).toFixed(1)}s = meia travessia da Havan]`);

/* D4 — O PRAZO NÃO PODE SER ETERNO NA ESCALA DA RODADA. ROUND_TIME é 99 s: um TTL que passe
   de um terço da rodada faz a arma do primeiro minuto ainda estar lá no fim. */
const ROUND_TIME = num('ROUND_TIME');
chk('D4', DROP_TTL <= ROUND_TIME / 3, `TTL ${DROP_TTL}s [<= ${(ROUND_TIME / 3).toFixed(1)}s = 1/3 da rodada de ${ROUND_TIME}s]`);

console.log(falhas ? `\n${falhas} régua(s) de drop REPROVAM` : '\nDROP  todas as réguas passam');
process.exit(falhas ? 1 : 0);
