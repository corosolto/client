import * as THREE from 'three';
import { buildCharacterModel } from './glbchars.js';
import { Game } from './game.js';
import { makeNetcode } from './netgame.js';

export async function createRemoteHarness({ scene, camera, renderer, built, def, sp, gy, weapon, fps }) {
  let mesh = built, remote, attacker, net, mp, now = 1000;
  const render = () => renderer.render(scene, camera);
  const game = {
    scene, camera, state: 'live', time: 0, online: false,
    player: { pos: new THREE.Vector3(sp.x, gy, sp.z - 10), yaw: 0, team: 'B' },
    _defNoLado: (d) => d,
    _syncRemoteWeapon: Game.prototype._syncRemoteWeapon,
  };
  const row = (id, team, x, z, extra) => ({
    id, team, name: id === remote?._netId ? 'Remoto' : 'Atacante', bot: true,
    x, y: gy, z, yaw: Math.PI, pitch: 0, hp: 100, alive: true, weapon,
    ...extra,
  });
  function requireRealMesh(b) {
    if (!b.mesh?.isGLB || !b.mesh.group.getObjectByName('arma-glb')) {
      throw new Error('Arnês remoto exige GLBs carregados para personagem e arma: ' + b.weapon);
    }
  }
  function init({ remoteId = 1, attackerId = 2, remote: remoteFields = {}, attacker: attackerFields = {} } = {}) {
    if (remoteId === attackerId) throw new Error('remoteId e attackerId devem ser distintos');
    mp?.dispose();
    scene.remove(mesh.group);
    mesh = buildCharacterModel(def, { weaponId: weapon });
    remote = { def, team: 'E', pos: new THREE.Vector3(), yaw: 0, alive: true, hp: 100,
      weapon, _meshWeapon: weapon, mesh };
    requireRealMesh(remote);
    scene.add(mesh.group);
    attacker = { team: 'B', pos: new THREE.Vector3(), yaw: 0, alive: true, hp: 100,
      mesh: { group: new THREE.Group() } };
    game.bots = [remote, attacker];
    game.time = 0; now = 1000;
    net = { meta: { events: true, snapshotHz: 20 }, yourEnt: 0, events: [],
      startPing() {}, stopPing() {} };
    mp = makeNetcode(game, net);
    // O timer de telemetria não pertence a uma captura determinística.
    mp.dispose();
    mp._now = () => now;
    const initial = { tick: 0, t: 0, state: 'live', ents: [
      row(remoteId, 'E', sp.x, sp.z, remoteFields),
      row(attackerId, 'B', sp.x + 2, sp.z, attackerFields),
    ] };
    net.snap = initial;
    mp.applySnapshot();
    mp.updateRemoteBot(attacker, 0, true);
    mp.updateRemoteBot(remote, 0);
    render();
    return initial;
  }
  function snapshot(snap, events = []) {
    if (!mp) throw new Error('Chame init antes de snapshot');
    if (events.length) net.events.push({ tick: snap.tick, t: snap.t, list: events });
    net.snap = snap;
    mp.applySnapshot();
    requireRealMesh(remote);
    mesh = remote.mesh;
  }
  function event(e) {
    if (!mp) throw new Error('Chame init antes de event');
    mp._evento(e);
  }
  function view(degrees = 90) {
    if (!mp || !Number.isFinite(degrees)) throw new Error('view exige init e ângulo finito');
    const radius = Math.hypot(camera.position.x - remote.pos.x, camera.position.z - remote.pos.z);
    const angle = THREE.MathUtils.degToRad(degrees);
    camera.position.x = remote.pos.x + radius * Math.sin(angle);
    camera.position.z = remote.pos.z - radius * Math.cos(angle);
    camera.lookAt(remote.pos.x, camera.position.y, remote.pos.z);
    render();
  }
  function step(dt = 1 / fps) {
    if (!mp) throw new Error('Chame init antes de step');
    if (!Number.isFinite(dt) || dt < 0) throw new Error('dt deve ser finito e não negativo');
    now += dt * 1000; game.time += dt;
    mp.updateRemoteBot(attacker, dt, true);
    mp.updateRemoteBot(remote, dt);
    mesh.group.updateMatrixWorld(true);
    render();
    return game.time;
  }
  function state() {
    if (!mp) return null;
    const c = remote.mesh.ctrl, mount = c.tpMount;
    let mountAngleDeg = null;
    if (mount) {
      remote.mesh.group.updateMatrixWorld(true);
      const actual = mount.mount.getWorldQuaternion(new THREE.Quaternion());
      const desired = mount.model.getWorldQuaternion(new THREE.Quaternion()).multiply(mount.carry);
      mountAngleDeg = THREE.MathUtils.radToDeg(actual.angleTo(desired));
    }
    let supportGap = null;
    if (c.ikL) {
      const ik = c.ikL;
      const palm = ik.end.localToWorld(ik.endOffset.clone());
      const grip = ik.gun.localToWorld(ik.fore.clone());
      supportGap = palm.distanceTo(grip);
    }
    return { time: game.time, renderTime: mp.renderTime(), id: remote._netId,
      position: remote.pos.toArray(), yaw: remote.yaw, speed: remote._netSpd || 0,
      alive: remote.alive, weapon: remote.weapon, visible: remote.mesh.group.visible,
      flinchDirection: c._flinchDir && { ...c._flinchDir }, drawTime: c._drawT,
      dead: c.dead, mountAngleDeg, supportGap };
  }
  function dispose() {
    mp?.dispose(); mp = null;
    scene.remove(mesh.group);
    render();
  }
  init();
  return { ready: true, init, snapshot, event, step, view, state, grab: () => renderer.domElement.toDataURL('image/png'), dispose };
}
