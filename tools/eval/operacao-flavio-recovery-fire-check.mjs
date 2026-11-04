// Resposta de fogo do guarda durante/depois do reagrupamento, sem abrir mão de LOS.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game as BaseGame, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || null;
let Game = BaseGame;
if (mutation) {
  const edits = {
    'cadencia-longa': [
      'BOT_FAIR && objectiveDestination && !formationPull ? Math.min(pause, 1.5) : pause',
      'BOT_FAIR && objectiveDestination && !formationPull ? pause : pause',
    ],
    'cadencia-global': [
      'BOT_FAIR && objectiveDestination && !formationPull ? Math.min(pause, 1.5) : pause',
      'BOT_FAIR ? Math.min(pause, 1.5) : pause',
    ],
    'tiro-sem-los': [
      '&& Math.abs(dy) < 0.3 && !b._losLost && inRange && hasTurn;',
      '&& Math.abs(dy) < 0.3 && inRange && hasTurn;',
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
const makeGame = (mapId, seed) => {
  seedRandom(seed);
  const game = new Game({ renderer, textures, sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'RECOVERY-FIRE',
    mapId, ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  return game;
};
const readyToFire = (guard, enemy) => {
  guard.weapon = 'ak'; guard.mag = 30; guard.skill = 0.4;
  guard.target = enemy; guard.think = Infinity;
  guard.reactAt = 0; guard.focusUntil = 0; guard.nextShotAt = 0; guard.reloadUntil = 0;
  guard.burst = 0; guard.aimErr = 0.01; guard._losLost = false; guard._lostAt = 0;
  guard.crouchBias = false;
  guard.yaw = Math.atan2(enemy.pos.x - guard.pos.x, enemy.pos.z - guard.pos.z);
  enemy.hp = 1e6;
};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

check('guarda de skill baixa no slot volta a disparar dentro da janela visível de dois segundos', () => {
  const game = makeGame('operacao_flavio', 5101);
  const random = Math.random;
  try {
    const vip = game.objective.vip;
    const guard = game.bots.find(b => b.team === 'B' && b !== vip);
    const enemy = game.bots.find(b => b.team === 'E');
    game.bots = [vip, guard, enemy]; game.combatants = [...game.bots];
    vip.pos.set(0, 0, 28); enemy.pos.set(0, 0, 3);
    const destination = game.objective.botDestination(guard);
    guard.pos.set(destination.x, 0, destination.z);
    guard.path = null; guard.repathAt = 0; guard._repathMin = 0;
    readyToFire(guard, enemy);
    assert.ok(Math.hypot(guard.pos.x - destination.x, guard.pos.z - destination.z) <= destination.slotRadius,
      'o guarda começa na formação estável');
    assert.ok(game._losClear(game._botEye(guard), game._botEye(enemy)), 'controle começa com LOS real');
    // Força o pior sorteio de pausa (3,1 s sem o teto) sem alterar skill, arma ou reação.
    Math.random = () => 0.9999999999999999;
    let shots = 0, firstPause = null;
    for (let frame = 0; frame < 120; frame++) {
      assert.ok(game._losClear(game._botEye(guard), game._botEye(enemy)), `LOS real fechou no frame ${frame + 1}`);
      const mag = guard.mag;
      game.time += 1 / 60; game._updateBot(guard, 1 / 60);
      if (guard.mag < mag) {
        shots++;
        if (firstPause === null) firstPause = guard.nextShotAt - game.time;
      }
    }
    assert.ok(firstPause !== null, 'o primeiro tiro acontece com os gates abertos');
    assert.ok(firstPause <= 1.5 + 1e-9, `pausa entre rajadas=${firstPause}`);
    assert.ok(shots >= 2, `somente ${shots} tiro(s) na janela visível de 2 s`);
  } finally { Math.random = random; game.dispose(); }
});

check('pausa longa de skill baixa permanece inalterada fora da escolta', () => {
  const game = makeGame('praca_poderes', 5102);
  const random = Math.random;
  try {
    const guard = game.bots.find(b => b.team === 'B');
    const enemy = game.bots.find(b => b.team === 'E');
    game.bots = [guard, enemy]; game.combatants = [...game.bots];
    guard.pos.set(0, 0, 0); enemy.pos.set(0, 0, 3);
    readyToFire(guard, enemy);
    // Isola cadência de mapa/raycast: este caso é o controle negativo do escopo da correção.
    game._losClear = () => true;
    game._dispararBot = () => ({});
    Math.random = () => 0.9999999999999999;
    game.time += 1 / 60; game._updateBot(guard, 1 / 60);
    assert.equal(guard.mag, 29, 'controle dispara uma vez');
    const pause = guard.nextShotAt - game.time;
    near(pause, 3.1);
  } finally { Math.random = random; game.dispose(); }
});

check('recuperação não dispara quando a linha de visão está fechada', () => {
  const game = makeGame('operacao_flavio', 5103);
  try {
    const vip = game.objective.vip;
    const guard = game.bots.find(b => b.team === 'B' && b !== vip);
    const enemy = game.bots.find(b => b.team === 'E');
    game.bots = [vip, guard, enemy]; game.combatants = [...game.bots];
    vip.pos.set(0, 0, -12); guard.pos.set(9, 0, -17); enemy.pos.set(6, 0, -17);
    readyToFire(guard, enemy);
    guard.think = 0;
    game.world.rayOccluded = () => true;
    let resolvedShots = 0;
    game._dispararBot = () => { resolvedShots++; return {}; };
    const mag = guard.mag;
    game.time += 1 / 60; game._updateBot(guard, 1 / 60);
    assert.equal(guard._losLost, true, 'a aquisição real marcou perda de LOS');
    assert.equal(guard.target, enemy, 'grace mantém o alvo, mas não abre o gatilho');
    assert.equal(guard.mag, mag);
    assert.equal(resolvedShots, 0);
  } finally { game.dispose(); }
});

console.log(JSON.stringify({ mutant: mutation, cases, failed: failures }));
if (failures.length) process.exitCode = 1;
