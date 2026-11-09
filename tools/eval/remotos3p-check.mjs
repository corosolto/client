import assert from 'node:assert/strict';
import { register } from 'node:module';
if (process.env.REMOTOS_MUTANTE) register(new URL('./remotos3p-mut-loader.mjs', import.meta.url));
const { THREE, bootGame, initTextures } = await import('./harness.mjs');
const { makeNetcode } = await import('../../public/js/netgame.js');

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
game.camera.position.set(100, 0, 0);
mp.updateRemoteBot(remoto, 1 / 60);
assert.equal(remoto.mesh.ctrl.lod, 2, 'remoto distante não recebeu LOD de animação');
const atacante = { pos: new THREE.Vector3(3, 0, 4) };
remoto.pos.set(5, 0, 7);
let golpe;
remoto.mesh.ctrl.flinch = (dir, forca) => { golpe = { dir, forca }; };
mp._netMap.set(2, atacante);
mp._netMap.set(3, remoto);
mp._evento({ k: 'hit', a: 2, v: 3, d: 40 });
assert.deepEqual(golpe, { dir: { x: 2, z: 3 }, forca: 0.4 }, 'hit remoto não animou a vítima na direção do disparo');
let arco = 0, nota = 0;
game._dmgArc = () => { arco++; };
game._noteHit = () => { nota++; };
mp._netMap.set(1, game.player);
mp._evento({ k: 'hit', a: 2, v: 1, d: 20 });
assert.equal(arco, 1, 'dano ao jogador deixou de exibir arco');
assert.equal(nota, 1, 'dano ao jogador deixou de registrar hit');
let direcaoMorte;
remoto.mesh.ctrl.die = dir => { direcaoMorte = dir; };
mp._evento({ k: 'kill', a: 2, v: 3, d: 100 });
assert.deepEqual(direcaoMorte, { x: 2, z: 3 }, 'kill remoto perdeu direção do disparo');
direcaoMorte = 'não chamado';
remoto.alive = false;
mp.updateRemoteBot(remoto, 1 / 60);
assert.equal(direcaoMorte, undefined, 'morte sem evento deixou de usar fallback');
remoto.alive = true;
let saques = 0;
remoto.mesh.ctrl.draw = () => { saques++; };
remoto.weapon = 'awp'; remoto._meshWeapon = 'awp'; remoto.hp = 100;
game._syncRemoteWeapon = (ent, arma) => { ent.weapon = arma; ent._meshWeapon = arma; };
net.snap = { tick: 1, t: 1, ents: [{ id: 3, hp: 100, alive: true, weapon: 'awp', x: 0, y: 0, z: 0, yaw: 0 }] };
mp.applySnapshot();
net.snap = { tick: 2, t: 1.05, ents: [{ id: 3, hp: 100, alive: true, weapon: 'pistol', x: 0, y: 0, z: 0, yaw: 0 }] };
mp.applySnapshot();
assert.equal(saques, 1, 'troca de arma remota não iniciou saque');
mp.dispose();
console.log('VERDE remotos3p: velocidade lateral 2 m/s');
