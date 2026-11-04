import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mutations = {
  'cliente-autoridade': ['_autoridadeEscolta() { return !this.game.online || this.game.dedicated; }', '_autoridadeEscolta() { return !this.game.online; }', 'servidor online simula escolta até vitória B'],
  'vip-bot-remoto': ['if (bot !== this.vip || this._clienteEscolta()) return false;', 'if (bot !== this.vip || this.game.online) return false;', 'servidor online simula escolta até vitória B'],
  'snapshot-no-servidor': ['if (!this._clienteEscolta()) return;\n    aplicarSnapshotEscolta(this.state, net);', 'if (false) return;\n    aplicarSnapshotEscolta(this.state, net);', 'servidor ignora snapshot recebido'],
  'respawn-cliente-local': ['if (this._clienteEscolta()) return Infinity;', 'if (this._clienteEscolta()) return now + 2.2;', 'cliente não calcula onda local'],
  'hud-contestado-oculto': ["if (this.state.contested) status.push('CONTESTADO');", "if (this.state.contested && !this.state.threatened) status.push('CONTESTADO');", 'HUD mostra contestação e cobertura simultâneas'],
  'slots-mortes': ['if (!bot?.pos || !vip?.pos || bot.alive === false || bot === vip) return null;', 'if (!bot?.pos || !vip?.pos || bot === vip) return null;\n  if (bot.alive === false) { formacoesEscolta.get(vip)?.delete(bot); return null; }', 'slot permanece com a entidade após morte'],
  'slots-distantes-iguais': ['const ordem = temporarios.indexOf(bot);', 'const ordem = 0;', 'múltiplos bots distantes ocupam slots temporários distintos'],
  'orientacao-so-engaje': ['const yaw = contato ? contato.yaw : maisPerto\n', 'const yaw = interceptar\n', 'formação orienta para ameaça fora do raio de engaje'],
  'contato-rotaciona': ['const yaw = contato ? contato.yaw : maisPerto', 'const yaw = maisPerto', 'contato próximo mantém slot legado estável'],
  'interceptacao-ultrapassa': ['const avanco = Math.min(1.2, Math.max(0, GUARD_PROTECT_RADIUS - radial), Math.max(0, limite - radial));', 'const avanco = Math.min(1.2, Math.max(0, GUARD_PROTECT_RADIUS - radial));', 'contato próximo mantém slot legado estável'],
  'sem-interceptacao': ['if (contato) {', 'if (false) {', 'raios de engaje e proteção produzem interceptação'],
  'sem-decaimento': ['state.threatLostFor < THREAT_MEMORY', 'true', 'ameaça sem LOS decai e escolta retoma'],
  'spawn-longe': ['.filter((p) => p.dist <= 18);\n    const base', '.filter((p) => p.dist <= 180);\n    const base', 'spawn filtra colisão rota e distância'],
  'spawn-sem-fallback': ['if (!escolha.length) return semColisao(anchor) && rota(anchor) ? [{ x: anchor.x, z: anchor.z, dist: 0, lateral: 0 }] : null;', 'if (!escolha.length) return null;', 'fallback de spawn usa âncora válida'],
  'sem-replane': ['const world = this.game.world, nodes = world.waypoints?.nodes || [];', 'return rota;\n    const world = this.game.world, nodes = world.waypoints?.nodes || [];', 'VIP replaneja por waypoints sem atravessar parede'],
  'retorno-lento': ['const RETURN_SPEED = 2.2;', 'const RETURN_SPEED = 0.65;', 'retorno ao checkpoint tem velocidade viável'],
  'morte-sem-vip': ["const morto = winner === 'E' && (this.vip?.alive === false || this.deathAnnounced);", "const morto = winner === 'E' && (!this.vip?.alive || this.deathAnnounced);", 'VIP ausente tem estado neutro'],
};

if (process.argv.includes('--mutantes')) {
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
  console.log('Mutação aplicada: ' + mutant);
}
const { OperacaoFlavio, criarEstadoEscolta, destinoProtecaoEscolta, passoEscolta, snapshotEscolta } =
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
  assert.equal(objective.respawnAt(guard, 103), Infinity);
});

check('HUD mostra contestação e cobertura simultâneas', () => {
  const { objective } = fixture({ dedicated: false });
  objective.hud = { textContent: '' };
  Object.assign(objective.state, { contested: true, threatened: true, inCover: true });
  objective.atualizaHud();
  assert.match(objective.hud.textContent, /CONTESTADO/);
  assert.match(objective.hud.textContent, /EM COBERTURA/);
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
  for (const dt of [0.5, 0.5]) passoEscolta(state, { defensores: [defender], atacantes: [attacker], vipAlive: true, temLinhaDeVisao: () => false }, dt);
  assert.equal(state.threatened, true, 'grace curto evita oscilação');
  passoEscolta(state, { defensores: [defender], atacantes: [attacker], vipAlive: true, temLinhaDeVisao: () => false }, 0.5);
  assert.equal(state.threatened, false);
  assert.ok(state.position.z > 0, 'VIP retoma avanço com atacante ainda no raio, mas sem LOS');
});

check('VIP replaneja por waypoints sem atravessar parede', () => {
  const nodes = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }, { x: 4, z: 8 }, { x: 0, z: 8 }];
  const adj = [[1], [0, 2], [1, 3], [2, 4], [3]];
  let allowPath = false;
  const realFindPath = pathfinder(nodes, adj);
  const world = {
    waypoints: { nodes, adj },
    findPath(from, to) { return allowPath ? realFindPath(from, to) : [from]; },
  };
  const { objective, vip, guard, winners } = fixture({ path: [{ x: 0, z: 0 }, { x: 0, z: 8 }], world });
  objective.game._collide = (pos, radius) => {
    if (Math.abs(pos.x) < 2 + radius && Math.abs(pos.z - 4) < radius) pos.z = pos.z < 4 ? 4 - radius : 4 + radius;
  };
  let maximumX = 0;
  for (let i = 0; i < 400 && !winners.length; i++) {
    allowPath = i >= 10;
    guard.pos.copy(vip.pos);
    objective.update(0.1);
    maximumX = Math.max(maximumX, Math.abs(vip.pos.x));
    assert.ok(!(Math.abs(vip.pos.x) < 2 && Math.abs(vip.pos.z - 4) < 0.44), 'corpo atravessou colisor');
  }
  assert.deepEqual(winners, ['B']);
  assert.ok(maximumX > 3, 'rota contorna a parede em vez de teleportar');
  assert.ok(objective._vipReplans >= 2, 'falta de progresso dispara novo plano');
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
  for (let i = 0; i < 20; i++) passoEscolta(state, { defensores: [], atacantes: [], vipAlive: true }, 0.25);
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

console.log(JSON.stringify({ mutant: mutant || null, failures }));
process.exitCode = failures ? 1 : 0;
