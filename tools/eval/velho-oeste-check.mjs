import { THREE, MAPS, initTextures, Game } from './harness.mjs';
import { existsSync, readFileSync } from 'node:fs';

const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const scene = new THREE.Scene();
const world = MAPS.velho_oeste.build(scene, await initTextures());

const named = prefix => {
  const found = [];
  world.root.traverse(object => { if (object.name?.startsWith(prefix)) found.push(object); });
  return found;
};
const buildings = named('predio-');
const wagons = named('sertao-carroca-feira');
const tumbleweeds = named('sertao-poeira-');
const obstacles = named('obstaculo-');
const wantedPosters = named('sertao-aviso-feira-');
const oldWestWindows = named('janela-sertaneja-');
const mandacarus = named('sertao-mandacaru-');
if (mutante === 'sem-mercado') buildings.splice(buildings.findIndex(o => o.name === 'predio-mercado'), 1);
if (mutante === 'sem-carrocas') wagons.length = 0;
if (mutante === 'sem-tumbleweed') tumbleweeds.length = 0;
if (mutante === 'sem-obstaculos-centrais') obstacles.length = 0;
if (mutante === 'centro-aberto') { buildings.splice(8); obstacles.splice(4); }
if (mutante === 'sem-avisos') wantedPosters.length = 0;
if (mutante === 'sem-mandacarus') mandacarus.length = 0;
if (mutante === 'sem-colisao-movel') for (const weed of tumbleweeds) {
  const i = world.colliders.indexOf(weed.userData.collider); if (i >= 0) world.colliders.splice(i, 1);
}
if (mutante === 'sem-colisao-varanda') {
  world.colliders = world.colliders.filter(collider => !collider.tag?.startsWith('varanda-'));
}

if (mutante === 'tema-oeste') world.root.userData.theme.id = 'velho-oeste';
const theme = world.root.userData.theme || {};
const themeOk = theme.id === 'sertao-nordestino' && Array.isArray(theme.palette) && theme.palette.includes('barro')
  && buildings.length >= 8 && buildings.some(o => o.name === 'predio-mercado') && wagons.length >= 3 && mandacarus.length >= 8;
const tumbleweedOk = tumbleweeds.length >= 3 && typeof world.update === 'function';
const before = tumbleweeds.map(o => o.position.clone());
world.update?.(1, 2);
const motion = tumbleweeds.map((o, i) => o.position.distanceTo(before[i]));
if (mutante === 'parada') motion.fill(0);
const motionOk = motion.length >= 3 && Math.min(...motion) >= 1;
const ctfOk = world.ctfPoints?.length === 3 && new Set(world.ctfPoints.map(p => p.id)).size === 3;
const spawnsOk = ['E', 'B'].every(team => world.spawns?.[team]?.length === 4 && world.spawns[team].every(p =>
  p.x > world.bounds.minX && p.x < world.bounds.maxX && p.z > world.bounds.minZ && p.z < world.bounds.maxZ));
const nodes = world.waypoints?.nodes || [];
const start = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
const end = world.nearestWaypoint(world.spawns.B[0].x, world.spawns.B[0].z);
const path = world.findPath(start, end);
const routeOk = nodes.length >= 100 && path.length >= 2 && path.every(i => Number.isInteger(i) && nodes[i]);
const textureNames = new Set();
world.root.traverse(object => {
  if (!object.isMesh) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) if (material?.map?.name) textureNames.add(material.map.name);
});
if (mutante === 'texturas-genericas') textureNames.clear();
const textureOk = [
  ['sertao-sand', 'sertao-chao-de-barro'], ['sertao-wood', 'sertao-madeira'], ['sertao-wood-pale', 'sertao-cal-e-madeira'],
  ['sertao-roof', 'sertao-telha'], ['sertao-cactus', 'sertao-mandacaru'], ['sertao-hay', 'sertao-palha'],
].every(names => names.some(name => textureNames.has(name)));
const requiredObstacles = ['obstaculo-cisterna', 'obstaculo-caixas-feira', 'obstaculo-banco-da-praca', 'obstaculo-barricada'];
const obstaclesOk = requiredObstacles.every(name => obstacles.some(object => object.name === name))
  && obstacles.every(object => Math.abs(object.position.x) <= 12 && Math.abs(object.position.z) <= 12);
const realTextureFiles = ['wood-real-v1.webp', 'dirt-real-v1.webp', 'roof-real-v1.webp', 'cactus-real-v1.webp', 'hay-real-v1.webp', 'metal-real-v1.webp'];
const mapSource = readFileSync(new URL('../../public/js/map_velho_oeste.js', import.meta.url), 'utf8');
const realTexturesOk = realTextureFiles.every(file => existsSync(new URL(`../../public/img/textures/velho_oeste/${file}`, import.meta.url)) && mapSource.includes(file));
const collisionProbe = Object.create(Game.prototype);
collisionProbe.world = { colliders: world.colliders, bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 } };
const movingCollisionOk = tumbleweeds.length >= 3 && tumbleweeds.every(weed => {
  if (!weed.userData.collider || !world.colliders.includes(weed.userData.collider)) return false;
  const before = weed.position.clone(); const body = new THREE.Vector3(before.x, 0, before.z);
  collisionProbe._collide(body, .38); return Math.hypot(body.x - before.x, body.z - before.z) >= .37;
});
const porchColliders = world.colliders.filter(collider => collider.tag?.startsWith('varanda-'));
collisionProbe.world.colliders = world.colliders;
const porchCollisionOk = porchColliders.length >= 8 && porchColliders.every(collider => {
  const x = (collider.minX + collider.maxX) / 2, z = (collider.minZ + collider.maxZ) / 2;
  const body = new THREE.Vector3(x, 0, z); collisionProbe._collide(body, .38);
  return Math.hypot(body.x - x, body.z - z) >= .37;
});
const centerDensityOk = buildings.length >= 12 && obstacles.length >= 8;
const wantedOk = wantedPosters.length === 8 && new Set(wantedPosters.map(poster => poster.userData.title)).size === wantedPosters.length
  && wantedPosters.every(poster => poster.userData.identity === 'feira-sertaneja');
const westernWindowsOk = oldWestWindows.length >= 24 && oldWestWindows.every(window => window.children.length >= 3 && window.userData.material === 'madeira-e-cal');
if (mutante === 'todas-fechadas') for (const window of oldWestWindows) window.userData.state = 'fechada';
if (mutante === 'perigoso-unico') for (const poster of wantedPosters) poster.userData.danger = 'PERIGOSO';
if (mutante === 'recompensa-repetida') for (const poster of wantedPosters) poster.userData.reward = 500;
const openWindows = oldWestWindows.filter(window => window.userData.state === 'aberta' && window.userData.material === 'madeira-e-cal');
const closedWindows = oldWestWindows.filter(window => window.userData.state === 'fechada' && window.userData.material === 'madeira-e-cal');
const woodStatesOk = openWindows.length === 12 && closedWindows.length === 12;
const legacyTerms = ['SALOON', 'XERIFE', 'ESTÁBULO', 'PROCURADO', 'RECOMPENSA'];
const noWesternResidueOk = legacyTerms.every(term => !mapSource.includes(term));
const layoutOk = JSON.stringify(world.spawns) === JSON.stringify({
  E: [-12, -4, 4, 12].map(x => ({ x, z: -41, yaw: 0 })),
  B: [12, 4, -4, -12].map(x => ({ x, z: 41, yaw: Math.PI })),
}) && world.ctfPoints.map(point => `${point.id}:${point.x}:${point.z}`).join('|') === 'E:-12:-34|MID:0:0|B:12:34';

console.log(`SER1 ${themeOk ? 'PASSA' : 'FALHA'} — ${buildings.length} fachadas · ${wagons.length} carroças de feira · ${mandacarus.length} mandacarus${mutante ? ` [mutante ${mutante}]` : ''}`);
console.log(`SER2 ${tumbleweedOk && motionOk ? 'PASSA' : 'FALHA'} — ${tumbleweeds.length} rolos de poeira · menor deslocamento ${motion.length ? Math.min(...motion).toFixed(2) : '0.00'} m`);
console.log(`SER3 ${ctfOk && spawnsOk ? 'PASSA' : 'FALHA'} — ${world.ctfPoints?.length || 0} pontos CTF · ${world.spawns?.E?.length || 0}×${world.spawns?.B?.length || 0} spawns`);
console.log(`SER4 ${routeOk ? 'PASSA' : 'FALHA'} — ${nodes.length} nós · rota entre bases com ${path.length} passos`);
console.log(`SER5 ${textureOk ? 'PASSA' : 'FALHA'} — materiais do sertão: ${[...textureNames].sort().join(', ') || 'nenhum'}`);
console.log(`SER6 ${obstaclesOk ? 'PASSA' : 'FALHA'} — ${obstacles.length} obstáculos temáticos no miolo`);
console.log(`SER7 ${realTexturesOk ? 'PASSA' : 'FALHA'} — ${realTextureFiles.length} texturas presentes e ligadas ao mapa`);
console.log(`SER8 ${movingCollisionOk ? 'PASSA' : 'FALHA'} — ${tumbleweeds.filter(weed => weed.userData.collider).length}/${tumbleweeds.length} rolos de poeira com colisor móvel`);
console.log(`SER9 ${porchCollisionOk ? 'PASSA' : 'FALHA'} — ${porchColliders.length}/8 proteções de varanda bloqueiam o corpo real`);
console.log(`SER10 ${centerDensityOk ? 'PASSA' : 'FALHA'} — ${buildings.length} casas · ${obstacles.length} obstáculos`);
console.log(`SER11 ${wantedOk && noWesternResidueOk ? 'PASSA' : 'FALHA'} — ${wantedPosters.length} avisos de feira · resíduos western ${legacyTerms.filter(term => mapSource.includes(term)).join(', ') || 'nenhum'}`);
console.log(`SER12 ${westernWindowsOk && woodStatesOk ? 'PASSA' : 'FALHA'} — ${oldWestWindows.length} janelas de madeira e cal · ${openWindows.length} abertas + ${closedWindows.length} fechadas`);
console.log(`SER13 ${layoutOk ? 'PASSA' : 'FALHA'} — bases, pontos CTF e coordenadas originais preservados`);
process.exit(themeOk && tumbleweedOk && motionOk && ctfOk && spawnsOk && routeOk && textureOk && obstaclesOk && realTexturesOk && movingCollisionOk && porchCollisionOk && centerDensityOk && wantedOk && westernWindowsOk && woodStatesOk && noWesternResidueOk && layoutOk ? 0 : 1);
