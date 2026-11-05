// Proteção de spawn telegrafada + armadura no servidor dedicado.
//   (1) ESCUDO ESTÁVEL: durante protUntil o dano é ZERO e, na escolta, o corpo não
//       pisca — o anel de escudo tem que aparecer SEM alternância por quadro (nem no
//       corpo, nem no anel) e sumir quando a proteção acaba.
//   (2) ARMADURA NO DEDICADO: o servidor dedicado computa o dano autoritativo — o
//       colete/capacete da escolta TEM que reduzir o dano lá. Cliente online puro
//       (sem dedicated) continua dirigido por snapshot: nada de armadura local.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Game as BaseGame, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const reporter = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.slice(17);
if (reporter) {
  assert(['TypeError', 'AssertionError'].includes(reporter)); console.log('Mutação aplicada: controle-reporter');
  try { if (reporter === 'TypeError') throw new TypeError('controle'); assert.fail('controle'); }
  catch (error) { console.error(`✗ ${error.name}: ${error.message}`); }
  process.exit(1);
}
const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const mutations = {
  // Armor: sem o servidor dedicado aplicando, guarda da escolta não é mais duro online.
  'armadura-sem-dedicado': ['(this.online && !this.dedicated) || !(ent.armor > 0)', 'this.online || this.dedicated || !(ent.armor > 0)'],
  // Armor: aplicar no cliente puro quebra o contrato snapshot-driven.
  'armadura-no-cliente': ['(this.online && !this.dedicated) || !(ent.armor > 0)', '!(ent.armor > 0)'],
  // Escudo: sem telegraph, o invulnerável silencioso volta.
  'sem-escudo': ['const protegido = this.time < (b.protUntil || 0);', 'const protegido = false;'],
  // Escudo: telegraph piscando é o flicker que não pode voltar.
  'escudo-piscando': ['m.halo.visible = true;',
    "m.halo.visible = !(this.time < (b.protUntil || 0)) || Math.floor(this.time * 12) % 2 === 0;"],
};
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
let Game = BaseGame;
if (mutation) {
  assert(Object.hasOwn(mutations, mutation), 'mutante conhecido');
  const [before, after] = mutations[mutation];
  assert.equal(source.split(before).length, 2, 'mutação única');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  ({ Game } = await import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`));
  console.log(`Mutação aplicada: ${mutation}`);
}

seedRandom(1);
const game = new Game({ renderer, textures: initTextures(renderer), sfx,
  settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
  playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'SPAWN-SHIELD-UNIT',
  mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
game._ensureDolly = () => {}; game._startRound(); game.state = 'live'; game.time = 10;
game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
const vip = game.objective.vip;
const guard = game.bots.find(b => b.team === 'B' && b !== vip);
const attacker = game.bots.find(b => b.team === 'E');
game.bots = [vip, guard, attacker]; game.combatants = [...game.bots];
guard.protUntil = 0; attacker.protUntil = 0;
game._losClear = () => false;   // ninguém adquire alvo: a régua mede o telegraph, não o combate
const report = { unit: true, synthetic: true, browserQA: false };
let failures = 0;
const check = (clause, run) => {
  try { run(); report[clause] = 'ok'; console.log(`✓ ${clause}`); }
  catch (error) { failures++; report[clause] = `${error.name}: ${error.message}`; console.error(`✗ ${clause}: ${error.message}`); }
};

// ---------- (1) escudo estável + proteção de dano ----------
check('escudo: halo telegrafado estável durante protUntil sem piscar corpo', () => {
  assert.ok(attacker._mark?.halo, 'halo do marcador existe');
  attacker.protUntil = game.time + 2.5;
  let corpoFlips = 0, haloFlips = 0, haloApareceu = 0, telegrafado = 0, frames = 0;
  let prevCorpo = null, prevHalo = null;
  for (let f = 0; f < 140; f++) {   // janela DENTRO da proteção (2,5 s): transição alguma é esperada
    game.time += 1 / 60; game._updateBot(attacker, 1 / 60);
    const corpo = attacker.mesh.group.visible, halo = attacker._mark.halo.visible;
    if (prevCorpo !== null && corpo !== prevCorpo) corpoFlips++;
    if (prevHalo !== null && halo !== prevHalo) haloFlips++;
    if (halo) haloApareceu++;
    const m = attacker._mark;
    if (m.protegido === true && Math.abs(m.halo.scale.x - 1.9) < 1e-6 && m.col === '#bfe6ff') telegrafado++;
    frames++; prevCorpo = corpo; prevHalo = halo;
  }
  report.escudo = { frames, corpoFlips, haloFlips, haloApareceu, telegrafado };
  assert.equal(corpoFlips, 0, 'corpo não pisca na escolta durante a proteção');
  assert.equal(haloFlips, 0, 'halo não alterna por quadro');
  assert.ok(telegrafado >= 120, `halo telegrafado (crescido + azul-gelo) durante a proteção (${telegrafado}/${frames})`);
});
check('escudo: dano zero durante protUntil e anel some ao expirar', () => {
  attacker.protUntil = game.time + 0.5;
  game._updateBot(attacker, 1 / 60);
  assert.equal(attacker._mark.protegido, true, 'halo telegrafado com proteção ativa');
  const hpAntes = attacker.hp;
  game._damage(attacker, 40, guard, 'ak', false);
  assert.equal(attacker.hp, hpAntes, 'dano anulado durante protUntil');
  while (game.time < attacker.protUntil + 0.05) { game.time += 1 / 60; game._updateBot(attacker, 1 / 60); }
  assert.equal(attacker._mark.protegido, false, 'telegraph sai quando a proteção acaba');
  assert.ok(Math.abs(attacker._mark.halo.scale.x - 1.45) < 1e-6, 'halo volta ao tamanho de time');
  game._damage(attacker, 40, guard, 'ak', false);
  assert.ok(attacker.hp < hpAntes, 'dano normal após expirar');
});

// ---------- (2) armadura: dedicado aplica, cliente puro não ----------
check('armadura: dedicado reduz dano do guarda com colete+capacete', () => {
  guard.protUntil = 0; guard.hp = 100; guard.armor = 100; guard.helmet = true;
  attacker.protUntil = 0; attacker.hp = 100; attacker.armor = 0; attacker.helmet = false;
  const onlineAntes = game.online, dedicadoAntes = game.dedicated;
  game.online = true; game.dedicated = true;
  try {
    const dGuarda = game._aplicaArmadura(guard, 40, 'ak', false);
    const dAtacante = game._aplicaArmadura(attacker, 40, 'ak', false);
    report.armadura = { dGuarda, dAtacante, coleteApos: guard.armor };
    assert.ok(dGuarda < dAtacante, `colete absorve no dedicado (${dGuarda} vs ${dAtacante})`);
    assert.ok(guard.armor < 100, 'pool de colete é consumido');
    guard.hp = 100; attacker.hp = 100;
    game._damage(guard, 40, attacker, 'ak', false);
    game._damage(attacker, 40, guard, 'ak', false);
    assert.ok(guard.hp > attacker.hp, `guarda armored perde menos HP (${guard.hp} vs ${attacker.hp})`);
  } finally { game.online = onlineAntes; game.dedicated = dedicadoAntes; }
});
check('armadura: cliente puro (sem dedicated) segue snapshot, não aplica local', () => {
  guard.protUntil = 0; guard.armor = 100; guard.helmet = true;
  const onlineAntes = game.online, dedicadoAntes = game.dedicated;
  game.online = true; game.dedicated = false;
  try {
    const d = game._aplicaArmadura(guard, 40, 'ak', false);
    report.cliente = { d, coleteApos: guard.armor };
    assert.equal(d, 40, 'cliente puro não aplica armadura localmente');
    assert.equal(guard.armor, 100, 'pool de colete intacto no cliente');
  } finally { game.online = onlineAntes; game.dedicated = dedicadoAntes; }
});
game.dispose();
const reportFile = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
if (reportFile) writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (failures) process.exitCode = 1;
