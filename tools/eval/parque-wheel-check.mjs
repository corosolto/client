import { THREE, MAPS, initTextures } from './harness.mjs';

const mutante = process.argv.includes('--mutante=pivo-base');
const mutanteLateral = process.argv.includes('--mutante=lateral-verde');
const mutanteAltura = process.argv.includes('--mutante=altura-baixa');
const mutanteAro = process.argv.includes('--mutante=aro-no-assento');
const scene = new THREE.Scene();
const world = MAPS.parque_treta.build(scene, await initTextures());
const wheel = world.root.getObjectByName('roda-gigante');
const rim = world.root.getObjectByName('roda-aro');
const wheelBase = world.root.getObjectByName('roda-base');
const chairs = Array.from({ length: 10 }, (_, i) => world.root.getObjectByName(`roda-cadeira-${i}`));
const cabins = Array.from({ length: 10 }, (_, i) => world.root.getObjectByName(`roda-cabine-${i}`));
const carousel = world.root.getObjectByName('carrossel-giratorio');
const horses = Array.from({ length: 8 }, (_, i) => world.root.getObjectByName(`carrossel-cavalo-${i}`));
const bird = world.root.getObjectByName('passaro');
const leftWing = bird?.getObjectByName('asa-esquerda');

if (!wheel || !rim || !wheelBase || chairs.some(chair => !chair) || cabins.some(cabin => !cabin) || !carousel || horses.some(horse => !horse) || !leftWing || typeof world.update !== 'function') {
  console.error('RODA1 FALHA — atrações, pássaros ou hook update ausente');
  process.exit(1);
}

if (mutante) rim.position.y += 12;
if (mutanteLateral) wheel.position.x = -25;
if (mutanteAltura) wheel.position.y = 12;
if (mutanteAro) rim.position.z = 0;
const before = new THREE.Vector3();
const after = new THREE.Vector3();
rim.getWorldPosition(before);
world.update(1, 10);
rim.getWorldPosition(after);
const drift = before.distanceTo(after);
const pivotOffset = Math.hypot(rim.position.x, rim.position.y);
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

let menorFolgaLateral = Infinity;
for (let frame = 0; frame <= 24; frame++) {
  world.update(1 / 12, frame / 12);
  const box = new THREE.Box3().setFromObject(wheel);
  menorFolgaLateral = Math.min(menorFolgaLateral, box.min.x - world.bounds.minX);
}
const lateralOk = menorFolgaLateral >= 0.1;

const baseTop = new THREE.Box3().setFromObject(wheelBase).max.y;
let menorFolgaBase = Infinity;
for (let frame = 0; frame <= 120; frame++) {
  world.update(0, (Math.PI * 2 / 0.075) * frame / 120);
  for (const chair of chairs) {
    const chairBottom = new THREE.Box3().setFromObject(chair).min.y;
    menorFolgaBase = Math.min(menorFolgaBase, chairBottom - baseTop);
  }
}
const alturaOk = menorFolgaBase >= 0.1;

const rimMaxZ = new THREE.Box3().setFromObject(rim).max.z;
const cabinMinZ = Math.min(...cabins.map(cabin => new THREE.Box3().setFromObject(cabin).min.z));
const folgaAro = cabinMinZ - rimMaxZ;
const aroOk = folgaAro >= 0.1;

console.log(`RODA1 ${pivotOk ? 'PASSA' : 'FALHA'} — pivô→aro ${pivotOffset.toFixed(3)} m · deriva do centro ${drift.toFixed(3)} m${mutante ? ' [mutante pivo-base]' : ''}`);
console.log(`RODA2 ${swayOk ? 'PASSA' : 'FALHA'} — inclinação máxima ${(maxTilt * 180 / Math.PI).toFixed(2)}° · movimento ${(maxMotion * 180 / Math.PI).toFixed(2)}°`);
console.log(`CARROSSEL1 ${carouselOk ? 'PASSA' : 'FALHA'} — giro ${(carouselMotion * 180 / Math.PI).toFixed(2)}° · curso vertical ${horseMotion.toFixed(2)} m`);
console.log(`AVE1 ${birdOk ? 'PASSA' : 'FALHA'} — curso da asa ${(wingMotion * 180 / Math.PI).toFixed(2)}°`);
console.log(`SUPERFICIE1 ${textureOk ? 'PASSA' : 'FALHA'} — ${texturedCount}/${meshCount} malhas com textura (${(textureCoverage * 100).toFixed(1)}%)`);
console.log(`RODA3 ${lateralOk ? 'PASSA' : 'FALHA'} — menor folga da roda para a lateral verde ${menorFolgaLateral.toFixed(3)} m${mutanteLateral ? ' [mutante lateral-verde]' : ''}`);
console.log(`RODA4 ${alturaOk ? 'PASSA' : 'FALHA'} — menor folga dos assentos para a base ${menorFolgaBase.toFixed(3)} m${mutanteAltura ? ' [mutante altura-baixa]' : ''}`);
console.log(`RODA5 ${aroOk ? 'PASSA' : 'FALHA'} — folga entre cabines e aro ${folgaAro.toFixed(3)} m${mutanteAro ? ' [mutante aro-no-assento]' : ''}`);
process.exit(pivotOk && swayOk && carouselOk && birdOk && textureOk && lateralOk && alturaOk && aroOk ? 0 : 1);
