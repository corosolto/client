#!/usr/bin/env node
/* Vira-Casaca: modo local explícito, conversão no respawn e fim somente sem sobreviventes. */
import { bootGame, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').slice(10) || null;
const conhecidos = new Set(['modo-descartado', 'sem-troca-bot', 'fim-com-sobrevivente']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const falhas = [];
const confere = (ok, mensagem) => { if (!ok) falhas.push(mensagem); };
const g = bootGame('praca_poderes', {
  textures: await initTextures(), bots: 4, arena: MUTANTE !== 'modo-descartado', seed: 7319,
});
let resultado = null;
g.onMatchEnd = (detalhe) => { resultado = detalhe; };

confere(g.arena === true, `Arena não foi ativada pelo contrato do Game: ${String(g.arena)}`);
confere(g.ctf === false, 'Vira-Casaca ativou CTF junto');
confere(g.roundsMax === 1, `Vira-Casaca publicou ${g.roundsMax} rounds, esperado 1`);
confere(g.timeLeft === Infinity, `Vira-Casaca ganhou relógio de round: ${g.timeLeft}`);
confere(g._modeId?.() === 'arena', `identidade de modo: ${String(g._modeId?.())}`);

const atacante = g.bots[0], vitima = g.bots[1];
// O jogador usa um caminho de respawn diferente dos bots; ambos precisam converter.
for (const combatente of g.combatants) combatente.team = 'B';
g.player.team = 'E';
vitima.team = 'E'; // mantém um sobrevivente E depois da conversão do jogador
g.state = 'live';
g._kill(g.player, atacante, 'AK', false);
confere(g.player._switchTeam === 'B', `morte do jogador não agendou conversão: ${String(g.player._switchTeam)}`);
g._respawnPlayer();
confere(g.player.team === 'B', `jogador renasceu no time ${g.player.team}, esperado B`);
confere(g.state === 'live', 'conversão do jogador encerrou com outro E ainda vivo');

for (const combatente of g.combatants) combatente.team = 'B';
vitima.team = 'E';
g.arenaSwitched = 0;
resultado = null;
g.state = 'live';
if (MUTANTE === 'fim-com-sobrevivente') {
  const real = g._checkArenaWin.bind(g);
  g._checkArenaWin = () => { real(); if (g.state === 'live') g._endMatch?.('B'); };
}
g._checkArenaWin();
confere(g.state === 'live', 'partida acabou com um sobrevivente ainda no time E');
if (g.state !== 'live') g.state = 'live';

g._kill(vitima, atacante, 'AK', false);
confere(vitima._switchTeam === 'B', `morte não agendou conversão para B: ${String(vitima._switchTeam)}`);
confere(g.state === 'live', 'partida acabou antes de aplicar a conversão');
if (MUTANTE === 'sem-troca-bot') vitima._switchTeam = null;
g._respawnEntity(vitima);
confere(vitima.team === 'B', `bot renasceu no time ${vitima.team}, esperado B`);
confere(g.arenaSwitched === 1, `contador de conversões=${g.arenaSwitched}, esperado 1`);
confere(g.state === 'matchEnd', `última conversão deixou estado ${g.state}, esperado matchEnd`);
confere(resultado?.mode === 'arena', `resultado não publicou mode=arena: ${String(resultado?.mode)}`);

console.log(`VIRA-CASACA${MUTANTE ? ` [mutante: ${MUTANTE}]` : ''}`);
console.log(`  AR1 contrato do modo: arena=${g.arena} ctf=${g.ctf} rounds=${g.roundsMax} tempo=${g.timeLeft}`);
console.log(`  AR2 conversão: jogador=${g.player.team} bot=${vitima.team} conversões finais=${g.arenaSwitched}`);
console.log(`  AR3 encerramento: estado=${g.state} resultado=${resultado?.mode || 'ausente'}`);
g.dispose?.();

if (MUTANTE) {
  if (falhas.length) {
    console.log(`MUTANTE MORDIDO: ${MUTANTE} (${falhas.join('; ')})`);
    process.exit(0);
  }
  console.error(`MUTANTE SOBREVIVEU: ${MUTANTE}`);
  process.exit(1);
}
if (falhas.length) {
  for (const falha of falhas) console.error(`  x ${falha}`);
  process.exit(1);
}
console.log('  AR1–AR3 PASSAM');
