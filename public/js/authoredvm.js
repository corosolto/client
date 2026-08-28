import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Contrato do catálogo KINEMATION: binários licenciados ficam no armazenamento privado.
// Armas compartilham famílias mecânicas completas, sem desmontagem no navegador.
export const AUTHORED_VM_MODELS = Object.freeze({
  awp: 'sniper', ak: 'ak', m4: 'ar', mp5: 'mp5', shotgun: 'shotgun',
  deagle: 'deagle', pistol: 'pistol', m92: 'ak', akm: 'ak', g3: 'g3',
  revolver38: 'revolver', md97: 'ar', carbine: 'ar', m400: 'sniper',
  mosin: 'bolt', rem700: 'sniper', lmg: 'lmg', scar: 'ar', tavor: 'ar',
  famas: 'ar', uzi: 'smg', p90: 'p90', svd: 'svd', g3sg1: 'marksman',
  sks: 'marksman',
});

const CATALOG_VERSION = 'paid-aaa-1';
const NODE_RUNTIME = typeof process !== 'undefined' && Boolean(process.versions?.node);
export const AUTHORED_VM_URLS = Object.freeze(Object.fromEntries(
  [...new Set([...Object.values(AUTHORED_VM_MODELS), 'grenade'])]
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

// O enquadramento move o pacote inteiro e preserva contatos. Armas longas ganham
// distância ocular para o aspecto largo do navegador.
const FAMILY_FRAME = Object.freeze({
  pistol:  { x: 0.080, y: -0.040, z: -0.100, fov: 84 },
  revolver:{ x: 0.075, y: -0.042, z: -0.110, fov: 84 },
  shotgun: { x: 0.050, y: -0.045, z: -0.200, fov: 84 },
  sniper:  { x: 0.045, y: -0.040, z: -0.180, fov: 84 },
  bolt:    { x: 0.045, y: -0.040, z: -0.180, fov: 84 },
  lmg:     { x: 0.045, y: -0.040, z: -0.180, fov: 84 },
  p90:     { x: 0.050, y: -0.040, z: -0.140, fov: 84 },
  grenade: { x: 0.045, y: -0.035, z: -0.080, fov: 84 },
  default: { x: 0.050, y: -0.040, z: -0.140, fov: 84 },
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

  const frame = FAMILY_FRAME[family] || FAMILY_FRAME.default;

  const mount = new THREE.Group();
  mount.name = `paid_viewmodel_mount_${family}`;
  mount.add(scene);
  mount.position.set(frame.x, frame.y, frame.z);
  mount.visible = false;
  parent.add(mount);

  const handMeshes = [];
  const weaponMeshes = [];
  const utilityModels = new Map();
  scene.traverse((object) => {
    const utility = /^UTILITY_(HE|FLASH|SMOKE)$/.exec(object.name);
    if (utility) {
      utilityModels.set(utility[1].toLowerCase(), object);
      object.visible = false;
    }
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
  return { scene, mount, cameraFov: Math.max(cameraFov, frame.fov), frame, handMeshes, weaponMeshes, utilityModels };
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
    this.utility = null;
    this._utilityPrime = null;
    this._disposed = false;
  }

  async load() {
    // Famílias entram no primeiro uso; baixar as 15 no boot custaria mais de 300 MB.
    if (this.onReady) queueMicrotask(() => this.onReady(this));
    if (!NODE_RUNTIME) {
      const prime = () => { if (!this._disposed) this._loadFamily('grenade'); };
      this._utilityPrime = typeof requestIdleCallback === 'function'
        ? requestIdleCallback(prime, { timeout: 2400 })
        : setTimeout(prime, 1400);
    }
    return this;
  }

  async _loadFamily(family) {
    if (NODE_RUNTIME) return null;
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
      if (familyFor(this.weapon) === family && !this.utility) entry.mount.visible = true;
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
    for (const entry of this.entries.values()) {
      entry.mount.visible = this.utility ? entry === this.utility.entry : entry.family === family;
    }
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
    // Clipes e câmera paga compartilham o espaço óptico; mover ossos quebraria contatos.
    return this.active();
  }

  update(dt) {
    const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
    if (this.utility) {
      const utility = this.utility;
      utility.entry.mixer.update(step);
      utility.elapsed += step;
      if (!utility.released && utility.elapsed >= utility.releaseAt) {
        utility.released = true;
        utility.onRelease?.();
      }
      if (utility.elapsed >= utility.duration) {
        utility.entry.mount.visible = false;
        this._idle(utility.entry);
        this.utility = null;
        const weaponEntry = this.entry();
        if (weaponEntry) weaponEntry.mount.visible = true;
        if (this.onReady) this.onReady(this);
      }
      return;
    }
    const entry = this.entry();
    if (!entry?.mount.visible) return;
    entry.mixer.update(step);
    if (entry.drawTime < entry.drawDuration) {
      entry.drawTime = Math.min(entry.drawDuration, entry.drawTime + step);
      const t = entry.drawTime / entry.drawDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      entry.mount.position.set(
        entry.frame.x,
        entry.frame.y + THREE.MathUtils.lerp(-0.22, 0, eased),
        entry.frame.z,
      );
      entry.mount.rotation.x = THREE.MathUtils.lerp(0.24, 0, eased);
    } else {
      entry.mount.position.set(entry.frame.x, entry.frame.y, entry.frame.z);
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

  throwUtility(kind, duration = 1.05, onRelease = null) {
    const entry = this.entries.get('grenade');
    const model = entry?.utilityModels.get(kind === 'frag' ? 'he' : kind);
    if (!entry || !model || this.utility) return false;
    for (const candidate of this.entries.values()) candidate.mount.visible = candidate === entry;
    for (const candidate of entry.utilityModels.values()) candidate.visible = candidate === model;
    const names = ['throw_start', 'throw_loop', 'throw_end'].filter((name) => entry.clips.has(name));
    if (!names.length) return false;
    const actualDuration = Math.max(0.7, Number(duration) || 1.05);
    this.utility = {
      entry, elapsed: 0, duration: actualDuration,
      releaseAt: actualDuration * 0.58, released: false, onRelease,
    };
    this._sequence(entry, names, actualDuration);
    return true;
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
    if (this._utilityPrime != null) {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(this._utilityPrime);
      else clearTimeout(this._utilityPrime);
    }
    if (this.utility && !this.utility.released) this.utility.onRelease?.();
    this.utility = null;
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
  const runningInNode = NODE_RUNTIME || typeof window === 'undefined' || typeof document === 'undefined';
  if (!runningInNode) controller.load();
  else if (onReady) queueMicrotask(() => onReady(controller));
  return controller;
}
