import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, THREE, mkEl } from './harness.mjs';

const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
async function moduloMutado(path, edits) {
  const url = new URL(path, import.meta.url);
  let source = readFileSync(url, 'utf8');
  for (const [before, after] of edits) {
    assert.equal(source.split(before).length - 1, 1, 'mutação tem alvo único');
    source = source.replace(before, after);
  }
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const netEdits = mutante === 'sem-placar'
  ? [['game._resultadoDaRodada(fim.title, fim.detail, false);', 'game._resultadoDaRodada(fim.title, fim.detail);']]
  : mutante === 'sem-ordem'
  ? [["if (fimDeRound) this.transicaoDeEstado(estadoAntes, 'roundEnd', placarAntes);", ''],
    ['const primeiroSnap = this._tAt.length <= 1;', "if (fimDeRound) this.transicaoDeEstado(estadoAntes, 'roundEnd', placarAntes);\n    const primeiroSnap = this._tAt.length <= 1;"]]
  : mutante === 'sem-retomada'
  ? [['if (rodadaNova) {', 'if (false && rodadaNova) {']]
  : [];
const { makeNetcode } = netEdits.length
  ? await moduloMutado('../../public/js/netgame.js', netEdits) : await import('../../public/js/netgame.js');
const { OperacaoFlavio } = mutante === 'sem-parar'
  ? await moduloMutado('../../public/js/mode_operacao_flavio.js', [['for (const fonte of this.fontes) { try { fonte.stop(); }', 'for (const fonte of []) { try { fonte.stop(); }']])
  : await import('../../public/js/mode_operacao_flavio.js');

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
} else if (mutante && !['sem-placar','sem-ordem','sem-parar','sem-retomada'].includes(mutante)) throw new Error('Mutante desconhecido: '+mutante);
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
    assert.equal(result.at(-1)?.[2], false, 'placar não cobre a cinemática do objetivo');
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
  check('morte do VIP no snapshot de roundEnd determina o título atual', () => {
    game.objective.prepareRound();
    game.state = 'live'; game.roundsWon = { E: 0, B: 0 };
    mp._netTick = 20;
    mp._netMap.set(7, vip);
    net.snap = { tick: 21, t: 1, state: 'roundEnd', scoreE: 1, scoreB: 0,
      timeLeft: 90, objective: { checkpoint: 0 },
      ents: [{ id: 7, team: 'B', bot: true, name: 'Flávio Bolsonaro', alive: false,
        hp: 0, x: 0, y: 0, z: 0, yaw: 0, k: 0, d: 1, weapon: 'knife' }] };
    mp.applySnapshot();
    assert.equal(vip.alive, false, 'pré-condição: snapshot aplicado');
    assert.equal(result.at(-1)?.[0], 'FLÁVIO FOI MORTO');
    const before = result.length;
    mp.applySnapshot();
    assert.equal(result.length, before, 'snapshot repetido não repete a cerimônia');
  });
  check('reset e nova cinemática encerram todas as fontes anteriores', () => {
    const sources = [];
    const ctx = { currentTime: 0,
      createOscillator() {
        const source = { frequency: {}, stops: [], connect() {}, start() {}, stop(at) { this.stops.push(at); } };
        sources.push(source); return source;
      },
      createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
    };
    const priorSfx = game.sfx;
    game.sfx = { ensure() {}, ctx, master: {} };
    try {
      game.objective.startCinematic('B');
      const first = [...sources];
      assert.ok(first.length > 0, 'pré-condição: marcha agendada');
      game.objective.prepareRound();
      assert.ok(first.every(s => s.stops.some(at => at === undefined || at <= ctx.currentTime)), 'reset interrompe a marcha anterior');
      game.objective.startCinematic('B');
      const second = sources.slice(first.length);
      game.objective.startCinematic('E');
      assert.ok(second.every(s => s.stops.some(at => at === undefined || at <= ctx.currentTime)), 'nova cena interrompe as fontes substituídas');
    } finally { game.objective.dispose(); game.sfx = priorSfx; }
  });
  check('primeiro applySnapshot em roundEnd permanece sem cerimônia', () => {
    game.state = 'live'; mp._netTick = -1; game.objective.cinematic = null;
    net.snap = { ...net.snap, tick: 31, t: 2, scoreE: 2 };
    const before = result.length;
    mp.applySnapshot();
    assert.equal(result.length, before);
    assert.equal(game.objective.cinematic, null);
  });
  check('countdown reseta antes de aplicar o estado autoritativo da rodada nova', () => {
    net.snap = { ...net.snap, tick: 32, t: 2.05, state: 'countdown', timeLeft: 347,
      objective: { checkpoint: 1, position: { x: 0, z: 4 }, escortCount: 2 },
      ents: [{ ...net.snap.ents[0], hp: 42, alive: false }] };
    mp.applySnapshot();
    assert.equal(game.timeLeft, 347);
    assert.equal(vip.hp, 42);
    assert.equal(vip.alive, false);
    assert.equal(game.objective.state.checkpoint, 1);
  });
  for (const before of ['roundEnd', 'live']) check('nova rodada sem countdown observado, estado anterior '+before, () => {
    game.state = before;
    game.objective.startCinematic('B');
    assert.equal(game.vmScene.visible, false, 'pré-condição: apresentação anterior ativa');
    const nextRound = game.roundNum + 1;
    net.snap = { ...net.snap, tick: net.snap.tick + 1, t: net.snap.t + .05,
      state: 'live', roundNum: nextRound, timeLeft: 291,
      objective: { checkpoint: 1, position: { x: 0, z: 6 }, escortCount: 2 },
      ents: [{ ...net.snap.ents[0], hp: 57, alive: false }] };
    mp.applySnapshot();
    assert.equal(game.objective.cinematic, null, 'rodada nova encerra câmera anterior');
    assert.equal(game.vmScene.visible, true);
    assert.equal(game.timeLeft, 291, 'relógio do snapshot preservado');
    assert.equal(vip.hp, 57, 'entidades aplicadas depois do reset');
    assert.equal(vip.alive, false);
    assert.equal(game.objective.state.position.z, 6, 'objetivo aplicado depois do reset');
    assert.equal(game.roundNum, nextRound);
  });
  check('mesma rodada não reinicia apresentação em snapshots subsequentes', () => {
    const prepare = game.objective.prepareRound;
    let resets = 0;
    game.objective.prepareRound = function () { resets++; return prepare.call(this); };
    try {
      net.snap = { ...net.snap, tick: net.snap.tick + 1, t: net.snap.t + .05 };
      mp.applySnapshot();
      mp.applySnapshot();
      assert.equal(resets, 0);
      assert.equal(game.timeLeft, 291);
    } finally { game.objective.prepareRound = prepare; }
  });
} finally { mp.dispose(); game.objective.dispose(); }
if (failures) process.exitCode = 1;
