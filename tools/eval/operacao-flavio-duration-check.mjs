import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { Game } from './harness.mjs';
import { OperacaoFlavio } from '../../public/js/mode_operacao_flavio.js';

const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
const mutations = {
  'final-cortado': ['this.stateUntil = this.time + (objectiveResult?.duration || 4.5);', 'this.stateUntil = this.time + 4.5;'],
  'final-fixo': ['this.stateUntil = this.time + (objectiveResult?.duration || 4.5);', 'this.stateUntil = this.time + 9;'],
  'normal-cortado': ['this.stateUntil = this.time + (objectiveResult?.duration || 4);', 'this.stateUntil = this.time + 4;'],
};
const TIMEOUT_ESCOLTA = ["if (this.timeLeft <= 0) this._endRound(this.objective.state?.winner || 'E');", "if (this.timeLeft <= 0) this._endRound('E');"];
if (mutant === 'timeout-fixo') {
  const source = Game.prototype.update.toString();
  assert.equal(source.split(TIMEOUT_ESCOLTA[0]).length - 1, 1, 'mutação tem alvo real único');
  console.log('Mutação aplicada: ' + mutant);
} else if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const [before, after] = mutations[mutant], source = Game.prototype._endRound.toString();
  assert.equal(source.split(before).length - 1, 1, 'mutação tem alvo real único');
  Game.prototype._endRound = runInNewContext('({' + source.replace(before, after) + '})._endRound', { PACE: false });
  console.log('Mutação aplicada: ' + mutant);
}
const failures = [];
let cases = 0;
for (const final of [false, true]) for (const winner of ['E', 'B']) {
  for (const kind of ['flavio', 'legacy', 'empty']) {
    cases++;
    const expected = kind === 'flavio' ? 9 : final ? 4.5 : 4;
    let startedAt = null;
    const state = {}, scope = { state, vip: { alive: true }, deathAnnounced: false };
    const game = {
      roundKills: { E: 0, B: 0 }, roundsWon: { E: 0, B: 0 }, ctf: false,
      time: 123, player: { scoped: true }, playerTeam: 'E', killsToWin: Infinity,
      el: { scope: { classList: { remove() {} } } },
      _radioUi() {}, _showScoreboard() {}, _ensureDolly() {}, _resultadoDaRodada() {},
      _roundWinnerVoice() {}, _voiceKey() { return ''; }, _teamName(team) { return team; },
      _fimDaPartida() { return final; }, sfx: { roundSound() { return true; } },
    };
    game.objective = kind === 'legacy' ? null : {
      roundResult(team) { return kind === 'empty' ? {} : OperacaoFlavio.prototype.roundResult.call(scope, team); },
      startCinematic() { startedAt = game.stateUntil; },
    };
    const clause = `${kind} ${final ? 'final' : 'intermediária'} ${winner}`;
    try {
      Game.prototype._endRound.call(game, winner);
      assert.equal(game.state, 'roundEnd');
      assert.equal(game.stateUntil - game.time, expected, 'duração do estado de rodada');
      if (kind === 'flavio') {
        assert.equal(startedAt - game.time, 9, 'apresentação inicia com contrato de nove segundos');
        assert.equal(state.winner, winner, 'vencedor continua autoritativo');
      }
      console.log('✓ ' + clause);
    } catch (error) {
      failures.push({ clause, type: error.name, message: error.message });
      console.error('✗ ' + clause + ': ' + error.name + ': ' + error.message.split('\n')[0]);
    }
  }
}
{
  cases++;
  const clause = 'timeout usa o veredito do objetivo';
  try {
    const source = Game.prototype.update.toString(), live = source.indexOf("else if (this.state === 'live')");
    const inicio = source.indexOf('if (this.objective) {', live), fim = source.indexOf('} else if (this.ctf)', inicio);
    assert.ok(inicio > live && fim > inicio, 'ramo real de objetivo em live');
    let ramo = source.slice(inicio, fim + 1);
    if (mutant === 'timeout-fixo') ramo = ramo.replace(TIMEOUT_ESCOLTA[0], TIMEOUT_ESCOLTA[1]);
    const executar = new Function('dt', ramo);
    let vencedor = null;
    const jogo = { state: 'live', timeLeft: .01, world: { mode: 'escort' },
      objective: { update() {}, state: { winner: 'B' } }, _endRound(time) { vencedor = time; } };
    executar.call(jogo, .02);
    assert.ok(jogo.timeLeft < 0, 'relógio da escolta esgota');
    assert.equal(vencedor, 'B', 'veredito do objetivo vence no timeout');
    console.log('✓ ' + clause);
  } catch (error) {
    failures.push({ clause, type: error.name, message: error.message });
    console.error('✗ ' + clause + ': ' + error.name + ': ' + error.message.split('\n')[0]);
  }
}
console.log(JSON.stringify({ mutant, cases, failed: failures }));
if (failures.length) process.exitCode = 1;
