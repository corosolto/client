/* SPAWNFACE: o primeiro quadro precisa mostrar a rota, não uma parede a um metro.
   A captura 3:2 real de 09/08 abriu fy_escadao no spawn E e mostrou somente a empena
   do bar. A sonda usa o yaw da câmera real e intersecta
   a malha visível na altura do peito. Dois metros são corpo + um passo lateral antes de
   qualquer obstáculo. `--mutante=inverte` aponta o Escadão reto contra a empena e precisa falhar. */
import { THREE, MAPS, Game, bootGame, initTextures } from './harness.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const textures = initTextures();
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
const mutant = mutation === 'inverte';
const onlyMap = process.argv.find(arg => arg.startsWith('--map='))?.slice(6);
const MIN = 2;
const authoredMaps = new Set(['escadao', 'ferro_velho', 'amazonia']);
const edits = {
  'ignora-autoria': ['if (!this.world.authoredSpawnYaw ||', 'if (true ||'],
  'bot-sem-conversao': ['return spawn.yaw + (bot ? Math.PI : 0);', 'return spawn.yaw;'],
  'camera-forca-zero': ['return spawn.yaw + (bot ? Math.PI : 0);', 'return bot ? Math.PI : 0;'],
};
if (onlyMap) assert(Object.hasOwn(MAPS, onlyMap), 'mapa conhecido');
if (mutation && !mutant) {
  assert(Object.hasOwn(edits, mutation), 'mutante conhecido');
  const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
  const start = source.indexOf('\n  _spawnYaw('), end = source.indexOf('\n  _pickSpawn(', start);
  assert(start >= 0 && end > start, 'método real de orientação');
  let method = source.slice(start, end).trim();
  const [before, after] = edits[mutation];
  assert.equal(method.split(before).length, 2, 'mutação única na fonte real');
  method = method.replace(before, after);
  Game.prototype._spawnYaw = vm.runInNewContext('({' + method + '})')._spawnYaw;
  console.log('Mutação aplicada: ' + mutation);
}
const failures = [];
function verify(condition, clause, detail) {
  try { assert(condition, clause); }
  catch (error) {
    failures.push({ clause, type: error.name, detail });
    console.error(`✗ ${clause}: ${error.name}: ${detail}`);
  }
}

function distancia(world, spawn, team) {
  const yaw = Game.prototype._spawnYaw.call({ world }, spawn, team);
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

let total = 0, mapCount = 0;
for (const mapId of Object.keys(MAPS).filter(id => !onlyMap || id === onlyMap)) {
  mapCount++;
  const world = bootGame(mapId, { textures, ctf: true, seed: 12345 }).world;
  const tested = mutant && mapId === 'escadao' ? {
    E: [-2.4, -0.8, 0.8, 2.4].map((x) => ({ x, z: 26, yaw: 0 })),
    B: [-4.5, -1.5, 1.5, 4.5].map((x) => ({ x, z: -34, yaw: Math.PI })),
  } : world.spawns;
  for (const [team, spawns] of Object.entries(tested)) for (const s of spawns) {
    total++;
    const d = distancia(world, s, team);
    if (authoredMaps.has(mapId) && !mutant) {
      const yaw = Game.prototype._spawnYaw.call({ world }, s, team);
      const botYaw = Game.prototype._spawnYaw.call({ world }, s, team, true);
      const detail = `${mapId} ${team} (${s.x},${s.z})`;
      verify(Math.abs(Math.atan2(Math.sin(yaw - s.yaw), Math.cos(yaw - s.yaw))) <= 1e-9,
        'SPAWNFACE consumidor respeita orientação autorada', detail);
      verify(Math.abs(Math.atan2(Math.sin(botYaw - yaw - Math.PI), Math.cos(botYaw - yaw - Math.PI))) <= 1e-9,
        'SPAWNFACE bot preserva conversão de meia volta', detail);
    }
    console.log(`${mapId} ${team} (${s.x},${s.z}) frente ${Number.isFinite(d) ? d.toFixed(2) : '>20'} m`);
    verify(d >= MIN, 'SPAWNFACE rota visível', `${mapId} ${team} (${s.x},${s.z}): ${d} m < ${MIN} m`);
  }
}
console.log(JSON.stringify({ mutant: mutation || null, scope: onlyMap || 'all', mapCount, total, failed: failures }));
if (failures.length) { console.error(`✗ SPAWNFACE ${failures.length} violações em ${total} slots`); process.exit(1); }
console.log(`✓ SPAWNFACE ${total}/${total} com rota visível no primeiro quadro`);
