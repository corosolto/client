#!/usr/bin/env node
import { bootGame, initTextures } from './harness.mjs';

const mutante = process.argv.includes('--mutante=sem-auto');
const game = bootGame('praca_poderes', { textures: initTextures(), bots: 0, seed: 20260928 });
game.state = 'live';
game.time = 10;
game.player.weapon = 'ak';
game.player.nextShotAt = 0;
game.player.drawUntil = 0;
game.player.reloadUntil = 0;
game._fireHitscan = () => {};

if (mutante) game._startReload = () => {};

const shot = (mag, res) => {
  game.player.ammo.ak = { mag, res };
  game.player.nextShotAt = 0;
  game.player.reloadUntil = 0;
  game._tryShoot();
  return {
    mag: game.player.ammo.ak.mag,
    reload: game.player.reloadUntil > game.time,
  };
};

const last = shot(1, 30);
const tactical = shot(2, 30);
const emptyReserve = shot(1, 0);
game.online = true;
let prematureRequests = 0;
game._mp = { pedirReload() { prematureRequests++; }, dispose() {} };
const online = shot(1, 30);
game.dispose();

const checks = [
  ['última bala inicia recarga com reserva', last.mag === 0 && last.reload],
  ['pente ainda com bala não inicia recarga', tactical.mag === 1 && !tactical.reload],
  ['reserva vazia não inicia recarga', emptyReserve.mag === 0 && !emptyReserve.reload],
  ['MP aguarda o tiro autoritativo antes da recarga', online.mag === 0 && !online.reload && prematureRequests === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'FALHA'} ${name}`);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
