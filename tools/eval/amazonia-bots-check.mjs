/* Navegação real da Amazônia: 30 rotas aos objetivos, 30 retornos e 11 saídas.
 * node tools/eval/amazonia-bots-check.mjs --seed=7 --output=/tmp/amazonia-bots.json
 * node tools/eval/amazonia-bots-check.mjs --mutante=sem-camadas
 * O mutante precisa perder rotas, não apenas mudar uma métrica do grafo.
 * Usa Game._updateBot, colisões e mapa reais; combate desativado, sem GLB/browser.
 */
import { bootGame, initTextures } from './harness.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const seed = Number(option('seed', '13007'));
const mutant = option('mutante', '');
if (!Number.isSafeInteger(seed)) throw new Error('Seed deve ser inteiro.');
if (mutant && mutant !== 'sem-camadas') throw new Error(`Mutante desconhecido: ${mutant}`);
const sha = name => createHash('sha256').update(readFileSync(new URL(`../../public/js/${name}`, import.meta.url))).digest('hex');
const game = bootGame('amazonia', { textures: initTextures(), ctf: true, seed, bots: 2 });
const world = game.world, nodes = world.waypoints.nodes, adj = world.waypoints.adj;
if (world.botLayeredNavigation !== true) throw new Error('Mapa não ativou navegação por camadas.');
if (mutant) world.botLayeredNavigation = false;
game._enemyOf = () => [];
game.state = 'live';
const bot = game.bots[0];
game.bots = [bot];
const objectives = game.ctfPts.map(({ x, z, id, r }) => ({ x, z, id, r }));
const edgeFailures = [];
for (let i = 0; i < nodes.length; i++) {
  for (const j of adj[i]) if (!game._walkReach({ pos: nodes[i] }, nodes[j])) edgeFailures.push([i, j]);
}
const cabinNodes = world.cabins.map(cabin => ({
  id: cabin.id,
  count: nodes.filter(n => cabin.contains(n.x, n.z) && Math.abs(n.y - cabin.floorY) < 0.1).length,
}));
const cases = [];
for (const team of ['E', 'B']) {
  for (const [index, spawn] of world.spawns[team].entries()) {
    for (const point of objectives) {
      cases.push({ id: `spawn-${team}-${index}-to-${point.id}`, start: { ...spawn, y: 0 }, target: point });
      cases.push({ id: `return-${point.id}-to-${team}-${index}`,
        start: { x: point.x, z: point.z, y: world.groundHeightAt(point.x, point.z), yaw: spawn.yaw },
        target: { ...spawn, r: 3.2 } });
    }
  }
}
for (const cabin of world.cabins) {
  cases.push({ id: `exit-${cabin.id}`,
    start: { x: cabin.door.inside[0], y: cabin.floorY, z: cabin.door.inside[2] },
    target: { x: cabin.door.outside[0], z: cabin.door.outside[2], r: 0.65 } });
}
if (cases.length !== 71 || world.cabins.length !== 11 || objectives.length !== 3) {
  throw new Error(`Cobertura mudou: ${cases.length} rotas, ${world.cabins.length} cabanas, ${objectives.length} objetivos.`);
}
const paths = [];
for (const test of cases) {
  const start = test.start, target = test.target;
  bot.pos.set(start.x, start.y, start.z);
  Object.assign(bot, { alive: true, hp: 100, think: 9999, target: null, path: null, pathIdx: 1,
    repathAt: 0, ctfPt: 0, roamSeed: 0, _hdg: undefined, _banNodes: null, _sideUntil: 0,
    _stuckT: 0, _scanAt: 0, _scanYaw: undefined, yaw: start.yaw || 0,
    protUntil: 0, alertUntil: 0, ctfRepick: 9999 });
  game.ctfPts = [{ ...target, r: target.r || 3.2, owner: bot.team === 'B' ? 'E' : 'B' }];
  game.time = 0;
  let reached = null, walked = 0, heightJumps = 0;
  for (let tick = 0; tick < 60 * 60; tick++) {
    const previous = bot.pos.clone();
    game.time += 1 / 60;
    game._updateBot(bot, 1 / 60);
    walked += Math.hypot(bot.pos.x - previous.x, bot.pos.z - previous.z);
    if (Math.abs(bot.pos.y - previous.y) > 0.6) heightJumps++;
    if (Math.hypot(bot.pos.x - target.x, bot.pos.z - target.z) < game.ctfPts[0].r * 0.7) {
      reached = game.time;
      break;
    }
  }
  paths.push({ id: test.id, reached, walked, heightJumps, final: bot.pos.toArray(),
    remaining: Math.hypot(bot.pos.x - target.x, bot.pos.z - target.z) });
}
const failures = paths.filter(p => p.reached === null);
const missingCabins = cabinNodes.filter(c => !c.count);
const pass = mutant ? failures.length > 0 : failures.length === 0 && edgeFailures.length === 0 && missingCabins.length === 0;
const receipt = { seed, mutant, pass, scope: 'Game._updateBot real; alvos CTF fixos, sem combate e sem GLBs/browser.',
  hashes: { game: sha('game.js'), map: sha('map_amazonia.js') },
  routes: paths.length, reached: paths.length - failures.length, nodes: nodes.length,
  edges: adj.reduce((sum, neighbors) => sum + neighbors.length, 0), edgeFailures, cabinNodes, paths };
const output = option('output', '');
if (output) writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ pass, seed, mutant, reached: `${receipt.reached}/${receipt.routes}`,
  edgeFailures: edgeFailures.length, cabins: `${cabinNodes.length - missingCabins.length}/11`,
  failures: failures.map(({ id, final, remaining }) => ({ id, final, remaining })) }, null, 2));
process.exitCode = pass ? 0 : 1;
