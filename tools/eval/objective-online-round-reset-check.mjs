// Reset online de objetivos: primeira rodada recebida, rodadas seguintes e deduplicação.
import assert from 'node:assert/strict';
import { bootGame, initTextures, THREE } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || null;
assert.ok(!mutant || mutant === 'sem-reset', 'mutante conhecido');
const game = bootGame('invasao_javaporcos', {
  textures: initTextures(), bots: 3, seed: 9127,
  settings: { javaporcos: { times: 3, fim: 'infinito' } },
});
game.online = true;
const net = { meta: {}, yourEnt: 1, startPing() {}, stopPing() {} };
const mp = makeNetcode(game, net);
game._mp = mp;
mp._netMap.set(1, {});
mp._netTick = 0;

const objective = game.objective;
const prepare = objective.prepareRound;
let resets = 0;
objective.prepareRound = function (...args) {
  resets++;
  if (mutant !== 'sem-reset') return prepare.apply(this, args);
};
if (mutant) console.log('Mutação aplicada: sem-reset');

const snapshot = (tick, state, roundNum) => ({
  tick, t: tick / 20, state, roundNum, timeLeft: 360 - roundNum,
  scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0, ents: [],
  objective: { ...objective.netState(), wave: roundNum, clock: 0, phase: 'prep', prepLeft: 15, scoreByPlayer: {} },
});
const staleCorpse = () => {
  objective.corpses.push({ visual: new THREE.Group(), startedAt: game.time, side: 1, baseY: 0 });
  objective.state.wave = 8;
  objective.state.clock = 500;
  objective.state.scores.velho = { points: 999, kills: 99, assists: 0 };
};
try {
  game.state = 'live';
  staleCorpse();
  net.snap = snapshot(1, 'countdown', 1);
  mp.applySnapshot();
  assert.equal(resets, 1, 'primeira rodada online reseta uma única vez');
  assert.equal(objective.corpses.length, 0, 'primeira rodada remove corpos antigos');
  assert.equal(objective.state.wave, 1, 'snapshot da primeira rodada é autoritativo depois do reset');
  assert.equal(objective.state.clock, 0);
  assert.equal(objective.state.scores.velho, undefined, 'placar antigo não vaza para a primeira rodada');
  assert.equal(game.timeLeft, 359, 'reset não reescreve o relógio do servidor');

  net.snap = snapshot(2, 'live', 1);
  mp.applySnapshot();
  assert.equal(resets, 1, 'mesma rodada não repete reset');

  staleCorpse();
  net.snap = snapshot(3, 'countdown', 2);
  mp.applySnapshot();
  assert.equal(resets, 2, 'segunda rodada reseta uma única vez');
  assert.equal(objective.corpses.length, 0, 'segunda rodada remove corpos antigos');
  assert.equal(objective.state.wave, 2);
  assert.equal(objective.state.clock, 0);
  assert.equal(objective.state.scores.velho, undefined);
  assert.equal(game.timeLeft, 358);

  staleCorpse();
  net.snap = snapshot(4, 'live', 3);
  mp.applySnapshot();
  assert.equal(resets, 3, 'live→live de rodada nova também reseta');
  assert.equal(objective.corpses.length, 0);
  assert.equal(objective.state.wave, 3);
  assert.equal(game.timeLeft, 357);

  mp.applySnapshot();
  assert.equal(resets, 3, 'repetir o mesmo tick não repete o reset nem a transição');
  console.log('✓ primeira e posteriores rodadas online resetam uma vez, sem vazar estado ou quebrar deduplicação');
} finally {
  mp.dispose();
  game.dispose();
}
