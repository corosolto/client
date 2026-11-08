// Régua do pickup de arma caída na Operação Flávio (offline, dono 08/11/2026):
// "quando cai a arma do inimigo ou amigo não dá pra capturar". Causa medida: a escolta
// (guardas/flanqueadores colados no VIP) recolhia o drop andando por cima em <1 s — o
// jogador nunca chegava. A escolta não coleta mais (o kit é do modo); atacante segue a regra
// genérica de todo mapa. Online: o nó roda este mesmo `_updatePickups` (bots do servidor),
// e o `pick` do humano é por id, autoritativo — nada é fingido no cliente.
//   node tools/eval/operacao-flavio-pickup-check.mjs [--mutantes | --mutante=<nome>]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game as BaseGame, CHARACTERS, initTextures, renderer, sfx, seedRandom, pickMatchRoster, mkEl } from './harness.mjs';
import { elencoOperacaoFlavio } from '../../public/js/mode_operacao_flavio.js';
import { WEAPONS } from '../../public/js/data/weapons.js';

const COLETA = 'return b.alive && !b._remote && !b._objectiveNpc && !this._entidadeEscolta(b);';
const mutations = {
  // Volta o código de antes: guarda/flanqueador também varre o drop.
  'escolta-coleta': {
    before: COLETA, after: 'return b.alive && !b._remote && !b._objectiveNpc;',
    clause: 'escolta não recolhe a arma caída antes do jogador',
  },
  // Exclusão só nos pickups do mapa: os drops de morte continuam varridos pela escolta.
  'so-pickup-do-mapa': {
    before: 'if (!this._botPegaArma(b)) continue;\n        const dx = pk.x - b.pos.x, dz = pk.z - b.pos.z;\n        if (dx * dx + dz * dz <= 1.7 * 1.7) { this._grabPickup(pk, b, false); this._sumirDrop(i); break; }',
    after: 'if (!b.alive || b._remote || b._objectiveNpc) continue;\n        const dx = pk.x - b.pos.x, dz = pk.z - b.pos.z;\n        if (dx * dx + dz * dz <= 1.7 * 1.7) { this._grabPickup(pk, b, false); this._sumirDrop(i); break; }',
    clause: 'em partida simulada a escolta não leva drop e o jogador tem a maioria',
  },
  // Conserto largo demais: ninguém coleta, e o atacante perde a regra genérica.
  'ninguem-coleta': {
    before: COLETA, after: 'return false;',
    clause: 'atacante segue coletando andando por cima, como em todo mapa',
  },
  // Caminho do jogador (E e PEGAR compartilham `_grabNearPickup`).
  'pegar-mudo': {
    before: 'if (!this.nearPickup) return;\n    const { pk, dropIdx } = this.nearPickup;',
    after: 'return;\n    const { pk, dropIdx } = this.nearPickup;',
    clause: 'jogador pega a arma caída de inimigo e de aliado (E e PEGAR)',
  },
};

if (process.argv.includes('--mutantes')) {
  for (const [name, mutation] of Object.entries(mutations)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=' + name], { encoding: 'utf8', timeout: 120000, maxBuffer: 4000000 });
    const output = `${run.stdout}${run.stderr}`;
    assert.equal(run.status, 1, `${name}: mutante deve reprovar\n${output.slice(-3000)}`);
    assert.ok(!run.signal && !run.error, `${name}: falha semântica, não de infraestrutura`);
    assert.ok(output.includes('Mutação aplicada: ' + name), `${name}: mutação aplicada de fato`);
    assert.ok(output.includes('✗ ' + mutation.clause + ':'), `${name}: cláusula errada\n${output.slice(-3000)}`);
    console.log('✓ mutante reprovado: ' + name);
  }
  process.exit(0);
}

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || null;
const gameUrl = new URL('../../public/js/game.js', import.meta.url);
const gameSource = readFileSync(gameUrl, 'utf8');
let Game = BaseGame;
if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const { before, after } = mutations[mutant];
  assert.equal(gameSource.split(before).length - 1, 1, 'alvo do mutante único');
  ({ Game } = await import('data:text/javascript;base64,' + Buffer.from(gameSource.replace(before, after)
    .replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, gameUrl).href : import.meta.resolve(spec)))).toString('base64')));
  console.log('Mutação aplicada: ' + mutant);
}

const SENADOR = CHARACTERS.find((character) => character.id === 'senador');
let failures = 0;
const cases = [];
const check = (clause, run) => {
  try { run(); cases.push({ clause, pass: true }); console.log('✓ ' + clause); }
  catch (error) {
    failures++; cases.push({ clause, pass: false, type: error.name, message: error.message });
    console.error('✗ ' + clause + ': ' + error.message);
  }
};

// Mesmo caminho do main.js offline (vip-jogador-check): roster + elenco do modo + Game não dedicado.
function novoJogo(lado, seed = 7) {
  seedRandom(seed);
  const outro = lado === 'B' ? 'E' : 'B';
  const personagem = CHARACTERS.find((c) => (c.lados || ['E', 'B']).includes(lado) && c.id !== SENADOR.id).id;
  const roster = pickMatchRoster(lado, outro, { allies: 3, enemies: 4 }, personagem);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: personagem,
    playerTeam: lado, playerFaction: lado, enemyFaction: outro, nickname: 'PICKUP-FLAVIO',
    mapId: 'operacao_flavio', ctf: false, testMode: true, matchRoster: elencoOperacaoFlavio(roster, lado, personagem, SENADOR),
    onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  return game;
}
function comJogo(lado, run) { const game = novoJogo(lado); try { run(game); } finally { game.dispose(); } }

// Cena da queixa: alguém morre colado na formação (guarda a 0,8 m, VIP a 0,6 m) no meio da
// rota, longe do armário do spawn, e o jogador chega depois. Bots fora da cena vão para longe.
function cena(game, quem) {
  const p = game.player, vip = game.objective.vip;
  const guardas = game.bots.filter((b) => b._flavioPapel === 'guarda');
  const atacantes = game.bots.filter((b) => b.team === 'E');
  assert.ok(vip && !vip.isPlayer && guardas.length >= 2 && atacantes.length >= 1, 'pré-condição: VIP bot, dois guardas e um atacante');
  const vitima = quem === 'guarda' ? guardas[1] : atacantes[0];
  const vigia = guardas[0];
  if (vitima.weapon === p.weapon) vitima.weapon = 'm4';   // mesma arma na mão não troca (#264)
  game.bots.forEach((b, i) => { if (b !== vip && b !== vigia && b !== vitima) b.pos.set(200 + 4 * i, 0, 200); });
  const caminho = game.objective.state.caminho;
  const o = caminho[Math.floor(caminho.length / 2)];
  const chao = (x, z) => game.world.groundHeightAt(x, z);
  assert.ok(!game.drops.some((d) => Math.hypot(d.x - o.x, d.z - o.z) < 8), 'pré-condição: cena a 8 m de qualquer arma do armário');
  vigia.pos.set(o.x, chao(o.x, o.z), o.z);
  vip.pos.set(o.x - 0.6, chao(o.x - 0.6, o.z), o.z);
  vitima.pos.set(o.x + 0.8, chao(o.x + 0.8, o.z), o.z);
  p.pos.set(o.x + 6, chao(o.x + 6, o.z), o.z);
  const antes = game.drops.length;
  game._kill(vitima, null, vitima.weapon);
  assert.equal(game.drops.length, antes + 1, 'morte larga a arma');
  const drop = game.drops[game.drops.length - 1];
  assert.ok(drop.expiraEm > game.time && !drop.rack, 'drop de morte com prazo, fora do rack');
  return { p, vip, vigia, vitima, drop };
}

check('escolta não recolhe a arma caída antes do jogador', () => {
  for (const lado of ['E', 'B']) for (const quem of ['guarda', 'atacante']) comJogo(lado, (game) => {
    const { vip, vigia, drop } = cena(game, quem);
    for (let f = 0; f < 30; f++) { game.time += 1 / 60; game._updatePickups(); }
    assert.ok(game.drops.includes(drop), `${lado}/${quem}: drop ${drop.weapon} sumiu com guarda a 0,8 m`);
    assert.equal(vigia.weapon, vigia._flavioArma, `${lado}/${quem}: guarda mantém a arma do papel`);
    assert.equal(vip.weapon, 'pistol', `${lado}/${quem}: trava de arma do VIP`);
  });
});

check('jogador pega a arma caída de inimigo e de aliado (E e PEGAR)', () => {
  const fonte = gameSource.replace(/\s+/g, ' ');
  assert.ok(fonte.includes("if (e.code === 'KeyE') this._grabNearPickup();"), 'tecla E chama _grabNearPickup');
  assert.ok(fonte.includes("on('.touch-pickup', () => { if (this._acceptInput()) this._grabNearPickup(); });"), 'PEGAR chama _grabNearPickup');
  // inimigo e aliado para os dois lados: E mata guarda (inimigo) / vê atacante cair (aliado), e vice-versa.
  for (const lado of ['E', 'B']) for (const quem of ['guarda', 'atacante']) for (const toque of [false, true]) comJogo(lado, (game) => {
    const { p, drop } = cena(game, quem);
    const rotulo = `${lado}/${quem === 'guarda' ? (lado === 'B' ? 'aliado' : 'inimigo') : (lado === 'E' ? 'aliado' : 'inimigo')}/${toque ? 'PEGAR' : 'E'}`;
    for (let f = 0; f < 30; f++) { game.time += 1 / 60; game._updatePickups(); }   // 0,5 s até chegar
    p.pos.set(drop.x + 0.4, p.pos.y, drop.z);
    let lbl = null;
    if (toque) {
      lbl = mkEl('span');
      game._touchPickBtn = mkEl('button'); game._touchPickBtn.querySelector = () => lbl;
      game._touchPickBtn.classList.add('hidden');
    }
    game._updatePickups();
    // ok() e não equal(): o diff de um drop com malha Three.js estoura a memória do node
    assert.ok(game.nearPickup?.pk === drop, `${rotulo}: arma caída vira o alvo do pegar (alvo: ${game.nearPickup?.pk?.weapon ?? 'nenhum'})`);
    if (toque) {
      assert.ok(!game._touchPickBtn.classList.contains('hidden'), `${rotulo}: botão PEGAR aparece`);
      assert.equal(lbl.textContent, WEAPONS[drop.weapon].short, `${rotulo}: botão nomeia a arma`);
      assert.ok(game._acceptInput(), `${rotulo}: toque aceito em jogo`);
    }
    game._grabNearPickup();
    assert.equal(p.weapon, drop.weapon, `${rotulo}: arma na mão é a caída`);
    assert.ok(!game.drops.includes(drop), `${rotulo}: drop consumido`);
  });
});

check('atacante segue coletando andando por cima, como em todo mapa', () => comJogo('B', (game) => {
  const { drop } = cena(game, 'guarda');
  const atacante = game.bots.find((b) => b.team === 'E' && b.alive);
  atacante.pos.set(drop.x + 0.5, atacante.pos.y, drop.z);
  game._updatePickups();
  assert.ok(!game.drops.includes(drop), 'atacante a 0,5 m leva o drop');
  assert.equal(atacante.weapon, drop.weapon, 'e passa a usar a arma');
}));

/* Regime: IA completa, jogador imortal e parado (só observa), 2 lados × 3 sementes × 120 s.
   Medido 08/11 em 5 sementes: antes, escolta levava 7–10 drops/rodada e sobrava 6–20% ao
   jogador; depois, 0 pela escolta e 53–73% disponível (ferro_velho, controle: 50–80%). */
check('em partida simulada a escolta não leva drop e o jogador tem a maioria', () => {
  let total = 0, escolta = 0, bot = 0;
  for (const lado of ['E', 'B']) for (const seed of [1, 2, 3]) {
    const game = novoJogo(lado, seed);
    try {
      const vivos = new Set();
      const drop0 = game._dropWeapon.bind(game), grab0 = game._grabPickup.bind(game);
      game._dropWeapon = (...a) => { drop0(...a); if (a[5]) { total++; vivos.add(game.drops[game.drops.length - 1]); } };
      game._grabPickup = (pk, who, isPlayer) => {
        if (vivos.has(pk) && !isPlayer) { bot++; if (game._entidadeEscolta(who)) escolta++; vivos.delete(pk); }
        return grab0(pk, who, isPlayer);
      };
      for (let t = 0; t < 120; t += 1 / 30) { game.player.protUntil = Infinity; game.player.hp = 100; game.state = 'live'; game.update(1 / 30, false); }
    } finally { game.dispose(); }
  }
  const disponivel = (total - bot) / Math.max(1, total);
  console.log(`  regime: ${total} drops de morte, ${bot} por bot (${escolta} pela escolta), ${(100 * disponivel).toFixed(0)}% ficaram pro jogador`);
  assert.ok(total >= 20, `amostra de ${total} drops (anti-vacuidade: >= 20)`);
  assert.equal(escolta, 0, `escolta levou ${escolta} drops`);
  assert.ok(disponivel >= 0.5, `só ${(100 * disponivel).toFixed(0)}% dos drops ficaram pro jogador (>= 50%)`);
});

console.log(JSON.stringify({ tool: 'operacao-flavio-pickup-check', mutant, cases, failed: cases.filter((test) => !test.pass) }));
process.exitCode = failures ? 1 : 0;
