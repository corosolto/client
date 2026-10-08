// Percorre a direção em que cada jogador nasce. O abrigo do time E em z=25
// deve proteger sem fazer W apontar para a parede a 45 cm do spawn.
import assert from 'node:assert/strict';
import { bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const player = game.player;
for (const team of ['E', 'B']) {
  for (const spawn of game.world.spawns[team]) {
    player.pos.set(spawn.x, game.world.groundHeightAt(spawn.x, spawn.z), spawn.z);
    player.vel.set(0, 0, 0);
    player.grounded = true;
    player.mantle = null;
    player.crouchF = 0;
    player.alive = true;
    player.hp = 100;
    player.yaw = spawn.yaw;
    for (let i = 0; i < 90; i++) {
      game.time += 1 / 60;
      game._moveEntity(player, { ax: 0, az: -1, jump: false, crouch: false, shift: false }, 1 / 60);
    }
    const distance = Math.hypot(player.pos.x - spawn.x, player.pos.z - spawn.z);
    assert.ok(distance > 2, `${team} x=${spawn.x}: W só avançou ${distance.toFixed(2)} m em 1,5 s`);
  }
}
console.log('ESCADAO SPAWN EGRESS PASS: 8/8 spawns avançam ao apertar W');
