import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, PCHAR, CHARACTERS, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const mutations = {
  'sem-pressao': {
    before: "if (bot.team === 'E') {", after: 'if (false) {',
    clause: 'atacantes recebem destino de contestação na rota do VIP',
  },
  'vip-de-faca': {
    before: "const VIP_WEAPON = 'pistol';", after: "const VIP_WEAPON = 'knife';",
    clause: 'VIP tem pistola visível, colete e capacete restaurados a cada rodada',
  },
  'vip-sem-armadura': {
    before: 'this.vip.armor = 100;', after: 'this.vip.armor = 0;',
    clause: 'VIP tem pistola visível, colete e capacete restaurados a cada rodada',
  },
  'vip-sem-combate': {
    before: 'bot.crouchBias = Boolean(this.state.threatened);\n      return false;',
    after: 'bot.crouchBias = Boolean(this.state.threatened);\n      return true;',
    clause: 'VIP vivo usa aquisição LOS, tiro e recarga genéricos',
  },
};

if (process.argv.includes('--mutantes')) {
  for (const [name, mutation] of Object.entries(mutations)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=' + name], {
      encoding: 'utf8', timeout: 60000, maxBuffer: 2000000,
    });
    const output = `${run.stdout}${run.stderr}`;
    assert.equal(run.status, 1, `${name}: mutante deve reprovar\n${output}`);
    assert.ok(!run.signal && !run.error, `${name}: falha semântica, não de infraestrutura`);
    assert.ok(output.includes('Mutação aplicada: ' + name), `${name}: mutação aplicada de fato`);
    assert.ok(output.includes('✗ ' + mutation.clause + ':'), `${name}: cláusula errada\n${output}`);
    console.log('✓ mutante reprovado: ' + name);
  }
  process.exit(0);
}

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || null;
const modeUrl = new URL('../../public/js/mode_operacao_flavio.js', import.meta.url);
let modeSource = readFileSync(modeUrl, 'utf8');
if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const { before, after } = mutations[mutant];
  assert.equal(modeSource.split(before).length - 1, 1, 'alvo do mutante único');
  modeSource = modeSource.replace(before, after);
  console.log('Mutação aplicada: ' + mutant);
}
modeSource = modeSource.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
  'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, modeUrl).href : import.meta.resolve(spec)));
const { OperacaoFlavio } = await import('data:text/javascript;base64,' + Buffer.from(modeSource).toString('base64'));
const gameSource = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const botSpeed = Number(gameSource.match(/const BOT_SPEED = ([\d.]+)/)?.[1]);
const bodyRadius = Number(gameSource.match(/const BOT_BODY_R = ([\d.]+)/)?.[1]);
assert.ok(Number.isFinite(botSpeed) && Number.isFinite(bodyRadius), 'constantes físicas reais');

let failures = 0;
const cases = [];
const check = (clause, run) => {
  try { run(); cases.push({ clause, pass: true }); console.log('✓ ' + clause); }
  catch (error) {
    failures++; cases.push({ clause, pass: false, type: error.name, message: error.message });
    console.error('✗ ' + clause + ': ' + error.message);
  }
};
function withGame(run) {
  seedRandom(1);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'PRESSURE-UNIT',
    mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game.objective.dispose();
  game.objective = new OperacaoFlavio(game, CHARACTERS.find((character) => character.id === 'senador'));
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  try { run(game); } finally { game.dispose(); }
}

check('atacantes recebem destino de contestação na rota do VIP', () => withGame((game) => {
  const vip = game.objective.vip;
  const attackers = game.bots.filter((bot) => bot.team === 'E').slice(0, 3);
  game.bots = [vip, ...attackers]; game.combatants = [...game.bots];
  vip.pos.set(0, 0, 28);
  const destinations = attackers.map((bot) => game.objective.botDestination(bot));
  assert.ok(destinations.every(Boolean), 'todo atacante tem objetivo tático mesmo fora dos 45 m');
  assert.ok(destinations.every((destination) => Math.hypot(destination.x - vip.pos.x, destination.z - vip.pos.z) <= 4),
    'slots terminam dentro do raio que contesta a escolta');
  assert.equal(new Set(destinations.map((destination) => `${destination.x.toFixed(3)}:${destination.z.toFixed(3)}`)).size,
    attackers.length, 'atacantes não convergem para o mesmo ponto');
  assert.ok(destinations.every((destination) => destination.repath <= 0.25), 'rota móvel é recalculada com frequência');
}));

check('atacante sem LOS navega até contestar e só engaja com LOS', () => withGame((game) => {
  const vip = game.objective.vip, attacker = game.bots.find((bot) => bot.team === 'E');
  game.bots = [vip, attacker]; game.combatants = [...game.bots];
  vip.pos.set(0, 0, -20); vip.hp = 1e6;
  attacker.pos.set(32, 0, 54); attacker.target = null; attacker.path = null;
  attacker.repathAt = 0; attacker._repathMin = 0; attacker.think = 0;
  assert.ok(attacker.pos.distanceTo(vip.pos) > 45, 'controle começa fora da aquisição genérica');
  game._losClear = () => false;
  let usedPath = false, minimumDistance = Infinity, maximumStep = 0;
  for (let frame = 0; frame < 2400 && minimumDistance > 4; frame++) {
    const before = attacker.pos.clone();
    game.time += 1 / 60; game._updateBot(attacker, 1 / 60);
    maximumStep = Math.max(maximumStep, attacker.pos.distanceTo(before));
    minimumDistance = Math.min(minimumDistance, Math.hypot(attacker.pos.x - vip.pos.x, attacker.pos.z - vip.pos.z));
    usedPath ||= Array.isArray(attacker.path) && attacker.path.length > 1;
  }
  assert.ok(usedPath, 'pressão usa o grafo de navegação real');
  assert.ok(minimumDistance <= 4, `atacante alcança a contestação sem visão (mínimo ${minimumDistance.toFixed(2)} m)`);
  assert.ok(maximumStep <= Math.max(botSpeed / 60, bodyRadius * 2) + 1e-6,
    `deslocamento físico sem teleporte (máximo ${maximumStep.toFixed(3)} m)`);
  assert.equal(attacker.target, null, 'ausência de LOS não concede alvo por telepatia');
  game._losClear = () => true; attacker.think = 0; attacker.nextShotAt = 0;
  attacker.mag = 30; attacker.reloadUntil = 0;
  let shots = 0;
  for (let frame = 0; frame < 300 && !shots; frame++) {
    const magazine = attacker.mag;
    game.time += 1 / 60; game._updateBot(attacker, 1 / 60);
    shots += Number(attacker.mag < magazine);
  }
  assert.equal(attacker.target, vip, 'VIP vira alvo quando a LOS abre');
  assert.ok(shots > 0, 'contestação termina em fogo real, não apenas aproximação');
}));

check('VIP tem pistola visível, colete e capacete restaurados a cada rodada', () => withGame((game) => {
  const vip = game.objective.vip;
  const assertLoadout = () => {
    assert.equal(vip.weapon, 'pistol'); assert.equal(vip.secondary, 'pistol'); assert.equal(vip.primary, null);
    assert.equal(vip._meshWeapon, 'pistol', 'malha de terceira pessoa mostra a pistola');
    assert.equal(vip.mag, 12); assert.equal(vip.armor, 100); assert.equal(vip.helmet, true);
    assert.equal(vip.reloadUntil, 0); assert.equal(vip.target, null);
  };
  assertLoadout();
  for (let round = 0; round < 2; round++) {
    Object.assign(vip, { weapon: 'knife', primary: 'knife', secondary: 'knife', _meshWeapon: 'knife', mag: 0,
      armor: 17, helmet: false, reloadUntil: game.time + 99, target: game.bots.find((bot) => bot.team === 'E') });
    game.objective.prepareRound();
    assertLoadout();
  }
}));

check('VIP vivo usa aquisição LOS, tiro e recarga genéricos', () => withGame((game) => {
  const vip = game.objective.vip, attacker = game.bots.find((bot) => bot.team === 'E');
  game.bots = [vip, attacker]; game.combatants = [...game.bots];
  vip.pos.set(0, 0, 28); game.objective.state.position.x = 0; game.objective.state.position.z = 28;
  attacker.pos.set(0, 0, 36); attacker.hp = 1e6;
  game._losClear = () => true;
  vip.think = 0; vip.mag = 1; vip.nextShotAt = 0; vip.reloadUntil = 0;
  assert.equal(game.objective.updateBot(vip, 1 / 60), false, 'objetivo delega o VIP vivo à IA de combate');
  let fired = false, reloaded = false;
  for (let frame = 0; frame < 300 && !reloaded; frame++) {
    const magazine = vip.mag;
    game.time += 1 / 60; game._updateBot(vip, 1 / 60);
    fired ||= vip.mag < magazine || (vip.mag === 12 && vip.reloadUntil > game.time);
    reloaded ||= vip.mag === 12 && vip.reloadUntil > game.time;
  }
  assert.equal(vip.target, attacker, 'aquisição genérica escolhe o atacante visível');
  assert.ok(fired && reloaded, 'última bala dispara e inicia a recarga real da pistola');
  assert.equal(vip.weapon, 'pistol'); assert.equal(vip.mag, 12);
  game.time = vip.reloadUntil + 0.01; vip.nextShotAt = 0; vip.reactAt = 0; vip.focusUntil = 0;
  let firedAfterReload = false;
  for (let frame = 0; frame < 120 && !firedAfterReload; frame++) {
    game.time += 1 / 60; game._updateBot(vip, 1 / 60);
    firedAfterReload ||= vip.mag < 12;
  }
  assert.ok(firedAfterReload, 'pistola volta a disparar depois da recarga');
  game._losClear = () => false; vip.think = 0; vip.mag = 12; vip.nextShotAt = 0; vip.reloadUntil = 0;
  for (let frame = 0; frame < 30; frame++) { game.time += 1 / 60; game._updateBot(vip, 1 / 60); }
  assert.equal(vip.mag, 12, 'LOS fechada bloqueia novos tiros');
}));

console.log(JSON.stringify({ tool: 'operacao-flavio-pressure-check', mutant, cases, failed: cases.filter((test) => !test.pass) }));
process.exitCode = failures ? 1 : 0;
