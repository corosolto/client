// Réguas do comportamento de ABRIGO REAL do modo Operação Flávio (gauntlet de cover,
// coordenado com o lane do mapa — contrato world.escortCoverPoints {x, z, role, zone}):
//   - VIP ameaçado ou sem escolta busca slot de cobertura exportado (não o checkpoint
//     cru), agacha/segura atrás do objeto e só retoma quando a escolta recupera;
//   - abrigo com histerese (ameaça oscilando não re-escolhe por quadro) e nunca colado
//     na ameaça;
//   - guardas engajados fazem snap para cobertura role 'guard' da zona de conflito, sem
//     duplicar ponto; flanqueador pressiona a lane e converge no conflito;
//   - fairness: atacante sem LOS não vê o VIP atrás da cobertura (sem wallhack, sem
//     invisibilidade — a LOS continua sendo a única porta de aquisição).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, PCHAR, CHARACTERS, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const mutations = {
  'abrigo-checkpoint': {
    before: 'const abrigo = contexto.abrigo || state.caminho[state.checkpoint];',
    after: 'const abrigo = state.caminho[state.checkpoint];',
    clause: 'VIP ameaçado busca cobertura real, agacha e segura',
  },
  'abrigo-troca-quadro': {
    before: 'if (melhor <= qAtual + ABRIGO_TROCA || (!morou && !emergencia)) return atual;',
    after: 'if (melhor <= qAtual) return atual;',
    clause: 'abrigo é pegajoso sob ameaça oscilando',
  },
  'abrigo-ve-parede': {
    before: 'if (distancia < menorDistancia && this._vipTemLos(ent)) { maisPerto = ent; menorDistancia = distancia; }',
    after: 'if (distancia < menorDistancia) { maisPerto = ent; menorDistancia = distancia; }',
    clause: 'abrigo reage só a ameaça VISTA: ameaça oculta não reposiciona o VIP',
  },
  'formacao-ve-parede': {
    before: 'if (this._vipTemLos(ent)) { ent._flavioVistoEm = agora; visiveis.push(ent); continue; }',
    after: 'if (true) { ent._flavioVistoEm = agora; visiveis.push(ent); continue; }',
    clause: 'formação e cobertura só reagem a ameaça VISTA',
  },
  'abrigo-cola-ameaca': {
    before: 'return dAmeaca - ABRIGO_PESO_ANCORA * dAncora;',
    after: 'return -ABRIGO_PESO_ANCORA * dAncora;',
    clause: 'abrigo nunca fica mais perto da ameaça que o checkpoint',
  },
  'sem-cobertura-guarda': {
    before: 'const cobertura = coberturaGuarda(bot, vip, defensores, coberturas, destino, contato.ameaca);',
    after: 'const cobertura = null && coberturaGuarda(bot, vip, defensores, coberturas, destino, contato.ameaca);',
    clause: 'guarda engajado ocupa cobertura real da zona de conflito',
  },
  'flanqueador-para-no-vanguarda': {
    before: "if (bot._flavioPapel === 'flanqueador' && !orientacaoFormacao(this.vip, ameacas)?.engajado) {",
    after: "if (bot._flavioPapel === 'flanqueador' && false) {",
    clause: 'flanqueador pressiona a lane e converge no conflito',
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
if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const { before, after } = mutations[mutant];
  assert.equal(modeSource.split(before).length - 1, 1, 'alvo do mutante único');
  modeSource = modeSource.replace(before, after);
  console.log('Mutação aplicada: ' + mutant);
}
modeSource = modeSource.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
  'from ' + JSON.stringify(new URL(spec, modeUrl).href));
const { OperacaoFlavio } = await import('data:text/javascript;base64,' + Buffer.from(modeSource).toString('base64'));

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
    settings: { bots: 7, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'COVER-UNIT',
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
// Ancora o comboio no checkpoint 2 (embarque, duas coberturas reais a ~6,8 m) e solta uma
// ameaça a 12 m a OESTE: a cobertura certa fica a Leste, longe da ameaça.
function cenarioAmeaca(game, { ameacaPos = { x: -26, z: -40 } } = {}) {
  const { vip, atacantes } = papeis(game);
  const path = game.world.escortPath;
  game.objective.state.checkpoint = 2;
  game.objective.state.position.x = path[2].x; game.objective.state.position.z = path[2].z;
  vip.pos.set(path[2].x, 0, path[2].z);
  const atacante = atacantes[0];
  atacante.pos.set(ameacaPos.x, 0, ameacaPos.z);
  atacante.alive = true;
  game.bots = [vip, atacante]; game.combatants = [...game.bots];
  game._losClear = () => true;
  return { vip, atacante, checkpoint: { ...path[2] }, coberturas: game.world.escortCoverPoints };
}
const maisPerto = (ponto, coberturas) => coberturas.reduce((melhor, c) =>
  Math.hypot(c.x - ponto.x, c.z - ponto.z) < Math.hypot(melhor.x - ponto.x, melhor.z - ponto.z) ? c : melhor);

check('VIP ameaçado busca cobertura real, agacha e segura', () => withGame((game) => {
  const { vip, atacante, checkpoint, coberturas } = cenarioAmeaca(game);
  for (let frame = 0; frame < 240; frame++) game.objective.update(1 / 60);
  game.objective.updateBot(vip, 1 / 60);   // postura vem do updateBot (canal do corpo)
  const pos = game.objective.state.position;
  const abrigo = maisPerto(pos, coberturas);
  assert.ok(Math.hypot(abrigo.x - pos.x, abrigo.z - pos.z) <= 0.75,
    `convergiu a ${Math.hypot(abrigo.x - pos.x, abrigo.z - pos.z).toFixed(2)} m de cobertura real`);
  assert.ok(Math.hypot(pos.x - checkpoint.x, pos.z - checkpoint.z) > 0.75, 'não parou no checkpoint cru');
  assert.ok(game.objective.state.inCover, 'marcado em cobertura');
  assert.equal(vip.crouchBias, true, 'agachado atrás do objeto');
  assert.equal(game.objective.state.checkpoint, 2, 'não avança sob ameaça');
  assert.ok(atacante.alive, 'ameaça intacta (fairness: o abrigo não remove ninguém)');
}));

check('abrigo nunca fica mais perto da ameaça que o checkpoint', () => withGame((game) => {
  const { atacante, checkpoint, coberturas } = cenarioAmeaca(game);
  for (let frame = 0; frame < 240; frame++) game.objective.update(1 / 60);
  const pos = game.objective.state.position;
  const abrigo = maisPerto(pos, coberturas);
  const daAmeaca = Math.hypot(abrigo.x - atacante.pos.x, abrigo.z - atacante.pos.z);
  assert.ok(daAmeaca > Math.hypot(checkpoint.x - atacante.pos.x, checkpoint.z - atacante.pos.z) - 0.5,
    `abrigo a ${daAmeaca.toFixed(2)} m da ameaça não pode ser pior que o checkpoint`);
}));

check('abrigo é pegajoso sob ameaça oscilando', () => withGame((game) => {
  // Duas coberturas isoladas (map-agnóstico): a ameaça oscila 0,8 m cruzando a
  // mediação delas e o ARGMAX alterna a cada quadro — a histerese (margem + moradia
  // mínima) é o único freio. O corpo fica PARADO atrás da cobertura escolhida.
  game.world.escortCoverPoints = [
    { x: -7.2, z: -40, role: 'guard', zone: 'embarque' },
    { x: -20.5, z: -40.5, role: 'guard', zone: 'embarque' },
  ];
  const { vip, atacante, coberturas } = cenarioAmeaca(game, { ameacaPos: { x: -13.85, z: -41 } });
  const escolhas = new Set();
  const amostras = [];
  for (let frame = 0; frame < 240; frame++) {
    atacante.pos.set(-13.85 + (frame % 2 === 0 ? 0.4 : -0.4), 0, -41);
    game.objective.update(1 / 60);
  }
  for (let frame = 0; frame < 40; frame++) {
    atacante.pos.set(-13.85 + (frame % 2 === 0 ? 0.4 : -0.4), 0, -41);
    game.objective.update(1 / 60);
    amostras.push({ ...game.objective.state.position });
    escolhas.add(`${game.objective._vipAbrigo?.x}:${game.objective._vipAbrigo?.z}`);
  }
  const abrigos = new Set(amostras.map((pos) => maisPerto(pos, coberturas)));
  const espalhamento = Math.max(...amostras.map((p) => p.x)) - Math.min(...amostras.map((p) => p.x))
    + Math.max(...amostras.map((p) => p.z)) - Math.min(...amostras.map((p) => p.z));
  assert.equal(escolhas.size, 1, 'a ESCOLHA de abrigo não alterna por quadro');
  assert.equal(abrigos.size, 1, 'ameaça oscilando não re-escolhe abrigo por quadro');
  assert.ok(espalhamento < 0.3, `corpo parado atrás da cobertura (espalhamento ${espalhamento.toFixed(2)} m)`);
}));

check('ameaça colada no abrigo força troca por cobertura mais segura', () => withGame((game) => {
  const { atacante } = cenarioAmeaca(game, { ameacaPos: { x: -13.85, z: -41 } });
  for (let frame = 0; frame < 240; frame++) game.objective.update(1 / 60);
  const abrigado = { ...game.objective._vipAbrigo };
  assert.ok(abrigado.x !== undefined, 'pré-condição: VIP está abrigado');
  atacante.pos.set(abrigado.x + 0.5, 0, abrigado.z);   // cola a ameaça no abrigo atual
  game.objective.update(1 / 60);
  const trocou = game.objective._vipAbrigo;
  assert.ok(Math.hypot(trocou.x - abrigado.x, trocou.z - abrigado.z) > 0.01, 'colada troca de abrigo imediatamente');
  assert.ok(Math.hypot(trocou.x - atacante.pos.x, trocou.z - atacante.pos.z) >= 4,
    'novo abrigo não é outro ponto grudado na ameaça');
}));

check('abrigo reage só a ameaça VISTA: ameaça oculta não reposiciona o VIP', () => withGame((game) => {
  game.world.escortCoverPoints = [
    { x: -7.2, z: -40, role: 'guard', zone: 'embarque' },
    { x: -20.5, z: -40.5, role: 'guard', zone: 'embarque' },
  ];
  const { vip, atacante } = cenarioAmeaca(game, { ameacaPos: { x: -26, z: -40 } });
  game._losClear = () => false;   // ameaça existe, mas SEMPRE atrás da parede
  const x0 = vip.pos.x;
  for (let frame = 0; frame < 150; frame++) game.objective.update(1 / 60);
  const x1 = game.objective.state.position.x;
  assert.ok(x1 < x0 - 3, `sem LOS a ameaça oculta não empurra o VIP: x ${x0.toFixed(1)} → ${x1.toFixed(1)}`);
  game._losClear = () => true;    // ameaça vira VISTA: agora sim o abrigo foge dela
  for (let frame = 0; frame < 150; frame++) game.objective.update(1 / 60);
  const x2 = game.objective.state.position.x;
  assert.ok(x2 > x1 + 3, `ameaça visível move o abrigo para longe: x ${x1.toFixed(1)} → ${x2.toFixed(1)}`);
}));

check('VIP retoma a rota somente quando a escolta recupera', () => withGame((game) => {
  const defensor = game.bots.find((bot) => bot !== game.objective.vip && bot.team === 'B');
  const { vip, atacante } = cenarioAmeaca(game);
  for (let frame = 0; frame < 240; frame++) game.objective.update(1 / 60);
  const abrigado = game.objective.state.position.z;
  atacante.alive = false;   // ameaça elimina; escolta ainda não voltou
  defensor.pos.set(vip.pos.x + 1, 0, vip.pos.z); defensor.alive = true;
  game.bots = [vip, atacante, defensor]; game.combatants = [...game.bots];
  let avancou = false;
  for (let frame = 0; frame < 600 && !avancou; frame++) {
    game.objective.update(1 / 60);
    avancou ||= game.objective.state.checkpoint > 2 || game.objective.state.position.z > abrigado + 1;
  }
  assert.ok(avancou, 'retoma o avanço com escolta presente e ameaça extinta');
}));

check('formação e cobertura só reagem a ameaça VISTA', () => withGame((game) => {
  const { vip, guardas, flanqueadores, atacantes } = papeis(game);
  const coberturas = game.world.escortCoverPoints;
  game.objective.state.checkpoint = 8;
  vip.pos.set(-12, 0, 4.5); game.objective.state.position.x = -12; game.objective.state.position.z = 4.5;
  const roamer = flanqueadores[0], guarda = guardas[0];
  const ameaca = atacantes[0];
  ameaca.pos.set(-12, 0, 2.5);   // 2 m do VIP, mas SEM linha de visão
  game.bots = [vip, ameaca, roamer, guarda]; game.combatants = [...game.bots];
  game._losClear = () => false;
  const vanguarda = { ...game.objective.destinoFlanqueador(roamer, {}) };
  const rotaOculta = { ...game.objective.botDestination(roamer) };
  assert.ok(Math.hypot(rotaOculta.x - vanguarda.x, rotaOculta.z - vanguarda.z) < 0.01,
    'ameaça oculta não puxa o flanqueador da vanguarda');
  const slotOculto = { ...game.objective.botDestination(guarda) };
  assert.ok(!coberturas.some((c) => c.x === slotOculto.x && c.z === slotOculto.z),
    'ameaça oculta não reserva cobertura de guarda');
  game._losClear = () => true;   // ameaça vira VISTA: formação engaja de verdade
  const rotaVisivel = { ...game.objective.botDestination(roamer) };
  assert.ok(Math.hypot(rotaVisivel.x - vip.pos.x, rotaVisivel.z - vip.pos.z) < 9,
    'ameaça visível converge o flanqueador para o conflito');
}));

check('sem escolta, VIP espera atrás de cobertura em vez de exposto', () => withGame((game) => {
  const cena = cenarioAmeaca(game);
  cena.atacante.alive = false;   // sem ameaça: isola o estado de "sem escolta"
  const { vip, atacante: fora, checkpoint, coberturas } = cena;
  game.bots = [vip, fora]; game.combatants = [...game.bots];
  game._losClear = () => true;
  const abrigoInicial = maisPerto(vip.pos, coberturas);
  const inicial = Math.hypot(abrigoInicial.x - vip.pos.x, abrigoInicial.z - vip.pos.z);
  for (let frame = 0; frame < 180; frame++) game.objective.update(1 / 60);   // 3 s < RETURN_DELAY
  const pos = game.objective.state.position;
  const abrigo = maisPerto(pos, coberturas);
  game.objective.updateBot(vip, 1 / 60);   // postura vem do updateBot (canal do corpo)
  assert.ok(Math.hypot(abrigo.x - pos.x, abrigo.z - pos.z) < inicial - 0.5,
    'andou na direção de cobertura real enquanto esperava');
  assert.ok(Math.hypot(pos.x - checkpoint.x, pos.z - checkpoint.z) > 0.5, 'não ficou parado no ponto aberto');
  assert.equal(vip.crouchBias, true, 'agacha enquanto espera sem escolta');
  assert.equal(game.objective.state.checkpoint, 2, 'ainda não recuou de checkpoint');
  for (let frame = 0; frame < 400; frame++) game.objective.update(1 / 60);   // passa do RETURN_DELAY
  assert.ok(game.objective.state.checkpoint < 2, 'retorno ao checkpoint anterior segue operante');
}));

check('guarda engajado ocupa cobertura real da zona de conflito', () => withGame((game) => {
  const { vip, guardas, atacantes } = papeis(game);
  const coberturas = game.world.escortCoverPoints;
  game._losClear = () => true;
  vip.pos.set(-12, 0, 4.5); game.objective.state.position.x = -12; game.objective.state.position.z = 4.5;
  const ameaca = atacantes[0];
  ameaca.pos.set(-12, 0, -2);   // 6,5 m: engaje com contatos do cluster de serviço por perto
  game.bots = [vip, ameaca, ...guardas.slice(0, 4)]; game.combatants = [...game.bots];
  const destinos = guardas.slice(0, 4).map((guarda) => ({ ...game.objective.botDestination(guarda) }));
  const emCobertura = destinos.filter((destino) => coberturas.some((c) => c.x === destino.x && c.z === destino.z && c.role === 'guard'));
  assert.ok(emCobertura.length >= 2, `${emCobertura.length} guardas em ponto role 'guard' exato`);
  const chaves = emCobertura.map((destino) => `${destino.x}:${destino.z}`);
  assert.equal(new Set(chaves).size, chaves.length, 'guardas não dividem a mesma cobertura');
  for (const destino of destinos) {
    assert.ok(Math.hypot(destino.x - vip.pos.x, destino.z - vip.pos.z) <= 9, 'cobertura do conflito continua perto do VIP');
  }
  ameaca.pos.set(-12, 0, -30);   // fora do raio ampliado: desengaja e o snap some
  game.objective.update(1 / 60);
  const desengajado = { ...game.objective.botDestination(guardas[0]) };
  assert.ok(!coberturas.some((c) => c.x === desengajado.x && c.z === desengajado.z),
    'sem engaje o destino volta ao slot legado');
}));

check('flanqueador pressiona a lane e converge no conflito', () => withGame((game) => {
  const { vip, flanqueadores, atacantes } = papeis(game);
  game._losClear = () => true;
  game.objective.state.checkpoint = 8;
  const roamer = flanqueadores[0];
  const ameaca = atacantes[0];
  vip.pos.set(-12, 0, 4.5); game.objective.state.position.x = -12; game.objective.state.position.z = 4.5;
  ameaca.pos.set(-12, 0, -2);
  game.bots = [vip, ameaca, roamer]; game.combatants = [...game.bots];
  const vanguarda = game.objective.destinoFlanqueador(roamer, {});
  const convergiu = { ...game.objective.botDestination(roamer) };
  assert.ok(Math.hypot(convergiu.x - vip.pos.x, convergiu.z - vip.pos.z) < 9,
    'converge para a zona de conflito');
  assert.ok(Math.hypot(convergiu.x - vanguarda.x, convergiu.z - vanguarda.z) > 9, 'sai da vanguarda para pressionar');
  const fases = new Set();
  for (let frame = 0; frame < 12; frame++) {
    ameaca.pos.z = frame % 2 === 0 ? -2.1 : -1.9;   // oscila na borda: Schmitt segura o estado
    fases.add(Math.hypot(game.objective.botDestination(roamer).x - vip.pos.x, game.objective.botDestination(roamer).z - vip.pos.z) < 9 ? 'conflito' : 'vanguarda');
  }
  assert.deepEqual([...fases], ['conflito'], 'histerese: não alterna vanguarda/conflito por quadro');
  ameaca.pos.set(-12, 0, -40);
  game.objective.update(1 / 60);
  const voltou = game.objective.botDestination(roamer);
  assert.ok(Math.hypot(voltou.x - vanguarda.x, voltou.z - vanguarda.z) < 0.01,
    'desengajado, volta a pressionar a lane da vanguarda');
}));

check('fairness: atacante sem LOS não vê o VIP abrigado', () => withGame((game) => {
  const { vip, atacante } = cenarioAmeaca(game);
  for (let frame = 0; frame < 240; frame++) game.objective.update(1 / 60);   // abriga
  atacante.pos.set(vip.pos.x + 2, 0, vip.pos.z + 2);   // colado, mas sem linha de visão
  atacante.target = null; atacante.think = 0;
  game._losClear = () => false;
  for (let frame = 0; frame < 90; frame++) {
    game.time += 1 / 60;
    game._updateBot(atacante, 1 / 60);
    assert.equal(atacante.target, null, 'cobertura real não vira wallhack: sem LOS não há alvo');
  }
  game._losClear = () => true; atacante.think = 0;
  let adquiriu = false;
  for (let frame = 0; frame < 90 && !adquiriu; frame++) {
    game.time += 1 / 60;
    game._updateBot(atacante, 1 / 60);
    adquiriu ||= atacante.target === vip;
  }
  assert.ok(adquiriu, 'LOS aberta volta a permitir a aquisição normal');
}));

console.log(JSON.stringify({ tool: 'operacao-flavio-cover-behavior-check', mutant, cases, failed: cases.filter((test) => !test.pass) }));
process.exitCode = failures ? 1 : 0;
