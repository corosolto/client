/* Contrato de vida e rede do mantle: respawn elimina a trajetória antiga, reconciliação
   desloca a base absoluta e o corpo remoto recebe progresso interpolado. */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const game = bootGame('fy_corrego', { textures: initTextures(), ctf: true, seed: 12345 });
const bot = game.bots[0];
bot.mantle = { x0: 1, y0: 2, z0: 3, x1: 4, y1: 5, z1: 6, t: 0.2, dur: 0.4 };
bot.mantleF = 0.5;
bot._spaceHeld = true;
bot._mantleScanAt = 99;
bot.jumpBufferedUntil = 99;
bot.coyoteUntil = 99;
game._respawnEntity(bot);
assert.equal(bot.mantle, null, 'respawn autoritativo preservou trajetória da vida anterior');
assert.equal(bot.mantleF, 0, 'respawn autoritativo preservou progresso do mantle');
assert.equal(bot._spaceHeld, false, 'respawn autoritativo preservou Espaço segurado');
assert.equal(bot.jumpBufferedUntil, 0, 'respawn autoritativo preservou buffer de pulo');
assert.equal(bot.coyoteUntil, 0, 'respawn autoritativo preservou coyote time');

const net = {
  meta: { snapshotHz: 20 }, espectador: false, yourEnt: 1,
  startPing() {}, stopPing() {}, sendInput() { return 0; },
};
const mp = makeNetcode(game, net);
const p = game.player;
p.mantle = { x0: 2, y0: 3, z0: 4, x1: 5, y1: 6, z1: 7, t: 0.1, dur: 0.4 };
p.pos.set(2.5, 3.5, 4.5);
mp._ackOn = true;
mp._corrX = 0.8; mp._corrY = -0.4; mp._corrZ = 0.6;
const antes = {
  pos: p.pos.clone(),
  x0: p.mantle.x0, y0: p.mantle.y0, z0: p.mantle.z0,
  x1: p.mantle.x1, y1: p.mantle.y1, z1: p.mantle.z1,
};
mp.stepPlayer(p, { ax: 0, az: 0, crouch: false, shift: false, jump: false }, 1 / 60);
const dx = p.pos.x - antes.pos.x, dy = p.pos.y - antes.pos.y, dz = p.pos.z - antes.pos.z;
assert(Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.001, 'fixture não aplicou correção de ack');
for (const [campo, delta] of [['x0', dx], ['x1', dx], ['y0', dy], ['y1', dy], ['z0', dz], ['z1', dz]]) {
  assert(Math.abs((p.mantle[campo] - antes[campo]) - delta) < 1e-9,
    `correção de ack não deslocou ${campo} junto com o corpo`);
}

let mantleRemoto = null;
const remoto = {
  alive: true, pos: new THREE.Vector3(), yaw: 0, crouchF: 0, _netBot: false, _netSpd: 0,
  _bufAt: [0, 100], _bufX: [0, 0.2], _bufY: [0, 0.8], _bufZ: [0, 0.2],
  _bufYaw: [0, 0], _bufPitch: [0, 0], _bufMantle: [0.2, 0.8],
  mesh: {
    isGLB: true,
    group: new THREE.Group(),
    ctrl: { aimPitch: 0, setMantle(value) { mantleRemoto = value; }, update() {} },
  },
};
mp._relogioAgora = () => mp.interpAtrasoMs + 50;
mp.updateRemoteBot(remoto, 1 / 60);
assert(Math.abs(mantleRemoto - 0.5) < 1e-9,
  `corpo remoto não recebeu progresso interpolado do mantle; recebeu ${mantleRemoto}`);
mp.dispose();

console.log(`VERDE mantle-network: respawn limpo, correção ${dx.toFixed(3)}/${dy.toFixed(3)}/${dz.toFixed(3)}, remoto ${mantleRemoto.toFixed(2)}`);
