import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game as BaseGame, PCHAR, initTextures, renderer, sfx } from './harness.mjs';

const mutations = {
  retencao: ['|| slotSx * slotSx + slotSz * slotSz > objectiveDestination.slotRadius * objectiveDestination.slotRadius);', '|| slotSx * slotSx + slotSz * slotSz > objectiveDestination.slotRadius * objectiveDestination.slotRadius); if (formationPull && b.target) { b.target = null; b._losLost = false; b._lostAt = 0; }'],
  hold: ['const holding = this.time < (b.holdUntil || 0) || !!objectiveDestination;', 'const holding = this.time < (b.holdUntil || 0);'],
  giro: ['if (BOT_MOVE2 && !approach && Math.abs(dy) > 0.5 && !objectiveDestination) approach = 0.5;', 'if (BOT_MOVE2 && !approach && Math.abs(dy) > 0.5) approach = 0.5;'],
  legado: ['if (BOT_MOVE2 || objectiveDestination) {', 'if (BOT_MOVE2) {'],
  reagrupar: ['if (formationPull) {', 'if (formationPull && false) {'],
  los: ['&& Math.abs(dy) < 0.3 && !b._losLost && inRange && hasTurn;', '&& Math.abs(dy) < 0.3 && inRange && hasTurn;'],
};
const mutation = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10);
let Game = BaseGame;
if (mutation) {
  assert(Object.hasOwn(mutations, mutation), 'mutante desconhecido');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const source = readFileSync(url, 'utf8');
  const [before, after] = mutations[mutation];
  assert.equal(source.split(before).length - 1, 1, 'mutante precisa aplicar exatamente uma vez');
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  ({ Game } = await import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`));
  console.log(`Mutação aplicada: ${mutation}`);
}

let failures = 0;
const cases = [];
for (const [name, angle] of [['frente', 0], ['lateral', Math.PI / 2], ['retaguarda', Math.PI]]) {
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'DEFENSE-UNIT',
    mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true);
  const vip = game.objective.vip;
  const guard = game.bots.find((bot) => bot.team === 'B' && bot !== vip);
  const enemy = game.bots.find((bot) => bot.team === 'E');
  game.bots = [vip, guard, enemy]; game.combatants = [...game.bots];
  vip.pos.set(0, 0, 28);
  enemy.pos.set(Math.sin(angle) * 25, 0, 28 + Math.cos(angle) * 25);
  enemy.hp = 1e6;
  const slot = game.objective.botDestination(guard);
  guard.pos.set(slot.x, 0, slot.z); guard.yaw = 0; guard.think = 0;
  guard.weapon = 'ak'; guard.mag = 30; guard.nextShotAt = 0;
  guard.holdUntil = 0; guard._holdDecide = Number.POSITIVE_INFINITY;
  // Visibilidade é controlada; aquisição, giro, cadência, movimento e colisão são reais.
  game._losClear = () => true;
  let maximumSlotDistance = 0, fired = false, acquired = false;
  try {
    for (let frame = 0; frame < 240; frame++) {
      const magazine = guard.mag;
      game.time += 1 / 60; game._updateBot(guard, 1 / 60);
      acquired ||= guard.target === enemy;
      fired ||= guard.mag < magazine;
      maximumSlotDistance = Math.max(maximumSlotDistance, Math.hypot(guard.pos.x - slot.x, guard.pos.z - slot.z));
    }
    assert(acquired && fired, `${name}: guarda no slot adquire e dispara contra ameaça visível distante`);
    assert.equal(maximumSlotDistance, 0, `${name}: disparar não persegue alvo nem abandona formação`);
    game._losClear = () => false; guard.think = 0; guard.mag = 30; guard.nextShotAt = 0; guard.reloadUntil = 0;
    const magazineWithoutLOS = guard.mag;
    for (let frame = 0; frame < 60; frame++) { game.time += 1 / 60; game._updateBot(guard, 1 / 60); }
    assert(guard.mag >= magazineWithoutLOS, `${name}: perder LOS bloqueia novos tiros`);
    game._losClear = () => true; guard.weapon = 'knife'; guard.think = 0;
    const enemyHealth = enemy.hp;
    for (let frame = 0; frame < 60; frame++) { game.time += 1 / 60; game._updateBot(guard, 1 / 60); }
    assert.equal(enemy.hp, enemyHealth, `${name}: faca não ataca ameaça distante`);
    guard.weapon = 'ak'; vip.pos.x += 4; enemy.pos.set(vip.pos.x, 0, vip.pos.z + 1);
    guard.target = enemy; guard.think = Number.POSITIVE_INFINITY;
    const regroupSlot = game.objective.botDestination(guard);
    const beforeRegroup = Math.hypot(guard.pos.x - regroupSlot.x, guard.pos.z - regroupSlot.z);
    game.time += 1 / 60; game._updateBot(guard, 1 / 60);
    assert(guard.target === enemy, `${name}: reagrupar sob ameaça imediata mantém o alvo engajado`);
    let nearestRegroup = Number.POSITIVE_INFINITY;
    for (let frame = 0; frame < 360; frame++) {
      game.time += 1 / 60; game._updateBot(guard, 1 / 60);
      nearestRegroup = Math.min(nearestRegroup, Math.hypot(guard.pos.x - regroupSlot.x, guard.pos.z - regroupSlot.z));
    }
    assert(nearestRegroup < beforeRegroup, `${name}: reagrupamento se aproxima pelo caminho físico`);
    assert(nearestRegroup <= regroupSlot.slotRadius, `${name}: reagrupamento alcança o slot sem perseguir a ameaça`);
    cases.push({ name, acquired, fired, maximumSlotDistance, beforeRegroup, nearestRegroup });
    console.log(`✓ ${name}: defesa distante conserva formação`);
  } catch (error) {
    const failure = error.message.split('\n')[0];
    failures++; cases.push({ name, acquired, fired, maximumSlotDistance, failure: `${error.name}: ${failure}` });
    console.error(`✗ ${failure}`);
  } finally { game.dispose(); }
}
console.log(JSON.stringify({ controlledVisibility: true, browserQA: false, balanceProof: false, cases }));
if (failures) process.exitCode = 1;
