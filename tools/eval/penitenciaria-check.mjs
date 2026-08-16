import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const scene = new THREE.Scene();
const world = MAPS.penitenciaria?.build(scene, await initTextures());
if (!world) {
  console.log('PEN1 FALHA — mapa penitenciaria ausente');
  process.exit(1);
}

const named = prefix => {
  const found = [];
  world.root.traverse(object => { if (object.name?.startsWith(prefix)) found.push(object); });
  return found;
};
const cells = named('penitenciaria-cela-aberta-');
const benches = named('penitenciaria-banco-');
const ammo = named('penitenciaria-caixa-municao-');
const bags = named('penitenciaria-saco-boxe-');
const towers = named('penitenciaria-guarita-');
const fences = named('penitenciaria-cerca-');
const dynamite = named('penitenciaria-dinamite-');
const policeCars = named('penitenciaria-carro-policia');
if (mutante === 'fecha-celas') cells.length = 0;
if (mutante === 'sem-guaritas') towers.length = 0;
if (mutante === 'sem-obstaculos') { ammo.length = 0; policeCars.length = 0; }

const themeOk = cells.length >= 8 && benches.length >= 4 && bags.length >= 2
  && towers.length === 4 && fences.length >= 4 && dynamite.length >= 2 && policeCars.length >= 1;
const courtOk = named('penitenciaria-quadra').length === 1 && named('penitenciaria-gol-').length === 2;
const cellsOpen = cells.length >= 8 && cells.every(cell => {
  const { doorwayX, doorwayZ, insideX, insideZ } = cell.userData;
  const blocked = (x, z) => world.colliders.some(c => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.minY < 1.7 && c.maxY > .1);
  return !blocked(doorwayX, doorwayZ) && !blocked(insideX, insideZ);
});
const probe = Object.create(Game.prototype);
probe.world = { colliders: world.colliders, bounds: world.bounds };
const collisionObjects = [...ammo, ...policeCars];
const obstaclesBlock = collisionObjects.length >= 5 && collisionObjects.every(object => {
  const collider = object.userData.collider;
  if (!collider || !world.colliders.includes(collider)) return false;
  const x = (collider.minX + collider.maxX) / 2, z = (collider.minZ + collider.maxZ) / 2;
  const body = new THREE.Vector3(x, 0, z); probe._collide(body, .38);
  return Math.hypot(body.x - x, body.z - z) >= .37;
});
const centerWeapons = world.pickups?.filter(p => Math.abs(p.x) <= 12 && Math.abs(p.z) <= 12) || [];
const arsenalOk = centerWeapons.length >= 7 && new Set(centerWeapons.map(p => p.kind)).size >= 6;
const nodes = world.waypoints?.nodes || [];
const from = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
const to = world.nearestWaypoint(world.spawns.B[0].x, world.spawns.B[0].z);
const path = world.findPath(from, to);
const routesOk = nodes.length >= 100 && path.length > 2 && path.every(i => Number.isInteger(i) && nodes[i]);
const ctfOk = world.ctfPoints?.length === 3 && world.spawns?.E?.length === 4 && world.spawns?.B?.length === 4;

console.log(`PEN1 ${themeOk ? 'PASSA' : 'FALHA'} — ${cells.length} celas · ${benches.length} bancos · ${towers.length} guaritas · ${fences.length} cercas`);
console.log(`PEN2 ${cellsOpen ? 'PASSA' : 'FALHA'} — ${cells.length} celas com porta e interior transitáveis`);
console.log(`PEN3 ${obstaclesBlock ? 'PASSA' : 'FALHA'} — ${ammo.length} caixas de munição + ${policeCars.length} carro policial com colisão`);
console.log(`PEN4 ${courtOk && arsenalOk ? 'PASSA' : 'FALHA'} — quadra com 2 gols · ${centerWeapons.length} armas no miolo`);
console.log(`PEN5 ${routesOk && ctfOk ? 'PASSA' : 'FALHA'} — ${nodes.length} nós · rota ${path.length} passos · 3 pontos CTF`);
process.exit(themeOk && cellsOpen && obstaclesBlock && courtOk && arsenalOk && routesOk && ctfOk ? 0 : 1);
