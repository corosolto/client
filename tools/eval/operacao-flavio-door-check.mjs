// Aberturas vêm das paredes visíveis; passos físicos e limites vêm do Game real.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const mapUrl = new URL('../../public/js/map_operacao_flavio.js', import.meta.url);
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
if (mutation) {
  const anchors = '  for (const x of fachadaNorte.portas) if (!blocked(x, fachadaNorte.z)) nodes.push({ x, z: fachadaNorte.z });';
  const relay = '  if (!blocked(fachadaNorte.x, fachadaNorte.z + step)) nodes.push({ x: fachadaNorte.x, z: fachadaNorte.z + step });';
  const edits = {
    'sem-portas': [anchors, ''],
    'sem-relay': [relay, ''],
    'meia-porta': ['      if (i === j) continue;', `      if (i === j || (nodes[i].x === fachadaNorte.x && nodes[i].z === fachadaNorte.z && nodes[j].z > fachadaNorte.z)
        || (nodes[j].x === fachadaNorte.x && nodes[j].z === fachadaNorte.z && nodes[i].z > fachadaNorte.z)) continue;`],
    'no-penetrado': [anchors, anchors.replace('nodes.push({ x, z:', 'nodes.push({ x: x === 0 ? (fachadaNorte.portas[1] + fachadaNorte.portas[2]) / 2 : x, z:')],
    'atalho-parede': ['  const nearestWaypoint = (x, z) => {', `  const atalho = [fachadaNorte.z - step, fachadaNorte.z + step].map(z => nodes.reduce((best, node, i) => {
    const x = (fachadaNorte.portas[1] + fachadaNorte.portas[2]) / 2;
    return Math.hypot(node.x - x, node.z - z) < Math.hypot(nodes[best].x - x, nodes[best].z - z) ? i : best;
  }, 0));
  adj[atalho[0]].push(atalho[1]); adj[atalho[1]].push(atalho[0]);
  const nearestWaypoint = (x, z) => {`],
  };
  assert(Object.hasOwn(edits, mutation), 'mutante conhecido');
  let source = readFileSync(mapUrl, 'utf8'); const [before, after] = edits[mutation];
  assert.equal(source.split(before).length, 2, 'mutação única no mapa real'); source = source.replace(before, after);
  registerHooks({ load(url, context, next) { return url === mapUrl.href ? { format: 'module', source, shortCircuit: true } : next(url, context); } });
  console.log(`Mutação aplicada: ${mutation}`);
}
const injectedStep = process.argv.includes('--prova-salto');
if (injectedStep) console.log('Mutação aplicada: passo-duplo');
let failures = 0;
const check = (name, task) => {
  try { task(); console.log(`✓ ${name}`); }
  catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message.split('\n')[0]}`); }
};
const reporter = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.split('=')[1];
if (reporter) {
  assert(['TypeError', 'AssertionError'].includes(reporter)); console.log('Mutação aplicada: controle-reporter');
  check('reporter', () => { if (reporter === 'TypeError') throw new TypeError('controle'); assert.fail('controle'); }); process.exit(1);
}
const { Game, MAPS, THREE, initTextures, renderer, sfx, PCHAR, seedRandom } = await import('./harness.mjs');

const geometryHelper = process.argv.find(arg => arg.startsWith('--geometry-helper='))?.slice(18);
const geometry = geometryHelper ? await (await import(geometryHelper)).prepareMapPropGeometry(MAPS) : null;
if (geometryHelper) assert(geometry?.flavio === 17 && geometry?.count === 175, 'pré-condição: 17 GLBs Flávio e 175 props comuns reais');
const gameSource = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const speed = Number(gameSource.match(/const BOT_SPEED = ([\d.]+)/)?.[1]);
const radius = Number(gameSource.match(/this\._collide\(b\.pos, ([\d.]+)\)/)?.[1]);
assert([speed, radius].every(Number.isFinite), 'referência física legível');
seedRandom(1);
const game = new Game({ renderer, textures: initTextures(renderer), sfx,
  settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
  playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'DOOR-CONTRACT',
  mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
game._ensureDolly = () => {}; game._startRound();
game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
const results = [];
try {
  const world = game.world, { nodes, adj } = world.waypoints;
  const walls = []; world.root.traverse(object => {
    if (object.isMesh && object.name === 'fachada-norte') walls.push(new THREE.Box3().setFromObject(object));
  });
  walls.sort((a, b) => a.min.x - b.min.x);
  assert(walls.length >= 2, 'pré-condição: paredes visíveis delimitam aberturas');
  const plane = (walls[0].min.z + walls[0].max.z) / 2;
  const doors = walls.slice(1).map((wall, i) => ({ min: walls[i].max.x, max: wall.min.x }))
    .filter(door => door.max > door.min).map(door => ({ ...door, x: (door.min + door.max) / 2 }));
  assert(doors.length > 0, 'pré-condição: pelo menos uma porta física');
  const segment = world.escortPath.slice(1).map((b, i) => [world.escortPath[i], b])
    .find(([a, b]) => a.z < plane && b.z > plane && a.x === 0 && b.x === 0);
  assert(segment, 'referência: segmento autoral do VIP atravessa fachada');
  const [from, to] = segment;
  const epsilon = Number.EPSILON * 1024;
  const validPosition = pos => {
    const copy = { ...pos }; game._collide(copy, radius);
    return Math.hypot(copy.x - pos.x, copy.z - pos.z) <= epsilon;
  };
  const walk = (start, end) => {
    const pos = { x: start.x, y: 0, z: start.z }, distance = Math.hypot(end.x - start.x, end.z - start.z);
    const step = speed / 60, frames = Math.ceil(distance / step);
    const validStart = validPosition(pos); let maximumStep = 0, positionsValid = validStart;
    for (let i = 0; i < frames; i++) {
      const remaining = Math.hypot(end.x - pos.x, end.z - pos.z);
      if (!remaining) break;
      const previous = { ...pos };
      const advance = Math.min(injectedStep ? step * 2 : step, remaining); pos.x += (end.x - pos.x) / remaining * advance;
      pos.z += (end.z - pos.z) / remaining * advance; game._collide(pos, radius);
      maximumStep = Math.max(maximumStep, Math.hypot(pos.x - previous.x, pos.z - previous.z));
      positionsValid &&= validPosition(pos);
    }
    return { pos, arrived: Math.hypot(end.x - pos.x, end.z - pos.z) <= step,
      physical: validStart && positionsValid && maximumStep <= step + epsilon, validStart, positionsValid, maximumStep };
  };
  const crossing = (a, b, door) => {
    if (!(Math.min(a.z, b.z) <= plane && Math.max(a.z, b.z) >= plane && a.z !== b.z)) return false;
    const x = a.x + (b.x - a.x) * (plane - a.z) / (b.z - a.z);
    return x > door.min + radius && x < door.max - radius;
  };
  const completeCrossing = (route, door) => {
    const inside = node => node.x > door.min + radius && node.x < door.max - radius;
    let entered = false;
    for (let i = 1; i < route.length; i++) {
      const a = nodes[route[i - 1]], b = nodes[route[i]];
      if (a.z < plane && b.z > plane && crossing(a, b, door)) return true;
      if (a.z < plane && b.z === plane) entered = inside(b);
      else if (entered && a.z === plane && b.z === plane) entered = inside(a) && inside(b);
      else if (entered && a.z === plane && b.z > plane) return inside(a);
      else if (b.z < plane) entered = false;
    }
    return false;
  };
  const edges = [];
  for (let i = 0; i < nodes.length; i++) for (const j of adj[i]) if (i < j) edges.push([i, j]);
  check('grafo: nós não começam penetrados', () => assert(nodes.every(node => validPosition({ ...node, y: 0 })), 'todo nó tem posição física válida'));
  check('fachada: arestas respeitam paredes', () => {
    for (const [i, j] of edges) {
      const a = nodes[i], b = nodes[j];
      if (!(Math.min(a.z, b.z) <= plane && Math.max(a.z, b.z) >= plane && a.z !== b.z)) continue;
      const x = a.x + (b.x - a.x) * (plane - a.z) / (b.z - a.z);
      if (x < walls[0].min.x || x > walls.at(-1).max.x) continue;
      for (const [start, end] of [[a, b], [b, a]]) {
        const edge = walk(start, end); assert(edge.arrived && edge.physical, 'travessia de fachada não fura parede');
      }
    }
  });
  for (const door of doors) {
    const start = { x: door.x, z: from.z }, end = { x: door.x, z: to.z };
    const physical = walk(start, end);
    check(`porta ${door.x}: física`, () => assert(physical.arrived && physical.physical, 'passagem visível permite travessia física sem salto ou penetração'));
    const hits = edges.filter(([i, j]) => crossing(nodes[i], nodes[j], door));
    const startNode = world.nearestWaypoint(start.x, start.z), endNode = world.nearestWaypoint(end.x, end.z);
    const route = world.findPath(startNode, endNode), reverse = world.findPath(endNode, startNode);
    check(`porta ${door.x}: grafo`, () => {
      assert(hits.length > 0, 'passagem física tem aresta no grafo');
      for (const [path, first, last] of [[route, startNode, endNode], [reverse, endNode, startNode]]) {
        assert(path[0] === first && path.at(-1) === last, 'rota liga os extremos solicitados');
        assert(path.every((node, i) => !i || adj[path[i - 1]].includes(node)), 'rota usa apenas adjacências reais');
      }
      for (const [a, b] of [[start, nodes[startNode]], [nodes[endNode], end], [end, nodes[endNode]], [nodes[startNode], start]]) {
        const connector = walk(a, b); assert(connector.arrived && connector.physical, 'extremos físicos ligam à rota sem salto ou penetração');
      }
      assert(completeCrossing(route, door) && completeCrossing([...reverse].reverse(), door), 'rota completa atravessa os dois lados pela própria porta');
    });
    check(`porta ${door.x}: arestas físicas`, () => {
      assert(hits.length > 0, 'grafo possui travessia para medir');
      for (const [i, j] of hits) {
        assert(adj[j].includes(i), 'travessia bidirecional');
        for (const [a, b] of [[nodes[i], nodes[j]], [nodes[j], nodes[i]]]) {
          const edge = walk(a, b); assert(edge.arrived && edge.physical, 'arestas atravessam sem salto ou penetração');
        }
      }
    });
    results.push({ door, physical, edges: hits, route, reverse });
  }
  const closedX = walls.map(wall => (wall.min.x + wall.max.x) / 2).find(x => validPosition({ x, y: 0, z: from.z }));
  assert(Number.isFinite(closedX), 'pré-condição: controle inicia fora de colisores');
  check('controle: parede fechada', () => {
    const blocked = walk({ x: closedX, z: from.z }, { x: closedX, z: to.z });
    assert(blocked.physical && blocked.pos.z < plane);
  });
  check('controle: destino dentro do colisor', () => {
    const blocked = walk({ x: closedX, z: from.z }, { x: closedX, z: plane });
    assert(blocked.physical && !blocked.arrived);
  });
  check('controle: início penetrado', () => assert(!walk({ x: closedX, z: plane }, { x: closedX, z: to.z }).physical));
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
  if (output) writeFileSync(output, JSON.stringify({ synthetic: true, browserQA: false, geometry,
    source: 'paredes visíveis + Game._collide + escortPath + grafo real', speed, radius, plane, results, failures }, null, 2) + '\n');
} finally { game.dispose(); }
if (failures) process.exitCode = 1;
