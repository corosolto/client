// Janela de 4 s vem de defense-check; deslocamento e passo usam as constantes reais.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Game as BaseGame, MAPS, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';
const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const mutations = {
  'apagar-alvo': ['|| slotSx * slotSx + slotSz * slotSz > objectiveDestination.slotRadius * objectiveDestination.slotRadius);', '|| slotSx * slotSx + slotSz * slotSz > objectiveDestination.slotRadius * objectiveDestination.slotRadius); if (formationPull && b.target) b.target = null;'],
  'sem-acompanhar': ['if (formationPull) {', 'if (formationPull && false) {'],
  'nav-sobrescreve-mira': ['const gx = regNode.x - b.pos.x, gz = regNode.z - b.pos.z, gn = Math.hypot(gx, gz) || 1;', 'const gx = regNode.x - b.pos.x, gz = regNode.z - b.pos.z, gn = Math.hypot(gx, gz) || 1; b.yaw = Math.atan2(gx, gz);'],
  'teleporte': ['if (formationPull) {', 'if (formationPull) { b.pos.x = objectiveDestination.x; b.pos.z = objectiveDestination.z;'],
};
let Game = BaseGame;
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
if (mutation) {
  assert(Object.hasOwn(mutations, mutation), 'mutante conhecido');
  const [before, after] = mutations[mutation]; assert.equal(source.split(before).length, 2, 'mutação única');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  ({ Game } = await import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`));
  console.log(`Mutação aplicada: ${mutation}`);
}
const mode = readFileSync(new URL('../../public/js/mode_operacao_flavio.js', import.meta.url), 'utf8');
const speed = Number(source.match(/const BOT_SPEED = ([\d.]+)/)?.[1]);
const escortSpeed = Number(mode.match(/const ESCORT_SPEED = ([\d.]+)/)?.[1]);
assert(Number.isFinite(speed) && Number.isFinite(escortSpeed), 'constantes físicas reais');
const geometryHelper = process.argv.find(arg => arg.startsWith('--geometry-helper='))?.slice(18);
const geometry = geometryHelper ? await (await import(geometryHelper)).prepareMapPropGeometry(MAPS) : null;
if (geometryHelper) assert(geometry?.flavio === 17 && geometry?.count === 175, '17 GLBs/175 props reais');
const results = []; let failures = 0;
for (const visibility of ['controlada', 'real']) for (const movement of [0, -1, 1]) {
  const moving = movement !== 0;
  seedRandom(1);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'MOVING-DEFENSE-UNIT',
    mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {}; game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  const vip = game.objective.vip, guard = game.bots.find(b => b.team === 'B' && b !== vip), enemy = game.bots.find(b => b.team === 'E');
  game.bots = [vip, guard, enemy]; game.combatants = [...game.bots];
  vip.pos.set(0, 0, 28); enemy.pos.set(0, 0, 3); enemy.hp = 1e6;
  const slot = game.objective.botDestination(guard);
  guard.pos.set(slot.x, 0, slot.z); guard.yaw = Math.PI; guard.think = 0;
  guard.weapon = 'ak'; guard.mag = 30; guard.nextShotAt = 0;
  if (visibility === 'controlada') game._losClear = () => true;
  const result = { visibility, movement, warmupShots: 0, shots: 0, lastHalfShots: 0, reactionResets: 0, clearedFrames: 0, visibleFrames: 0, maximumStep: 0, maximumSlotDistance: 0 };
  try {
    seedRandom(1);
    for (let frame = 0; frame < 480; frame++) {
      const active = frame >= 240;
      if (active && moving) {
        const before = vip.pos.z; vip.pos.z += movement * escortSpeed / 60; game._collide(vip.pos, 0.38);
        assert(Math.abs(vip.pos.z - before - movement * escortSpeed / 60) < 1e-9, 'trajeto do VIP fisicamente livre');
      }
      const x = guard.pos.x, z = guard.pos.z, mag = guard.mag, reaction = guard.reactAt;
      game.time += 1 / 60; game._updateBot(guard, 1 / 60);
      const fired = guard.mag < mag;
      if (!active) result.warmupShots += Number(fired);
      else {
        result.shots += Number(fired); result.lastHalfShots += Number(fired && frame >= 360);
        result.reactionResets += Number(guard.reactAt !== reaction);
        result.clearedFrames += Number(guard.target === null);
        result.visibleFrames += Number(game._losClear(game._botEye(guard), game._botEye(enemy)));
        result.maximumStep = Math.max(result.maximumStep, Math.hypot(guard.pos.x - x, guard.pos.z - z));
        const destination = game.objective.botDestination(guard);
        result.maximumSlotDistance = Math.max(result.maximumSlotDistance, Math.hypot(guard.pos.x - destination.x, guard.pos.z - destination.z));
      }
    }
    assert(result.warmupShots > 0 && result.visibleFrames === 240, 'controle: alvo visível e tiro possível antes do movimento');
    assert(result.maximumStep <= speed / 60 + 1e-9, 'movimento respeita passo físico sem teleporte');
    assert(result.lastHalfShots > 0, 'guarda continua disparando durante acompanhamento do VIP');
    const destination = game.objective.botDestination(guard);
    result.finalSlotDistance = Math.hypot(guard.pos.x - destination.x, guard.pos.z - destination.z);
    assert(result.finalSlotDistance <= destination.slotRadius, 'guarda acompanha o slot sem perseguir o inimigo');
    console.log(`✓ ${visibility}/${movement}: resposta ao alvo visível`);
  } catch (error) {
    failures++; result.failure = `${error.name}: ${error.message}`;
    console.error(`✗ ${visibility}/${movement}: ${result.failure}`);
  } finally { result.finalVip = vip.pos.toArray(); result.finalGuard = guard.pos.toArray(); results.push(result); game.dispose(); }
}
const report = { geometry, unit: true, browserQA: false, balanceProof: false, results };
const reportFile = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
if (reportFile) writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (failures) process.exitCode = 1;
