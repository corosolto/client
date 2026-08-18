import { readFileSync } from 'node:fs';
import { bootGame, MAPS, THREE, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const entry = MAPS.treta_no_gelo;
if (!entry) {
  console.error('GELO FALHA — treta_no_gelo não está no registro de mapas');
  process.exit(1);
}

const scene = new THREE.Scene();
const harnessTextures = await initTextures();
const world = entry.build(scene, harnessTextures);
const objects = [];
world.root.traverse((object) => objects.push(object));
const named = (prefix) => objects.filter((object) => object.name?.startsWith(prefix));

if (MUTANTE === 'sem-paredes') for (const object of [...named('gelo-parede-'), ...named('gelo-estrutura-parede-')]) object.name = 'mutante-sem-parede';
if (MUTANTE === 'sem-fortaleza') for (const object of named('gelo-fortaleza-')) object.name = 'mutante-sem-fortaleza';
if (MUTANTE === 'sem-texturas') {
  for (const object of objects) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (material?.map) material.map.name = 'mutante-sem-textura';
  }
}
if (MUTANTE === 'sem-cobertura') for (const object of named('gelo-cobertura-')) object.name = 'mutante-sem-cobertura';
if (MUTANTE === 'parede-cor') for (const object of named('gelo-estrutura-parede-')) object.material.map.name = 'mutante-cor-parede';
if (MUTANTE === 'gelo-lento') world.speedMulAt = () => .45;
if (MUTANTE === 'gelo-rapido') world.speedMulAt = () => 1;
if (MUTANTE === 'parede-sem-uv') for (const object of named('gelo-estrutura-parede-')) object.geometry.deleteAttribute('uv');
if (MUTANTE === 'passo-concreto') world.surfaceAt = () => 'concrete';
if (MUTANTE === 'parede-sem-colisao') world.colliders = world.colliders.filter((collider) => !String(collider.tag || '').startsWith('gelo-parede-'));

const textures = new Set();
for (const object of objects) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
  if (material?.map?.name) textures.add(material.map.name);
}

const fortress = named('gelo-fortaleza-');
const ramps = named('gelo-rampa-');
const iceWalls = named('gelo-estrutura-parede-');
const cover = named('gelo-cobertura-');
const architectureOk = named('gelo-fortaleza-central').length === 1
  && named('gelo-fortaleza-bastiao-').length === 4
  && fortress.length >= 5 && iceWalls.length === 2 && ramps.length === 0;
const textureOk = ['gelo-pedra', 'gelo-neve', 'gelo-piso'].every((name) => textures.has(name));
const gameplayOk = cover.length >= 12 && world.colliders.length >= 25
  && world.pickups.length >= 20 && world.ctfPoints?.length === 4;
const wallReplacementOk = iceWalls.length === 2 && ramps.length === 0
  && world.colliders.filter((collider) => String(collider.tag || '').startsWith('gelo-parede-')).length === 2;

const spawnE = world.spawns?.E?.[0], spawnB = world.spawns?.B?.[0];
let route = [];
if (spawnE && spawnB) route = world.findPath(world.nearestWaypoint(spawnE.x, spawnE.z), world.nearestWaypoint(spawnB.x, spawnB.z));
const navigationOk = world.waypoints?.nodes?.length >= 100 && route.length >= 8
  && world.waypoints.adj.every((line) => Array.isArray(line));
let previewSource = readFileSync('tools/eval/g2ui-map-previews.mjs', 'utf8');
if (MUTANTE === 'preview-com-arma') previewSource = previewSource.replaceAll('g.vmScene.visible = false', 'g.vmScene.visible = true').replaceAll('mute(d.mesh)', 'd.mesh.visible = true');
const cleanPreviewOk = /g\.vmScene\.visible = false/.test(previewSource)
  && /for \(const d of g\.drops\)[\s\S]{0,80}mute\(d\.mesh\)/.test(previewSource)
  && /#hud,#hud-shortcuts\{display:none!important\}/.test(previewSource);
const wallUvRatios = iceWalls.map((mesh) => {
  const uv = mesh.geometry.getAttribute('uv');
  const index = mesh.geometry.index?.array;
  if (!uv || !index) return 0;
  let visible = 0, mapped = 0;
  for (let offset = 0; offset < index.length; offset += 3) {
    visible++;
    const a = index[offset], b = index[offset + 1], c = index[offset + 2];
    const area = Math.abs((uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))
      - (uv.getY(b)-uv.getY(a))*(uv.getX(c)-uv.getX(a))) / 2;
    if (area > .01) mapped++;
  }
  return visible ? mapped / visible : 0;
});
const wallUvOk = wallUvRatios.length === 2 && wallUvRatios.every((ratio) => ratio === 1);
const wallMaterialOk = iceWalls.every((mesh) => mesh.geometry.type === 'BoxGeometry'
  && mesh.material?.map?.name === 'gelo-pedra');
const game = bootGame('treta_no_gelo', { textures: harnessTextures, ctf: false, seed: 4242 });
game.state = 'live';
if (MUTANTE === 'parede-sem-colisao') game.world.colliders = game.world.colliders.filter((collider) => !String(collider.tag || '').startsWith('gelo-parede-'));
const wallStops = [
  { x: -12, z: -8.5, yaw: 0 },
  { x: 12, z: 8.5, yaw: Math.PI },
].map((wallSpec) => {
  const localStart = -5;
  const startX = wallSpec.x + Math.sin(wallSpec.yaw) * localStart;
  const startZ = wallSpec.z + Math.cos(wallSpec.yaw) * localStart;
  const player = game.player;
  player.pos.set(startX, 0, startZ);
  player.vel.set(0, 0, 0); player.yaw = wallSpec.yaw + Math.PI; player.grounded = true;
  game.keys.KeyW = true;
  for (let frame = 0; frame < 240; frame++) { game.time += 1 / 60; game._updatePlayer(1 / 60); }
  game.keys.KeyW = false;
  const dx = player.pos.x - wallSpec.x, dz = player.pos.z - wallSpec.z;
  return Math.sin(wallSpec.yaw) * dx + Math.cos(wallSpec.yaw) * dz;
});
const wallsBlockingOk = wallReplacementOk && wallMaterialOk && wallStops.every((localZ) => localZ < 0);
const walkDistance = (speedMul) => {
  const player = game.player;
  game.world.speedMulAt = speedMul;
  player.pos.set(-34, 0, -28); player.vel.set(0, 0, 0); player.yaw = Math.PI; player.grounded = true;
  game.keys.KeyW = true;
  const startZ = player.pos.z;
  for (let frame = 0; frame < 180; frame++) { game.time += 1 / 60; game._updatePlayer(1 / 60); }
  game.keys.KeyW = false;
  return player.pos.z - startZ;
};
const slowDistance = walkDistance(() => .45);
const iceSpeedMul = MUTANTE === 'gelo-lento' ? () => .45 : MUTANTE === 'gelo-rapido' ? () => 1 : world.speedMulAt;
const iceDistance = walkDistance(iceSpeedMul);
const icePaceRatio = iceDistance / slowDistance;
const icePaceOk = typeof world.speedMulAt === 'function' && icePaceRatio >= 1.15 && icePaceRatio <= 1.30;
if (MUTANTE === 'passo-concreto') game.world.surfaceAt = () => 'concrete';
const stepSurfaces = [];
game.sfx = { step: (surface) => stepSurfaces.push(surface) };
game.player.pos.set(-34, 0, -28); game.player.vel.set(0, 0, 0); game.player.yaw = Math.PI;
game.player.grounded = true; game.player.stepPhase = 0; game.keys.KeyW = true;
for (let frame = 0; frame < 120; frame++) { game.time += 1 / 60; game._updatePlayer(1 / 60); }
game.keys.KeyW = false;
const { Sfx } = await import('../../public/js/audio.js');
const iceBursts = [];
const synth = Object.create(Sfx.prototype);
synth.pack = null; synth.ensure = () => {}; synth._burst = (...args) => iceBursts.push(args);
synth.step('ice');
const iceStepOk = typeof world.surfaceAt === 'function' && world.surfaceAt(0, 0) === 'ice'
  && stepSurfaces.length >= 2 && stepSurfaces.every((surface) => surface === 'ice')
  && iceBursts.length >= 2 && iceBursts.some((burst) => burst[4] === 'bandpass');
game.dispose();

console.log(`GELO1 ${architectureOk ? 'PASSA' : 'FALHA'} — fortaleza central, quatro bastiões e duas paredes internas`);
console.log(`GELO2 ${textureOk ? 'PASSA' : 'FALHA'} — pedra congelada, neve e piso de gelo texturizados`);
console.log(`GELO3 ${gameplayOk ? 'PASSA' : 'FALHA'} — ${cover.length} coberturas · ${world.colliders.length} colisores · ${world.pickups.length} armas · ${world.ctfPoints?.length || 0} objetivos`);
console.log(`GELO4 ${navigationOk ? 'PASSA' : 'FALHA'} — ${world.waypoints?.nodes?.length || 0} nós · rota entre spawns com ${route.length} passos`);
console.log(`GELO5 ${cleanPreviewOk ? 'PASSA' : 'FALHA'} — preview oculta HUD, viewmodel e armas do chão`);
console.log(`GELO6 ${wallsBlockingOk ? 'PASSA' : 'FALHA'} — paredes de gelo bloquearam o jogador em ${wallStops.map((localZ) => localZ.toFixed(2)).join('/')} m locais`);
console.log(`GELO7 ${icePaceOk ? 'PASSA' : 'FALHA'} — passada no gelo ${icePaceRatio.toFixed(2)}× a passada lenta (${iceDistance.toFixed(2)} m em 3 s)`);
console.log(`GELO8 ${wallUvOk ? 'PASSA' : 'FALHA'} — cobertura UV das paredes ${wallUvRatios.map((ratio) => (ratio*100).toFixed(0)+'%').join('/')}`);
console.log(`GELO9 ${iceStepOk ? 'PASSA' : 'FALHA'} — ${stepSurfaces.length} passos receberam superfície de gelo · ${iceBursts.length} camadas procedurais`);
console.log(`GELO10 ${wallReplacementOk ? 'PASSA' : 'FALHA'} — ${iceWalls.length} paredes substituem ${ramps.length} rampas · colisão sólida nos dois lados`);

process.exit(architectureOk && textureOk && gameplayOk && navigationOk && cleanPreviewOk && wallsBlockingOk && icePaceOk && wallUvOk && iceStepOk && wallReplacementOk ? 0 : 1);
