import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VM_FAMILY, VM_WEAPON } from './data/vmconfig.js';
import { attachMintWeapon, mintPointWorld } from './vmweapon.js';

// Contrato do catálogo KINEMATION: binários licenciados ficam no armazenamento privado.
// O mapa arma→família vem de data/vmconfig.js, a fonte única do viewmodel autorado.
export const AUTHORED_VM_MODELS = Object.freeze(Object.fromEntries(
  Object.entries(VM_WEAPON).map(([weapon, config]) => [weapon, config.family]),
));

const CATALOG_VERSION = 'paid-aaa-2';
const NODE_RUNTIME = typeof process !== 'undefined' && Boolean(process.versions?.node);
export const AUTHORED_VM_URLS = Object.freeze(Object.fromEntries(
  [...new Set([...Object.values(AUTHORED_VM_MODELS), 'grenade'])]
    .map((family) => [family, `/private-assets/viewmodels/${family}/${family}-runtime.glb?v=${CATALOG_VERSION}`]),
));

// Kill-switch global do caminho autorado (?vmauthored=0): tudo cai no legado.
const AUTHORED_KILLED = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('vmauthored') === '0';

// Cache de GLTF parseado no nível do módulo: o preload do boot aquece aqui e
// _loadFamily consome clone — o mesmo download serve qualquer instância de Game.
const GLTF_CACHE = new Map();
let skeletonClonePromise = null;
function loadFamilyGltf(family) {
  if (!GLTF_CACHE.has(family)) {
    GLTF_CACHE.set(family, new GLTFLoader().loadAsync(AUTHORED_VM_URLS[family]).catch((error) => {
      GLTF_CACHE.delete(family);
      throw error;
    }));
  }
  return GLTF_CACHE.get(family);
}
function skeletonCloneOf(scene) {
  if (!skeletonClonePromise) {
    skeletonClonePromise = import('three/addons/utils/SkeletonUtils.js').then((m) => m.clone);
  }
  return skeletonClonePromise.then((clone) => clone(scene));
}
// Aquecimento de famílias antes da partida (chamado pelo boot do main.js em M4).
export function preloadAuthoredFamilies(families = []) {
  if (NODE_RUNTIME || AUTHORED_KILLED) return Promise.resolve([]);
  return Promise.allSettled(families.filter((family) => AUTHORED_VM_URLS[family]).map(loadFamilyGltf));
}

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

// Portão de rollout: família só serve o jogo depois de `ready:true` no vmconfig.
// ?vmready=ak,pistol é o override DEV para calibrar/A-B sem abrir o portão no repo.
const READY_OVERRIDE = new Set(typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('vmready') || '').split(',').filter(Boolean)
  : []);
const familyReady = (family) => Boolean(family)
  && (VM_FAMILY[family]?.ready === true || READY_OVERRIDE.has(family));
const familyFor = (weapon) => {
  if (AUTHORED_KILLED) return '';
  const family = AUTHORED_VM_MODELS[weapon] || '';
  return familyReady(family) ? family : '';
};
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
    this.adsAmount = 0;
    this._ctx = {};
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
    if (!NODE_RUNTIME && !AUTHORED_KILLED && familyReady('grenade')) {
      const prime = () => { if (!this._disposed) this._loadFamily('grenade'); };
      this._utilityPrime = typeof requestIdleCallback === 'function'
        ? requestIdleCallback(prime, { timeout: 2400 })
        : setTimeout(prime, 1400);
    }
    return this;
  }

  async _loadFamily(family) {
    if (NODE_RUNTIME || AUTHORED_KILLED) return null;
    if (!family || this.entries.has(family)) return this.entries.get(family) || null;
    if (this.pending.has(family)) return this.pending.get(family);
    const pending = loadFamilyGltf(family).then(async (gltf) => {
      if (this._disposed) return null;
      // Clone do cache do módulo: o pacote é mutado (câmera removida, tint) e o
      // mesmo parse pode servir outra instância de Game depois.
      const scene = await skeletonCloneOf(gltf.scene);
      const visual = cameraSpacePackage({ scene, animations: gltf.animations }, this.profile, this.parent, family);
      const mixer = new THREE.AnimationMixer(visual.scene);
      const clips = new Map(gltf.animations.map((clip) => [clipKey(clip.name), clip]));
      const entry = {
        family, ...visual, mixer, clips, action: null, queue: [], serial: 0,
        drawTime: 1, drawDuration: 0.32, muzzleLocal: null, ejectLocal: null,
      };
      mixer.addEventListener('finished', () => this._continue(entry));
      this.entries.set(family, entry);
      this.pending.delete(family);
      this._idle(entry);
      // Identidade Mint: a genérica do pack some e a arma do jogador entra no socket.
      if (family !== 'grenade') {
        const owner = familyFor(this.weapon) === family
          ? this.weapon
          : Object.keys(VM_WEAPON).find((id) => VM_WEAPON[id].family === family);
        if (owner) attachMintWeapon(entry, owner);
      }
      if (familyFor(this.weapon) === family && !this.utility) {
        // Chegada tardia entra SUBINDO pelo arco de draw, nunca trocando no meio do idle.
        entry.mount.visible = true;
        this.draw(this.weapon);
      }
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
  fov(id = this.weapon, aspect = 16 / 9) {
    // Espelho do vmFovForAspect: meia-tangente HORIZONTAL constante — o FOV autorado
    // vale no aspecto 16:9 e converte para o aspecto corrente (3:2 não pode regredir).
    const authored = this.entry(id)?.cameraFov;
    const v0 = ((Number.isFinite(authored) ? authored : 80) * Math.PI) / 180;
    const ref = 16 / 9;
    const a = Number.isFinite(aspect) && aspect > 0 ? aspect : ref;
    const halfH = Math.atan(Math.tan(v0 / 2) * ref);
    return (2 * Math.atan(Math.tan(halfH) / a) * 180) / Math.PI;
  }

  setWeapon(id) {
    const previous = this.weapon;
    this.weapon = id;
    const family = familyFor(id);
    for (const entry of this.entries.values()) {
      const visible = this.utility ? entry === this.utility.entry : entry.family === family;
      // Entrada que sai de cena volta ao idle: fila/pose de reload não fica presa.
      if (!visible && entry.mount.visible) this._idle(entry);
      entry.mount.visible = visible;
    }
    if (!family) return false;
    const entry = this.entries.get(family);
    if (!entry) {
      this._loadFamily(family);
      return false;
    }
    if (previous !== id) this._idle(entry);
    if (family !== 'grenade') attachMintWeapon(entry, id);
    return true;
  }

  setAim(id = this.weapon, amount = 0) {
    // Guarda o blend do botão direito; a pose de ADS entra no stack do mount (M6).
    this.adsAmount = Math.min(1, Math.max(0, Number(amount) || 0));
    return this.active(id);
  }

  update(dt, ctx = {}) {
    const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
    this._ctx = ctx;
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
    const active = this.entry();
    for (const entry of this.entries.values()) {
      if (entry === active && entry.mount.visible) continue;
      // Fila/ação pendente termina mesmo com o mount escondido — sem pose presa.
      if (entry.queue.length > 0 || (entry.action && !entry.action.paused)) entry.mixer.update(step);
    }
    if (!active?.mount.visible) return;
    active.mixer.update(step);
    // Dono único do transform do mount: base ∘ arco de draw (ADS/recoil: M5/M6).
    if (active.drawTime < active.drawDuration) {
      active.drawTime = Math.min(active.drawDuration, active.drawTime + step);
      const t = active.drawTime / active.drawDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      active.mount.position.set(
        active.frame.x,
        active.frame.y + THREE.MathUtils.lerp(-0.22, 0, eased),
        active.frame.z,
      );
      active.mount.rotation.x = THREE.MathUtils.lerp(0.24, 0, eased);
    } else {
      active.mount.position.set(active.frame.x, active.frame.y, active.frame.z);
      active.mount.rotation.set(0, 0, 0);
    }
  }

  // Boca do cano da arma VISÍVEL em world space (tracer/flash nascem nela, não na
  // arma legada oculta). Cache do ponto local; M3 troca a fonte pela malha Mint.
  muzzleWorld(id = this.weapon, camera = null) {
    const entry = this.entry(id);
    if (!entry?.mount.visible || !camera) return null;
    // Arma Mint montada tem boca MEDIDA (weaponMetrics); o bbox é só fallback.
    const mint = mintPointWorld(entry, 'muzzle', camera);
    if (mint) return mint;
    if (!entry.muzzleLocal) entry.muzzleLocal = this._gunPoint(entry, 'muzzle');
    if (!entry.muzzleLocal) return null;
    entry.scene.updateWorldMatrix(true, false);
    const v = entry.muzzleLocal.clone();
    entry.scene.localToWorld(v);
    return camera.localToWorld(v);
  }

  sightWorld(id = this.weapon, camera = null) {
    const entry = this.entry(id);
    if (!entry?.mount.visible || !camera) return null;
    return mintPointWorld(entry, 'sight', camera);
  }

  ejectWorld(id = this.weapon, camera = null) {
    const entry = this.entry(id);
    if (!entry?.mount.visible || !camera) return null;
    if (!entry.ejectLocal) entry.ejectLocal = this._gunPoint(entry, 'eject');
    if (!entry.ejectLocal) return null;
    entry.scene.updateWorldMatrix(true, false);
    const v = entry.ejectLocal.clone();
    entry.scene.localToWorld(v);
    return camera.localToWorld(v);
  }

  _gunPoint(entry, kind) {
    const box = new THREE.Box3();
    const meshBox = new THREE.Box3();
    entry.scene.updateWorldMatrix(true, true);
    const inverse = entry.scene.matrixWorld.clone().invert();
    for (const mesh of entry.weaponMeshes) {
      if (!mesh.geometry) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      meshBox.copy(mesh.geometry.boundingBox)
        .applyMatrix4(mesh.matrixWorld)
        .applyMatrix4(inverse);
      box.union(meshBox);
    }
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    if (kind === 'eject') return new THREE.Vector3(box.max.x, center.y, center.z);
    // -Z é a frente no espaço da câmera autorada: a boca fica na face frontal.
    return new THREE.Vector3(center.x, center.y, box.min.z);
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

  inspect(id = this.weapon) {
    const entry = this.entry(id);
    return entry?.clips.has('inspect') ? this._play(entry, 'inspect', { fade: 0.05 }) : false;
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
    // Sem guarda de visibilidade: fila encalhada com mount oculto era pose congelada.
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
