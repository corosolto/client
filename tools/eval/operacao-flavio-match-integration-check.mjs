// Integração de rodadas/relógio da escolta com os demais modos no Game real.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game as BaseGame, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || null;
let Game = BaseGame;
if (mutation) {
  const edits = {
    'fim-na-primeira': [
      "if (this.world.mode === 'escort') return this.roundNum >= this.roundsMax;",
      "if (this.world.mode === 'escort') return !!this.objective.state.winner;",
    ],
    'vencedor-da-ultima': [
      '(!escort && this.objective?.state?.winner)',
      'this.objective?.state?.winner',
    ],
    'stats-de-territorio': [
      'const timesTerritorio = timesComTerritorio(this.objective);',
      'const timesTerritorio = this.objective.regras.times;',
    ],
    'timeout-fora-escolta': [
      "if (this.world.mode === 'escort' && this.state === 'live') {",
      "if (this.state === 'live') {",
    ],
    'spawn-sem-autoria': [
      "if (!bot && this.world.mode === 'escort' && Number.isFinite(spawn?.yaw)) return spawn.yaw;",
      "if (false && !bot && this.world.mode === 'escort' && Number.isFinite(spawn?.yaw)) return spawn.yaw;",
    ],
  };
  assert.ok(Object.hasOwn(edits, mutation), 'mutante conhecido');
  const [before, after] = edits[mutation];
  const url = new URL('../../public/js/game.js', import.meta.url);
  let source = readFileSync(url, 'utf8');
  assert.equal(source.split(before).length - 1, 1, 'mutação tem alvo real único');
  source = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  ({ Game } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')));
  console.log('Mutação aplicada: ' + mutation);
}

const textures = initTextures(renderer);
const failures = [];
let cases = 0;
const check = (clause, fn) => {
  cases++;
  try { fn(); console.log('✓ ' + clause); }
  catch (error) {
    const message = error.message.split('\n')[0];
    failures.push({ clause, type: error.name, message });
    console.error(`✗ ${clause}: ${error.name}: ${message}`);
  }
};
const makeGame = (mapId, { roundsMax = 3, ctf = false, arena = false, seed = 4100 } = {}) => {
  seedRandom(seed);
  let result = null;
  const game = new Game({ renderer, textures, sfx,
    settings: { bots: 2, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'INTEGRATION',
    mapId, ctf, arena, roundsMax, testMode: true, dedicated: true,
    onQuit() {}, onMatchEnd(value) { result = value; } });
  game._ensureDolly = () => {};
  game._startRound();
  game.scene.updateMatrixWorld(true);
  game.world.root.updateMatrixWorld(true);
  return { game, result: () => result };
};
const withGame = (mapId, options, fn) => {
  const { game, result } = makeGame(mapId, options);
  try { fn(game, result); } finally { game.dispose(); }
};
const advance = (game, dt) => {
  game.state = 'live';
  game.bots = [];
  game.update(dt, false);
};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

check('escolta respeita rounds configurados e decide pelo placar acumulado', () => {
  withGame('operacao_flavio', { roundsMax: 3, seed: 4101 }, (game, result) => {
    game.el.matchEnd.classList.add('hidden');
    game.player.kills = 7; game.player.deaths = 2;
    game.state = 'live'; game.time = 10;
    game._endRound('E');
    assert.equal(game.roundNum, 1);
    assert.equal(game.objective.state.winner, 'E', 'a rodada tem vencedor');
    assert.equal(game._fimDaPartida(), false, 'a primeira rodada não encerra a partida');
    game.time = game.stateUntil;
    game.update(1 / 60, false);
    assert.equal(game.roundNum, 2, 'a segunda rodada começa');
    assert.equal(game.state, 'countdown');
    assert.equal(game.objective.state.winner, null, 'prepareRound limpa o resultado anterior');
    assert.equal(game._matchEndShown, false);
    assert.ok(game.el.matchEnd.classList.contains('hidden'), 'nenhum overlay de erro/fim aparece entre rodadas');

    // E vence também a segunda; B vence só a última. O estado do objetivo não pode virar o placar.
    for (const winner of ['E', 'B']) {
      game.state = 'live';
      game._endRound(winner);
      game.time = game.stateUntil;
      game.update(1 / 60, false);
    }
    assert.equal(game.state, 'matchEnd');
    assert.deepEqual(game.roundsWon, { E: 2, B: 1 });
    assert.equal(game.objective.state.winner, 'B', 'pré-condição: B venceu apenas a última');
    assert.equal(game.el.matchTitle.textContent, 'VITÓRIA');
    assert.ok(game.el.matchStats.innerHTML.includes('<b>2 × 1</b>rounds'));
    assert.ok(game.el.matchStats.innerHTML.includes('<b>7</b>kills'));
    assert.ok(game.el.matchStats.innerHTML.includes('<b>2</b>suas mortes'));
    assert.ok(!game.el.matchStats.innerHTML.includes('%'), 'escolta não inventa território');
    assert.equal(result()?.won, true);
    assert.equal(result()?.roundsP, 2);
    assert.equal(result()?.roundsB, 1);
  });
});

check('escolta de uma rodada termina sem objective.regras nem território', () => {
  withGame('operacao_flavio', { roundsMax: 1, seed: 4102 }, (game, result) => {
    assert.equal(game.objective.regras, undefined);
    assert.equal(game.objective.state.territorio, undefined);
    game.state = 'live'; game.time = 5;
    game._endRound('B');
    assert.equal(game._fimDaPartida(), true);
    game.time = game.stateUntil;
    game.update(1 / 60, false);
    assert.equal(game.state, 'matchEnd');
    assert.equal(game.el.matchTitle.textContent, 'DERROTA');
    assert.ok(game.el.matchStats.innerHTML.includes('<b>0 × 1</b>rounds'));
    assert.equal(result()?.won, false);
  });
});

check('spawn B da escolta usa yaw autorado na câmera e nos corpos', () => {
  withGame('operacao_flavio', { roundsMax: 3, seed: 4108 }, game => {
    assert.notEqual(game.world.authoredSpawnYaw, true, 'escolta não depende da opt-in global');
    game.playerTeam = 'B'; game.player.team = 'B';
    game._startRound();
    const spawn = game.world.spawns.B[0];
    const angle = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    assert.ok(angle(game.player.yaw, spawn.yaw) < 1e-9, `câmera yaw=${game.player.yaw}, autorado=${spawn.yaw}`);
    const next = game.world.escortPath[1];
    const dx = next.x - game.player.pos.x, dz = next.z - game.player.pos.z;
    const length = Math.hypot(dx, dz);
    const dot = (-Math.sin(game.player.yaw)) * dx / length + (-Math.cos(game.player.yaw)) * dz / length;
    assert.ok(dot > 0.75, `primeira leitura para a rota dot=${dot}`);
    const guard = game.bots.find(bot => bot.team === 'B' && bot !== game.objective.vip);
    assert.ok(angle(guard.yaw, Math.PI) < 1e-9, 'convenção legada dos bots permanece estável');
  });
});

check('timeout de seis minutos continua exclusivo da escolta', () => {
  withGame('operacao_flavio', { roundsMax: 3, seed: 4103 }, game => {
    game.objective.update = () => {};
    game.timeLeft = 1;
    advance(game, 0.25);
    near(game.timeLeft, 0.75);
    assert.equal(game.state, 'live');
    game.bots = [];
    game.update(1, false);
    assert.equal(game.state, 'roundEnd');
    assert.equal(game.objective.state.winner, 'E');
    assert.equal(game.roundsWon.E, 1);
  });
});

check('Javaporcos não herda o relógio nem o teto de rodadas da escolta', () => {
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    world: { mode: 'horde' }, objective: { update() {}, updatePresentation() {}, state: { winner: null } },
    online: false, paused: false, dedicated: true, time: 0, timeLeft: 37, state: 'live', roundNum: 1,
    bots: [], player: {}, _updatePickups() {}, _updateFx() {}, _updateDoors() {}, _updateGrenades() {},
  });
  game.update(0.5, false);
  assert.equal(game.timeLeft, 37);
  assert.equal(game.state, 'live');
  assert.equal(game._fimDaPartida(), false);
  game.objective.state.winner = 'J';
  assert.equal(game._fimDaPartida(), true, 'a horda conserva seu próprio fim');
});

check('mata-mata conserva o relógio de rodada', () => {
  withGame('praca_poderes', { roundsMax: 3, seed: 4105 }, game => {
    game.timeLeft = 2;
    advance(game, 0.25);
    near(game.timeLeft, 1.75);
    assert.equal(game.state, 'live');
  });
});

check('CTF conserva relógio de partida, sem relógio de rodada da escolta', () => {
  withGame('praca_poderes', { roundsMax: 3, ctf: true, seed: 4106 }, game => {
    game._updateCTF = () => {};
    game.timeLeft = 99; game.ctfMatchLeft = 100;
    advance(game, 0.25);
    assert.equal(game.timeLeft, 99);
    near(game.ctfMatchLeft, 99.75);
    assert.equal(game.state, 'live');
  });
});

check('Arena conserva relógio infinito e encerramento próprio', () => {
  withGame('praca_poderes', { arena: true, roundsMax: 7, seed: 4107 }, game => {
    assert.equal(game.timeLeft, Infinity);
    advance(game, 0.25);
    assert.equal(game.timeLeft, Infinity);
    assert.equal(game.state, 'live');
    assert.equal(game._fimDaPartida(), false);
  });
});

console.log(JSON.stringify({ mutant: mutation, cases, failed: failures }));
if (failures.length) process.exitCode = 1;
