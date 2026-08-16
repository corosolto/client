import { THREE, MAPS, initTextures } from './harness.mjs';

const mutante = process.argv.includes('--mutante=pivo-base');
const scene = new THREE.Scene();
const world = MAPS.parque_treta.build(scene, await initTextures());
const wheel = world.root.getObjectByName('roda-gigante');
const rim = world.root.getObjectByName('roda-aro');
const chairs = Array.from({ length: 10 }, (_, i) => world.root.getObjectByName(`roda-cadeira-${i}`));
const carousel = world.root.getObjectByName('carrossel-giratorio');
const horses = Array.from({ length: 8 }, (_, i) => world.root.getObjectByName(`carrossel-cavalo-${i}`));
const bird = world.root.getObjectByName('passaro');
const leftWing = bird?.getObjectByName('asa-esquerda');

if (!wheel || !rim || chairs.some(chair => !chair) || !carousel || horses.some(horse => !horse) || !leftWing || typeof world.update !== 'function') {
  console.error('RODA1 FALHA — atrações, pássaros ou hook update ausente');
  process.exit(1);
}

if (mutante) rim.position.y += 12;
const before = new THREE.Vector3();
const after = new THREE.Vector3();
rim.getWorldPosition(before);
world.update(1, 10);
rim.getWorldPosition(after);
const drift = before.distanceTo(after);
const pivotOffset = rim.position.length();
const pivotOk = pivotOffset <= 0.01 && drift <= 0.01;

const worldTilt = chair => new THREE.Euler().setFromQuaternion(chair.getWorldQuaternion(new THREE.Quaternion())).z;
const tiltsA = chairs.map(worldTilt);
const carouselAngleA = carousel.rotation.y;
const horseYA = horses.map(horse => horse.position.y);
const wingAngleA = leftWing.rotation.x;
world.update(0.7, 10.7);
const tiltsB = chairs.map(worldTilt);
const carouselMotion = Math.abs(carousel.rotation.y - carouselAngleA);
const horseMotion = Math.max(...horses.map((horse, i) => Math.abs(horse.position.y - horseYA[i])));
const wingMotion = Math.abs(leftWing.rotation.x - wingAngleA);
const maxTilt = Math.max(...tiltsA.map(Math.abs), ...tiltsB.map(Math.abs));
const maxMotion = Math.max(...tiltsA.map((tilt, i) => Math.abs(tiltsB[i] - tilt)));
const swayOk = maxTilt >= 0.02 && maxTilt <= 0.1 && maxMotion >= 0.01;
const carouselOk = carouselMotion >= 0.1 && horseMotion >= 0.1;
const birdOk = wingMotion >= 0.25;
let meshCount = 0, texturedCount = 0;
world.root.traverse(object => {
  if (!object.isMesh) return;
  meshCount++;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  if (materials.some(material => material?.map)) texturedCount++;
});
const textureCoverage = texturedCount / Math.max(meshCount, 1);
const textureOk = textureCoverage >= 0.82;

console.log(`RODA1 ${pivotOk ? 'PASSA' : 'FALHA'} — pivô→aro ${pivotOffset.toFixed(3)} m · deriva do centro ${drift.toFixed(3)} m${mutante ? ' [mutante pivo-base]' : ''}`);
console.log(`RODA2 ${swayOk ? 'PASSA' : 'FALHA'} — inclinação máxima ${(maxTilt * 180 / Math.PI).toFixed(2)}° · movimento ${(maxMotion * 180 / Math.PI).toFixed(2)}°`);
console.log(`CARROSSEL1 ${carouselOk ? 'PASSA' : 'FALHA'} — giro ${(carouselMotion * 180 / Math.PI).toFixed(2)}° · curso vertical ${horseMotion.toFixed(2)} m`);
console.log(`AVE1 ${birdOk ? 'PASSA' : 'FALHA'} — curso da asa ${(wingMotion * 180 / Math.PI).toFixed(2)}°`);
console.log(`SUPERFICIE1 ${textureOk ? 'PASSA' : 'FALHA'} — ${texturedCount}/${meshCount} malhas com textura (${(textureCoverage * 100).toFixed(1)}%)`);
process.exit(pivotOk && swayOk && carouselOk && birdOk && textureOk ? 0 : 1);
