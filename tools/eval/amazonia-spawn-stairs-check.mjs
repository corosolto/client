/* A cabana B próxima ao respawn sobe pelo norte e conserva a janela para o rio. */
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (mutant && mutant !== 'virar-b') throw new Error(`Mutante desconhecido: ${mutant}`);
const game = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007, bots: 0 });
const world = game.world;
const station = world.amazonia.estacoes.find(s => s.x === 17 && s.z === 29);
const foot = { ...station.peEscada };
if (mutant) foot.z = 29 - (foot.z - 29);
const spawnB = world.spawns.B.map(s => Math.hypot(foot.x - s.x, foot.z - s.z));
const spawnE = world.spawns.E.map(s => Math.hypot(foot.x - s.x, foot.z - s.z));
const body = new THREE.Vector3(foot.x, world.groundHeightAt(foot.x, foot.z), foot.z);
game._collide(body, 0.38);
const cabin = world.cabins.find(c => c.x === 17 && c.z === 29);
const riverWindow = cabin.windows.find(w => w.wall === 'left');
const origin = new THREE.Vector3(riverWindow.center[0] - 0.12, riverWindow.center[1], riverWindow.center[2]);
const viewHits = new THREE.Raycaster(origin, new THREE.Vector3(-1, 0, 0), 0, 30).intersectObjects(world.occluders, true);
const checks = {
  northToRespawn: foot.z > station.z && Math.min(...spawnB) < Math.min(...spawnE),
  landingClear: Math.hypot(body.x - foot.x, body.z - foot.z) < 0.05,
  riverWindowClear: viewHits.length === 0,
};
console.log(JSON.stringify({ mutant, foot, nearestB: Math.min(...spawnB), nearestE: Math.min(...spawnE), checks }, null, 2));
game.dispose();
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
