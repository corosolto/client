/* ============================================================================
   death-camera-check.mjs — câmera de morto não atravessa piso multinível.

   Caso real (screenshot do dono, 09/08/2026): morto no mirante do fy_escadao,
   o frame mostrava a parte de baixo da laje e bots/pickups suspensos. O piso local
   media 14,28 m; `_updatePlayer()` descia a câmera até y global 0,5.

   A sonda usa Game + mapa reais via harness, mata o jogador no spawn mais alto,
   avança 1,5 s e exige câmera >= chão local + 0,5 m. `--mutante=yglobal`
   substitui groundHeightAt por zero durante a queda e precisa reprovar.
   ============================================================================ */
import { bootGame, initTextures, MAPS } from './harness.mjs';

const mutante = process.argv.includes('--mutante=yglobal');
const textures = initTextures();
const resultados = [];

for (const mapId of Object.keys(MAPS)) {
  const g = bootGame(mapId, { textures, ctf: true, seed: 12345 });
  const pontos = Object.values(g.world.spawns || {}).flat();
  if (!pontos.length || typeof g.world.groundHeightAt !== 'function') continue;
  let spawn = pontos[0], chao = g.world.groundHeightAt(spawn.x, spawn.z);
  for (const s of pontos.slice(1)) {
    const y = g.world.groundHeightAt(s.x, s.z);
    if (y > chao) { spawn = s; chao = y; }
  }
  if (chao < 1) continue; // mapa plano não exercita o defeito.

  g.player.pos.set(spawn.x, chao, spawn.z);
  g.camera.position.set(spawn.x, chao + 1.62, spawn.z);
  g.player.alive = false;
  g.player.respawnAt = 999;
  g.time = 1;
  const realGround = g.world.groundHeightAt;
  if (mutante) g.world.groundHeightAt = () => 0;
  for (let i = 0; i < 90; i++) g._updatePlayer(1 / 60);
  g.world.groundHeightAt = realGround;

  const minimo = chao + 0.5;
  resultados.push({ mapId, chao, cameraY: g.camera.position.y, minimo, ok: g.camera.position.y >= minimo - 0.01 });
}

if (!resultados.length) throw new Error('CAMMORTE não encontrou spawn multinível; não saber medir é vermelho');
for (const r of resultados)
  console.log(`${r.ok ? 'PASSA' : 'FALHA'} CAMMORTE ${r.mapId}: chão ${r.chao.toFixed(2)} m · câmera ${r.cameraY.toFixed(2)} m · mínimo ${r.minimo.toFixed(2)} m`);

const falhas = resultados.filter((r) => !r.ok);
if (falhas.length) process.exitCode = 1;
if (mutante && !falhas.length) {
  console.error('MUTANTE yglobal sobreviveu: a sonda não percebeu a volta ao piso global');
  process.exitCode = 1;
}
