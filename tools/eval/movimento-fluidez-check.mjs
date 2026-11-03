/* Fluidez de controle: aceleração visual não pode saltar para velocidade cheia, soltar
   continua parando com controle e contra-strafe preserva a resposta competitiva. */
import assert from 'node:assert/strict';
import { writeSync } from 'node:fs';
import { bootGame, initTextures } from './harness.mjs';

const TOOL = 'movimento-fluidez-check.mjs';
const pedidos = process.argv.slice(2).filter((a) => a.startsWith('--mutante='));
if (pedidos.length > 1
  || process.argv.slice(2).length !== pedidos.length
  || pedidos.some((a) => a.slice(10) !== 'acel-dura')) {
  console.error(`uso: node tools/eval/${TOOL} [--mutante=acel-dura]`);
  process.exit(2);
}
const mutante = pedidos.length === 1 ? pedidos[0].slice(10) : null;
let applied = false;
const clausula = (tag, corpo) => {
  try { corpo(); } catch (e) {
    if (e instanceof assert.AssertionError) e.clausula = tag;
    throw e;
  }
};
const reporta = (e) => {
  writeSync(2, 'FLUIDEZ_RESULT:' + JSON.stringify({ tool: TOOL, mutante, applied,
    tipo: e?.name || 'Error', clausula: e?.clausula || '' }) + '\n');
  console.error(e?.stack ?? e);
  process.exit(e instanceof assert.AssertionError ? 1 : 2);
};
process.on('uncaughtException', reporta);
process.on('unhandledRejection', reporta);

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
}

reset();
game.__mutAccel = 0;
if (mutante === 'acel-dura') {
  game.__mutAccel = 44;
  applied = true;
  writeSync(2, `POST ${TOOL} mutante=${mutante} aplicado __mutAccel=44\n`);
}
let framesAcel = 0;
for (let n = 1; n <= 120; n++) {
  game._moveEntity(player, input(-1), DT);
  if (Math.hypot(player.vel.x, player.vel.z) >= game._maxSp * 0.90) { framesAcel = n; break; }
}
const tAcel = framesAcel * DT;
clausula('MVF_ACEL', () => assert(tAcel >= 0.14 && tAcel <= 0.24,
  `90% da velocidade deve chegar em 0,14 a 0,24 s; chegou em ${tAcel.toFixed(3)} s`));

for (let n = 0; n < 60; n++) game._moveEntity(player, input(-1), DT);
const velocidadeSolta = Math.hypot(player.vel.x, player.vel.z);
let framesFreio = 0;
for (let n = 1; n <= 120; n++) {
  game._moveEntity(player, input(0), DT);
  if (Math.hypot(player.vel.x, player.vel.z) <= velocidadeSolta * 0.10) { framesFreio = n; break; }
}
const tFreio = framesFreio * DT;
clausula('MVF_FREIO', () => assert(tFreio >= 0.16 && tFreio <= 0.28,
  `soltar deve dissipar 90% em 0,16 a 0,28 s; levou ${tFreio.toFixed(3)} s`));

reset();
for (let n = 0; n < 60; n++) game._moveEntity(player, input(-1), DT);
const velocidadeAntes = Math.hypot(player.vel.x, player.vel.z);
let framesContra = 0;
for (let n = 1; n <= 30; n++) {
  game._moveEntity(player, input(1), DT);
  if (Math.abs(player.vel.z) <= velocidadeAntes * 0.10) { framesContra = n; break; }
}
const tContra = framesContra * DT;
clausula('MVF_CONTRA', () => assert(tContra > 0 && tContra <= 0.13,
  `contra-strafe deve estabilizar em até 0,13 s; levou ${tContra.toFixed(3)} s`));

console.log(`VERDE movimento-fluidez: 90% em ${tAcel.toFixed(3)} s, solta em ${tFreio.toFixed(3)} s, contra-strafe em ${tContra.toFixed(3)} s`);
