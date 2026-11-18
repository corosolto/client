// Régua da VAGA DO VIP (Operação Flávio, dono 18/11/2026): numa sala N×N os dois lados têm N
// vagas de gente. O VIP é corpo A MAIS no lado B (N escoltas + VIP) e não é vaga
// (`_objectiveNpc`); antes ele virava uma das N e o lado B ficava com N-1 vagas no nó
// (backend game/room.js `vagasPorTime` conta bots do lado sem `_objectiveNpc`).
// Cobre o nó (Game dedicado, mesmas opções do Room), o espelho do cliente online (elenco do
// servidor na ordem do roster) e o elenco offline do main.js (elencoDaEscolta).
//   node tools/eval/operacao-flavio-vaga-check.mjs [--mutantes | --mutante=<nome>]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game as BaseGame, CHARACTERS, PCHAR, initTextures, renderer, sfx, seedRandom, pickMatchRoster } from './harness.mjs';

const MODE = new URL('../../public/js/mode_operacao_flavio.js', import.meta.url);
const GAME = new URL('../../public/js/game.js', import.meta.url);
const mutations = {
  // O código de antes no nó: Game sem matchRoster não acrescenta o VIP; ele vira um dos N.
  'vip-consome-vaga': {
    file: GAME,
    before: 'if (vipExtra) elencoDaEscolta(roster, playerTeam, playerCharId);',
    after: '',
  },
  // Senador sorteado como escolta sai sem reposição (o elenco offline de antes).
  'senador-sem-reposicao': {
    file: MODE,
    before: 'const faltam = roster[campo].length - escolta.length + (jogadorVip ? 1 : 0);',
    after: 'const faltam = 0;',
  },
  // VIP no fim do lado B: o 1º bot B (quem o modo, o nó e o cliente online tratam como VIP) é escolta.
  'vip-fora-da-frente': {
    file: MODE,
    before: 'roster[campo] = jogadorVip ? escolta : [vipDef, ...escolta];',
    after: 'roster[campo] = jogadorVip ? escolta : [...escolta, vipDef];',
  },
};

if (process.argv.includes('--mutantes')) {
  for (const name of Object.keys(mutations)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=' + name], { encoding: 'utf8', timeout: 180000, maxBuffer: 8000000 });
    const output = (run.stdout || '') + (run.stderr || '');
    assert.equal(run.status, 1, `${name}: mutante deve reprovar\n${output.slice(-3000)}`);
    console.log('✓ mutante reprovado: ' + name);
  }
  process.exit(0);
}

const reescreve = (source, base, troca = {}) => source.replace(/from\s+(['"])([^'"]+)\1/g, (_, _q, spec) => {
  if (troca[spec]) return 'from ' + JSON.stringify(troca[spec]);
  return 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, base).href : import.meta.resolve(spec));
});
const dataUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || null;
let Game = BaseGame;
let { elencoDaEscolta } = await import(GAME.href);
if (mutant) {
  const m = mutations[mutant];
  assert.ok(m, 'mutante conhecido: ' + Object.keys(mutations).join(', '));
  let modeSource = readFileSync(MODE, 'utf8');
  let gameSource = readFileSync(GAME, 'utf8');
  const alvo = m.file === MODE ? modeSource : gameSource;
  assert.equal(alvo.split(m.before).length - 1, 1, 'alvo do mutante único');
  if (m.file === MODE) modeSource = modeSource.replace(m.before, m.after);
  else gameSource = gameSource.replace(m.before, m.after);
  const modo = dataUrl(reescreve(modeSource, MODE));
  ({ Game, elencoDaEscolta } = await import(dataUrl(reescreve(gameSource, GAME, { './mode_operacao_flavio.js': modo }))));
  console.log('Mutação aplicada: ' + mutant);
}

const VIP = 'senador';
const textures = initTextures(renderer);
let failures = 0;
const cases = [];
const check = (clause, run) => {
  try { run(); cases.push({ clause, pass: true }); console.log('✓ ' + clause); }
  catch (error) {
    failures++; cases.push({ clause, pass: false, type: error.name, message: error.message });
    console.error('✗ ' + clause + ': ' + error.message);
  }
};

// Mesmas opções do Room do nó (backend game/room.js): dedicado, sem matchRoster, lado E/B.
function comNo(n, run, seed = 11) {
  seedRandom(seed);
  const erros = [];
  const erro0 = console.error;
  console.error = (...args) => { erros.push(args.map(String).join(' ')); };
  let game;
  try {
    game = new Game({ renderer, textures, sfx,
      settings: { bots: n, quality: 'low', difficulty: 'normal', sens: 1 },
      playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'SERVER',
      mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  } finally { console.error = erro0; }
  game._ensureDolly = () => {};
  try { run(game, erros); } finally { game.dispose(); }
}
// Regras do nó, literais: capacidade = corpos do lado sem `_objectiveNpc` (vagasPorTime);
// o claimSlot entrega o 1º bot do lado sem dono e sem `_objectiveNpc`.
const capacidade = (game, team) => game.bots.filter((bot) => bot.team === team && !bot._objectiveNpc).length;
const reivindica = (game, team) => {
  const bot = game.bots.find((b) => b.team === team && !b._remote && !b._objectiveNpc);
  if (bot) bot._remote = 'humano-' + team;
  return bot || null;
};

for (const n of [2, 5, 8]) {
  check(`nó ${n}×${n}: ${n} vagas de gente por lado, VIP uma vez só e fora das vagas`, () => comNo(n, (game, erros) => {
    assert.deepEqual(erros.filter((e) => e.includes('COMPOSIÇÃO ERRADA')), [], 'composição conferida pelo Game');
    const vips = game.bots.filter((bot) => bot._objectiveNpc);
    assert.equal(vips.length, 1, 'um único corpo de objetivo');
    const vip = game.objective.vip;
    assert.equal(vips[0], vip, 'o corpo de objetivo é o VIP do modo');
    assert.equal(vip._objectiveNpc, 'flavio');
    assert.equal(vip.team, 'B');
    assert.equal(vip.def.id, VIP, 'VIP é o Zero Um');
    assert.equal(game.bots.find((bot) => bot.team === 'B'), vip, 'VIP abre o lado B (ordem do roster publicado)');
    assert.equal(game.combatants.filter((c) => c.def?.id === VIP).length, 1, 'Zero Um aparece uma vez só');
    assert.deepEqual({ E: capacidade(game, 'E'), B: capacidade(game, 'B') }, { E: n, B: n }, 'vagas por lado');
    for (const team of ['E', 'B']) {
      const corpos = Array.from({ length: n }, () => reivindica(game, team));
      assert.ok(corpos.every(Boolean), `${team}: as ${n} pessoas recebem corpo`);
      assert.ok(!corpos.includes(vip), `${team}: ninguém recebe o VIP`);
      assert.equal(new Set(corpos).size, n, `${team}: corpos distintos`);
      assert.equal(reivindica(game, team), null, `${team}: a pessoa ${n + 1} fica sem corpo`);
    }
    assert.equal(vip._remote, undefined, 'VIP segue com a IA do nó');
  }));
}

check('cliente online monta um corpo por entidade do nó e o VIP local é o do nó', () => comNo(4, (no) => {
  // roster como o Room publica (combatants sem o jogador do servidor, na ordem do Game; o id
  // de rede é do Room, aqui basta a posição)
  const roster = no.combatants.filter((c) => c !== no.player).map((c, id) => ({ id, char: c.def.id, team: c.team }));
  const def = (r) => CHARACTERS.find((c) => c.id === r.char);
  for (const lado of ['E', 'B']) {
    const meu = roster.find((r) => r.team === lado && r.char !== VIP);
    // rosterDoServidor (main.js): aliados do lado menos eu; inimigos do outro lado
    const matchRoster = {
      allyDefs: roster.filter((r) => r.team === lado && r.id !== meu.id).map(def),
      enemyDefs: roster.filter((r) => r.team !== lado).map(def),
    };
    seedRandom(5);
    const cliente = new Game({ renderer, textures, sfx,
      settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
      playerCharId: meu.char, playerTeam: lado, playerFaction: lado, enemyFaction: lado === 'B' ? 'E' : 'B', nickname: 'CLIENTE',
      mapId: 'operacao_flavio', ctf: false, testMode: true, matchRoster, onQuit() {}, onMatchEnd() {} });
    cliente._ensureDolly = () => {};
    try {
      for (const team of ['E', 'B']) {
        const doNo = roster.filter((r) => r.team === team && r.id !== meu.id).length;
        assert.equal(cliente.bots.filter((bot) => bot.team === team).length, doNo, `lado ${lado}: corpos locais ${team} = entidades do nó`);
      }
      assert.equal(cliente.objective.vip?.def?.id, VIP, `lado ${lado}: VIP local é o Zero Um do nó`);
      assert.equal(cliente.bots.filter((bot) => bot._objectiveNpc).length, 1, `lado ${lado}: um VIP local`);
    } finally { cliente.dispose(); }
  }
}));

// Elenco offline (main.js): formato do menu em SP, N = 4 por lado.
const sp = (lado, personagem, pinned = null) => {
  const outro = lado === 'B' ? 'E' : 'B';
  return elencoDaEscolta(pickMatchRoster(lado, outro, { allies: 3, enemies: 4 }, personagem, false, pinned), lado, personagem);
};
const ids = (defs) => defs.map((d) => d.id);
const OUTRO_B = CHARACTERS.find((c) => c.id !== VIP && !c.passe && (c.lados || ['E', 'B']).includes('B')).id;
const DO_E = CHARACTERS.find((c) => !c.passe && (c.lados || ['E', 'B']).includes('E') && !(c.lados || ['E', 'B']).includes('B'))?.id
  || CHARACTERS.find((c) => !c.passe && (c.lados || ['E', 'B']).includes('E')).id;

check('offline no lado B: 3 aliados + eu + VIP a mais', () => {
  seedRandom(3);
  const r = sp('B', OUTRO_B);
  assert.equal(r.allyDefs[0].id, VIP, 'VIP abre o lado B');
  assert.equal(r.allyDefs.length, 4, 'escolta de 3 bots + o jogador = 4, mais o VIP');
  assert.equal(ids(r.allyDefs).filter((id) => id === VIP).length, 1);
  assert.equal(r.enemyDefs.length, 4);
});
check('offline no lado E: 4 inimigos + VIP a mais', () => {
  seedRandom(3);
  const r = sp('E', DO_E);
  assert.equal(r.enemyDefs[0].id, VIP);
  assert.equal(r.enemyDefs.length, 5);
  assert.equal(r.allyDefs.length, 3);
});
check('senador escalado como escolta vira outro personagem, o lado não encolhe', () => {
  seedRandom(3);
  const r = sp('B', OUTRO_B, { ally: [VIP], enemy: [] });
  assert.equal(r.allyDefs[0].id, VIP);
  assert.equal(ids(r.allyDefs).filter((id) => id === VIP).length, 1, 'Zero Um uma vez só');
  assert.equal(r.allyDefs.length, 4, '3 escoltas + VIP');
  assert.ok(r.allyDefs.slice(1).every((d) => !d.passe && (d.lados || ['E', 'B']).includes('B')), 'reposição joga no B e é sorteável');
});
check('jogador Zero Um é o VIP a mais: escolta mantém 4 corpos além dele', () => {
  seedRandom(3);
  const r = sp('B', VIP);
  assert.equal(ids(r.allyDefs).filter((id) => id === VIP).length, 0, 'sem bot senador');
  assert.equal(r.allyDefs.length, 4, '4 escoltas além do jogador VIP');
});

console.log(JSON.stringify({ tool: 'operacao-flavio-vaga-check', mutant, cases, failed: cases.filter((c) => !c.pass) }));
process.exitCode = failures ? 1 : 0;
