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
const cells = named('bangu-cela-aberta-');
const benches = named('bangu-banco-');
const ammo = named('bangu-caixa-municao-');
const bags = named('bangu-saco-boxe-');
const towers = named('bangu-guarita-');
const fences = named('bangu-cerca-');
const dynamite = named('bangu-dinamite-');
const policeCars = named('bangu-carro-policia');
const centerObstacles = named('bangu-obstaculo-centro-');
const signs = named('bangu-placa-');
const bands = named('bangu-faixa-pintada-');
if (mutante === 'fecha-celas') cells.length = 0;
if (mutante === 'sem-guaritas') towers.length = 0;
if (mutante === 'sem-obstaculos') { ammo.length = 0; policeCars.length = 0; }
if (mutante === 'centro-aberto') centerObstacles.length = 0;
if (mutante === 'sem-placas') signs.length = 0;
if (mutante === 'sem-faixas') bands.length = 0;
const ammoTextures = new Set();
world.root.traverse(object => {
  if (!object.isMesh) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) if (material?.map?.name === 'penitenciaria-caixa-municao') ammoTextures.add(material.map.name);
});
if (mutante === 'sem-textura-municao') ammoTextures.clear();

if (mutante === 'tema-generica') world.root.userData.theme.id = 'penitenciaria-generica';
const theme = world.root.userData.theme || {};
const themeOk = theme.id === 'bangu-zona-oeste' && Array.isArray(theme.palette) && theme.palette.includes('cimento-quente')
  && cells.length >= 8 && benches.length >= 4 && bags.length >= 2
  && towers.length === 4 && fences.length >= 4 && dynamite.length >= 2 && policeCars.length >= 1;
const yardOk = named('bangu-patio-do-sol').length === 1
  && named('penitenciaria-quadra').length === 0 && named('penitenciaria-gol-').length === 0;
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
const ammoTextureOk = ammo.length >= 6 && ammoTextures.has('penitenciaria-caixa-municao');
const centerWeapons = world.pickups?.filter(p => Math.abs(p.x) <= 12 && Math.abs(p.z) <= 12) || [];
const arsenalOk = centerWeapons.length >= 7 && new Set(centerWeapons.map(p => p.kind)).size >= 6;
const centerDensityOk = centerObstacles.length >= 8 && centerObstacles.every(object =>
  Math.abs(object.position.x) <= 18 && Math.abs(object.position.z) <= 22);
const nodes = world.waypoints?.nodes || [];
const from = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
const to = world.nearestWaypoint(world.spawns.B[0].x, world.spawns.B[0].z);
const path = world.findPath(from, to);
const routesOk = nodes.length >= 100 && path.length > 2 && path.every(i => Number.isInteger(i) && nodes[i]);
const ctfOk = world.ctfPoints?.length === 3 && world.spawns?.E?.length === 4 && world.spawns?.B?.length === 4;
const banguIdentityOk = signs.length === 4 && bands.length === 2
  && signs.some(sign => sign.userData.title === 'COMPLEXO DE BANGU')
  && signs.every(sign => sign.userData.identity === 'bangu-zona-oeste')
  && bands.every(band => band.userData.identity === 'cimento-e-patina');
const layoutOk = JSON.stringify(world.spawns) === JSON.stringify({
  E: [-15, -5, 5, 15].map(x => ({ x, z: -42, yaw: 0 })),
  B: [15, 5, -5, -15].map(x => ({ x, z: 42, yaw: Math.PI })),
}) && world.ctfPoints.map(point => `${point.id}:${point.x}:${point.z}`).join('|') === 'E:0:-39|MID:0:0|B:0:39';

console.log(`BAN1 ${themeOk ? 'PASSA' : 'FALHA'} — ${cells.length} celas · ${benches.length} bancos · ${towers.length} guaritas · ${fences.length} cercas`);
console.log(`BAN2 ${cellsOpen ? 'PASSA' : 'FALHA'} — ${cells.length} celas com porta e interior transitáveis`);
console.log(`BAN3 ${obstaclesBlock && ammoTextureOk ? 'PASSA' : 'FALHA'} — ${ammo.length} caixas de munição texturizadas + ${policeCars.length} carro policial com colisão`);
console.log(`BAN4 ${yardOk && arsenalOk && centerDensityOk ? 'PASSA' : 'FALHA'} — pátio sem campo · ${centerObstacles.length} obstáculos · ${centerWeapons.length} armas no miolo`);
console.log(`BAN5 ${routesOk && ctfOk ? 'PASSA' : 'FALHA'} — ${nodes.length} nós · rota ${path.length} passos · 3 pontos CTF`);
console.log(`BAN6 ${banguIdentityOk ? 'PASSA' : 'FALHA'} — ${signs.length}/4 placas autorais · ${bands.length}/2 faixas de pátio`);
console.log(`BAN7 ${layoutOk ? 'PASSA' : 'FALHA'} — bases e coordenadas de objetivo preservadas`);
process.exit(themeOk && cellsOpen && obstaclesBlock && ammoTextureOk && yardOk && arsenalOk && centerDensityOk && routesOk && ctfOk && banguIdentityOk && layoutOk ? 0 : 1);
