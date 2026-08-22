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
const wagons = named('carroca');
const tumbleweeds = named('tumbleweed-');
const obstacles = named('obstaculo-');
const wantedPosters = named('procurado-');
const oldWestWindows = named('janela-oeste-');
if (mutante === 'sem-saloon') buildings.splice(buildings.findIndex(o => o.name === 'predio-saloon'), 1);
if (mutante === 'sem-carrocas') wagons.length = 0;
if (mutante === 'sem-tumbleweed') tumbleweeds.length = 0;
if (mutante === 'sem-obstaculos-centrais') obstacles.length = 0;
if (mutante === 'centro-aberto') { buildings.splice(8); obstacles.splice(4); }
if (mutante === 'sem-cartazes') wantedPosters.length = 0;
if (mutante === 'sem-colisao-movel') for (const weed of tumbleweeds) {
  const i = world.colliders.indexOf(weed.userData.collider); if (i >= 0) world.colliders.splice(i, 1);
}
if (mutante === 'sem-colisao-varanda') {
  world.colliders = world.colliders.filter(collider => !collider.tag?.startsWith('varanda-'));
}

const themeOk = buildings.length >= 8 && buildings.some(o => o.name === 'predio-saloon') && wagons.length >= 3;
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
  ['oeste-sand', 'oeste-sand-real'], ['oeste-wood', 'oeste-wood-real'], ['oeste-wood-pale', 'oeste-wood-pale-real'],
  ['oeste-roof', 'oeste-roof-real'], ['oeste-cactus', 'oeste-cactus-real'], ['oeste-hay', 'oeste-hay-real'],
].every(names => names.some(name => textureNames.has(name)));
const requiredObstacles = ['obstaculo-bebedouro', 'obstaculo-caixas-dinamite', 'obstaculo-amarra-cavalos', 'obstaculo-barricada'];
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
const wantedOk = wantedPosters.length >= 6 && new Set(wantedPosters.map(poster => poster.userData.outlaw)).size === wantedPosters.length;
const greenWindows = [];
world.root.traverse(object => {
  if (object.isMesh && object.material?.color?.getHex?.() === 0x87b2ba) greenWindows.push(object);
});
if (mutante === 'sem-retratos') for (const poster of wantedPosters) delete poster.userData.portraitAsset;
if (mutante === 'cartaz-sobre-janela' && wantedPosters[0] && greenWindows[0]) wantedPosters[0].position.copy(greenWindows[0].position);
const clearPosters = wantedPosters.filter(poster => !greenWindows.some(window =>
  Math.abs(window.position.x - poster.position.x) < .6 && Math.abs(window.position.z - poster.position.z) < 1.4));
const portraitAtlas = new URL('../../public/img/textures/velho_oeste/procurados-atlas-v1.jpg', import.meta.url);
const portraitOk = existsSync(portraitAtlas) && mapSource.includes('procurados-atlas-v1.jpg')
  && wantedPosters.every(poster => poster.userData.portraitAsset === 'procurados-atlas-v1.jpg') && clearPosters.length === wantedPosters.length;
const greenFacadeWindows = greenWindows.filter(window => window.position.y > 2);
if (mutante === 'genero-unico') for (const poster of wantedPosters) poster.userData.heading = 'PROCURADO';
if (mutante === 'janela-verde') oldWestWindows.length = 0;
const femalePosters = wantedPosters.filter(poster => poster.userData.gender === 'feminino' && poster.userData.heading === 'PROCURADA');
const malePosters = wantedPosters.filter(poster => poster.userData.gender === 'masculino' && poster.userData.heading === 'PROCURADO');
const westernWindowsOk = oldWestWindows.length >= 24 && oldWestWindows.every(window => window.children.length >= 3) && greenFacadeWindows.length === 0;
const genderHeadingOk = femalePosters.length === 4 && malePosters.length === 4;
if (mutante === 'todas-fechadas') for (const window of oldWestWindows) window.userData.state = 'fechada';
if (mutante === 'perigoso-unico') for (const poster of wantedPosters) poster.userData.danger = 'PERIGOSO';
if (mutante === 'recompensa-repetida') for (const poster of wantedPosters) poster.userData.reward = 500;
const openWindows = oldWestWindows.filter(window => window.userData.state === 'aberta' && window.userData.material === 'madeira');
const closedWindows = oldWestWindows.filter(window => window.userData.state === 'fechada' && window.userData.material === 'madeira');
const femaleDanger = wantedPosters.filter(poster => poster.userData.gender === 'feminino' && poster.userData.danger === 'PERIGOSA');
const maleDanger = wantedPosters.filter(poster => poster.userData.gender === 'masculino' && poster.userData.danger === 'PERIGOSO');
const uniqueRewards = new Set(wantedPosters.map(poster => poster.userData.reward));
const woodStatesOk = openWindows.length === 12 && closedWindows.length === 12;
const genderDangerOk = femaleDanger.length === 4 && maleDanger.length === 4;
const rewardsOk = uniqueRewards.size === wantedPosters.length;

console.log(`OESTE1 ${themeOk ? 'PASSA' : 'FALHA'} — ${buildings.length} fachadas · ${wagons.length} carroças${mutante ? ` [mutante ${mutante}]` : ''}`);
console.log(`OESTE2 ${tumbleweedOk && motionOk ? 'PASSA' : 'FALHA'} — ${tumbleweeds.length} tumbleweeds · menor deslocamento ${motion.length ? Math.min(...motion).toFixed(2) : '0.00'} m`);
console.log(`OESTE3 ${ctfOk && spawnsOk ? 'PASSA' : 'FALHA'} — ${world.ctfPoints?.length || 0} pontos CTF · ${world.spawns?.E?.length || 0}×${world.spawns?.B?.length || 0} spawns`);
console.log(`OESTE4 ${routeOk ? 'PASSA' : 'FALHA'} — ${nodes.length} nós · rota entre bases com ${path.length} passos`);
console.log(`OESTE5 ${textureOk ? 'PASSA' : 'FALHA'} — materiais dedicados: ${[...textureNames].sort().join(', ') || 'nenhum'}`);
console.log(`OESTE6 ${obstaclesOk ? 'PASSA' : 'FALHA'} — ${obstacles.length} obstáculos temáticos no miolo`);
console.log(`OESTE7 ${realTexturesOk ? 'PASSA' : 'FALHA'} — ${realTextureFiles.length} texturas realistas presentes e ligadas ao mapa`);
console.log(`OESTE8 ${movingCollisionOk ? 'PASSA' : 'FALHA'} — ${tumbleweeds.filter(weed => weed.userData.collider).length}/${tumbleweeds.length} tumbleweeds com colisor móvel`);
console.log(`OESTE9 ${porchCollisionOk ? 'PASSA' : 'FALHA'} — ${porchColliders.length}/8 proteções de varanda bloqueiam o corpo real`);
console.log(`OESTE10 ${centerDensityOk ? 'PASSA' : 'FALHA'} — ${buildings.length} casas · ${obstacles.length} obstáculos`);
console.log(`OESTE11 ${wantedOk ? 'PASSA' : 'FALHA'} — ${wantedPosters.length} cartazes de pistoleiros procurados`);
console.log(`OESTE12 ${portraitOk ? 'PASSA' : 'FALHA'} — atlas ${existsSync(portraitAtlas) ? 'presente' : 'ausente'} · ${clearPosters.length}/${wantedPosters.length} cartazes fora das janelas verdes`);
console.log(`OESTE13 ${westernWindowsOk && genderHeadingOk ? 'PASSA' : 'FALHA'} — ${oldWestWindows.length} janelas western · ${greenFacadeWindows.length} verdes · ${femalePosters.length} PROCURADA · ${malePosters.length} PROCURADO`);
console.log(`OESTE14 ${woodStatesOk && genderDangerOk && rewardsOk ? 'PASSA' : 'FALHA'} — madeira ${openWindows.length} abertas + ${closedWindows.length} fechadas · ${femaleDanger.length} PERIGOSA · ${maleDanger.length} PERIGOSO · ${uniqueRewards.size} recompensas`);
process.exit(themeOk && tumbleweedOk && motionOk && ctfOk && spawnsOk && routeOk && textureOk && obstaclesOk && realTexturesOk && movingCollisionOk && porchCollisionOk && centerDensityOk && wantedOk && portraitOk && westernWindowsOk && genderHeadingOk && woodStatesOk && genderDangerOk && rewardsOk ? 0 : 1);
