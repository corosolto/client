// Réguas do slice de papéis/loadout e de flicker do modo Operação Flávio:
//   - composição da escolta (1 LMG + 1 escopeta + 1 rifle + 1 sniper, flanqueadores),
//     guardas mais eficazes (skill) e mais duros de matar (colete/capacete), sem wallhack;
//   - estabilidade visual: bots vivos nunca têm a visibilidade do grupo alternada pelo
//     modo, corpo morto do VIP some uma única vez, destinos com histerese.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game as BaseGame, PCHAR, CHARACTERS, initTextures, renderer, sfx, seedRandom } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';

const mutations = {
  'papel-igualado': {
    before: 'bot._flavioArma = ARMAS_GUARDA[ordem];', after: "bot._flavioArma = 'ak';",
    clause: 'escolta entrega um LMG, uma escopeta, um rifle e um sniper',
  },
  'sem-colete-guarda': {
    before: 'bot.armor = 100;\n    bot.helmet = true;', after: 'bot.armor = 0;\n    bot.helmet = false;',
    clause: 'guardas mais eficazes e mais duros de matar que os atacantes',
  },
  'foco-sem-histerese': {
    before: 'if (maisPerto === foco || distancia <= (THREAT_RADIUS * ENGAGE_SAIDA) ** 2\n        && distancia <= menorDistancia / ORIENTACAO_TROCA ** 2) {',
    after: 'if (maisPerto === foco) {',
    clause: 'VIP foca uma ameaça sem girar entre equidistantes',
  },
  'vanguarda-por-quadro': {
    before: 'if (!Number.isFinite(bot._flavioVanguarda) || alvoZ > bot._flavioVanguarda) bot._flavioVanguarda = alvoZ;',
    after: 'bot._flavioVanguarda = alvoZ;',
    clause: 'flanqueador segura a vanguarda com histerese',
  },
  'vanguarda-presinha': {
    before: 'const pontoRota = Array.isArray(rota) ? rota.find((p) => Number.isFinite(p?.z) && p.z >= bot._flavioVanguarda) : null;',
    after: 'const pontoRota = Array.isArray(rota) ? rota.at(-1) : null;',
    clause: 'vanguarda atravessa hangar e pátio junto do comboio',
  },
  'vanguarda-troca-lado': {
    before: "if (Math.hypot(dx, dz) < 1e-6) { dx = ponto.x - anterior.x; dz = ponto.z - anterior.z; }",
    after: "if (Math.hypot(dx, dz) < 1e-6) { dx = this.state.position.x - ponto.x; dz = this.state.position.z - ponto.z; }",
    clause: 'vanguarda atravessa hangar e pátio junto do comboio',
  },
  'esconde-vivo': {
    before: 'if (bot.deadT > 1) group.visible = false;',
    after: 'if (bot.deadT > 1) group.visible = Math.random() < 0.5;',
    clause: 'corpo morto do VIP some uma única vez e não volta',
  },
  'rota-fixa': {
    before: 'return Array.isArray(rotas) && rotas.length > 1 ? varianteRotaEscolta(this.game.roundNum, rotas.length) : 0;',
    after: 'return 0;',
    clause: 'rota do VIP varia por rodada e conduz Flávio pela variante',
  },
  'rota-sem-caminho': {
    before: 'return criarEstadoEscolta(this.game.world.escortPaths?.[this._rota] || this.game.world.escortPath);',
    after: 'return criarEstadoEscolta(this.game.world.escortPath);',
    clause: 'rota do VIP varia por rodada e conduz Flávio pela variante',
  },
  'embarque-no-penultimo': {
    before: 'const escada = state.caminho[ultimo];',
    after: 'const escada = state.caminho[ultimo - 1];',
    clause: 'VIP bot chega ao pé da escada e embarca em toda variante',
  },
  'isca-fixa': {
    before: 'const rota = iscas[((bot._flavioIsca || 0) + (bot._flavioVidas || 0)) % iscas.length];',
    after: 'const rota = (bot._flavioIsca || 0) % 2 === 0 ? 2 : 0;',
    clause: 'flanqueadores viram iscas em ≥3 rotas, primeiro do lado oposto',
  },
  'isca-sem-rodizio': {
    before: "if (bot._flavioPapel === 'flanqueador') { bot._flavioVidas = (bot._flavioVidas || 0) + 1; this._rotaFlanqueador(bot); }",
    after: '',
    clause: 'flanqueadores viram iscas em ≥3 rotas, primeiro do lado oposto',
  },
  // Alvo em game.js: o hold da formação religava o puxão com destino null (VIP morto).
  'hold-sem-destino': {
    file: 'game',
    before: 'else if (objectiveDestination && this.time < (b._formacaoHoldAte || 0)) formationPull = true;',
    after: 'else if (this.time < (b._formacaoHoldAte || 0)) formationPull = true;',
    clause: 'guarda em hold de formação não quebra quando o VIP morre',
  },
};

if (process.argv.includes('--mutantes')) {
  for (const [name, mutation] of Object.entries(mutations)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=' + name], { encoding: 'utf8', timeout: 60000, maxBuffer: 4000000 });
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
let Game = BaseGame;
if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const { before, after, file } = mutations[mutant];
  if (file === 'game') {
    const gameUrl = new URL('../../public/js/game.js', import.meta.url);
    const gameSource = readFileSync(gameUrl, 'utf8');
    assert.equal(gameSource.split(before).length - 1, 1, 'alvo do mutante único');
    ({ Game } = await import('data:text/javascript;base64,' + Buffer.from(gameSource.replace(before, after)
      .replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, gameUrl).href : import.meta.resolve(spec)))).toString('base64')));
  } else {
    assert.equal(modeSource.split(before).length - 1, 1, 'alvo do mutante único');
    modeSource = modeSource.replace(before, after);
  }
  console.log('Mutação aplicada: ' + mutant);
}
modeSource = modeSource.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
  'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, modeUrl).href : import.meta.resolve(spec)));
const { OperacaoFlavio } = await import('data:text/javascript;base64,' + Buffer.from(modeSource).toString('base64'));
const VANGUARDA = Number(modeSource.match(/const FLANQUEADOR_VANGUARDA = (\d+)/)?.[1]);
assert.ok(VANGUARDA >= 3, 'vanguarda empurra ao menos três checkpoints à frente');

let failures = 0;
const cases = [];
const check = (clause, run) => {
  try { run(); cases.push({ clause, pass: true }); console.log('✓ ' + clause); }
  catch (error) {
    failures++; cases.push({ clause, pass: false, type: error.name, message: error.message });
    console.error('✗ ' + clause + ': ' + error.message);
  }
};
function withGame(bots, run) {
  seedRandom(1);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'ROLES-UNIT',
    mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {};
  game.objective.dispose();
  game.objective = new OperacaoFlavio(game, CHARACTERS.find((character) => character.id === 'senador'));
  game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  try { run(game); } finally { game.dispose(); }
}
const papeis = (game) => {
  const vip = game.objective.vip;
  const defensores = game.bots.filter((bot) => bot !== vip && bot.team === 'B');
  return {
    vip,
    guardas: defensores.filter((bot) => bot._flavioPapel === 'guarda'),
    flanqueadores: defensores.filter((bot) => bot._flavioPapel === 'flanqueador'),
    atacantes: game.bots.filter((bot) => bot.team === 'E'),
  };
};

check('escolta entrega um LMG, uma escopeta, um rifle e um sniper', () => withGame(7, (game) => {
  const { vip, guardas } = papeis(game);
  assert.equal(guardas.length, 4, 'quatro guardas diretos');
  assert.deepEqual(guardas.map((bot) => bot.weapon), ['lmg', 'shotgun', 'ak', 'awp'], 'um de cada, sem repetir');
  assert.deepEqual(guardas.map((bot) => bot.mag), ['lmg', 'shotgun', 'ak', 'awp'].map((w) => WEAPONS[w].mag), 'pente é o da arma do papel');
  game.objective.update(1 / 60);   // sync visual é adiado ao 1º update (spawn determinístico)
  assert.ok(guardas.every((bot) => bot._meshWeapon === bot.weapon), 'malha de terceira pessoa espelha a arma do papel');
  assert.equal(vip.weapon, 'pistol', 'VIP continua de pistola');
  const contagem = game.bots.filter((bot) => bot.team === 'B' && ['lmg', 'shotgun', 'ak', 'awp'].includes(bot.weapon));
  assert.equal(contagem.length, 4, 'ninguém fora do papel carrega o kit da escolta');
}));

check('4 guardas diretos e flanqueadores completam o 7x7', () => withGame(7, (game) => {
  const { flanqueadores } = papeis(game);
  assert.equal(flanqueadores.length, 2, 'dois flanqueadores de vanguarda');
  assert.deepEqual(flanqueadores.map((bot) => bot.weapon), ['mp5', 'carbine']);
  assert.ok(flanqueadores.every((bot) => bot._flavioLado === 1 || bot._flavioLado === -1), 'um por lateral da vanguarda');
}));

check('6x6 mantém os quatro guardas diretos', () => withGame(6, (game) => {
  const { guardas, flanqueadores } = papeis(game);
  assert.equal(guardas.length, 4, 'formato menor não racha o quarteto de guardas');
  assert.equal(flanqueadores.length, 1, 'quinto defensor vira flanqueador');
}));

check('guardas mais eficazes e mais duros de matar que os atacantes', () => withGame(7, (game) => {
  const { guardas, atacantes } = papeis(game);
  const mediaInimiga = atacantes.reduce((soma, bot) => soma + bot.skill, 0) / atacantes.length;
  assert.ok(guardas.every((bot) => bot.skill >= 1.25), 'piso de skill dos guardas');
  assert.ok(Math.min(...guardas.map((bot) => bot.skill)) > mediaInimiga, 'guarda mais fraco ainda supera a média inimiga');
  assert.ok(guardas.every((bot) => bot.armor === 100 && bot.helmet === true), 'kit com colete e capacete');
  assert.ok(atacantes.every((bot) => (bot.armor || 0) === 0), 'atacante continua sem colete grátis');
  assert.ok(guardas.every((bot) => bot.tier === 'bom' || bot.tier === 'muitobom'), 'tier visível espelha o skill real');
}));

check('kit do papel é restaurado a cada renascimento', () => withGame(7, (game) => {
  const { guardas } = papeis(game);
  const guarda = guardas[0];
  guarda.armor = 0; guarda.helmet = false; guarda.weapon = 'knife'; guarda.mag = 0;
  game._kill(guarda, null);
  game.time = guarda.respawnAt;
  game._respawnEntity(guarda);
  assert.equal(guarda.armor, 0, 'respawn genérico zera o colete antes do modo agir');
  game.objective.update(1 / 60);
  assert.equal(guarda.weapon, 'lmg', 'arma do papel volta após o renascimento');
  assert.equal(guarda.mag, WEAPONS.lmg.mag);
  assert.equal(guarda.armor, 100, 'colete do papel é reforçado no renascimento');
  assert.equal(guarda.helmet, true);
}));

check('flanqueador segura a vanguarda com histerese', () => withGame(7, (game) => {
  const { vip, flanqueadores } = papeis(game);
  game.objective.state.checkpoint = 3;
  const roamer = flanqueadores[0];
  roamer.alive = true;
  const destino = { ...game.objective.botDestination(roamer) };
  const rotaLateral = (game.world.escortServiceRoutes || [])[roamer._flavioRota] || [];
  assert.ok(rotaLateral.some((p) => Math.abs(p.x - destino.x) < 1e-9 && Math.abs(p.z - destino.z) < 1e-9),
    'flanqueador usa caminho lateral do mapa');
  const aFrente = game.objective.state.caminho[Math.min(3 + VANGUARDA, game.objective.state.caminho.length - 1)];
  assert.ok(destino.z > aFrente.z - 4.5, 'vanguarda fica adiante do comboio');
  const mesmas = [];
  for (let frame = 0; frame < 30; frame++) mesmas.push({ ...game.objective.botDestination(roamer) });
  assert.equal(new Set(mesmas.map((ponto) => `${ponto.x.toFixed(3)}:${ponto.z.toFixed(3)}`)).size, 1,
    'destino da vanguarda não alterna por quadro');
  game.objective.state.checkpoint = 5;
  const avancou = { ...game.objective.botDestination(roamer) };
  assert.ok(avancou.z > destino.z, 'vanguarda acompanha quando o comboio avança');
  game.objective.state.checkpoint = 4;
  const segurou = game.objective.botDestination(roamer);
  assert.equal(`${segurou.x.toFixed(3)}:${segurou.z.toFixed(3)}`, `${avancou.x.toFixed(3)}:${avancou.z.toFixed(3)}`,
    'vanguarda não recua quando o comboio recua um checkpoint');
  assert.ok(game.objective.botDestination(roamer).leash > 5.5, 'flanqueador tem trela própria de vanguarda');
  vip.alive = true;
}));

check('vanguarda atravessa hangar e pátio junto do comboio', () => withGame(7, (game) => {
  const { vip, flanqueadores } = papeis(game);
  vip.alive = true;
  for (const checkpoint of [8, 10]) {
    game.objective.state.checkpoint = checkpoint;
    const caminho = game.objective.state.caminho;
    const atual = caminho[checkpoint];
    game.objective.state.position.x = atual.x; game.objective.state.position.z = atual.z;
    vip.pos.set(atual.x, vip.pos.y, atual.z);
    const indice = Math.min(checkpoint + VANGUARDA, caminho.length - 1);
    const ponto = caminho[indice];
    for (const roamer of flanqueadores) {
      roamer.alive = true;
      const destino = game.objective.botDestination(roamer);
      const lateral = Math.hypot(destino.x - ponto.x, destino.z - ponto.z);
      assert.ok(destino.z >= ponto.z - 3.5, `checkpoint ${checkpoint}: vanguarda não fica atrás do comboio`);
      assert.ok(lateral <= 3.5 + 1e-9, `checkpoint ${checkpoint}: vanguarda permanece lateral (${lateral.toFixed(2)} m)`);
      assert.equal(Math.sign(destino.x - ponto.x), roamer._flavioLado, `checkpoint ${checkpoint}: flanqueador mantém o lado autorado`);
    }
  }
}));

check('bots vivos nunca têm a visibilidade alternada pelo modo', () => withGame(7, (game) => {
  game._losClear = () => false;   // sem combate: isola o estado do modo
  const visiveis = [];
  for (let frame = 0; frame < 120; frame++) {
    game.time += 1 / 60;
    game.objective.update(1 / 60);
    for (const bot of game.bots) {
      game._updateBot(bot, 1 / 60);
      if (bot.alive) visiveis.push(bot);
    }
  }
  assert.equal(visiveis.length, game.bots.length * 120, 'ninguém morreu sem LOS');
  assert.ok(visiveis.every((bot) => bot.mesh.group.visible === true), 'grupo visível em todos os quadros de vida');
}));

check('corpo morto do VIP some uma única vez e não volta', () => withGame(7, (game) => {
  const vip = game.objective.vip;
  vip.alive = false; vip.deadT = 0;
  const grupo = vip.mesh.group;
  const estados = [];
  for (let frame = 0; frame < 240; frame++) estados.push(game.objective.updateBot(vip, 1 / 60) && grupo.visible);
  const escondeuEm = estados.indexOf(false);
  assert.ok(escondeuEm > 55 && escondeuEm < 65, `fade acontece perto de 1 s (frame ${escondeuEm})`);
  assert.ok(estados.slice(escondeuEm).every((visivel) => visivel === false), 'depois de esconder nunca reexibe');
  game.objective.prepareRound();
  assert.equal(grupo.visible, true, 'rodada nova reexibe o VIP vivo');
}));

check('VIP foca uma ameaça sem girar entre equidistantes', () => withGame(7, (game) => {
  const { vip, atacantes } = papeis(game);
  game._losClear = () => false;
  // VIP ancorado num checkpoint: o estado de cobertura não move o corpo e o teste isola
  // só a troca de foco entre as duas ameaças equidistantes.
  game.objective.state.checkpoint = 6;
  const ancora = game.objective.state.caminho[6];
  game.objective.state.position.x = ancora.x; game.objective.state.position.z = ancora.z;
  vip.pos.set(ancora.x, 0, ancora.z);
  const esquerda = atacantes[0], direita = atacantes[1];
  esquerda.pos.set(ancora.x - 6, 0, ancora.z + 9.035); direita.pos.set(ancora.x + 6, 0, ancora.z + 9.035);
  const yaws = [];
  game._losClear = () => true;    // fase VISTA: o VIP adquire o foco com histerese real
  for (let frame = 0; frame < 30; frame++) {
    esquerda.pos.z = ancora.z + 9.035 + (frame % 2 === 0 ? -0.03 : 0.03);
    direita.pos.z = ancora.z + 9.035 + (frame % 2 === 0 ? 0.03 : -0.03);
    game.objective.update(1 / 60);
    yaws.push(vip.yaw);
  }
  game._losClear = () => false;   // fase OCULTA: vale o snapshot da última posição vista
  for (let frame = 0; frame < 24; frame++) {
    // cada quadro uma delas é "mais próxima" por 6 cm — sem histerese o VIP gira ±0,58 rad
    esquerda.pos.z = ancora.z + 9.035 + (frame % 2 === 0 ? -0.03 : 0.03);
    direita.pos.z = ancora.z + 9.035 + (frame % 2 === 0 ? 0.03 : -0.03);
    game.objective.state.threatLostFor = 0;   // mantém a memória de ameaça com LOS fechada
    game.objective.update(1 / 60);
    yaws.push(vip.yaw);
  }
  const amplitude = Math.max(...yaws) - Math.min(...yaws);
  assert.ok(amplitude < 0.15, `rumo do VIP estável (amplitude ${amplitude.toFixed(3)} rad), sem alternar ~±0,58 rad por quadro`);
}));

check('sem wallhack: guarda sem LOS não adquire alvo', () => withGame(7, (game) => {
  const { guardas, atacantes } = papeis(game);
  const guarda = guardas[0];
  guarda.pos.set(0, 0, 0); guarda.think = 0; guarda.target = null;
  atacantes[0].pos.set(2, 0, 3);
  game._losClear = () => false;
  for (let frame = 0; frame < 90; frame++) {
    game.time += 1 / 60;
    game._updateBot(guarda, 1 / 60);
    assert.equal(guarda.target, null, 'sem LOS não há aquisição por telepatia');
  }
  game._losClear = () => true; guarda.think = 0;
  let adquiriu = false;
  for (let frame = 0; frame < 90 && !adquiriu; frame++) {
    game.time += 1 / 60;
    game._updateBot(guarda, 1 / 60);
    adquiriu ||= guarda.target === atacantes[0];
  }
  assert.ok(adquiriu, 'LOS aberta volta a permitir a aquisição normal');
}));

// Playtest 06/11 ("não só o meio"): cada rodada escolhe uma variante de world.escortPaths
// pelo roundNum e o VIP anda por ELA; nenhuma rodada repete a anterior.
check('rota do VIP varia por rodada e conduz Flávio pela variante', () => withGame(7, (game) => {
  const { vip } = papeis(game);
  const rotas = game.world.escortPaths;
  assert.ok(Array.isArray(rotas) && rotas.length >= 3, 'mapa exporta três variantes');
  const escolhidas = [];
  game._losClear = () => false;   // isola a marcha: sem ameaça vista
  for (let rodada = 1; rodada <= 6; rodada++) {
    game.roundNum = rodada; game.state = 'live';
    game.objective.prepareRound();
    const rota = game.objective._rota;
    escolhidas.push(rota);
    const caminho = game.objective.state.caminho;
    assert.deepEqual(caminho, rotas[rota], `rodada ${rodada}: estado usa a variante ${rota}`);
    if (rodada > 3) continue;
    // Ponto de divergência: o próximo checkpoint é exclusivo desta variante.
    const k = caminho.findIndex((_, i) => i + 1 < caminho.length && rotas.every((outra, j) => j === rota
      || !outra[i + 1] || Math.hypot(outra[i + 1].x - caminho[i + 1].x, outra[i + 1].z - caminho[i + 1].z) > 2));
    assert.ok(k >= 0, `rodada ${rodada}: variante diverge das outras`);
    const estado = game.objective.state;
    estado.checkpoint = k; estado.position.x = caminho[k].x; estado.position.z = caminho[k].z;
    vip.pos.set(caminho[k].x, 0, caminho[k].z);
    const guardas = game.bots.filter((bot) => bot.team === 'B' && bot !== vip).slice(0, 2);
    const alvo = caminho[k + 1], antes = Math.hypot(alvo.x - vip.pos.x, alvo.z - vip.pos.z);
    for (let frame = 0; frame < 90; frame++) {
      for (const guarda of guardas) { guarda.alive = true; guarda.pos.set(vip.pos.x, 0, vip.pos.z); }
      game.time += 1 / 60;
      game.objective.update(1 / 60);
    }
    const depois = Math.hypot(alvo.x - vip.pos.x, alvo.z - vip.pos.z);
    assert.ok(antes - depois >= 1.5 || estado.checkpoint > k, `rodada ${rodada}: VIP andou ${(antes - depois).toFixed(2)} m rumo ao checkpoint da variante`);
  }
  assert.equal(new Set(escolhidas.slice(0, 3)).size, 3, `três rodadas cobrem as três variantes (${escolhidas})`);
  assert.ok(escolhidas.every((rota, i) => i === 0 || rota !== escolhidas[i - 1]), `rodadas seguidas não repetem a rota (${escolhidas})`);
  assert.equal(escolhidas[0], 0, 'primeira rodada abre pelo meio');
}));

// Playtest 06/11 ("não consegue embarcar"): em cada variante o VIP bot sai do penúltimo
// checkpoint pelo moverVip real, chega ao pé da escada e completa o embarque.
check('VIP bot chega ao pé da escada e embarca em toda variante', () => withGame(7, (game) => {
  const { vip, guardas, atacantes } = papeis(game);
  game._losClear = () => false;
  for (let rodada = 1; rodada <= 3; rodada++) {
    game.roundNum = rodada; game.state = 'live';
    game.objective.prepareRound();
    const estado = game.objective.state, caminho = estado.caminho, k = caminho.length - 2, fim = caminho.at(-1);
    estado.checkpoint = k; estado.position.x = caminho[k].x; estado.position.z = caminho[k].z;
    vip.pos.set(caminho[k].x, 0, caminho[k].z);
    for (let frame = 0; frame < 60 * 25 && !estado.winner; frame++) {
      for (const bot of atacantes) { bot.alive = false; bot.pos.set(-40, 0, -55); }
      for (const guarda of guardas) { guarda.alive = true; guarda.pos.set(vip.pos.x, 0, vip.pos.z); }
      game.time += 1 / 60;
      game.objective.update(1 / 60);
    }
    assert.equal(estado.winner, 'B', `rodada ${rodada}: Flávio não embarcou (checkpoint ${estado.checkpoint}/${caminho.length - 1})`);
    const falta = Math.hypot(estado.position.x - fim.x, estado.position.z - fim.z);
    assert.ok(falta < 0.75, `rodada ${rodada}: embarcou a ${falta.toFixed(2)} m do pé da escada`);
  }
}));

// "Enganar o inimigo": flanqueadores são iscas em rotas de serviço fora da lane do VIP —
// o primeiro pelo lado oposto da variante — e trocam de lane a cada vida.
check('flanqueadores viram iscas em ≥3 rotas, primeiro do lado oposto', () => withGame(7, (game) => {
  const usadas = new Set();
  for (let rodada = 1; rodada <= 3; rodada++) {
    game.roundNum = rodada; game.state = 'live';
    game.objective.prepareRound();
    const { flanqueadores } = papeis(game);
    assert.ok(flanqueadores.length >= 2, '7x7 tem dois flanqueadores');
    for (const bot of flanqueadores) {
      assert.ok(Number.isInteger(bot._flavioRota) && bot._flavioRota !== 1, `rodada ${rodada}: isca fora da rota central`);
      usadas.add(bot._flavioRota);
    }
    const caminho = game.objective.state.caminho;
    const patio = caminho.filter((p) => p.z >= -16 && p.z <= 23);
    const lado = Math.sign(patio.reduce((soma, p) => soma + p.x, 0) / patio.length);
    if (Math.abs(patio.reduce((soma, p) => soma + p.x, 0) / patio.length) > 6) {
      assert.equal(flanqueadores[0]._flavioLado, -lado, `rodada ${rodada}: 1ª isca vai pelo lado oposto ao VIP`);
    }
  }
  assert.ok(usadas.size >= 3, `iscas usam ${usadas.size} rotas (${[...usadas]})`);
  const { flanqueadores } = papeis(game);
  const isca = flanqueadores[0], antes = isca._flavioRota;
  isca.alive = true; isca.protUntil = game.time + 2;   // nova vida (respawn marca protUntil)
  game.objective._manterPapeis();
  assert.notEqual(isca._flavioRota, antes, 'nova vida troca a lane da isca');
}));

// Simulação bot×bot (06/11): morto o VIP, botDestination vira null; guarda com hold de
// formação ativo lia objectiveDestination.repath e derrubava o _updateBot do servidor.
check('guarda em hold de formação não quebra quando o VIP morre', () => withGame(7, (game) => {
  const { vip, guardas, atacantes } = papeis(game);
  const guarda = guardas[0], alvo = atacantes[0];
  // Guarda em combate (ramo com alvo) e com hold vivo: é onde o puxão relê o destino.
  game._losClear = () => true;
  alvo.alive = true; alvo.pos.set(guarda.pos.x + 6, 0, guarda.pos.z + 6);
  guarda.alive = true; guarda.target = alvo; guarda.think = 99; guarda.path = null;
  guarda.repathAt = 0; guarda._repathMin = 0; guarda._regroupEscapePending = false;
  guarda._formacaoHoldAte = game.time + 5;
  vip.alive = false;
  assert.equal(game.objective.botDestination(guarda), null, 'pré-condição: VIP morto não dá destino');
  for (let frame = 0; frame < 30; frame++) {
    game.time += 1 / 60;
    assert.doesNotThrow(() => game._updateBot(guarda, 1 / 60), `quadro ${frame}`);
  }
}));

console.log(JSON.stringify({ tool: 'operacao-flavio-roles-check', mutant, cases, failed: cases.filter((test) => !test.pass) }));
process.exitCode = failures ? 1 : 0;
