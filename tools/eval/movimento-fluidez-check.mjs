/* Fluidez de controle: aceleração visual não pode saltar para velocidade cheia, soltar
   continua parando com controle e contra-strafe preserva a resposta competitiva. */
import assert from 'node:assert/strict';
import { bootGame, initTextures } from './harness.mjs';

const mutanteDuro = process.argv.includes('--mutante=acel-dura');
const game = bootGame('praca_poderes', { textures: initTextures(), ctf: true, seed: 12345 });
const player = game.player;
const DT = 1 / 60;
const input = (az) => ({ ax: 0, az, crouch: false, shift: false, jump: false });

function reset() {
  player.pos.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  player.yaw = 0;
  player.grounded = true;
  player.crouchF = 0;
  player.weapon = 'ak';
  player._spaceHeld = false;
  player.jumpBufferedUntil = 0;
  player.coyoteUntil = 0;
  game.__mutAccel = mutanteDuro ? 44 : 0;
}

reset();
let framesAcel = 0;
for (let n = 1; n <= 120; n++) {
  game._moveEntity(player, input(-1), DT);
  if (Math.hypot(player.vel.x, player.vel.z) >= game._maxSp * 0.90) { framesAcel = n; break; }
}
const tAcel = framesAcel * DT;
assert(tAcel >= 0.14 && tAcel <= 0.24,
  `90% da velocidade deve chegar em 0,14 a 0,24 s; chegou em ${tAcel.toFixed(3)} s`);

for (let n = 0; n < 60; n++) game._moveEntity(player, input(-1), DT);
const velocidadeSolta = Math.hypot(player.vel.x, player.vel.z);
let framesFreio = 0;
for (let n = 1; n <= 120; n++) {
  game._moveEntity(player, input(0), DT);
  if (Math.hypot(player.vel.x, player.vel.z) <= velocidadeSolta * 0.10) { framesFreio = n; break; }
}
const tFreio = framesFreio * DT;
assert(tFreio >= 0.16 && tFreio <= 0.28,
  `soltar deve dissipar 90% em 0,16 a 0,28 s; levou ${tFreio.toFixed(3)} s`);

reset();
for (let n = 0; n < 60; n++) game._moveEntity(player, input(-1), DT);
const velocidadeAntes = Math.hypot(player.vel.x, player.vel.z);
let framesContra = 0;
for (let n = 1; n <= 30; n++) {
  game._moveEntity(player, input(1), DT);
  if (Math.abs(player.vel.z) <= velocidadeAntes * 0.10) { framesContra = n; break; }
}
const tContra = framesContra * DT;
assert(tContra > 0 && tContra <= 0.13,
  `contra-strafe deve estabilizar em até 0,13 s; levou ${tContra.toFixed(3)} s`);

console.log(`VERDE movimento-fluidez: 90% em ${tAcel.toFixed(3)} s, solta em ${tFreio.toFixed(3)} s, contra-strafe em ${tContra.toFixed(3)} s`);
