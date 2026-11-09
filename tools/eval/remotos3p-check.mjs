import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const game = bootGame('corrego', { textures: initTextures(), ctf: true, seed: 12345 });
const net = { meta: { snapshotHz: 20 }, espectador: false, yourEnt: 1, startPing() {}, stopPing() {}, sendInput() { return 0; } };
const mp = makeNetcode(game, net);
let lateral;
const remoto = {
  alive: true, pos: new THREE.Vector3(), yaw: 0, _netBot: true, _netSpd: 2,
  _bufAt: [0, 100], _bufX: [0, 0.2], _bufY: [0, 0], _bufZ: [0, 0],
  _bufYaw: [0, 0], _bufPitch: [0, 0], _bufMantle: [-1, -1],
  mesh: { isGLB: true, group: new THREE.Group(), ctrl: { update(...args) { lateral = args[5]; } } },
};
mp._relogioAgora = () => mp.interpAtrasoMs + 50;
mp.updateRemoteBot(remoto, 1 / 60);
assert.equal(lateral, 2, `inclinação remota perdeu velocidade lateral: ${lateral}`);
mp.dispose();
console.log('VERDE remotos3p: velocidade lateral 2 m/s');
