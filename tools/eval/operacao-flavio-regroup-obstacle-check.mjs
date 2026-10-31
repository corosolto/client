// Dez segundos de formation-check; passo e raio vêm do runtime e do destino real.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Game as BaseGame, MAPS, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const reporter = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.slice(17);
if (reporter) {
  assert(['TypeError', 'AssertionError'].includes(reporter)); console.log('Mutação aplicada: controle-reporter');
  try { if (reporter === 'TypeError') throw new TypeError('controle'); assert.fail('controle'); }
  catch (error) { console.error(`✗ ${error.name}: ${error.message}`); }
  process.exit(1);
}
const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const speed = Number(source.match(/const BOT_SPEED = ([\d.]+)/)?.[1]);
const radius = Number(source.match(/this\._collide\(b\.pos, ([\d.]+)\)/)?.[1]);
assert([speed, radius].every(Number.isFinite), 'passo e corpo usam constantes reais');
let Game = BaseGame;
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
if (mutation) {
  const edits = {
    'hop-invalido': ['if (regNode && this._walkReach(b, regNode)) {', 'if (regNode) {'],
    'apaga-alvo': ['} else if (b.path) {\n          // Hop bloqueado', '} else if (b.path) {\n          b.target = null;\n          // Hop bloqueado'],
    'para-apos-dois-passos': ['if (formationPull) {', 'if (formationPull && this.time < 12 + 2 / 60) {'],
    'para-apos-lateral': ['if (formationPull) {', 'if (formationPull && this.time < 14) {'],
    'sem-colisao': ['  _collide(pos, r) {', '  _collide(pos, r) { return;'],
    'sem-rearme': ['          } else {\n            b.path = null;\n            b._escapeUntil = Math.max(b._escapeUntil || 0, this.time + 0.35);', '          } else {\n            b.path = null;\n            b._escapeUntil = b._escapeUntil || 0;'],
  };
  const start = source.indexOf('      // Reagrupar não muda o yaw que orienta a mira.');
  const end = source.indexOf('      // FLANCO/AVANÇO:', start);
  assert(start >= 0 && end > start, 'bloco de reagrupamento delimitado');
  const block = source.slice(start, end);
  edits['so-gira'] = [block, block.replace(/b\.pos\.[xz] \+= [^;]+;/g, 'b.yaw += dt;')];
  assert(Object.hasOwn(edits, mutation), 'mutante conhecido');
  const [before, after] = edits[mutation]; assert.equal(source.split(before).length, 2, 'mutação única');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  ({ Game } = await import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`));
  console.log(`Mutação aplicada: ${mutation}`);
}
const geometryHelper = process.argv.find(arg => arg.startsWith('--geometry-helper='))?.slice(18);
const geometry = geometryHelper ? await (await import(geometryHelper)).prepareMapPropGeometry(MAPS) : null;
if (geometryHelper) assert(geometry?.flavio === 17 && geometry?.count === 175, '17 GLBs/175 props reais');
seedRandom(1);
const game = new Game({ renderer, textures: initTextures(renderer), sfx,
  settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
  playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'REGROUP-OBSTACLE-UNIT',
  mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
game._ensureDolly = () => {}; game._startRound(); game.state = 'live'; game.time = 10;
game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
const vip = game.objective.vip, guard = game.bots.find(b => b.team === 'B' && b !== vip), enemy = game.bots.find(b => b.team === 'E');
game.bots = [vip, guard, enemy]; game.combatants = [...game.bots];
vip.pos.set(0, 0, -12); guard.pos.set(9, 0, -17); enemy.pos.set(6, 0, -17);
enemy.hp = 1e6; guard.weapon = 'ak'; guard.mag = 30; guard.target = null; guard.think = 0;
guard.path = null; guard.repathAt = 0; guard._repathMin = 0;
const slot = { ...game.objective.botDestination(guard) };
const report = { geometry, unit: true, browserQA: false, balanceProof: false,
  initial: guard.pos.toArray(), slot, blockedHops: 0, maximumStep: 0, maximumSeparation: 0,
  shots: 0, windows: [], samples: [] };
const epsilon = Number.EPSILON * 1024;
const physics = Object.create(game);
physics._collide = BaseGame.prototype._collide; physics._collideRot = BaseGame.prototype._collideRot;
const walkReach = node => BaseGame.prototype._walkReach.call(physics, guard, node);
const validPosition = pos => {
  const copy = { x: pos.x, y: pos.y, z: pos.z }; physics._collide(copy, radius);
  return Math.hypot(copy.x - pos.x, copy.z - pos.z) <= epsilon;
};
const separation = game._botSeparation, collide = game._collide;
// Observa comandos antes das correções físicas; colisão e separação reais continuam executando.
let commandOrigin = guard.pos.clone(), commandDistance = 0, separating = false, separationCalls = 0;
const observeCommand = () => {
  commandDistance += guard.pos.distanceTo(commandOrigin); commandOrigin.copy(guard.pos);
};
game._collide = function (pos, bodyRadius) {
  if (pos === guard.pos && !separating) observeCommand();
  const result = collide.call(this, pos, bodyRadius);
  if (pos === guard.pos) commandOrigin.copy(pos);
  return result;
};
game._botSeparation = function (bot, dt) {
  const before = bot.pos.clone(); separationCalls++;
  observeCommand(); report.maximumStep = Math.max(report.maximumStep, commandDistance);
  separating = true;
  let result;
  try { result = separation.call(this, bot, dt); } finally { separating = false; }
  report.maximumSeparation = Math.max(report.maximumSeparation, bot.pos.distanceTo(before));
  return result;
};
let failure;
try {
  assert(game._losClear(game._botEye(guard), game._botEye(enemy)), 'controle: alvo realmente visível');
  assert(!walkReach(slot), 'controle: balcão impede trecho direto até o slot');
  assert(validPosition(guard.pos), 'controle: posição inicial sem penetração');
  let windowStart = guard.pos.clone(), windowShots = 0, windowVisible = 0;
  for (let frame = 0; frame < 600; frame++) {
    const mag = guard.mag, previousTarget = guard.target;
    const visible = game._losClear(game._botEye(guard), game._botEye(enemy));
    commandOrigin.copy(guard.pos); commandDistance = 0;
    game.time += 1 / 60; game._updateBot(guard, 1 / 60);
    if (frame === 0) assert(guard.target === enemy, 'aquisição normal mantém inimigo visível');
    if (previousTarget === enemy && visible) assert(guard.target === enemy, 'recuperação retém alvo enquanto realmente visível');
    assert(validPosition(guard.pos), 'recuperação preserva colisão com cenário real');
    report.shots += Number(guard.mag < mag);
    windowShots += Number(guard.mag < mag); windowVisible += Number(visible);
    const destination = game.objective.botDestination(guard);
    const node = guard.path && game.world.waypoints.nodes[guard.path[Math.min(guard.pathIdx, guard.path.length - 1)]];
    if (!walkReach(destination) && node && !walkReach(node)) report.blockedHops++;
    if ((frame + 1) % 120 === 0) {
      const distance = Math.hypot(guard.pos.x - destination.x, guard.pos.z - destination.z);
      const progress = guard.pos.distanceTo(windowStart);
      report.windows.push({ frame: frame + 1, progress, distance, shots: windowShots, visible: windowVisible });
      if (frame >= 239) {
        assert(distance <= destination.slotRadius || progress > speed / 60,
          'recuperação continua avançando nas janelas posteriores ou ocupa o slot');
        if (windowVisible === 120) assert(windowShots > 0, 'recuperação continua disparando nas janelas realmente visíveis');
      }
      windowStart = guard.pos.clone(); windowShots = 0; windowVisible = 0;
    }
    if (frame === 0 || (frame + 1) % 120 === 0) report.samples.push({ frame: frame + 1,
      position: guard.pos.toArray(), target: guard.target === enemy, path: guard.path, pathIdx: guard.pathIdx });
  }
  report.finalSlot = { ...game.objective.botDestination(guard) };
  report.finalSlotDistance = Math.hypot(guard.pos.x - report.finalSlot.x, guard.pos.z - report.finalSlot.z);
  assert.equal(separationCalls, 600, 'instrumentação observa separação real em cada frame');
  assert(report.maximumStep <= speed / 60 + 1e-9, 'reagrupamento respeita passo físico');
  assert.equal(report.blockedHops, 0, 'hop bloqueado deve ser descartado antes de navegar');
  assert(report.shots > 0, 'recuperação preserva resposta ao inimigo visível');
  console.log('✓ reagrupamento contorna obstáculo enquanto responde ao alvo');
} catch (error) {
  failure = `${error.name}: ${error.message.split('\n')[0]}`;
  console.error(`✗ ${failure}`); process.exitCode = 1;
} finally {
  report.final = guard.pos.toArray(); report.finalEnemy = enemy.pos.toArray(); report.finalVip = vip.pos.toArray();
  if (failure) report.failure = failure; game.dispose();
}
const reportFile = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
if (reportFile) writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
