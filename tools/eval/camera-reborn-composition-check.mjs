import assert from 'node:assert/strict';
import { THREE, Game } from './harness.mjs';

const { Box3, Euler, Group, PerspectiveCamera, Raycaster, Vector3 } = THREE;
const { _updatePlayerTPCamera: update, _updateCrosshairParallax: reticle, _tpDeath: death } = Game.prototype;
const dt = 1 / 60, eye = 1.62;
const wall = new Box3(new Vector3(-3, 0, 0.46), new Vector3(3, 3, 0.65));
const nearWall = new Box3(new Vector3(-3, 0, 0.26), new Vector3(3, 3, 0.34));
const ids = ['bebe-reborn', 'capitao-caveira', 'vlad', 'muro-de-caco'];

function boot(id, { mode = 'third', orbit = 0, side = 1 } = {}) {
  return {
    player: { def: { id }, pos: new Vector3(), yaw: 0, pitch: 0, crouchF: 0, scoped: false, alive: true },
    playerTP: { group: new Group(), selfMeshes: [{ object: { visible: true }, visible: true }] },
    world: { groundHeightAt: () => 0, camBlockers: [], occluders: [] },
    camView: mode, camera: new PerspectiveCamera(70, 16 / 9, 0.06, 1000),
    el: { crosshair: { style: {} } }, bots: [], ray: new Raycaster(), _eyeWorld: new Vector3(0, eye, 0),
    _tpEul: new Euler(), _tpAimEul: new Euler(), _tpFwd: new Vector3(), _tpRight: new Vector3(),
    _ensurePlayerTP() {},
    _updatePlayerTPCamera: update,
    _tpOrbitYaw: orbit, _tpOrbitPitch: 0, _tpShoulderSide: side,
  };
}
function step(g, frames = 1) {
  for (let i = 0; i < frames; i++) update.call(g, dt, eye);
  reticle.call(g);
  const { visibility, left, top } = g.el.crosshair.style;
  return {
    position: g.camera.position.toArray().map(x => +x.toFixed(10)),
    aim: g.camera.quaternion.toArray().map(x => +x.toFixed(10)),
    cross: visibility === 'hidden' ? { visibility } : { visibility, left, top },
    visible: g.playerTP.selfMeshes[0].object.visible,
  };
}
for (const orbit of [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI]) {
  const [short, medium, tall, bulk] = ids.map(id => boot(id, { orbit }));
  const standard = step(medium, 20);
  assert.deepEqual(step(tall, 20), standard, 'tall defaults unchanged');
  assert.deepEqual(step(bulk, 20), standard, 'voluminous defaults unchanged');
  const hip = step(short, 20);
  assert.ok(hip.position[1] < standard.position[1], 'Reborn hip camera is lower at every orbit angle');
  assert.ok(short._tpBoomClear > medium._tpBoomClear, 'Reborn hip boom exposes more of the short body');
  assert.equal(short.player.yaw, 0, 'free orbit must not turn the body');
  assert.equal(short.camera.fov, 70);
  short.player.scoped = medium.player.scoped = true;
  let previous = 0;
  for (let i = 0; i < 8; i++) {
    step(short);
    assert.ok(short._tpAdsF >= previous, 'aim blends in monotonically');
    previous = short._tpAdsF;
  }
  assert.equal(short._tpAdsF, 1, 'aim reaches the settled legacy geometry');
  assert.deepEqual(step(short, 20), step(medium, 28), 'settled ADS keeps the shared camera and reticle');
  short.player.scoped = false;
  assert.deepEqual(step(short, 28), hip, 'leaving ADS restores hip composition');
}
for (const side of [-1, 1]) {
  assert.deepEqual(step(boot(ids[0], { mode: 'shoulder', side })), step(boot(ids[1], { mode: 'shoulder', side })));
  const g = boot(ids[0], { side });
  step(g);
  const free = g._tpBoomClear;
  g.world.camBlockers = [wall];
  assert.ok(step(g).position[2] < wall.min.z, 'camera stays on the player side of an occluding box');
  assert.ok(g._tpBoomClear < free);
  g.world.camBlockers = [nearWall];
  assert.equal(step(g).visible, false, 'very short boom masks the own mesh');
  g.world.camBlockers = [];
  assert.equal(step(g, 30).visible, true, 'mesh and boom recover after leaving the wall');
  assert.equal(g._tpBoomClear, free);
}
function fallen(id) {
  const g = boot(id, { mode: 'first' });
  g.player.alive = false;
  const head = new Group();
  head.position.set(0.12, 0.52, 0);
  g.playerTP.group.add(head);
  g.playerTP.parts = { head };
  death.call(g, dt);
  assert.equal(g.playerTP.group.visible, false, 'the first-person death view hides the self mesh');
  g.camView = 'third';
  g.world.camBlockers = [nearWall];
  death.call(g, dt);
  assert.equal(g.playerTP.selfOccluded, true, 'the corpse follows the same obstruction guard');
  assert.equal(g._eyeWorld.y, 0.52, 'the death camera uses the animated head height');
  g.world.camBlockers = [];
  for (let i = 0; i < 30; i++) death.call(g, dt);
  assert.equal(g.playerTP.selfMeshes[0].object.visible, true, 'pull-in releases the corpse mask');
  return [g._eyeWorld.toArray(), g.camera.position.toArray(), g.camera.quaternion.toArray()];
}
assert.deepEqual(fallen(ids[0]), fallen(ids[1]), 'Reborn does not override the corpse view');
const fp = boot(ids[0], { mode: 'first' });
reticle.call(fp);
assert.deepEqual(fp.el.crosshair.style, { visibility: 'visible', left: '50%', top: '50%' });
console.log('Reborn camera: hip/orbit, controls, ADS, shoulders, occlusion/recovery and 1P reticle');
