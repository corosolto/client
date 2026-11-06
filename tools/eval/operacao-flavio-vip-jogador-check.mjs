// Régua do VIP jogador (Operação Flávio, offline): quem escolhe o Zero Um no time B É o
// VIP — sem bot senador duplicado, o estado da escolta segue o jogador, a morte dele fecha
// a rodada para E sem renascer e o embarque dele vence para B. Escolhido outro personagem,
// o bot VIP segue como antes; online o elenco continua do servidor.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, CHARACTERS, initTextures, renderer, sfx, seedRandom, pickMatchRoster } from './harness.mjs';

const mutations = {
  'elenco-duplica-senador': {
    before: 'roster[campo] = jogadorEhVip(lado, personagem, vipDef) ? semVip : [vipDef, ...semVip];',
    after: 'roster[campo] = [vipDef, ...semVip];',
    clause: 'elenco offline põe o senador uma única vez',
  },
  'vip-sempre-bot': {
    before: 'this.vip = jogadorVip ? game.player : game.bots.find((bot) => bot.team === \'B\') || null;',
    after: 'this.vip = game.bots.find((bot) => bot.team === \'B\') || null;',
    clause: 'Zero Um no time B é o próprio VIP, sem bot senador',
  },
  'jogador-vip-dirigido': {
    before: '      if (this.vip.isPlayer) {\n        passoEscoltaJogador(',
    after: '      if (false) {\n        passoEscoltaJogador(',
    clause: 'estado da escolta segue o jogador VIP sem movê-lo',
  },
  'checkpoint-jogador-parado': {
    before: '{ state.checkpoint = i; break; }',
    after: '{ break; }',
    clause: 'estado da escolta segue o jogador VIP sem movê-lo',
  },
  'jogador-vip-renasce': {
    before: 'if (ent === this.vip) return Infinity;',
    after: 'if (ent === this.vip && !ent.isPlayer) return Infinity;',
    clause: 'morte do VIP jogador fecha a rodada para E sem renascer',
  },
  'tela-de-morte-presa': {
    before: "game.el?.respawn?.classList?.add('hidden');",
    after: '',
    clause: 'rodada seguinte devolve o VIP jogador vivo no início da rota',
  },
  'embarque-ignora-contestacao': {
    before: 'const livre = defensores.length > 0 || (!state.contested && !state.threatened);',
    after: 'const livre = true;',
    clause: 'VIP jogador sozinho embarca e vence para B só sem contestação',
  },
  'embarque-escoltado-espera': {
    before: 'const livre = defensores.length > 0 || (!state.contested && !state.threatened);',
    after: 'const livre = !state.contested && !state.threatened;',
    clause: 'VIP jogador escoltado embarca mesmo contestado',
  },
  'embarque-jogador-nunca': {
    before: 'state.boardedFor = naEscada && livre ? state.boardedFor + dt : 0;',
    after: 'state.boardedFor = 0;',
    clause: 'VIP jogador sozinho embarca e vence para B só sem contestação',
  },
  'todo-b-vira-vip': {
    before: "export const jogadorEhVip = (lado, personagem, vipDef) => lado === 'B' && Boolean(vipDef?.id) && personagem === vipDef.id;",
    after: "export const jogadorEhVip = (lado) => lado === 'B';",
    clause: 'outro personagem no time B mantém o bot VIP de antes',
  },
  'online-vira-jogador': {
    before: 'const jogadorVip = !game.online && !game.dedicated && jogadorEhVip(',
    after: 'const jogadorVip = !game.dedicated && jogadorEhVip(',
    clause: 'online mantém o VIP bot do servidor',
  },
  'formacao-de-costas': {
    before: ': Number.isFinite(vip.yaw) ? (vip.isPlayer ? vip.yaw + Math.PI : vip.yaw) : 0;',
    after: ': Number.isFinite(vip.yaw) ? vip.yaw : 0;',
    clause: 'formação ociosa encara o rumo da câmera do VIP jogador',
  },
  'zona-jogador-no-penultimo': {
    before: 'const naEscada = state.checkpoint >= ultimo && d2(state.position, state.caminho[ultimo]) <= VIP_JOGADOR_RAIO ** 2;',
    after: 'const naEscada = state.checkpoint >= ultimo && d2(state.position, state.caminho[ultimo - 1]) <= VIP_JOGADOR_RAIO ** 2;',
    clause: 'VIP jogador anda até o pé da escada e embarca em toda variante',
  },
};

if (process.argv.includes('--mutantes')) {
  for (const [name, mutation] of Object.entries(mutations)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=' + name], { encoding: 'utf8', timeout: 90000, maxBuffer: 4000000 });
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
const { OperacaoFlavio, elencoOperacaoFlavio, destinoProtecaoEscolta } =
  await import('data:text/javascript;base64,' + Buffer.from(modeSource).toString('base64'));

const SENADOR = CHARACTERS.find((character) => character.id === 'senador');
const OUTRO_B = CHARACTERS.find((character) => character.id === 'deputado');
assert.ok(SENADOR && OUTRO_B, 'elenco tem Zero Um e um segundo personagem do time B');
assert.deepEqual(SENADOR.lados, ['B'], 'Zero Um só joga no time B: jogador senador no E não existe offline');

let failures = 0;
const cases = [];
const check = (clause, run) => {
  try { run(); cases.push({ clause, pass: true }); console.log('✓ ' + clause); }
  catch (error) {
    failures++; cases.push({ clause, pass: false, type: error.name, message: error.message });
    console.error('✗ ' + clause + ': ' + error.message);
  }
};
const elenco = (lado, personagem) => elencoOperacaoFlavio(
  pickMatchRoster(lado, lado === 'B' ? 'E' : 'B', { allies: 3, enemies: 4 }, personagem), lado, personagem, SENADOR);

// Mesmo caminho do main.js offline: roster sorteado + elenco do modo + Game não dedicado.
function withGame(personagem, run, { online = false } = {}) {
  seedRandom(7);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: personagem,
    playerTeam: 'B', playerFaction: 'B', enemyFaction: 'E', nickname: 'VIP-JOGADOR',
    mapId: 'operacao_flavio', ctf: false, testMode: true, matchRoster: elenco('B', personagem),
    onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game.objective.dispose();
  if (online) game.online = true;
  game.objective = new OperacaoFlavio(game, SENADOR);
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  try { run(game); } finally { game.online = false; game.dispose(); }
}
const senadores = (game) => game.combatants.filter((ent) => ent.def?.id === SENADOR.id);
const passos = (game, segundos) => {
  for (let t = 0; t < segundos && game.state === 'live'; t += 1 / 60) {
    game.time += 1 / 60;
    game.objective.update(1 / 60);
  }
};

check('elenco offline põe o senador uma única vez', () => {
  const jogadorVip = elenco('B', SENADOR.id);
  assert.equal(jogadorVip.allyDefs.filter((def) => def.id === SENADOR.id).length, 0, 'Zero Um jogador: nenhum bot senador aliado');
  assert.equal(jogadorVip.enemyDefs.filter((def) => def.id === SENADOR.id).length, 0, 'nem do outro lado');
  assert.equal(jogadorVip.allyDefs.length, 3, 'tamanho do time B preservado');
  const outro = elenco('B', OUTRO_B.id);
  assert.equal(outro.allyDefs[0].id, SENADOR.id, 'outro personagem B: bot VIP abre o lado B');
  assert.equal(outro.allyDefs.filter((def) => def.id === SENADOR.id).length, 1, 'senador uma vez só');
  const ataque = elenco('E', CHARACTERS.find((c) => c.lados?.includes('E')).id);
  assert.equal(ataque.enemyDefs[0].id, SENADOR.id, 'jogador no E: bot VIP abre o lado inimigo (B)');
});

check('Zero Um no time B é o próprio VIP, sem bot senador', () => withGame(SENADOR.id, (game) => {
  assert.ok(game.objective.vip === game.player, 'objective.vip é o jogador');
  const zeroUm = senadores(game);   // identidade, não deepEqual: entidades têm grafo three cíclico
  assert.ok(zeroUm.length === 1 && zeroUm[0] === game.player, `uma única entidade Zero Um, e é o jogador (${zeroUm.length})`);
  assert.ok(!game.player._objectiveNpc, 'jogador continua no placar (não é NPC de objetivo)');
  assert.notEqual(game.player.weapon, 'knife', 'jogador VIP entra armado');
  assert.equal(game.player.armor, 100, 'VIP jogador com colete');
  assert.equal(game.player.helmet, true, 'VIP jogador com capacete');
  assert.ok(game.objective.roundIntro().startsWith('VOCÊ É FLÁVIO'), 'banner avisa que ele é o VIP');
  const defensores = game.bots.filter((bot) => bot.team === 'B');
  assert.ok(defensores.length > 0 && defensores.every((bot) => bot._flavioPapel), 'todos os bots B escoltam o jogador');
}));

check('estado da escolta segue o jogador VIP sem movê-lo', () => withGame(SENADOR.id, (game) => {
  const { caminho } = game.objective.state;
  const p = game.player;
  assert.ok(Math.hypot(p.pos.x - caminho[0].x, p.pos.z - caminho[0].z) < 0.01, 'rodada nasce no início da rota');
  const trajeto = [
    [caminho[0].x + 1, caminho[0].z + 1, 0], [caminho[1].x, caminho[1].z, 1],
    [caminho[3].x + 1, caminho[3].z, 3], [caminho[2].x + 6, caminho[2].z, 3], [caminho[0].x, caminho[0].z, 3],
  ];
  for (const [x, z, checkpoint] of trajeto) {
    p.pos.set(x, 0, z);
    game.time += 1 / 60;
    game.objective.update(1 / 60);
    assert.equal(p.pos.x, x, 'modo não desloca o jogador (x)');
    assert.equal(p.pos.z, z, 'modo não desloca o jogador (z)');
    assert.equal(game.objective.state.position.x, x, 'estado segue x do jogador');
    assert.equal(game.objective.state.position.z, z, 'estado segue z do jogador');
    assert.equal(game.objective.state.checkpoint, checkpoint, `checkpoint ${checkpoint} em (${x}, ${z})`);
  }
}));

check('morte do VIP jogador fecha a rodada para E sem renascer', () => withGame(SENADOR.id, (game) => {
  const atirador = game.bots.find((bot) => bot.team === 'E');
  game._kill(game.player, atirador, 'ak');
  assert.equal(game.player.respawnAt, Infinity, 'VIP jogador não agenda renascimento');
  game.objective.update(1 / 60);
  assert.equal(game.objective.state.winner, 'E', 'E vence ao derrubar o VIP jogador');
  assert.equal(game.state, 'roundEnd', 'rodada encerrada');
  for (let frame = 0; frame < 120; frame++) { game.time += 0.1; game._updatePlayer(0.1); }
  assert.equal(game.player.alive, false, 'continua morto até a rodada seguinte');
  assert.equal(game.el.respawnCount.textContent, '—', 'contagem não mostra Infinity');
}));

check('rodada seguinte devolve o VIP jogador vivo no início da rota', () => withGame(SENADOR.id, (game) => {
  game._kill(game.player, game.bots.find((bot) => bot.team === 'E'), 'ak');
  game.objective.update(1 / 60);
  assert.equal(game.el.respawn.classList.contains('hidden'), false, 'tela de morte aberta na queda');
  game._startRound();
  const { caminho } = game.objective.state;
  const p = game.player;
  assert.equal(p.alive, true, 'vivo na rodada nova');
  assert.ok(game.objective.vip === p, 'continua sendo o VIP');
  assert.ok(Math.hypot(p.pos.x - caminho[0].x, p.pos.z - caminho[0].z) < 0.01, 'reposicionado no início da rota');
  const dx = caminho[1].x - p.pos.x, dz = caminho[1].z - p.pos.z, n = Math.hypot(dx, dz);
  assert.ok((-Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz) / n > 0.99, 'câmera olha o próximo checkpoint');
  assert.equal(game.el.respawn.classList.contains('hidden'), true, 'tela de morte fechada');
}));

check('VIP jogador sozinho embarca e vence para B só sem contestação', () => withGame(SENADOR.id, (game) => {
  game._losClear = () => true;
  const { caminho } = game.objective.state;
  const escada = caminho.at(-1);
  const atacantes = game.bots.filter((bot) => bot.team === 'E');
  atacantes.forEach((bot, i) => { bot.alive = i === 0; });
  game.bots.filter((bot) => bot.team === 'B').forEach((bot) => { bot.alive = false; });   // sozinho
  atacantes[0].pos.set(escada.x + 2, 0, escada.z);
  game.player.pos.set(escada.x, 0, escada.z);
  passos(game, 5);
  assert.equal(game.objective.state.checkpoint, caminho.length - 1, 'zona da escada alcançada');
  assert.equal(game.objective.state.winner, null, 'contestado não embarca');
  assert.equal(game.objective.state.boardedFor, 0, 'contagem de embarque zerada sob contestação');
  atacantes[0].alive = false;
  passos(game, 2.5);   // memória de ameaça + 3 s de embarque
  assert.equal(game.state, 'live', 'embarque exige o tempo inteiro');
  passos(game, 2.5);
  assert.equal(game.objective.state.winner, 'B', 'B vence com o VIP jogador embarcado');
  assert.equal(game.state, 'roundEnd', 'rodada encerrada no embarque');
}));

check('VIP jogador escoltado embarca mesmo contestado', () => withGame(SENADOR.id, (game) => {
  game._losClear = () => true;
  const escada = game.objective.state.caminho.at(-1);
  const atacantes = game.bots.filter((bot) => bot.team === 'E');
  atacantes.forEach((bot, i) => { bot.alive = i === 0; });
  atacantes[0].pos.set(escada.x + 2, 0, escada.z);
  const guarda = game.bots.find((bot) => bot.team === 'B');
  guarda.alive = true;
  guarda.pos.set(escada.x - 1, 0, escada.z);
  game.player.pos.set(escada.x, 0, escada.z);
  passos(game, 3.5);
  assert.equal(game.objective.state.contested, true, 'atacante no raio de contestação');
  assert.equal(game.objective.state.winner, 'B', 'com escolta o embarque não espera o pátio limpar (regra do bot VIP)');
}));

// Playtest 06/11 ("não consegue embarcar"): com a física real do jogador, Zero Um anda do
// penúltimo checkpoint de cada variante até o pé da escada sem colisor no caminho e embarca.
check('VIP jogador anda até o pé da escada e embarca em toda variante', () => withGame(SENADOR.id, (game) => {
  game._losClear = () => false;
  const p = game.player;
  for (let rodada = 1; rodada <= 3; rodada++) {
    game.roundNum = rodada; game.state = 'live';
    game.objective.prepareRound();
    const estado = game.objective.state, inicio = estado.caminho.at(-2), fim = estado.caminho.at(-1);
    estado.checkpoint = estado.caminho.length - 2;
    for (const bot of game.bots) bot.alive = false;   // pátio limpo: embarque sozinho vale
    p.pos.set(inicio.x, 0, inicio.z); p.vel.set(0, 0, 0); p.alive = true; p.hp = 100;
    game.touchMove = { x: 0, z: 0 };
    let chegou = false;
    for (let t = 0; t < 30 && !estado.winner; t += 1 / 60) {
      const dx = fim.x - p.pos.x, dz = fim.z - p.pos.z;
      chegou ||= Math.hypot(dx, dz) < 0.3;
      game.keys = chegou ? {} : { KeyW: true }; p.yaw = Math.atan2(-dx, -dz);
      game.time += 1 / 60; game._updatePlayer(1 / 60); game.objective.update(1 / 60);
    }
    game.keys = {};
    assert.ok(chegou, `rodada ${rodada}: jogador travou a ${Math.hypot(fim.x - p.pos.x, fim.z - p.pos.z).toFixed(2)} m do pé da escada`);
    assert.equal(estado.winner, 'B', `rodada ${rodada}: embarque do VIP jogador`);
  }
}));

check('outro personagem no time B mantém o bot VIP de antes', () => withGame(OUTRO_B.id, (game) => {
  const vip = game.objective.vip;
  assert.ok(vip !== game.player, 'jogador não é o VIP');
  assert.equal(vip?.isPlayer, false, 'VIP é bot');
  const zeroUm = senadores(game);
  assert.ok(zeroUm.length === 1 && zeroUm[0] === vip, `uma única entidade Zero Um, e é o bot VIP (${zeroUm.length})`);
  assert.equal(vip.weapon, 'pistol', 'bot VIP travado na pistola');
  assert.equal(vip._objectiveNpc, 'flavio');
  assert.equal(vip.name, '[VIP] ' + SENADOR.name);
  assert.ok(game.objective.roundIntro().startsWith('ESCOLTE'), 'banner da escolta');
  const jogador = game.player.pos.clone();
  passos(game, 0.5);
  assert.equal(vip.pos.x, game.objective.state.position.x, 'modo dirige o bot VIP');
  assert.equal(vip.pos.z, game.objective.state.position.z);
  assert.ok(game.player.pos.equals(jogador), 'modo não mexe no jogador');
}));

check('online mantém o VIP bot do servidor', () => withGame(SENADOR.id, (game) => {
  assert.ok(game.objective.vip !== game.player, 'online: o VIP vem do servidor, nunca do jogador local');
  assert.equal(game.objective.vip?.isPlayer, false);
}, { online: true }));

check('formação ociosa encara o rumo da câmera do VIP jogador', () => {
  const vip = { isPlayer: true, alive: true, team: 'B', pos: { x: 0, z: 0 }, yaw: Math.PI };   // câmera olha +Z
  const guarda = { alive: true, team: 'B', pos: { x: 0.5, z: 0.5 } };
  const destino = destinoProtecaoEscolta(guarda, vip, [guarda], []);
  assert.ok(destino.z > 2, `guarda da ponta à frente da câmera (z ${destino.z.toFixed(2)})`);
});

console.log(JSON.stringify({ tool: 'operacao-flavio-vip-jogador-check', mutant, cases, failed: cases.filter((test) => !test.pass) }));
process.exitCode = failures ? 1 : 0;
