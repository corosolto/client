/*
 * CAMPINHO_INTEGRACAO — contrato da Quebrada e do Campinho sobre a main atual.
 * Mede o mundo construido: cobertura, arsenal, grafo global, spawns, CTF e 5x5/8x8.
 *
 * Uso:
 *   node tools/eval/campinho-integration-foundation-check.mjs
 *   node tools/eval/campinho-integration-foundation-check.mjs --mutante=<nome>
 */
import { THREE, bootGame, initTextures } from './harness.mjs';

const MUTANTS = new Set([
  'cobertura-invisivel',
  'cobertura-sem-bala',
  'spawn-obstruido',
  'ctf-curto',
  'rota-partida',
  'grafo-ilhado',
  'arsenal-incompleto',
  'campinho-sem-placar',
  'time-5x5',
  'time-8x8',
]);
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
if (mutant && !MUTANTS.has(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);

const failures = [];
const textures = initTextures();
const expectedRoles = new Map([
  ['gate-cover', 2],
  ['sideline-cover', 11],
  ['sideline-backrest', 2],
]);
const expectedScenery = new Map([
  ['scoreboard', 1],
  ['score-mark', 9],
]);
const landmarks = [
  ['vila', { x: -18, z: -41 }],
  ['baile', { x: 5, z: -30.5 }],
  ['viela-oeste', { x: -23, z: 10 }],
  ['viela-leste', { x: 23, z: 10 }],
  ['bar', { x: 9.5, z: 6 }],
  ['campinho', { x: -6, z: 30 }],
];

function fail(message) {
  failures.push(message);
}

function occupied(game, point) {
  const start = new THREE.Vector3(point.x, point.y || 0, point.z);
  const resolved = start.clone();
  game._collide(resolved, 0.38);
  return resolved.distanceTo(start) > 1e-3;
}

function rolesOf(world) {
  const roles = new Map();
  world.root.traverse((object) => {
    const role = object.userData.campinhoRole;
    if (!role) return;
    const entries = roles.get(role) || [];
    entries.push(object);
    roles.set(role, entries);
  });
  return roles;
}

function disconnect(world, index) {
  const before = world.waypoints.adj[index].length;
  world.waypoints.adj[index] = [];
  for (const neighbours of world.waypoints.adj) {
    for (let i = neighbours.length - 1; i >= 0; i--) {
      if (neighbours[i] === index) neighbours.splice(i, 1);
    }
  }
  if (!before) throw new Error('Mutacao nao aplicou: destino CTF ja estava isolado');
}

function assertPath(world, from, to, label) {
  const start = world.nearestWaypoint(from.x, from.z);
  const end = world.nearestWaypoint(to.x, to.z);
  const path = world.findPath(start, end);
  if (start !== end && (path.length < 2 || path[0] !== start || path.at(-1) !== end)) {
    fail(`rota ausente: ${label}`);
    return;
  }
  for (let i = 1; i < path.length; i++) {
    if (!world.waypoints.adj[path[i - 1]].includes(path[i])) {
      fail(`rota invalida: ${label} (${path[i - 1]} -> ${path[i]})`);
      return;
    }
  }
}

function graphStats(world) {
  const { nodes, adj } = world.waypoints;
  const seen = new Set([0]), queue = [0];
  while (queue.length) {
    for (const next of adj[queue.shift()] || []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  }
  return { nodes: nodes.length, edges: adj.reduce((sum, entries) => sum + entries.length, 0), connected: seen.size };
}

let coverageCount = 0;
let routeCount = 0;
const scenarios = [];
for (const teamSize of [5, 8]) {
  for (const ctf of [false, true]) {
    const game = bootGame('quebrada', { textures, ctf, seed: 53000 + teamSize * 10 + Number(ctf), bots: teamSize });
    const label = `${teamSize}x${teamSize} ${ctf ? 'CTF' : 'mata-mata'}`;
    try {
      if (mutant === `time-${teamSize}x${teamSize}`) {
        const removed = game.bots.pop();
        if (!removed) throw new Error(`Mutacao nao aplicou: ${label} sem bot para remover`);
      }

      const actualTeams = Object.fromEntries(['E', 'B'].map((team) => [
        team,
        game.combatants.filter((entity) => entity.alive && entity.team === team && (entity.isPlayer || game.bots.includes(entity))).length,
      ]));
      if (actualTeams.E !== teamSize || actualTeams.B !== teamSize) {
        fail(`${label}: times ${actualTeams.E}x${actualTeams.B}, esperado ${teamSize}x${teamSize}`);
      }

      if (ctf) {
        const roles = rolesOf(game.world);
        const covers = [...expectedRoles.keys()].flatMap((role) => roles.get(role) || []);
        if (mutant === 'cobertura-invisivel') {
          if (!covers[0]?.visible) throw new Error('Mutacao nao aplicou: cobertura ja invisivel');
          covers[0].visible = false;
        }
        if (mutant === 'cobertura-sem-bala') {
          const index = game.world.occluders.indexOf(covers[0]);
          if (index < 0) throw new Error('Mutacao nao aplicou: cobertura ja fora dos occluders');
          game.world.occluders.splice(index, 1);
        }
        if (mutant === 'spawn-obstruido') {
          const target = game.world.spawns.B[0];
          game.world.colliders.push({
            minX: target.x - 0.2, maxX: target.x + 0.2,
            minY: 0, maxY: 2,
            minZ: target.z - 0.2, maxZ: target.z + 0.2,
          });
        }
        if (mutant === 'ctf-curto') {
          if (game.capsToWin !== game.ctfPts.length) throw new Error('Mutacao nao aplicou: alvo CTF ja divergia');
          game.capsToWin--;
        }
        if (mutant === 'campinho-sem-placar') {
          const target = roles.get('scoreboard')?.[0];
          if (!target) throw new Error('Mutacao nao aplicou: placar ausente');
          delete target.userData.campinhoRole;
        }
        if (mutant === 'arsenal-incompleto') {
          if (game.world.pickups.length < 1) throw new Error('Mutacao nao aplicou: arsenal vazio');
          game.world.pickups.pop();
        }

        for (const [role, expected] of expectedRoles) {
          const entries = roles.get(role) || [];
          if (entries.length !== expected) fail(`${role}: ${entries.length}, esperado ${expected}`);
          for (const object of entries) {
            coverageCount++;
            if (!object.visible || object.material?.visible === false) fail(`${role}: cobertura invisivel`);
            if (!game.world.occluders.includes(object)) fail(`${role}: cobertura nao bloqueia bala`);
          }
        }
        const scenery = rolesOf(game.world);
        for (const [role, expected] of expectedScenery) {
          const actual = scenery.get(role)?.length || 0;
          if (actual !== expected) fail(`${role}: ${actual}, esperado ${expected}`);
        }

        if (game.world.pickups.length !== 12) fail(`arsenal: ${game.world.pickups.length}, esperado 12`);
        const stats = graphStats(game.world);
        if (stats.nodes < 340 || stats.edges < 2000) fail(`grafo reduzido: ${stats.nodes} nos/${stats.edges} arestas`);
        if (mutant === 'grafo-ilhado') disconnect(game.world, game.world.nearestWaypoint(23, 10));
        const afterMutation = graphStats(game.world);
        if (afterMutation.connected !== afterMutation.nodes) fail(`grafo global: ${afterMutation.connected}/${afterMutation.nodes} nos conectados`);
        for (let i = 1; i < landmarks.length; i++) {
          assertPath(game.world, landmarks[i - 1][1], landmarks[i][1], `${landmarks[i - 1][0]} -> ${landmarks[i][0]}`);
        }

        for (const team of ['E', 'B']) {
          const spawns = game.world.spawns[team] || [];
          if (spawns.length !== 4) fail(`spawns ${team}: ${spawns.length}, esperado 4`);
          for (const [index, spawn] of spawns.entries()) {
            if (occupied(game, spawn)) fail(`spawn ${team}${index} em solido`);
          }
        }

        if (game.ctfPts.length !== 4) fail(`CTF: ${game.ctfPts.length} bandeiras, esperado 4`);
        if (game.capsToWin !== game.ctfPts.length) fail(`CTF: alvo ${game.capsToWin}, bandeiras ${game.ctfPts.length}`);
        if (new Set(game.ctfPts.map((point) => point.id)).size !== game.ctfPts.length) fail('CTF: ids repetidos');

        if (mutant === 'rota-partida') {
          const destination = game.world.nearestWaypoint(game.ctfPts[0].x, game.ctfPts[0].z);
          disconnect(game.world, destination);
        }
        for (const team of ['E', 'B']) {
          for (const [spawnIndex, spawn] of game.world.spawns[team].entries()) {
            for (const point of game.ctfPts) {
              assertPath(game.world, spawn, point, `${team}${spawnIndex} -> ${point.id}`);
              routeCount++;
            }
          }
        }
      }

      scenarios.push(`${label}=${actualTeams.E}x${actualTeams.B}`);
    } finally {
      game.dispose();
    }
  }
}

if (failures.length) throw new Error(`CAMPINHO_INTEGRACAO falhou: ${failures.join('; ')}`);
console.log(`CAMPINHO_INTEGRACAO ok · ${scenarios.join(' · ')} · cobertura solida=${coverageCount / 2} · grafo=344/2042 conexo · arsenal=12 · spawns=4x4 livres · CTF=4/4 · rotas spawn-CTF=${routeCount / 2}`);
