// Despacho de áudio de fim de rodada online para horda e escolta autoritativa.
import assert from 'node:assert/strict';
import './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || null;
assert.ok(!mutant || mutant === 'sem-audio', 'mutante conhecido');
if (mutant) console.log('Mutação aplicada: sem-audio');

const runCase = (mode, winner, winnerAtual = null) => {
  const events = [];
  const game = {
    world: { mode }, playerTeam: 'E', roundsWon: { E: 0, B: 0 },
    player: { scoped: false }, el: { scope: { classList: { remove() {} } } },
    radioOpen: null,
    objective: {
      ...(mode === 'escort' ? { vip: {} } : {}),
      state: { winner },
      roundResult(team) { return { title: team, detail: 'resultado' }; },
      startCinematic() {},
    },
    sfx: {
      roundSound() { return mutant ? true : false; },
      roundWin() { if (!mutant) events.push('win'); },
      roundLose() { if (!mutant) events.push('lose'); },
    },
    _radioUi() {}, _resultadoDaRodada() {}, _showScoreboard() {}, _ensureDolly() {},
    _roundWinnerVoice(team) { if (!mutant) events.push(`voice:${team}`); },
    _voiceKey(team) { return team; },
  };
  const net = { meta: {}, startPing() {}, stopPing() {} };
  const mp = makeNetcode(game, net);
  mp._netTick = 1;
  try {
    mp.transicaoDeEstado('live', 'roundEnd', { E: 0, B: 0 }, winnerAtual);
    return events;
  } finally { mp.dispose(); }
};

assert.deepEqual(runCase('horde', 'E'), ['voice:E', 'win'], 'horda: vencedor E tem voz e vitória');
assert.deepEqual(runCase('horde', 'B'), ['voice:B', 'lose'], 'horda: vencedor B tem voz e derrota');
assert.deepEqual(runCase('horde', 'J'), ['lose'], 'horda: J usa fallback de derrota sem voz humana');
assert.deepEqual(runCase('horde', 'draw'), ['lose'], 'horda: empate usa fallback de derrota');
assert.deepEqual(runCase('escort', 'E', 'B'), ['voice:B', 'lose'], 'escolta: winner explícito do snapshot vence estado antigo');
console.log('✓ áudio online da horda e vencedor autoritativo da escolta preservados');
