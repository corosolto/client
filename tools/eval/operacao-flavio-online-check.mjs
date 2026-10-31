import assert from 'node:assert/strict';
import { Game, THREE, mkEl } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';
import { OperacaoFlavio } from '../../public/js/mode_operacao_flavio.js';

// Régua independente: roda HUD e transições reais, sem renderer ou rede humana.
const el = Object.fromEntries(['hud','hpNum','hpFill','ammoWeaponArt','ammoMag','ammoRes','ammoBars','roundTime','roundsRow','scoreP','scoreB','prot','protCount','scope'].map(k => [k, mkEl('div')]));
const vip = { team: 'B', pos: new THREE.Vector3(), _meshWeapon: 'knife' };
const result = [];
const game = {
  online: true, dedicated: false, time: 10, timeLeft: 305, state: 'live',
  bots: [vip], el, playerTeam: 'B', player: { hp: 100, kills: 0, weapon: 'knife', alive: true, protUntil: 0 },
  world: { escortPath: [{ x: 0, z: 0 }, { x: 0, z: 4 }, { x: 0, z: 8 }], groundHeightAt: () => 0,
    objectivePlane: { position: new THREE.Vector3(0, .08, 55) } },
  roundsWon: { E: 0, B: 0 }, roundNum: 1, roundsMax: 3, roundsToWin: 2,
  vmScene: { visible: true }, camera: { position: new THREE.Vector3(), lookAt() {} },
  sfx: new Proxy({}, { get: () => () => false }),
  _trocarPersonagem() {}, _syncRemoteWeapon() {}, _updateWeaponHud() {}, _updateKillSequenceHud() {},
  _uiV3: () => false, _teamTag: t => t, _plaqueta() {}, _teamColor: () => '#fff',
  _radioUi() {}, _teamName: t => t, _voiceKey: t => t, _roundWinnerVoice() {}, _ensureDolly() {},
  _showScoreboard() {}, _banner() {}, _resultadoDaRodada: (...args) => result.push(args),
};
game.objective = new OperacaoFlavio(game, {});
game.objective.prepareRound();
const net = { meta: {}, startPing() {}, stopPing() {} };
const mp = makeNetcode(game, net);
mp._netTick = 1;
const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
if (mutante === 'sem-hud') game.objective.atualizaHud = () => {};
else if (mutante === 'sem-cinematica') game.objective.startCinematic = () => {};
else if (mutante === 'sem-reset') {
  const preparar = game.objective.prepareRound;
  game.objective.prepareRound = function () {
    const cinematic = this.cinematic;
    const plane = this.game.world.objectivePlane.position.clone();
    preparar.call(this);
    this.cinematic = cinematic;
    this.game.world.objectivePlane.position.copy(plane);
  };
} else if (mutante) throw new Error('Mutante desconhecido: '+mutante);
if (mutante) console.log('Mutação aplicada: '+mutante);
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log('✓ '+name); } catch (e) { failures++; console.error('✗ '+name+': '+e.message); }
};
try {
  check('HUD online reflete snapshot autoritativo e relógio atual', () => {
    game.objective.applyNetState({ checkpoint: 1, position: { x: 0, z: 4 }, escortCount: 3, contested: false, threatened: false, inCover: false });
    game.timeLeft = 305;
    Game.prototype._updateHud.call(game);
    assert.match(game.objective.hud.textContent, /1\/2 · 3 ESCOLTANDO · 305s/);
    game.timeLeft = 304;
    Game.prototype._updateHud.call(game);
    assert.match(game.objective.hud.textContent, /304s$/);
  });
  check('vitória online dispara cinemática e título do objetivo', () => {
    game.roundsWon.B = 1;
    mp.transicaoDeEstado('live', 'roundEnd', { E: 0, B: 0 });
    assert.equal(game.objective.cinematic?.winner, 'B');
    assert.equal(result.at(-1)?.[0], 'FLÁVIO EMBARCOU');
    assert.equal(game.vmScene.visible, false);
    Game.prototype._updateHud.call(game);
    assert.equal(game.objective.hud.textContent, 'EMBARQUE CONCLUÍDO', 'HUD normal não apaga a mensagem da cinemática');
  });
  check('nova rodada online restaura apresentação sem reescrever o relógio do servidor', () => {
    game.objective.startCinematic('B');
    game.time += game.objective.roundResult('B').duration;
    game.objective.updatePresentation();
    assert.notEqual(game.world.objectivePlane.position.z, 55, 'pré-condição: avião moveu antes do reset');
    game.timeLeft = 357;
    mp.transicaoDeEstado('roundEnd', 'countdown', game.roundsWon);
    assert.equal(game.objective.cinematic, null);
    assert.equal(game.world.objectivePlane.position.z, 55);
    assert.equal(game.vmScene.visible, true);
    assert.equal(game.timeLeft, 357);
  });
  check('primeiro snapshot não inventa cerimônia de fim de rodada', () => {
    game.objective.cinematic = null;
    mp._netTick = -1;
    const before = result.length;
    mp.transicaoDeEstado('live', 'roundEnd', { E: 0, B: 0 });
    assert.equal(game.objective.cinematic, null);
    assert.equal(result.length, before);
  });
} finally { mp.dispose(); game.objective.dispose(); }
if (failures) process.exitCode = 1;
