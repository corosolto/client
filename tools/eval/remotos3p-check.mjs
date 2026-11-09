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
const atacante = { pos: new THREE.Vector3(3, 0, 4) };
remoto.pos.set(5, 0, 7);
let golpe;
remoto.mesh.ctrl.flinch = (dir, forca) => { golpe = { dir, forca }; };
mp._netMap.set(2, atacante);
mp._netMap.set(3, remoto);
mp._evento({ k: 'hit', a: 2, v: 3, d: 40 });
assert.deepEqual(golpe, { dir: { x: 2, z: 3 }, forca: 0.4 }, 'hit remoto não animou a vítima na direção do disparo');
let direcaoMorte;
remoto.mesh.ctrl.die = dir => { direcaoMorte = dir; };
mp._evento({ k: 'kill', a: 2, v: 3, d: 100 });
assert.deepEqual(direcaoMorte, { x: 2, z: 3 }, 'kill remoto perdeu direção do disparo');
mp.dispose();
console.log('VERDE remotos3p: velocidade lateral 2 m/s');
