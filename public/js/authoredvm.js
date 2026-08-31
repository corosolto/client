import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

// Pilotos deliberadamente isolados: nenhuma outra arma pode optar por este caminho.
export const AUTHORED_VM_MODELS = Object.freeze({
  awp: 'awp-heavy',
  shotgun: 'shotgun-heavy',
});

export const AUTHORED_VM_URLS = Object.freeze({
  'awp-heavy': '/models/viewmodels/coro/heavy/awp-pilot.glb?v=heavy-runtime-1',
  'shotgun-heavy': '/models/viewmodels/coro/heavy/shotgun-pilot.glb?v=heavy-runtime-1',
});

const ADS = Object.freeze({
  shotgun: Object.freeze({
    position: new THREE.Vector3(-0.11, -0.015, -0.08),
    rotation: new THREE.Euler(-0.012, -0.025, 0.0, 'XYZ'),
    scale: 0.94,
  }),
});
const ADS_QUATERNION = Object.freeze({
  shotgun: new THREE.Quaternion().setFromEuler(ADS.shotgun.rotation),
});

const modelFor = (weapon) => AUTHORED_VM_MODELS[weapon] || '';
const clipName = (name = '') => name.split('-').pop().toLowerCase();

export class AuthoredViewModels {
  constructor(parent, onReady = null) {
    this.parent = parent;
    this.onReady = onReady;
    this.loader = new GLTFLoader();
    this.entries = new Map();
    this.weapon = '';
  }

  async load() {
    const jobs = Object.entries(AUTHORED_VM_URLS).map(([model, url]) => new Promise((resolve) => {
      this.loader.load(url, (gltf) => {
        const scene = skeletonClone(gltf.scene);
        scene.name = `authored_vm_${model}`;
        scene.updateMatrixWorld(true);
        let authoredCamera = null;
        scene.traverse((object) => {
          if (!authoredCamera && object.isPerspectiveCamera) authoredCamera = object;
        });
        if (!authoredCamera) {
          console.error(`[authored-vm] ${model} sem câmera exportada`);
          resolve(null);
          return;
        }
        authoredCamera.updateMatrixWorld(true);
        const cameraInverse = authoredCamera.matrixWorld.clone().invert();
        const cameraFov = authoredCamera.fov;
        authoredCamera.removeFromParent();
        scene.applyMatrix4(cameraInverse);
        scene.visible = false;
        scene.traverse((object) => {
          if (!object.isMesh) return;
          object.frustumCulled = false;
          object.castShadow = false;
          object.receiveShadow = false;
        });

        const mount = new THREE.Group();
        mount.name = `authored_vm_mount_${model}`;
        mount.add(scene);
        this.parent.add(mount);
        const mixer = new THREE.AnimationMixer(scene);
        const clips = new Map(gltf.animations.map((clip) => [clipName(clip.name), clip]));
        const idleAction = clips.has('idle') ? mixer.clipAction(clips.get('idle')) : null;
        if (idleAction) {
          idleAction.setLoop(THREE.LoopRepeat, Infinity).play();
          mixer.update(0);
        }
        const weapon = model === 'awp-heavy' ? 'awp' : 'shotgun';
        const entry = {
          model, weapon, scene, mount, mixer, clips, action: idleAction,
          cameraFov, serial: 0,
        };
        mixer.addEventListener('finished', () => {
          if (entry.scene.visible) this._play(weapon, 'idle', { loop: true, fade: 0.035 });
        });
        this.entries.set(model, entry);
        resolve(entry);
      }, undefined, (error) => {
        console.error(`[authored-vm] falha ao carregar ${model}`, error);
        resolve(null);
      });
    }));
    await Promise.all(jobs);
    this.setWeapon(this.weapon);
    this.onReady?.(this);
    return this;
  }

  entry(weapon = this.weapon) { return this.entries.get(modelFor(weapon)); }
  active(weapon = this.weapon) { return Boolean(this.entry(weapon)); }
  fov(weapon = this.weapon) { return this.entry(weapon)?.cameraFov; }

  setWeapon(weapon) {
    const changed = weapon !== this.weapon;
    this.weapon = weapon;
    const model = modelFor(weapon);
    for (const [key, entry] of this.entries) entry.scene.visible = key === model;
    if (changed && this.active(weapon)) this._play(weapon, 'idle', { loop: true, fade: 0.03 });
    return this.active(weapon);
  }

  setAim(weapon, amount) {
    const entry = this.entry(weapon);
    if (!entry) return false;
    const target = ADS[weapon];
    const t = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
    if (!target) {
      entry.mount.position.set(0, 0, 0);
      entry.mount.quaternion.identity();
      entry.mount.scale.setScalar(1);
      return false;
    }
    entry.mount.position.copy(target.position).multiplyScalar(t);
    entry.mount.quaternion.identity();
    entry.mount.quaternion.slerp(ADS_QUATERNION[weapon], t);
    entry.mount.scale.setScalar(THREE.MathUtils.lerp(1, target.scale, t));
    return true;
  }

  update(dt) {
    const entry = this.entry();
    if (entry?.scene.visible) entry.mixer.update(Math.min(0.05, Math.max(0, dt || 0)));
  }

  draw(weapon) {
    if (!this.active(weapon)) return false;
    this._play(weapon, 'idle', { loop: true, fade: 0.02 });
    return true;
  }
  reload(weapon, duration) { return this._play(weapon, 'reload', { duration, fade: 0.025 }); }
  shoot(weapon) { return this._play(weapon, 'fire', { fade: 0.01 }); }

  _play(weapon, name, { loop = false, duration = 0, fade = 0 } = {}) {
    const entry = this.entry(weapon);
    const clip = entry?.clips.get(name);
    if (!entry || !clip) return false;
    const previous = entry.action;
    const action = entry.mixer.clipAction(clip);
    action.reset();
    action.enabled = true;
    action.clampWhenFinished = !loop;
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.timeScale = duration > 0 ? Math.max(0.01, clip.duration / duration) : 1;
    if (previous && previous !== action && fade > 0) {
      previous.fadeOut(fade);
      action.fadeIn(fade);
    } else if (previous && previous !== action) previous.stop();
    action.play();
    entry.action = action;
    entry.serial += 1;
    return true;
  }
}

export function createAuthoredViewModels(parent, onReady) {
  const controller = new AuthoredViewModels(parent, onReady);
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
    window.__authoredVm = controller;
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') controller.load();
  else onReady && queueMicrotask(() => onReady(controller));
  return controller;
}
