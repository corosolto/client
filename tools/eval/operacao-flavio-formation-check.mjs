import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game as BaseGame, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

let failures = 0;
const results = [];
const reportFailure = error => { failures++; console.error(`✗ ${error.name}: ${error.message}`); };
const reporterProbe = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.split('=')[1];
if (reporterProbe) {
  assert(['TypeError', 'AssertionError'].includes(reporterProbe));
  console.log('Mutação aplicada: controle-reporter');
  try {
    if (reporterProbe === 'TypeError') throw new TypeError('controle executável do reporter');
    assert.fail('controle executável do reporter');
  } catch (error) { reportFailure(error); }
  process.exit(1);
}
const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const mutations = {
  'sem-hold': ['} else if (objectiveDestination\n        && Math.hypot', '} else if (false && objectiveDestination\n        && Math.hypot'],
  'hold-fora-slot': ['<= objectiveDestination.slotRadius) {\n      moving = 0;', '<= Infinity) {\n      moving = 0;'],
  'sem-alcance-final': ['&& this._walkReach(b, objectiveDestination)) node = objectiveDestination;', ') node = objectiveDestination;'],
  'sem-ultimo-trecho': ['if (objectiveDestination && b.pathIdx >= b.path.length - 1\n', 'if (objectiveDestination\n'],
  'teleporte-slot': ['node = objectiveDestination;', '{ b.pos.x = objectiveDestination.x; b.pos.z = objectiveDestination.z; node = objectiveDestination; }'],
};
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
let Game = BaseGame;
if (mutation) {
  assert(Object.hasOwn(mutations, mutation), 'mutante conhecido');
  const [before, after] = mutations[mutation];
  assert.equal(source.split(before).length - 1, 1, 'mutante aplica exatamente uma vez');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  ({ Game } = await import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`));
  console.log(`Mutação aplicada: ${mutation}`);
}
const speed = Number(source.match(/const BOT_SPEED = ([\d.]+)/)?.[1]);
assert(Number.isFinite(speed), 'pré-condição: orçamento físico vem de BOT_SPEED real');
const routes = process.argv.includes('--diagnostico-rotas');
for (const [name, vipPosition, offset, frames] of [
  ['parado', [0, 28], [0, 0], 600],
  ['escape', [0, 28], [0, 0], 600],
  ['aproximação', [0, 28], [0, 4], 600],
  ['vip-deslocado', [0, 28], [0, 0], 600],
  ['bloqueado', [10, -20], [0, 4.6], 1],
  ['intermediário', [0, 28], [0, 4], 1],
  ...(routes ? [['parede', [10, -20], [0, 5.2], 1200], ['rota-porta', [0, -20], [10, 5.2], 1200]] : []),
]) {
  seedRandom(1);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'FORMATION-UNIT',
    mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  const vip = game.objective.vip, guard = game.bots.find(bot => bot.team === 'B' && bot !== vip);
  game.bots = [vip, guard]; game.combatants = [vip, guard];
  vip.pos.set(vipPosition[0], 0, vipPosition[1]); vip.yaw = 0;
  let slot = { ...game.objective.botDestination(guard) };
  guard.pos.set(slot.x + offset[0], 0, slot.z + offset[1]); guard.yaw = 0;
  guard.target = null; guard.path = null; guard.repathAt = 0; guard._escapeUntil = 0;
  if (name === 'escape') { guard._escapeUntil = game.time + 1; guard._escapeYaw = Math.PI / 2; }
  if (name === 'vip-deslocado') { guard._escapeUntil = game.time + 2; guard._escapeYaw = Math.PI / 2; }
  let expectedVip = vip.pos.toArray(), validNode = -1, slotQueries = 0;
  let maximum = 0, lastSecondMaximum = 0, maximumStep = 0;
  try {
    if (name === 'parede' || name === 'rota-porta') assert(!game._walkReach(guard, slot), 'pré-condição: fachada impede caminhada direta');
    if (name === 'bloqueado' || name === 'intermediário') {
      if (name === 'bloqueado') assert(!game._walkReach(guard, slot), 'pré-condição: slot local bloqueado por fachada');
      const target = game.world.nearestWaypoint(slot.x, slot.z, guard.pos.y);
      validNode = game.world.waypoints.nodes.findIndex((node, index) => {
        const distance = Math.hypot(node.x - guard.pos.x, node.z - guard.pos.z);
        return index !== target && distance >= 2 && distance <= 4 && game._walkReach(guard, node);
      });
      assert(validNode >= 0, 'pré-condição: nó local distinto e realmente caminhável');
      guard.path = name === 'bloqueado' ? [validNode] : [validNode, target];
      guard.pathIdx = 0; guard.repathAt = game.time + 60;
      const walk = game._walkReach;
      game._walkReach = function (bot, node, ...rest) {
        if (node === guard._escortDestination) slotQueries++;
        return walk.call(this, bot, node, ...rest);
      };
    }
    seedRandom(1);
    for (let frame = 0; frame < frames; frame++) {
      if (name === 'vip-deslocado' && frame === 60) {
        vip.pos.x += 4; slot = { ...game.objective.botDestination(guard) }; expectedVip = vip.pos.toArray();
      }
      const x = guard.pos.x, z = guard.pos.z;
      game.time += 1 / 60; game._updateBot(guard, 1 / 60);
      const distance = Math.hypot(guard.pos.x - slot.x, guard.pos.z - slot.z);
      maximum = Math.max(maximum, distance);
      maximumStep = Math.max(maximumStep, Math.hypot(guard.pos.x - x, guard.pos.z - z));
      if (frame >= frames - 60) lastSecondMaximum = Math.max(lastSecondMaximum, distance);
    }
    assert(maximumStep <= speed / 60 + Number.EPSILON * 1024, `${name}: deslocamento respeita BOT_SPEED por passo físico`);
    if (name === 'bloqueado') {
      assert(guard.path && !guard._banNodes?.has(validNode) && !(guard._escapeUntil > game.time), 'bloqueado: slot inacessível não substitui nem bane nó válido');
      assert(slotQueries > 0, 'pré-condição: trecho final verificou alcance físico do slot');
    } else if (name === 'intermediário') {
      assert.equal(slotQueries, 0, 'intermediário: preserva percurso antes do último nó');
    } else if (name === 'parado') assert(maximum <= slot.slotRadius, 'parado: sem ameaça não abandona slot para orbitar waypoint');
    else if (name === 'escape') assert(maximum <= slot.slotRadius, 'escape: slot prevalece sobre caminhada de escape anterior');
    else assert(lastSecondMaximum <= slot.slotRadius, `${name}: chega ao slot físico e permanece nele`);
    assert.deepEqual(vip.pos.toArray(), expectedVip, `${name}: formação não move autoridade do VIP`);
    results.push({ name, maximum, lastSecondMaximum, maximumStep });
    console.log(`✓ ${name}: formação física estável`);
  } catch (error) {
    reportFailure(error);
    results.push({ name, failure: error.message, maximum, lastSecondMaximum,
      position: { x: guard.pos.x, z: guard.pos.z }, path: guard.path, pathIdx: guard.pathIdx,
      goal: slot, roamIdx: guard.roamIdx, node: game.world.waypoints.nodes[guard.roamIdx] });
  }
  finally { game.dispose(); }
}
console.log(JSON.stringify({ synthetic: true, browserQA: false, results }));
if (failures) process.exitCode = 1;
