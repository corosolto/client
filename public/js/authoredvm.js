import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Runtime contract for the licensed KINEMATION catalog. Binaries are served from
// private storage and never committed to the AGPL repository. Multiple gameplay
// weapons intentionally share one authored mechanical family; no mesh is detached,
// inferred or re-mounted in the browser.
export const AUTHORED_VM_MODELS = Object.freeze({
  awp: 'sniper', ak: 'ak', m4: 'ar', mp5: 'mp5', shotgun: 'shotgun',
  deagle: 'deagle', pistol: 'pistol', m92: 'ak', akm: 'ak', g3: 'g3',
  revolver38: 'revolver', md97: 'ar', carbine: 'ar', m400: 'sniper',
  mosin: 'bolt', rem700: 'sniper', lmg: 'lmg', scar: 'ar', tavor: 'ar',
  famas: 'ar', uzi: 'smg', p90: 'p90', svd: 'svd', g3sg1: 'marksman',
  sks: 'marksman',
});

const CATALOG_VERSION = 'paid-aaa-1';
export const AUTHORED_VM_URLS = Object.freeze(Object.fromEntries(
  [...new Set(Object.values(AUTHORED_VM_MODELS))]
    .map((family) => [family, `/private-assets/viewmodels/${family}/${family}-runtime.glb?v=${CATALOG_VERSION}`]),
));

const HAND_MATERIAL = /CoroSolto_FP_(?:Hand|Glove|Cloth)/i;
const SKIN_MATERIAL = /CoroSolto_FP_Hand/i;
const GLOVE_MATERIAL = /CoroSolto_FP_Glove/i;
const CLIP_ALIASES = Object.freeze({
  reloadtactical: 'reload_tactical', reloadempty: 'reload_empty',
  reloadstart: 'reload_start', reloadloop: 'reload_loop', reloadend: 'reload_end',
  pumpempty: 'pump_empty',
});

const familyFor = (weapon) => AUTHORED_VM_MODELS[weapon] || '';
const clipKey = (name = '') => {
  const key = name.toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
  return CLIP_ALIASES[key.replaceAll('_', '')] || key;
};
const materialsOf = (object) => Array.isArray(object.material) ? object.material : [object.material];

function tintHandMaterial(material, profile) {
  const copy = material.clone();
  if (copy.color) {
    if (SKIN_MATERIAL.test(copy.name)) copy.color.set(profile.skin ?? 0xd19a72);
    else if (GLOVE_MATERIAL.test(copy.name)) copy.color.set(profile.accent ?? 0x202735);
    else copy.color.set(profile.sleeve ?? 0x27364a);
  }
  copy.roughness = Math.max(0.48, copy.roughness ?? 0.6);
  copy.metalness = Math.min(0.08, copy.metalness ?? 0);
  copy.needsUpdate = true;
  return copy;
}

function cameraSpacePackage(gltf, profile, parent, family) {
  const scene = gltf.scene;
  scene.name = `paid_viewmodel_${family}`;
  scene.updateMatrixWorld(true);
  let authoredCamera = null;
  scene.traverse((object) => {
    if (!authoredCamera && object.isPerspectiveCamera) authoredCamera = object;
  });
  if (!authoredCamera) throw new Error(`${family}: embedded VIEWMODEL camera is missing`);
  authoredCamera.updateMatrixWorld(true);
  const cameraFov = authoredCamera.fov;
  const cameraInverse = authoredCamera.matrixWorld.clone().invert();
  authoredCamera.removeFromParent();
  scene.applyMatrix4(cameraInverse);

  const mount = new THREE.Group();
  mount.name = `paid_viewmodel_mount_${family}`;
  mount.add(scene);
  mount.visible = false;
  parent.add(mount);

  const handMeshes = [];
  const weaponMeshes = [];
  scene.traverse((object) => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    object.castShadow = false;
    object.receiveShadow = false;
    const hand = materialsOf(object).some((material) => HAND_MATERIAL.test(material?.name || ''));
    if (hand) {
      handMeshes.push(object);
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => HAND_MATERIAL.test(material?.name || '')
          ? tintHandMaterial(material, profile) : material)
        : tintHandMaterial(object.material, profile);
      object.userData.authoredCharacterHand = profile.id || 'player';
    } else {
      weaponMeshes.push(object);
      for (const material of materialsOf(object)) {
        if (!material) continue;
        material.envMapIntensity = 0.85;
        material.needsUpdate = true;
      }
    }
  });
  return { scene, mount, cameraFov, handMeshes, weaponMeshes };
}

export class AuthoredViewModels {
  constructor(parent, onReady = null, profile = {}) {
    this.parent = parent;
    this.onReady = onReady;
    this.profile = profile;
    this.loader = new GLTFLoader();
    this.entries = new Map();
    this.pending = new Map();
    this.weapon = '';
    this._disposed = false;
  }

  async load() {
    // Families are loaded on first equip. Loading all 15 up front would transfer more
    // than 300 MB and stall the main thread before the match starts.
    if (this.onReady) queueMicrotask(() => this.onReady(this));
    return this;
  }

  async _loadFamily(family) {
    if (!family || this.entries.has(family)) return this.entries.get(family) || null;
    if (this.pending.has(family)) return this.pending.get(family);
    const pending = this.loader.loadAsync(AUTHORED_VM_URLS[family]).then((gltf) => {
      if (this._disposed) return null;
      const visual = cameraSpacePackage(gltf, this.profile, this.parent, family);
      const mixer = new THREE.AnimationMixer(visual.scene);
      const clips = new Map(gltf.animations.map((clip) => [clipKey(clip.name), clip]));
      const entry = {
        family, ...visual, mixer, clips, action: null, queue: [], serial: 0,
        drawTime: 1, drawDuration: 0.32,
      };
      mixer.addEventListener('finished', () => this._continue(entry));
      this.entries.set(family, entry);
      this.pending.delete(family);
      this._idle(entry);
      if (familyFor(this.weapon) === family) entry.mount.visible = true;
      console.info('[paid-viewmodel] ready', family, [...clips.keys()]);
      if (this.onReady) this.onReady(this);
      return entry;
    }).catch((error) => {
      this.pending.delete(family);
      console.error(`[paid-viewmodel] ${family}`, error);
      return null;
    });
    this.pending.set(family, pending);
    return pending;
  }

  entry(id = this.weapon) { return this.entries.get(familyFor(id)); }
  active(id = this.weapon) { return Boolean(this.entry(id)); }
  fov(id = this.weapon) {
    const fov = this.entry(id)?.cameraFov;
    return Number.isFinite(fov) ? fov : 80;
  }

  setWeapon(id) {
    const previous = this.weapon;
    this.weapon = id;
    const family = familyFor(id);
    for (const entry of this.entries.values()) entry.mount.visible = entry.family === family;
    if (!family) return false;
    const entry = this.entries.get(family);
    if (!entry) {
      this._loadFamily(family);
      return false;
    }
    if (previous !== id) this._idle(entry);
    return true;
  }

  setAim() {
    // The paid clips and embedded camera already share one optical space. World-camera
    // zoom remains in Game; moving individual bones here would break authored contacts.
    return this.active();
  }

  update(dt) {
    const entry = this.entry();
    if (!entry?.mount.visible) return;
    const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
    entry.mixer.update(step);
    if (entry.drawTime < entry.drawDuration) {
      entry.drawTime = Math.min(entry.drawDuration, entry.drawTime + step);
      const t = entry.drawTime / entry.drawDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      entry.mount.position.y = THREE.MathUtils.lerp(-0.22, 0, eased);
      entry.mount.rotation.x = THREE.MathUtils.lerp(0.24, 0, eased);
    } else {
      entry.mount.position.set(0, 0, 0);
      entry.mount.rotation.set(0, 0, 0);
    }
  }

  draw(id, duration = 0.32) {
    const entry = this.entry(id);
    if (!entry) return false;
    entry.drawDuration = Math.max(0.12, duration || 0.32);
    entry.drawTime = 0;
    return true;
  }

  reload(id, duration, empty = false) {
    const entry = this.entry(id);
    if (!entry) return false;
    const direct = empty && entry.clips.has('reload_empty')
      ? 'reload_empty'
      : entry.clips.has('reload_tactical')
      ? 'reload_tactical'
      : entry.clips.has('reload_empty')
      ? 'reload_empty'
      : '';
    if (direct) return this._play(entry, direct, { duration, fade: 0.025 });
    const sequence = ['reload_start', 'reload_loop', 'reload_end'].filter((name) => entry.clips.has(name));
    return sequence.length ? this._sequence(entry, sequence, duration) : false;
  }

  shoot(id) {
    const entry = this.entry(id);
    return entry?.clips.has('shoot') ? this._play(entry, 'shoot', { fade: 0.01 }) : false;
  }

  _sequence(entry, names, duration) {
    const total = names.reduce((sum, name) => sum + entry.clips.get(name).duration, 0);
    const timeScale = duration > 0 ? total / duration : 1;
    entry.queue = names.slice(1).map((name) => ({ name, timeScale }));
    return this._play(entry, names[0], { timeScale, fade: 0.02, preserveQueue: true });
  }

  _continue(entry) {
    if (!entry.mount.visible) return;
    const next = entry.queue.shift();
    if (next) this._play(entry, next.name, { timeScale: next.timeScale, preserveQueue: true });
    else this._idle(entry);
  }

  _idle(entry) {
    const clip = entry.clips.get('idle');
    if (!clip) return false;
    entry.queue = [];
    entry.mixer.stopAllAction();
    const action = entry.mixer.clipAction(clip);
    action.reset().play();
    action.paused = true;
    entry.mixer.update(0);
    entry.action = action;
    return true;
  }

  _play(entry, name, { duration = 0, timeScale = 0, fade = 0, preserveQueue = false } = {}) {
    const clip = entry.clips.get(name);
    if (!clip) return false;
    if (!preserveQueue) entry.queue = [];
    const previous = entry.action;
    const action = entry.mixer.clipAction(clip);
    action.reset();
    action.paused = false;
    action.enabled = true;
    action.clampWhenFinished = true;
    action.setLoop(THREE.LoopOnce, 1);
    action.timeScale = timeScale || (duration > 0 ? Math.max(0.01, clip.duration / duration) : 1);
    if (previous && previous !== action && fade > 0) action.crossFadeFrom(previous, fade, false);
    else if (previous && previous !== action) previous.stop();
    action.play();
    entry.action = action;
    entry.serial += 1;
    return true;
  }

  dispose() {
    this._disposed = true;
    for (const entry of this.entries.values()) {
      entry.mixer.stopAllAction();
      entry.mount.removeFromParent();
      entry.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        for (const material of materialsOf(object)) material?.dispose?.();
      });
    }
    this.entries.clear();
    this.pending.clear();
  }
}

export function createAuthoredViewModels(parent, onReady, profile = {}) {
  const controller = new AuthoredViewModels(parent, onReady, profile);
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
    window.__authoredVm = controller;
  }
  const runningInNode = typeof window === 'undefined' || typeof document === 'undefined';
  if (!runningInNode) controller.load();
  else if (onReady) queueMicrotask(() => onReady(controller));
  return controller;
}
