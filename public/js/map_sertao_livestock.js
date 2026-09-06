import * as THREE from 'three';
import { cloneAmbientLifeAsset } from './ambientlife.js';

const TAU = Math.PI * 2;
const HERD = [
  { type: 'goat', asset: 'sertaoGoat', center: [-24, 29], radius: [1.5, .8], period: 28, phase: .2, pace: .45 },
  { type: 'goat', asset: 'sertaoGoat', center: [-21, 26], radius: [1.5, .8], period: 33, phase: 1.7, pace: .45, scale: .93 },
  { type: 'hen', asset: 'sertaoHen', center: [15, 26], radius: [1.5, .8], period: 38, phase: 0, pace: .25 },
  ...[1, 2, 3].map(i => ({ type: 'chick', asset: 'sertaoChick', center: [15, 26], radius: [1.5, .8], period: 38, phase: -i * .3, pace: .22 })),
];

function route(animal, time) {
  const cycle = time % animal.period, duration = animal.period - 4;
  const progress = Math.min(1, cycle / duration);
  const angle = (progress - Math.sin(TAU * progress) / TAU) * TAU + animal.phase;
  return { x: animal.center[0] + Math.sin(angle) * animal.radius[0],
    z: animal.center[1] + Math.cos(angle) * animal.radius[1],
    yaw: Math.atan2(Math.cos(angle) * animal.radius[0], -Math.sin(angle) * animal.radius[1]) };
}

// Um único passe de contato para o terreiro plano; não renderiza os rigs no shadow map.
function createContact(animals) {
  if (!animals.length) return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(35,25,15,.32)'); gradient.addColorStop(.5, 'rgba(35,25,15,.20)');
  gradient.addColorStop(1, 'rgba(35,25,15,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.PlaneGeometry(1, 1); geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geometry, material, animals.length);
  mesh.name = 'sertao-contato-criacao'; mesh.frustumCulled = false;
  mesh.userData.nonCollider = true; mesh.userData.nonSolidSurface = true;
  const transform = new THREE.Object3D();
  function update() {
    for (const [i, a] of animals.entries()) {
      const scale = a.root.scale.x, size = a.type === 'goat' ? [.62, 1.12] : a.type === 'hen' ? [.32, .42] : [.10, .13];
      transform.position.set(a.root.position.x, .008, a.root.position.z);
      transform.rotation.set(0, a.root.rotation.y, 0); transform.scale.set(size[0] * scale, 1, size[1] * scale);
      transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update, dispose() { geometry.dispose(); material.dispose(); texture.dispose(); } };
}

export function createSertaoLivestock(parent, { low = false, enabled = true } = {}) {
  const group = new THREE.Group(); group.name = 'sertao-criacao'; parent.add(group);
  const animals = [], missing = [];
  let time = 0, disposed = false;
  if (enabled) for (const [index, config] of HERD.entries()) {
    if (low && (index === 1 || index === 5)) continue;
    const loaded = cloneAmbientLifeAsset(config.asset);
    if (!loaded) { missing.push(config.asset); continue; }
    const root = new THREE.Group(), model = loaded.model;
    root.name = `sertao-${config.type}-${index}`;
    root.scale.setScalar(config.scale || 1);
    root.userData.fauna = config.type; root.userData.nonCollider = true;
    root.add(model); group.add(root);
    let pace = config.pace;
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      if (Number.isFinite(mesh.userData.gait_speed_mps) && mesh.userData.gait_speed_mps > 0) pace = mesh.userData.gait_speed_mps;
      mesh.castShadow = false; mesh.receiveShadow = true;
      mesh.userData.nonSolidSurface = true;
    });
    const mixer = new THREE.AnimationMixer(model), actions = {};
    for (const name of ['Idle', 'Walk']) {
      const clip = loaded.clips.find(c => c.name === name);
      if (clip) actions[name] = mixer.clipAction(clip);
    }
    animals.push({ ...config, pace: pace * (config.scale || 1), id: root.name, root, model, mixer, actions, state: 'Idle', distance: 0 });
  }
  const contact = createContact(animals);
  if (contact) group.add(contact.mesh);
  function reset() {
    if (disposed) return;
    time = 0;
    for (const a of animals) {
      const p = route(a, 0);
      a.root.position.set(p.x, 0, p.z); a.root.rotation.set(0, p.yaw, 0);
      a.distance = 0; a.state = 'Idle'; a.mixer.stopAllAction();
      a.actions.Idle?.reset().play(); a.mixer.update(0);
    }
    contact?.update();
  }
  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05); time += dt;
    for (const a of animals) {
      const p = route(a, time), distance = Math.hypot(p.x - a.root.position.x, p.z - a.root.position.z);
      const state = distance > .00001 ? 'Walk' : 'Idle';
      a.root.position.set(p.x, 0, p.z); a.root.rotation.set(0, p.yaw, 0);
      a.distance += distance;
      if (a.state !== state && a.actions[state]) {
        a.actions[state].reset().play();
        if (a.actions[a.state]) a.actions[state].crossFadeFrom(a.actions[a.state], .15, false);
      }
      a.state = state;
      if (state === 'Walk' && a.actions.Walk) a.actions.Walk.setEffectiveTimeScale(distance / dt / a.pace);
      a.mixer.update(dt);
    }
    contact?.update();
  }
  function report() {
    let meshes = 0, triangles = 0, casters = 0;
    group.traverse(mesh => {
      if (!mesh.isMesh) return;
      meshes++; triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3 * (mesh.isInstancedMesh ? mesh.count : 1);
      if (mesh.castShadow) casters++;
    });
    return { animals: animals.length, missing, meshes, modelMeshes: meshes - (contact ? 1 : 0),
      contactPasses: contact ? 1 : 0, contactInstances: contact?.mesh.count || 0, triangles, casters, low };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const a of animals) {
      a.mixer.stopAllAction(); a.mixer.uncacheRoot(a.model);
      a.model.traverse(mesh => mesh.skeleton?.dispose());
    }
    contact?.dispose();
    group.removeFromParent();
  }
  reset();
  return { group, animals, update, reset, dispose, report };
}
