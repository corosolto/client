/* SPAWNFACE: o primeiro quadro precisa mostrar a rota, não uma parede a um metro.
   A captura 3:2 real de 09/08 abriu fy_escadao no spawn E e mostrou somente a empena
   do bar. A sonda usa o yaw da câmera real e intersecta
   a malha visível na altura do peito. Dois metros são corpo + um passo lateral antes de
   qualquer obstáculo. `--mutante=inverte` aponta o Escadão reto contra a empena e precisa falhar. */
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';

const textures = initTextures();
const mutant = process.argv.includes('--mutante=inverte');
const MIN = 2;

function distancia(world, spawn) {
  const yaw = spawn.yaw;
  // A câmera do jogador usa o sinal oposto ao `forward` dos bots (game.js:4414).
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
  const y = world.groundHeightAt(spawn.x, spawn.z, spawn.y) + 1.4;
  world.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(spawn.x, y, spawn.z),
    new THREE.Vector3(dx, 0, dz), 0, 20,
  );
  // Sprite precisa de câmera para raycast e é decoração, não bloqueio da rota.
  // Pré-filtrar também evita que `noHit` seja avaliado tarde demais.
  const alvos = [];
  world.root.traverse((o) => {
    if (o.isMesh && o.visible !== false && !o.userData.noHit) alvos.push(o);
  });
  const hit = ray.intersectObjects(alvos, false)[0];
  return hit ? hit.distance : Infinity;
}

let bad = 0, total = 0;
for (const mapId of Object.keys(MAPS)) {
  const world = bootGame(mapId, { textures, ctf: true, seed: 12345 }).world;
  const tested = mutant && mapId === 'escadao' ? {
    E: [-2.4, -0.8, 0.8, 2.4].map((x) => ({ x, z: 26, yaw: 0 })),
    B: [-4.5, -1.5, 1.5, 4.5].map((x) => ({ x, z: -34, yaw: Math.PI })),
  } : world.spawns;
  for (const [team, spawns] of Object.entries(tested)) for (const s of spawns) {
    total++;
    const d = distancia(world, s);
    console.log(`${mapId} ${team} (${s.x},${s.z}) frente ${Number.isFinite(d) ? d.toFixed(2) : '>20'} m`);
    if (d < MIN) bad++;
  }
}
if (bad) { console.error(`✗ SPAWNFACE ${bad}/${total} spawn(s) olhando obstáculo a < ${MIN} m`); process.exit(1); }
console.log(`✓ SPAWNFACE ${total}/${total} com rota visível no primeiro quadro`);
