/* SPAWNFACE: o primeiro quadro precisa mostrar a rota, não uma parede a um metro.
   A captura 3:2 real de 09/08 abriu fy_escadao no spawn E e mostrou somente a empena
   do bar. A sonda usa o yaw da câmera real e intersecta
   a malha visível na altura do peito. Dois metros são corpo + um passo lateral antes de
   qualquer obstáculo. `--mutante=inverte` devolve os pontos antigos e precisa falhar. */
import { THREE, bootGame, initTextures } from './harness.mjs';

const world = bootGame('fy_escadao', { textures: initTextures(), ctf: true, seed: 12345 }).world;
const mutant = process.argv.includes('--mutante=inverte');
const MIN = 2;

function distancia(spawn) {
  const yaw = spawn.yaw;
  // A câmera do jogador usa o sinal oposto ao `forward` dos bots (game.js:4414).
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
  const y = world.groundHeightAt(spawn.x, spawn.z, spawn.y) + 1.4;
  world.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(spawn.x, y, spawn.z),
    new THREE.Vector3(dx, 0, dz), 0, 20,
  );
  const hit = ray.intersectObject(world.root, true)
    .find((h) => h.object.visible !== false && !h.object.userData.noHit);
  return hit ? hit.distance : Infinity;
}

let bad = 0;
const tested = mutant ? {
  E: [-4.5, -1.5, 1.5, 4.5].map((x) => ({ x, z: 26, yaw: 0 })),
  B: [-4.5, -1.5, 1.5, 4.5].map((x) => ({ x, z: -34, yaw: Math.PI })),
} : world.spawns;
for (const [team, spawns] of Object.entries(tested)) for (const s of spawns) {
  const d = distancia(s);
  console.log(`${team} (${s.x},${s.z}) frente ${Number.isFinite(d) ? d.toFixed(2) : '>20'} m`);
  if (d < MIN) bad++;
}
if (bad) { console.error(`✗ SPAWNFACE ${bad} spawn(s) olhando obstáculo a < ${MIN} m`); process.exit(1); }
console.log('✓ SPAWNFACE 8/8 com rota visível no primeiro quadro');
