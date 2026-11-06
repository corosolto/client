import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mutations = {
  'cliente-autoridade': ['_autoridadeEscolta() { return !this.game.online || (this.game.dedicated && !this._espectadorEscolta()); }', '_autoridadeEscolta() { return !this.game.online; }', 'servidor online simula escolta até vitória B'],
  'vip-bot-remoto': ['if (bot !== this.vip || this._clienteEscolta()) return false;', 'if (bot !== this.vip || this.game.online) return false;', 'servidor online simula escolta até vitória B'],
  'snapshot-no-servidor': ['if (!this._clienteEscolta()) return;\n    this._sincronizarRota();', 'if (false) return;\n    this._sincronizarRota();', 'servidor ignora snapshot recebido'],
  'respawn-cliente-local': ['if (this._clienteEscolta()) return undefined;', 'if (this._clienteEscolta()) return now + 2.2;', 'cliente não calcula onda local'],
  'hud-anuncia-escolta': ['${total} · ${Math.max(0, Math.ceil(this.game.timeLeft))}s`;', '${total} · ${this.state.escortCount} ESCOLTANDO · ${Math.max(0, Math.ceil(this.game.timeLeft))}s`;', 'HUD não entrega a tática da escolta'],
  'slots-mortes': ['if (!bot?.pos || !vip?.pos || bot.alive === false || bot === vip) return null;', 'if (!bot?.pos || !vip?.pos || bot === vip) return null;\n  if (bot.alive === false) { formacoesEscolta.get(vip)?.delete(bot); return null; }', 'slot permanece com a entidade após morte'],
  'slots-distantes-iguais': ['const ordem = temporarios.indexOf(bot);', 'const ordem = 0;', 'múltiplos bots distantes ocupam slots temporários distintos'],
  'orientacao-so-engaje': [': referencia ? Math.atan2(referencia', ': null ? Math.atan2(referencia', 'formação orienta para ameaça fora do raio de engaje'],
  'contato-rotaciona': ['const yaw = contato ? contato.yaw', 'const yaw = referencia && contato\n    ? Math.atan2(referencia.ameaca.pos.x - vip.pos.x, referencia.ameaca.pos.z - vip.pos.z)', 'contato próximo mantém slot legado estável'],
  'interceptacao-ultrapassa': ['const avanco = Math.min(GUARDA_AVANCO_MAX, Math.max(0, GUARD_PROTECT_RADIUS - radial), Math.max(0, limite - radial));', 'const avanco = Math.min(GUARDA_AVANCO_MAX, Math.max(0, GUARD_PROTECT_RADIUS - radial));', 'contato próximo mantém slot legado estável'],
  'sem-interceptacao': ['if (contato) {', 'if (false) {', 'raios de engaje e proteção produzem interceptação'],
  'sem-decaimento': [': visiveis.length > 0 || (state.threatened && state.threatLostFor < THREAT_MEMORY)', ': visiveis.length > 0 || (state.threatened && true)', 'ameaça sem LOS decai e escolta retoma'],
  'memoria-longa': ['const THREAT_MEMORY = 0.7;', 'const THREAT_MEMORY = 1.25;', 'ameaça sem LOS decai e escolta retoma'],
  'avanco-curto': ['const GUARDA_AVANCO_MAX = 2;', 'const GUARDA_AVANCO_MAX = 1.2;', 'guarda intercepta até 2 m à frente do slot'],
  'rush-abriga': ['state.exposto = state.threatened && (state.contested || defensores.length < ESCOLTA_RUSH || (state.exposto === true && colado));', 'state.exposto = state.threatened;', 'escolta em número não deixa Flávio parado sob ameaça'],
  'rush-sem-exposicao': ['state.exposto = state.threatened && (state.contested || defensores.length < ESCOLTA_RUSH || (state.exposto === true && colado));', 'state.exposto = state.threatened && (state.contested || (state.exposto === true && colado));', 'escolta em número não deixa Flávio parado sob ameaça'],
  'exposto-sem-histerese': ['state.exposto = state.threatened && (state.contested || defensores.length < ESCOLTA_RUSH || (state.exposto === true && colado));', 'state.exposto = state.threatened && (state.contested || defensores.length < ESCOLTA_RUSH);', 'contestado uma vez, Flávio chega ao abrigo sem vai-e-vem'],
  'trava-por-los': ['const colado = ameacas.some((ent) => d2(ent.pos || ent, state.position) <= EXPOSTO_SAIDA * EXPOSTO_SAIDA);', 'const colado = visiveis.some((ent) => d2(ent.pos || ent, state.position) <= EXPOSTO_SAIDA * EXPOSTO_SAIDA);', 'contestado uma vez, Flávio chega ao abrigo sem vai-e-vem'],
  'embarque-exige-limpo': ['if (state.checkpoint >= ultimo && defensores.length > 0) {', 'if (state.checkpoint >= ultimo && acompanhado && !state.threatened) {', 'embarque progride contestado com escolta'],
  'cliente-sem-rota': ['this._sincronizarRota();\n    aplicarSnapshotEscolta(this.state, net);', 'aplicarSnapshotEscolta(this.state, net);', 'cliente e servidor derivam a mesma rota da rodada replicada'],
  'saida-cortada': ['rota.points = path.map((i) => ({ x: nodes[i].x, z: nodes[i].z, node: i }));', 'rota.points = path.slice(1).map((i) => ({ x: nodes[i].x, z: nodes[i].z, node: i }));', 'plano do VIP passa pelo nó de saída sem travar'],
  'spawn-longe': ['.filter((p) => p.dist <= 18);\n    const base', '.filter((p) => p.dist <= 180);\n    const base', 'spawn filtra colisão rota e distância'],
  'spawn-sem-fallback': ['if (!escolha.length) return semColisao(anchor) && rota(anchor) ? [{ x: anchor.x, z: anchor.z, dist: 0, lateral: 0 }] : null;', 'if (!escolha.length) return null;', 'fallback de spawn usa âncora válida'],
  'sem-histerese-engaje': ['const ENGAGE_SAIDA = 1.25;', 'const ENGAGE_SAIDA = 1.0;', 'histerese de engaje não deixa o docking piscar na borda'],
  'morte-sem-vip': ["const morto = winner === 'E' && (this.vip?.alive === false || this.deathAnnounced);", "const morto = winner === 'E' && (!this.vip?.alive || this.deathAnnounced);", 'VIP ausente tem estado neutro'],
};

if (process.argv.includes('--mutantes')) {
  // A suíte só chama --mutantes: sem a base verde aqui, um contrato vermelho fazia o
  // mutante "morder" de graça (cliente não calcula onda local ficou assim desde 3717e4e16).
  const base = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: 'utf8', timeout: 30000 });
  assert.equal(base.status, 0, `base vermelha:\n${base.stdout}\n${base.stderr}`);
  for (const [name, edit] of Object.entries(mutations)) {
    const clause = edit[2];
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=' + name], { encoding: 'utf8', timeout: 30000 });
    assert.equal(run.status, 1, `${name}: ${run.stdout}\n${run.stderr}`);
    assert.ok(run.stdout.includes('Mutação aplicada: ' + name), name);
    assert.ok(run.stderr.includes(clause), `${name}: cláusula errada\n${run.stderr}`);
    console.log('✓ mutante reprovado: ' + name);
  }
  process.exit(0);
}

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10);
const url = new URL('../../public/js/mode_operacao_flavio.js', import.meta.url);
let source = readFileSync(url, 'utf8');
if (mutant) {
  const edit = mutations[mutant];
  assert.ok(edit, 'mutante conhecido');
  assert.equal(source.split(edit[0]).length - 1, 1, 'alvo do mutante único');
  source = source.replace(edit[0], edit[1]);
}
source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
  'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
if (mutant) console.log('Mutação aplicada: ' + mutant);
const { OperacaoFlavio, criarEstadoEscolta, destinoProtecaoEscolta, passoEscolta, snapshotEscolta, varianteRotaEscolta } =
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

class Pos {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(p) { return this.set(p.x, p.y, p.z); }
}

const body = (team, x = 0, z = 0) => ({ team, pos: new Pos(x, 0, z), alive: true, hp: 100, _meshWeapon: 'knife' });
const nearest = (nodes, x, z) => {
  let best = 0, distance = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2;
    if (d < distance) { best = i; distance = d; }
  }
  return best;
};
const pathfinder = (nodes, adj) => (from, to) => {
  const previous = new Int32Array(nodes.length).fill(-1), queue = [from];
  previous[from] = from;
  for (let q = 0; q < queue.length; q++) for (const next of adj[queue[q]] || []) if (previous[next] < 0) {
    previous[next] = queue[q]; queue.push(next);
  }
  if (previous[to] < 0) return [from];
  const path = [to];
  while (path[0] !== from) path.unshift(previous[path[0]]);
  return path;
};

function fixture({ online = true, dedicated = true, vipPresent = true, path = [{ x: 0, z: 0 }, { x: 0, z: 0.4 }], world = {} } = {}) {
  const vip = vipPresent ? body('B') : null, guard = body(vipPresent ? 'B' : 'E');
  const nodes = world.waypoints?.nodes || path.map((p) => ({ ...p }));
  const adj = world.waypoints?.adj || nodes.map((_, i) => [i - 1, i + 1].filter((n) => n >= 0 && n < nodes.length));
  const winners = [], banners = [];
  const game = {
    online, dedicated, time: 100, timeLeft: 360, state: 'live',
    bots: vip ? [vip, guard] : [guard], combatants: vip ? [vip, guard] : [guard],
    el: {}, world: {
      escortPath: path, colliders: [], spawns: { B: [], E: [] }, groundHeightAt: () => 0,
      waypoints: { nodes, adj }, nearestWaypoint: (x, z) => nearest(nodes, x, z), findPath: pathfinder(nodes, adj),
      ...world,
    },
    _trocarPersonagem() {}, _syncRemoteWeapon() {}, _collide() {},
    _endRound(winner) { winners.push(winner); game.state = 'roundEnd'; },
    _banner(...args) { banners.push(args); },
  };
  const objective = new OperacaoFlavio(game, { id: 'senador', name: 'Flávio' });
  objective.prepareRound();
  return { game, objective, vip, guard, winners, banners };
}

let failures = 0;
const check = (name, run) => {
  try { run(); console.log('✓ ' + name); }
  catch (error) { failures++; console.error('✗ ' + name + ': ' + error.message); }
};

check('servidor online simula escolta até vitória B', () => {
  const { game, objective, vip, winners } = fixture();
  objective.state.threatened = true;
  vip.crouchBias = false;
  assert.equal(objective.updateBot(vip, 0.1), false, 'VIP vivo usa combate genérico no servidor');
  assert.equal(vip.crouchBias, true, 'servidor online prepara a postura de combate do VIP');
  for (let i = 0; i < 60 && !winners.length; i++) objective.update(0.1);
  assert.deepEqual(winners, ['B']);
  assert.equal(objective.state.checkpoint, 1);
  assert.ok(objective.state.boardedFor >= 3);
  assert.equal(game.state, 'roundEnd');
});

check('cliente remoto só espelha snapshot entre atualizações', () => {
  const { objective, vip, game, winners } = fixture({ dedicated: false });
  objective.state.threatened = true;
  vip.crouchBias = false;
  vip.target = null;
  assert.equal(objective.updateBot(vip, 0.1), false, 'cliente deixa corpo para interpolação de rede');
  assert.equal(vip.crouchBias, false, 'cliente não prepara postura da IA autoritativa');
  assert.equal(vip.target, null, 'cliente não adquire alvo para o VIP');
  objective.applyNetState({ position: { x: 2, z: 0.2 }, checkpoint: 0, escortCount: 4, contested: true, threatened: true, inCover: false, unattendedFor: 2, boardedFor: 1, winner: null });
  const before = snapshotEscolta(objective.state);
  vip.pos.set(99, 0, 99);
  game.combatants.push(body('E', 2, 0.2));
  objective.update(1);
  assert.deepEqual(snapshotEscolta(objective.state), before);
  assert.deepEqual(winners, []);
});

check('servidor ignora snapshot recebido', () => {
  const { objective } = fixture({ dedicated: true });
  const before = snapshotEscolta(objective.state);
  objective.applyNetState({ position: { x: 9, z: 9 }, checkpoint: 1, escortCount: 8, contested: true, threatened: true });
  assert.deepEqual(snapshotEscolta(objective.state), before);
});

check('onda de oito segundos é exclusiva do servidor online', () => {
  const { objective, guard, vip } = fixture({ dedicated: true });
  for (const now of [103, 106, 107.9]) assert.equal(objective.respawnAt(guard, now), 108);
  assert.equal(objective.respawnAt(guard, 108), 116);
  assert.equal(objective.respawnAt(vip, 103), Infinity);
});

check('cliente não calcula onda local', () => {
  const { objective, guard } = fixture({ dedicated: false });
  // 3717e4e16: o cliente não inventa onda; devolve undefined e o servidor manda o renascimento.
  assert.equal(objective.respawnAt(guard, 103), undefined);
});

check('HUD não entrega a tática da escolta', () => {
  const { objective } = fixture({ dedicated: false });
  objective.hud = { textContent: '' };
  Object.assign(objective.state, { checkpoint: 4, escortCount: 4, contested: true, threatened: true, inCover: true });
  objective.game.timeLeft = 345.2;
  objective.atualizaHud();
  assert.equal(objective.hud.textContent, `OPERAÇÃO FLÁVIO · 4/${objective.state.caminho.length - 1} · 346s`);
});

check('slot permanece com a entidade após morte', () => {
  const vip = { pos: { x: 0, z: 0 }, yaw: 0, alive: true, team: 'B' };
  const first = body('B'), second = body('B', 1, 0), third = body('B', 2, 0), defenders = [vip, first, second, third];
  const initial = { ...destinoProtecaoEscolta(first, vip, defenders) };
  first.alive = false;
  assert.equal(destinoProtecaoEscolta(first, vip, defenders), null);
  destinoProtecaoEscolta(third, vip, defenders);
  first.alive = true;
  assert.deepEqual({ ...destinoProtecaoEscolta(first, vip, defenders) }, initial);
});

check('bot distante não rouba slot reservado de bot próximo', () => {
  const vip = { pos: { x: 0, z: 0 }, yaw: 0, alive: true, team: 'B' };
  const far = body('B', 50, 0), near = body('B'), other = body('B', 1, 0), defenders = [vip, far, near, other];
  destinoProtecaoEscolta(far, vip, defenders);
  const reserved = { ...destinoProtecaoEscolta(near, vip, defenders) };
  const second = destinoProtecaoEscolta(other, vip, defenders);
  destinoProtecaoEscolta(far, vip, defenders);
  assert.deepEqual({ ...destinoProtecaoEscolta(near, vip, defenders) }, reserved);
  assert.notEqual(`${second.x}:${second.z}`, `${reserved.x}:${reserved.z}`);
});

check('múltiplos bots distantes ocupam slots temporários distintos', () => {
  const vip = { pos: { x: 12, z: -7 }, yaw: Math.PI / 4, alive: true, team: 'B' };
  const guards = [[0, 0], [20, -20], [40, -40]].map(([x, z]) => body('B', x, z));
  const destinations = guards.map((guard) => destinoProtecaoEscolta(guard, vip, guards, [body('E', 12, 3)]));
  const keys = destinations.map((p) => `${p.x.toFixed(3)}:${p.z.toFixed(3)}`);
  assert.equal(new Set(keys).size, 3, keys.join(' | '));
  assert.ok(destinations.every((p) => {
    const distance = Math.hypot(p.x - vip.pos.x, p.z - vip.pos.z);
    return distance >= 2 && distance <= 3.5;
  }));
});

check('formação orienta para ameaça fora do raio de engaje', () => {
  const vip = { pos: { x: 0, z: 28 }, yaw: 0, alive: true, team: 'B' }, guard = body('B', 0, 28);
  const destination = destinoProtecaoEscolta(guard, vip, [vip, guard], [body('E', 0, 3)]);
  assert.ok(Math.abs(destination.z - 25.6) < 1e-9, `slot ficou em z=${destination.z}`);
  assert.ok(Math.abs(destination.x) < 1e-9);
  assert.ok(Math.hypot(destination.x, destination.z - 28) <= destination.protectRadius);
});

check('contato próximo mantém slot legado estável', () => {
  const vip = { pos: { x: 0, z: 28 }, yaw: 0, alive: true, team: 'B' }, guard = body('B', 0, 30.4), enemy = body('E', 0, 53);
  destinoProtecaoEscolta(guard, vip, [vip, guard], [enemy]);
  vip.pos.x = 4; enemy.pos.set(4, 0, 29);
  const first = { ...destinoProtecaoEscolta(guard, vip, [vip, guard], [enemy]) };
  assert.ok(Math.abs(first.z - 30.4) < 1e-9 && first.x === 4, `destino=${first.x}:${first.z}`);
  enemy.pos.set(4.8, 0, 28.4);
  const second = { ...destinoProtecaoEscolta(guard, vip, [vip, guard], [enemy]) };
  assert.deepEqual(second, first, 'separação do inimigo não pode girar o docking');
});

check('histerese de engaje não deixa o docking piscar na borda', () => {
  const vip = { pos: { x: 0, z: 0 }, yaw: 0, alive: true, team: 'B' }, guard = body('B');
  const borda = body('E', 0, 7.4), fora = body('E', 0, 7.6);
  const ameacas = [borda, fora];
  destinoProtecaoEscolta(guard, vip, [vip, guard], ameacas);   // engata na borda (7.4 < 7.5)
  const engajado = { ...destinoProtecaoEscolta(guard, vip, [vip, guard], ameacas) };
  // Ameaça oscila na fronteira do raio: contato só solta além de 1,25x — sem flap.
  const oscilando = [];
  for (let frame = 0; frame < 12; frame++) {
    borda.pos.set(0, 0, frame % 2 === 0 ? 7.6 : 7.4);
    oscilando.push({ ...destinoProtecaoEscolta(guard, vip, [vip, guard], ameacas) });
  }
  assert.ok(oscilando.every((destino) => destino.z > 2.4), 'contato segurou o avanço na oscilação da borda');
  assert.equal(new Set(oscilando.map((destino) => `${destino.x.toFixed(3)}:${destino.z.toFixed(3)}`)).size, 1,
    'destino só acompanha a ameaça, nunca alterna engaje/desengaje por quadro');
  assert.ok(engajado.z > 2.4, 'engaje inicial avança o guarda');
  borda.pos.set(0, 0, 9.5);   // além de 1,25x (9,375): aqui sim solta
  const soltou = destinoProtecaoEscolta(guard, vip, [vip, guard], ameacas);
  assert.ok(soltou.z < engajado.z, 'contato solta apenas fora do raio ampliado');
  // Duas ameaças quase equidistantes trocando de "mais próxima" não giram o docking.
  const esquerda = body('E', -6, 3), direita = body('E', 6, 3);
  const alternando = [];
  for (let frame = 0; frame < 8; frame++) {
    (frame % 2 === 0 ? esquerda : direita).pos.set((frame % 2 === 0 ? -6 : 6) * 0.999, 0, 3);
    alternando.push({ ...destinoProtecaoEscolta(guard, vip, [vip, guard], frame % 2 === 0 ? [esquerda, direita] : [direita, esquerda]) });
  }
  assert.equal(new Set(alternando.map((destino) => destino.x.toFixed(3))).size, 1,
    'ameaças equidistantes não alternam o yaw do docking a cada quadro');
});

check('raios de engaje e proteção produzem interceptação', () => {
  const vip = { pos: { x: 0, z: 0 }, yaw: 0, alive: true, team: 'B' }, guard = body('B');
  const far = destinoProtecaoEscolta(guard, vip, [vip, guard], [body('E', 0, 20)]);
  const near = destinoProtecaoEscolta(guard, vip, [vip, guard], [body('E', 0, 5)]);
  assert.ok(near.z > far.z, 'guarda avança para ficar entre VIP e ameaça engajada');
  assert.ok(Math.hypot(near.x, near.z) <= near.protectRadius);
  assert.ok(5 <= near.engageRadius);
});

check('ameaça sem LOS decai e escolta retoma', () => {
  const state = criarEstadoEscolta([{ x: 0, z: 0 }, { x: 0, z: 20 }]);
  const defender = body('B'), attacker = body('E', 0, 13.9);
  passoEscolta(state, { defensores: [defender], atacantes: [attacker], vipAlive: true, temLinhaDeVisao: () => true }, 0.1);
  assert.equal(state.threatened, true);
  // Memória curta (0,7 s): uma brecha de LOS segura o estado, sem prender o comboio.
  for (const dt of [0.25, 0.25]) passoEscolta(state, { defensores: [defender], atacantes: [attacker], vipAlive: true, temLinhaDeVisao: () => false }, dt);
  assert.equal(state.threatened, true, 'grace curto evita oscilação');
  passoEscolta(state, { defensores: [defender], atacantes: [attacker], vipAlive: true, temLinhaDeVisao: () => false }, 0.5);
  assert.equal(state.threatened, false);
  assert.ok(state.position.z > 0, 'VIP retoma avanço com atacante ainda no raio, mas sem LOS');
});

// Parede em z=4 com meia-largura `meia`; relés laterais em x=`lado`. Sem A* nos primeiros
// 10 passos: só a falta de progresso pode forçar um plano novo.
function contornoParede(meia, lado) {
  const nodes = [{ x: 0, z: 0 }, { x: lado, z: 0 }, { x: lado, z: 4 }, { x: lado, z: 8 }, { x: 0, z: 8 }];
  const adj = [[1], [0, 2], [1, 3], [2, 4], [3]];
  let allowPath = false;
  const realFindPath = pathfinder(nodes, adj);
  const world = {
    waypoints: { nodes, adj },
    findPath(from, to) { return allowPath ? realFindPath(from, to) : [from]; },
  };
  const { objective, vip, guard, winners } = fixture({ path: [{ x: 0, z: 0 }, { x: 0, z: 8 }], world });
  objective.game._collide = (pos, radius) => {
    if (Math.abs(pos.x) < meia + radius && Math.abs(pos.z - 4) < radius) pos.z = pos.z < 4 ? 4 - radius : 4 + radius;
  };
  let maximumX = 0;
  for (let i = 0; i < 400 && !winners.length; i++) {
    allowPath = i >= 10;
    guard.pos.copy(vip.pos);
    objective.update(0.1);
    maximumX = Math.max(maximumX, Math.abs(vip.pos.x));
    assert.ok(!(Math.abs(vip.pos.x) < meia && Math.abs(vip.pos.z - 4) < 0.44), 'corpo atravessou colisor');
  }
  return { objective, winners, maximumX };
}

check('VIP replaneja por waypoints sem atravessar parede', () => {
  // Parede larga: nenhum relé é visível de origem E destino, o plano direto trava.
  const { objective, winners, maximumX } = contornoParede(5, 6);
  assert.deepEqual(winners, ['B']);
  assert.ok(maximumX > 5, 'rota contorna a parede em vez de teleportar');
  assert.ok(objective._vipReplans >= 2, 'falta de progresso dispara novo plano');
});

// Abrigo fora do grafo (atrás da fachada, junto à porta da variante oeste) travava o VIP
// 114 s na simulação: o plano descartava o nó de saída e mirava um nó invisível.
check('plano do VIP passa pelo nó de saída sem travar', () => {
  const { objective, winners, maximumX } = contornoParede(2, 4);
  assert.deepEqual(winners, ['B']);
  assert.ok(maximumX > 3, 'contorna pelo relé lateral');
  assert.equal(objective._vipReplans, 1, `um plano basta quando o relé é visível (${objective._vipReplans})`);
});

check('spawn filtra colisão rota e distância', () => {
  const nodes = [{ x: 0, z: 0 }, { x: 0, z: -5 }, { x: 2, z: -5 }, { x: 30, z: -5 }, { x: 5, z: -5 }, { x: 0, z: 12 }];
  const adj = [[1, 2, 3], [0], [0], [0], [], []];
  const colliders = [{ minX: 1.5, maxX: 2.5, minZ: -5.5, maxZ: -4.5, minY: 0, maxY: 2 }];
  const { objective, vip } = fixture({ path: [{ x: 0, z: 0 }, { x: 0, z: 10 }], world: { waypoints: { nodes, adj }, colliders } });
  vip.pos.z = 10; objective.state.checkpoint = 1;
  const candidates = objective.spawnCandidates('B');
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((p) => p.dist <= 18 && p.z < vip.pos.z));
  assert.ok(!candidates.some((p) => p.x === 2 || p.x === 30 || p.x === 5 || p.z === 12));
});

check('fallback de spawn usa âncora válida', () => {
  const nodes = [{ x: 0, z: 0 }], adj = [[]];
  const { objective } = fixture({ path: [{ x: 0, z: 0 }, { x: 0, z: 10 }], world: { waypoints: { nodes, adj } } });
  const candidates = objective.spawnCandidates('B');
  assert.deepEqual(candidates, [{ x: 0, z: 0, dist: 0, lateral: 0 }]);
});

check('retorno ao checkpoint tem velocidade viável', () => {
  const state = criarEstadoEscolta([{ x: 0, z: 0 }, { x: 0, z: 4 }, { x: 0, z: 8 }]);
  state.checkpoint = 1; state.position.z = 4;
  for (let i = 0; i < 16; i++) passoEscolta(state, { defensores: [], atacantes: [], vipAlive: true }, 0.25);   // 3 s de espera + 1 s de retorno
  assert.ok(state.position.z <= 1.81, `um segundo de retorno anda só ${4 - state.position.z}m`);
  for (let i = 0; i < 8; i++) passoEscolta(state, { defensores: [], atacantes: [], vipAlive: true }, 0.25);
  assert.equal(state.checkpoint, 0);
});

check('VIP ausente tem estado neutro', () => {
  const { objective, banners } = fixture({ vipPresent: false, dedicated: false });
  objective.hud = { textContent: '' };
  objective.update(0.1);
  assert.match(objective.hud.textContent, /AGUARDANDO VIP/);
  objective.anunciarMorte();
  assert.equal(banners.length, 0);
  assert.equal(objective.roundResult('E').title, 'A FUGA FOI INTERROMPIDA');
});

check('guarda intercepta até 2 m à frente do slot', () => {
  const vip = { pos: { x: 0, z: 0 }, yaw: 0, alive: true, team: 'B' }, guard = body('B');
  const destino = destinoProtecaoEscolta(guard, vip, [vip, guard], [body('E', 0, 6)]);
  assert.ok(destino.z >= 4.3, `guarda da ponta parou em z=${destino.z.toFixed(2)}, 2,4 m de slot + avanço curto`);
  assert.ok(Math.hypot(destino.x, destino.z) <= destino.protectRadius, 'avanço continua dentro do raio de proteção');
});

// Rush (playtest 06/11): com dois guardas colados a ameaça VISTA não para Flávio; com um
// só (exposto) ele ainda se abriga — o abrigo não virou letra morta.
check('escolta em número não deixa Flávio parado sob ameaça', () => {
  const caminho = [{ x: 0, z: 0 }, { x: 0, z: 20 }];
  const ameaca = body('E', 0, 10);
  const rush = criarEstadoEscolta(caminho);
  for (let i = 0; i < 10; i++) passoEscolta(rush, { defensores: [body('B'), body('B')], atacantes: [ameaca], vipAlive: true, temLinhaDeVisao: () => true }, 0.1);
  assert.equal(rush.threatened, true, 'ameaça a 10 m é vista');
  assert.ok(rush.position.z >= 1.7 && !rush.inCover, `com escolta Flávio andou ${rush.position.z.toFixed(2)} m sob ameaça`);
  const exposto = criarEstadoEscolta(caminho);
  for (let i = 0; i < 10; i++) passoEscolta(exposto, { defensores: [body('B')], atacantes: [ameaca], vipAlive: true, temLinhaDeVisao: () => true }, 0.1);
  assert.ok(exposto.position.z < 0.5 && exposto.inCover, 'escolta curta: Flávio exposto se abriga');
});

// Gate do navegador (06/11): atacante parado a 3 m contesta; Flávio foge para o abrigo, sai
// do raio de 4 m e, sem histerese, voltava a marchar para cima dele — nunca abrigava.
check('contestado uma vez, Flávio chega ao abrigo sem vai-e-vem', () => {
  const state = criarEstadoEscolta([{ x: 0, z: 0 }, { x: 0, z: 20 }]);
  state.position.z = 5;
  const abrigo = { x: 0, z: 1.5 }, atacante = body('E', 0, 8);
  let maisLonge = 5, abrigou = 0;
  for (let i = 0; i < 40; i++) {
    const guardas = [body('B', state.position.x, state.position.z), body('B', state.position.x, state.position.z)];
    // LOS pisca na quina (navegador: GLB da planta): 1 quadro em 3 sem visão.
    passoEscolta(state, { defensores: guardas, atacantes: [atacante], vipAlive: true, temLinhaDeVisao: () => i % 3 !== 1, abrigo }, 0.1);
    maisLonge = Math.max(maisLonge, state.position.z);
    if (state.inCover && Math.hypot(state.position.x - abrigo.x, state.position.z - abrigo.z) < 0.75) abrigou++;
  }
  assert.ok(maisLonge <= 5 + 1e-9, `Flávio voltou a marchar rumo ao atacante (z máx ${maisLonge.toFixed(2)})`);
  assert.ok(abrigou >= 20, `ficou abrigado ${abrigou} de 40 quadros`);
  // Atacante fora de vista (sem LOS) solta a histerese após a memória curta: o rush volta.
  for (let i = 0; i < 20; i++) {
    passoEscolta(state, { defensores: [body('B', state.position.x, state.position.z), body('B', state.position.x, state.position.z)], atacantes: [atacante], vipAlive: true, temLinhaDeVisao: () => false, abrigo }, 0.1);
  }
  assert.equal(state.exposto, false, 'sem ameaça vista o abrigo solta');
  assert.ok(state.position.z > 1.5 + 0.5, 'escolta retoma a marcha');
});

check('embarque progride contestado com escolta', () => {
  const caminho = [{ x: 0, z: 0 }, { x: 0, z: 0.1 }];
  const contexto = (defensores) => ({ defensores, atacantes: [body('E', 0, 1)], vipAlive: true, temLinhaDeVisao: () => true });
  const escoltado = criarEstadoEscolta(caminho);
  escoltado.checkpoint = 1; escoltado.position.z = 0.1;
  for (let i = 0; i < 40 && !escoltado.winner; i++) passoEscolta(escoltado, contexto([body('B')]), 0.1);
  assert.equal(escoltado.contested, true, 'atacante colado contesta a escada');
  assert.equal(escoltado.winner, 'B', `escolta sobe com o pátio contestado (embarque ${escoltado.boardedFor.toFixed(2)} s)`);
  const sozinho = criarEstadoEscolta(caminho);
  sozinho.checkpoint = 1; sozinho.position.z = 0.1;
  for (let i = 0; i < 40; i++) passoEscolta(sozinho, contexto([]), 0.1);
  assert.equal(sozinho.winner, null, 'sem escolta não embarca');
});

// A variante vem só do roundNum (já replicado no snapshot): servidor e cliente que entrou
// com a rodada em curso chegam no mesmo caminho, sem campo novo no fio.
check('cliente e servidor derivam a mesma rota da rodada replicada', () => {
  const rotas = [
    [{ x: 0, z: 0 }, { x: 0, z: 10 }],
    [{ x: 0, z: 0 }, { x: -5, z: 3 }, { x: -5, z: 6 }, { x: -5, z: 9 }, { x: 0, z: 10 }],
    [{ x: 0, z: 0 }, { x: 5, z: 3 }, { x: 5, z: 6 }, { x: 5, z: 9 }, { x: 0, z: 10 }],
  ];
  const aneis = () => ({ children: rotas.flat().map((p, i) => ({ name: 'marca-checkpoint-escolta', visible: true,
    userData: { rotas: rotas.map((_, r) => r).filter((r) => rotas[r].includes(p)) }, ponto: p, i })) });
  const servidor = fixture({ path: rotas[0], world: { escortPaths: rotas, root: aneis() } });
  const cliente = fixture({ dedicated: false, path: rotas[0], world: { escortPaths: rotas, root: aneis() } });
  assert.deepEqual(cliente.objective.state.caminho, rotas[0], 'antes do snapshot o cliente está na rodada 0');
  for (const rodada of [2, 3]) {
    const esperada = varianteRotaEscolta(rodada, rotas.length);
    assert.notEqual(esperada, 0, `rodada ${rodada} sai do meio`);
    servidor.game.roundNum = rodada; servidor.objective.prepareRound();
    assert.deepEqual(servidor.objective.state.caminho, rotas[esperada], `servidor na variante ${esperada}`);
    cliente.game.roundNum = rodada;   // netgame copia snap.roundNum antes de aplicar o objetivo
    cliente.objective.applyNetState({ position: { x: 5, z: 6 }, checkpoint: 3, escortCount: 2, contested: false, threatened: false, inCover: false, unattendedFor: 0, boardedFor: 0, winner: null });
    assert.deepEqual(cliente.objective.state.caminho, servidor.objective.state.caminho, `cliente na mesma variante da rodada ${rodada}`);
    assert.equal(cliente.objective.state.checkpoint, 3, 'checkpoint replicado não é cortado pelo caminho errado');
    const acesos = cliente.game.world.root.children.filter((anel) => anel.visible).map((anel) => anel.ponto);
    assert.ok(acesos.length && acesos.every((p) => rotas[esperada].includes(p)), 'cliente acende só os anéis da variante');
  }
});

console.log(JSON.stringify({ mutant: mutant || null, failures }));
process.exitCode = failures ? 1 : 0;
