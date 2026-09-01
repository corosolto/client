import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VM_FAMILY, VM_WEAPON } from './data/vmconfig.js';
import { attachMintWeapon, mintPointWorld, mintPointScene } from './vmweapon.js';
import { VmRecoil } from './vmrecoil.js';
import { weaponCFG } from './weapons.js';

const DEG2RAD = Math.PI / 180;

// Contrato do catálogo KINEMATION: binários licenciados ficam no armazenamento privado.
// O mapa arma→família vem de data/vmconfig.js, a fonte única do viewmodel autorado.
export const AUTHORED_VM_MODELS = Object.freeze(Object.fromEntries(
  Object.entries(VM_WEAPON).map(([weapon, config]) => [weapon, config.family]),
));

const CATALOG_VERSION = 'paid-aaa-3';
const NODE_RUNTIME = typeof process !== 'undefined' && Boolean(process.versions?.node);
export const AUTHORED_VM_URLS = Object.freeze(Object.fromEntries(
  [...new Set([...Object.values(AUTHORED_VM_MODELS), 'grenade'])]
    .map((family) => [family, `/private-assets/viewmodels/${family}/${family}-runtime.glb?v=${CATALOG_VERSION}`]),
));

// ?vmfonte=goldsrc: viewmodel dos moldes CS 1.6 (CC0, FONTE.md) com a arma
// Mint; ?cs16=1 é o atalho que liga todas as famílias + a fonte de uma vez.
const _QS = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const CS16_TUDO = _QS?.get('cs16') === '1';
// ?vmfonte=retarget (?rt=1): braços pagos sobre movimento CS 1.6 retargetado.
// Evidência e custo da escolha: docs/reports/GOLDEN-AK-DECISION.md.
const RETARGET_TUDO = _QS?.get('rt') === '1';
const VM_FONTE = RETARGET_TUDO ? 'retarget' : CS16_TUDO ? 'goldsrc' : (_QS?.get('vmfonte') || '');
const GOLDEN_VM = _QS?.get('vmgolden') !== '0';
// Kill-switch global do caminho autorado (?vmauthored=0): tudo cai no legado.
const AUTHORED_KILLED = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('vmauthored') === '0';

// Cache de GLTF parseado no nível do módulo: o preload do boot aquece aqui e
// _loadFamily consome clone — o mesmo download serve qualquer instância de Game.
const GLTF_CACHE = new Map();
let skeletonClonePromise = null;
function loadFamilyGltf(key) {
  if (!GLTF_CACHE.has(key)) {
    GLTF_CACHE.set(key, new GLTFLoader().loadAsync(urlForKey(key)).catch((error) => {
      GLTF_CACHE.delete(key);
      throw error;
    }));
  }
  return GLTF_CACHE.get(key);
}
function skeletonCloneOf(scene) {
  if (!skeletonClonePromise) {
    skeletonClonePromise = import('three/addons/utils/SkeletonUtils.js').then((m) => m.clone);
  }
  return skeletonClonePromise.then((clone) => clone(scene));
}
// Texturas de braço saem UMA vez de shared/ (o GLB de família leva placeholder
// 1×1 com o mesmo nome); religadas por nome de material no load — fim dos 23 MB.
const SHARED_ARM_TEXTURES = Object.freeze([
  'T_Arm01_B', 'T_Arm01_N', 'T_Arm01_ORM',
  'T_Cloth01_B', 'T_Cloth01_N', 'T_Cloth01_ORM',
  'T_Glove01_B', 'T_Glove01_N', 'T_Glove01_ORM',
]);
const MATERIAL_TEXTURE_BASE = Object.freeze({ Hand: 'T_Arm01', Glove: 'T_Glove01', Cloth: 'T_Cloth01' });
let sharedArmPromise = null;
function sharedArmTextures() {
  if (NODE_RUNTIME || AUTHORED_KILLED) return Promise.resolve(null);
  if (!sharedArmPromise) {
    const loader = new THREE.TextureLoader();
    sharedArmPromise = Promise.all(SHARED_ARM_TEXTURES.map((name) => loader
      .loadAsync(`/private-assets/viewmodels/shared/${name}.webp?v=${CATALOG_VERSION}`)
      .then((texture) => {
        texture.name = name;
        texture.flipY = false;
        texture.colorSpace = name.endsWith('_B') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return [name, texture];
      })))
      .then((pairs) => new Map(pairs))
      .catch((error) => {
        console.error('[paid-viewmodel] shared arm textures', error);
        return null;
      });
  }
  return sharedArmPromise;
}
function bindSharedArmTextures(handMeshes, shared) {
  if (!shared) return;
  for (const mesh of handMeshes) {
    for (const material of materialsOf(mesh)) {
      const kind = /CoroSolto_FP_(Hand|Glove|Cloth)/.exec(material?.name || '')?.[1];
      if (!kind) continue;
      const base = MATERIAL_TEXTURE_BASE[kind];
      material.map = shared.get(`${base}_B`) || material.map;
      material.normalMap = shared.get(`${base}_N`) || material.normalMap;
      const orm = shared.get(`${base}_ORM`);
      if (orm) {
        material.metalnessMap = orm;
        material.roughnessMap = orm;
      }
      material.needsUpdate = true;
    }
  }
}

// Clipes gerais compartilhados (respiração/walk/sprint/equip) — um download,
// tracks por NOME de bone: o mesmo rig UE em todas as famílias os aceita.
let generalMotionsPromise = null;
function generalMotions() {
  if (NODE_RUNTIME || AUTHORED_KILLED) return Promise.resolve(null);
  if (!generalMotionsPromise) {
    generalMotionsPromise = new GLTFLoader()
      .loadAsync(`/private-assets/viewmodels/shared/general-runtime.glb?v=${CATALOG_VERSION}`)
      .then((gltf) => new Map(gltf.animations.map((clip) => [clip.name, clip])))
      .catch((error) => {
        console.error('[paid-viewmodel] general-runtime', error);
        return null;
      });
  }
  return generalMotionsPromise;
}

// Parâmetros de recuo extraídos do pack (recoil.json) — um fetch por sessão.
let recoilParamsPromise = null;
function recoilParams() {
  if (NODE_RUNTIME || AUTHORED_KILLED) return Promise.resolve(null);
  if (!recoilParamsPromise) {
    recoilParamsPromise = fetch(`/private-assets/viewmodels/recoil.json?v=${CATALOG_VERSION}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data?.families || null)
      .catch((error) => {
        console.error('[paid-viewmodel] recoil.json', error);
        return null;
      });
  }
  return recoilParamsPromise;
}

// Aquecimento de famílias + texturas compartilhadas antes da partida (boot M4).
export function preloadAuthoredFamilies(keys = []) {
  if (NODE_RUNTIME || AUTHORED_KILLED) return Promise.resolve([]);
  return Promise.allSettled([
    sharedArmTextures(),
    recoilParams(),
    generalMotions(),
    ...keys.filter((key) => urlForKey(key)).map(loadFamilyGltf),
  ]);
}

// Chaves que o boot deve esperar: as READY do loadout (arma assada tem chave
// própria — família#arma) + granada, se aberta.
export function authoredBootFamilies(weaponIds = []) {
  const keys = new Set(weaponIds.map((id) => entryKeyFor(id)).filter(Boolean));
  if (familyReady('grenade')) keys.add('grenade');
  return [...keys];
}

const _pivot = new THREE.Vector3();
const _pivotRotated = new THREE.Vector3();
const _adsQuat = new THREE.Quaternion();
const _adsAlign = new THREE.Quaternion();
const _adsBlend = new THREE.Quaternion();
const _adsForward = new THREE.Vector3();
const _ADS_AXIS = new THREE.Vector3(0, 0, -1);
const HAND_MATERIAL = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
const SKIN_MATERIAL = /CoroSolto_FP_Hand/i;
const GLOVE_MATERIAL = /CoroSolto_FP_Gloves?/i;
const CLIP_ALIASES = Object.freeze({
  equip: 'equip_rifle', reload: 'reload_tactical', fire: 'shoot',
  reloadtactical: 'reload_tactical', reloadempty: 'reload_empty',
  reloadstart: 'reload_start', reloadloop: 'reload_loop', reloadend: 'reload_end',
  pumpempty: 'pump_empty',
});

// Enquadramento por ARMA da trilha CS 1.6 (goldsrc). MEDIDO no jogo real por
// `tools/eval/vm-frame-calibra.mjs`; o alvo de tamanho é a AK golden aprovada.
const MOLDE_FRAME = Object.freeze({
  awp:        { x: 0.141, y: 0.031, z: 0 },
  ak:         { x: 0.092, y: 0.064, z: 0 },
  m4:         { x: 0.092, y: 0.009, z: 0 },
  mp5:        { x: 0.133, y: 0.068, z: 0 },
  shotgun:    { x: 0.549, y: 0.04, z: -0.24 },
  deagle:     { x: 0.012, y: 0.084, z: 0, drawDrop: 0.513 },
  pistol:     { x: 0.061, y: -0.043, z: 0, drawDrop: 0.367 },
  m92:        { x: 0.086, y: 0.012, z: 0 },
  revolver38: { x: 0.053, y: 0.013, z: 0, drawDrop: 0.333 },
  md97:       { x: 0.064, y: 0.099, z: 0 },
  carbine:    { x: 0.117, y: 0.085, z: 0 },
  mosin:      { x: 0.221, y: -0.14, z: -0.08 },
  lmg:        { x: 0.356, y: 0.173, z: -0.08 },
  scar:       { x: 0.15, y: 0.013, z: 0 },
  famas:      { x: 0.046, y: 0.005, z: 0 },
  uzi:        { x: 0.345, y: 0.177, z: 0 },
  p90:        { x: 0.042, y: -0.046, z: 0 },
  svd:        { x: 0.183, y: 0.12, z: -0.08 },
  sks:        { x: 0.158, y: 0.078, z: -0.08 },
  default:    { x: 0.1, y: 0.02, z: 0 },
});

// O enquadramento move o pacote inteiro e preserva contatos. Armas longas ganham
// distância ocular para o aspecto largo do navegador.
const FAMILY_FRAME = Object.freeze({
  // Âncoras MEDIDAS nos gabaritos CS 1.6 (vm-cs16-frames.mjs, razão angular
  // alvo 1,00; relatórios em baked-preview/<arma>-cs16-template-report.json).
  ak:      { x: 0.112, y: -0.068, z: -0.199, fov: 84, rotDeg: [0.6, -0.1, -5] },
  ar:      { x: 0.096, y: -0.129, z: -0.198, fov: 84, rotDeg: [-8.0, 0.9, 0] },
  mp5:     { x: 0.091, y: -0.187, z: -0.204, fov: 84, rotDeg: [-10.1, 0, 0] },
  deagle:  { x: 0.089, y: -0.152, z: -0.217, fov: 84, rotDeg: [-15.8, -0.2, 0] },
  smg:     { x: 0.206, y: -0.141, z: -0.462, fov: 84, rotDeg: [15.4, 6.0, 0] },
  p90:     { x: 0.075, y: -0.02, z: -0.141, fov: 84, rotDeg: [0, 0, 0] },
  pistol:  { x: 0.270, y: -0.180, z: -0.320, fov: 72, rotDeg: [-7, 30, -15], drawDrop: 0.34 },
  shotgun: { x: 0.057, y: -0.114, z: -0.159, fov: 84, rotDeg: [-8.9, 0, 0] },
  sniper:  { x: 0.118, y: -0.128, z: 0.029, fov: 84, rotDeg: [-11.9, 0, 0] },
  bolt:    { x: 0.055, y: -0.083, z: -0.254, fov: 84, rotDeg: [-1.6, -0.3, 0] },
  g3:      { x: 0.117, y: -0.062, z: -0.202, fov: 84, rotDeg: [1.0, -0.2, 0] },
  marksman:{ x: 0.107, y: -0.07, z: -0.187, fov: 84, rotDeg: [0.5, -0.3, 0] },
  svd:     { x: 0.107, y: -0.06, z: -0.419, fov: 84, rotDeg: [1.9, 0.5, 0] },
  lmg:     { x: 0.153, y: -0.116, z: -0.409, fov: 84, rotDeg: [-5.2, -0.3, 0] },
  // revolver: sem doador CS 1.6 (não existe no jogo fonte) — fica no olho antigo.
  revolver:{ x: 0.075, y: -0.042, z: -0.110, fov: 84 },
  grenade: { x: 0.045, y: -0.035, z: -0.080, fov: 84 },
  default: { x: 0.050, y: -0.040, z: -0.140, fov: 84 },
});

// Portão de rollout: família só serve o jogo depois de `ready:true` no vmconfig.
// ?vmready=ak,pistol é o override DEV para calibrar/A-B sem abrir o portão no repo.
const READY_OVERRIDE = new Set(
  CS16_TUDO || RETARGET_TUDO
    ? Object.keys(VM_FAMILY)
    : (_QS?.get('vmready') || '').split(',').filter(Boolean));
const familyReady = (family) => Boolean(family)
  && (VM_FAMILY[family]?.ready === true || READY_OVERRIDE.has(family));
const familyFor = (weapon) => {
  if (AUTHORED_KILLED) return '';
  const family = AUTHORED_VM_MODELS[weapon] || '';
  return familyReady(family) ? family : '';
};
// Arma "baked" tem GLB próprio (Mint assada dentro, offline): entry por ARMA.
const weaponBaked = (weapon) => VM_WEAPON[weapon]?.baked === true;
const entryKeyFor = (weapon) => {
  const family = familyFor(weapon);
  if (!family) return '';
  if (VM_FONTE === 'retarget') return `rt#${weapon}`;
  if (VM_FONTE === 'goldsrc') return `gs#${weapon}`;
  if (GOLDEN_VM && VM_WEAPON[weapon]?.golden === true) return `gold#${weapon}`;
  return weaponBaked(weapon) ? `${family}#${weapon}` : family;
};
const urlForKey = (key) => {
  if (key.startsWith('gold#')) {
    const weapon = key.slice(5);
    const version = weapon === 'ak' ? 'golden-ak-4' : `golden-${weapon}-1`;
    return `/models/viewmodels/coro/${weapon}-hires.glb?v=${version}`;
  }
  if (key.startsWith('gs#') || key.startsWith('rt#')) {
    const dir = key.startsWith('rt#') ? 'retarget-vm' : 'goldsrc-vm';
    return `/private-assets/viewmodels/${dir}/${key.slice(3)}-runtime.glb?v=${CATALOG_VERSION}`;
  }
  if (key.includes('#')) {
    const [family, weapon] = key.split('#');
    if (VM_WEAPON[weapon]?.runtime === 'family') return AUTHORED_VM_URLS[family];
    return `/private-assets/viewmodels/${family}/${weapon}-baked-runtime.glb?v=${CATALOG_VERSION}`;
  }
  return AUTHORED_VM_URLS[key];
};
const clipKey = (name = '') => {
  const key = name.toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
  return CLIP_ALIASES[key.replaceAll('_', '')] || key;
};
const materialsOf = (object) => Array.isArray(object.material) ? object.material : [object.material];

// Tint multiplica a textura; estes pesos preservam a camuflagem de luva e manga.
// Evidência da manga chapada: docs/reports/GOLDEN-AK-DECISION.md.
const PESO_TINT = Object.freeze({ pele: 1, luva: 0.55, manga: 0.5 });

function tintHandMaterial(material, profile) {
  const copy = material.clone();
  if (copy.color) {
    // O tint antecede bindSharedArmTextures; `copy.map` ainda é null neste ponto.
    const aplica = (hex, peso) => {
      copy.color.set(hex);
      if (peso < 1) copy.color.lerp(new THREE.Color(0xffffff), 1 - peso);
    };
    if (SKIN_MATERIAL.test(copy.name)) aplica(profile.skin ?? 0xd19a72, PESO_TINT.pele);
    else if (GLOVE_MATERIAL.test(copy.name)) aplica(profile.accent ?? 0x202735, PESO_TINT.luva);
    else aplica(profile.sleeve ?? 0x27364a, PESO_TINT.manga);
  }
  copy.roughness = Math.max(0.48, copy.roughness ?? 0.6);
  copy.metalness = Math.min(0.08, copy.metalness ?? 0);
  copy.needsUpdate = true;
  return copy;
}

function cameraSpacePackage(gltf, profile, parent, family, sourceKey = '') {
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
  const cameraAspect = authoredCamera.aspect;
  const cameraInverse = authoredCamera.matrixWorld.clone().invert();
  authoredCamera.removeFromParent();
  scene.applyMatrix4(cameraInverse);

  const molde = VM_FONTE === 'goldsrc' || VM_FONTE === 'retarget';
  const golden = sourceKey.startsWith('gold#');
  // A trilha retarget ainda não tem enquadramento medido: a manga do pack entra
  // por cima da arma e o C5 só fecha escondendo o cano (VIEWMODEL-INVENTARIO).
  const frame = golden
    ? { x: 0, y: 0, z: 0, fov: cameraFov }
    : molde
    ? { ...(VM_FONTE === 'goldsrc'
      ? MOLDE_FRAME[sourceKey.split('#')[1]] || MOLDE_FRAME.default
      : { x: 0, y: 0, z: 0 }), fov: 74 }
    : (FAMILY_FRAME[family] || FAMILY_FRAME.default);

  const mount = new THREE.Group();
  mount.name = `paid_viewmodel_mount_${family}`;
  mount.add(scene);
  mount.position.set(frame.x, frame.y, frame.z);
  if (molde) {
    // espelho do cl_righthand: o molde cru é canhoto; det<0 exige DoubleSide.
    mount.scale.x = -1;
    scene.traverse((o) => { if (o.isMesh) materialsOf(o).forEach((m) => { if (m) m.side = THREE.DoubleSide; }); });
  }
  mount.visible = false;
  parent.add(mount);

  const handMeshes = [];
  const weaponMeshes = [];
  const utilityModels = new Map();
  const caixaArma = new THREE.Box3();
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
      if (!golden) {
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => HAND_MATERIAL.test(material?.name || '')
            ? tintHandMaterial(material, profile) : material)
          : tintHandMaterial(object.material, profile);
      }
      object.userData.authoredCharacterHand = profile.id || 'player';
    } else {
      weaponMeshes.push(object);
      if (molde && !/MAG/i.test(object.name)) {
        object.updateWorldMatrix(true, false);
        caixaArma.expandByObject(object);
      }
      for (const material of materialsOf(object)) {
        if (!material) continue;
        material.envMapIntensity = 0.85;
        material.needsUpdate = true;
      }
    }
  });
  const _dim = caixaArma.isEmpty() ? null : caixaArma.getSize(new THREE.Vector3());
  const weaponLength = _dim ? Math.max(_dim.x, _dim.y, _dim.z) : 0;
  // O molde CS 1.6 chega a ~23 unidades por metro. Reescala em torno da câmera
  // (na origem): a projeção não muda e frame, recuo e ADS voltam a valer metro.
  if (molde && weaponLength > 0) {
    const alvo = weaponCFG(sourceKey.split('#')[1]).len || 0.9;
    const k = weaponLength / alvo;
    if (k > 1.5) mount.scale.multiplyScalar(1 / k);
  }
  return {
    scene, mount, cameraFov: golden || molde ? Math.max(cameraFov, frame.fov) : frame.fov, cameraAspect,
    frame, handMeshes, weaponMeshes, utilityModels,
  };
}

export class AuthoredViewModels {
  constructor(parent, onReady = null, profile = {}) {
    this.parent = parent;
    this.onReady = onReady;
    this.profile = profile;
    this.adsAmount = 0;
    this._ctx = {};
    this._time = 0;
    this.recoil = new VmRecoil();
    this._recoilParams = null;
    this._recoilFamily = '';
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
    recoilParams().then((params) => {
      if (this._disposed || !params) return;
      this._recoilParams = params;
      this._applyRecoilFamily();
    });
    if (!NODE_RUNTIME && !AUTHORED_KILLED && familyReady('grenade')) {
      const prime = () => { if (!this._disposed) this._loadFamily('grenade'); };
      this._utilityPrime = typeof requestIdleCallback === 'function'
        ? requestIdleCallback(prime, { timeout: 2400 })
        : setTimeout(prime, 1400);
    }
    return this;
  }

  async _loadFamily(key) {
    if (NODE_RUNTIME || AUTHORED_KILLED) return null;
    if (!key || this.entries.has(key)) return this.entries.get(key) || null;
    if (this.pending.has(key)) return this.pending.get(key);
    // Chave goldsrc é `gs#<arma>`: família REAL vem da arma. Com 'gs' o
    // VM_FAMILY dava undefined e nada da família valia (31/08).
    const bruta = key.split('#')[0];
    const armaDaChave = key.includes('#') ? key.split('#')[1] : '';
    const family = (bruta === 'gs' || bruta === 'rt' || bruta === 'gold')
      ? (VM_WEAPON[armaDaChave]?.family || bruta) : bruta;
    const bakedWeapon = key.includes('#') ? key.split('#')[1] : '';
    const golden = key.startsWith('gold#');
    const pending = Promise.all([
      loadFamilyGltf(key),
      golden ? Promise.resolve(null) : sharedArmTextures(),
      golden ? Promise.resolve(null) : generalMotions(),
    ])
      .then(async ([gltf, shared, general]) => {
      if (this._disposed) return null;
      // Clone do cache do módulo: o pacote é mutado (câmera removida, tint) e o
      // mesmo parse pode servir outra instância de Game depois.
      const scene = await skeletonCloneOf(gltf.scene);
      const visual = cameraSpacePackage({ scene, animations: gltf.animations }, this.profile, this.parent, family, key);
      if (!golden) bindSharedArmTextures(visual.handMeshes, shared);
      const mixer = new THREE.AnimationMixer(visual.scene);
      const clips = new Map(gltf.animations.map((clip) => [clipKey(clip.name), clip]));
      const entry = {
        key, family, golden: key.startsWith('gold#'), ...visual, mixer, clips, action: null, queue: [], serial: 0,
        drawTime: 1, drawDuration: 0.32, muzzleLocal: null, ejectLocal: null,
        state: 'idle', stateUntil: 0, shootCycle: 0,
      };
      mixer.addEventListener('finished', (event) => {
        if (event.action === entry.action) this._continue(entry);
      });
      this._setupGeneralMotion(entry, general);
      this.entries.set(key, entry);
      this.pending.delete(key);
      this._idle(entry);
      if (bakedWeapon) {
        // GLB assado: a Mint já está DENTRO (offline) com sockets nomeados —
        // nada de montagem ao vivo; só referencia os nós do contrato.
        const mint = visual.scene.getObjectByName(`MINT_WEAPON_${bakedWeapon.toUpperCase()}`);
        if (mint) entry.mint = { active: mint, wraps: new Map(), weaponId: bakedWeapon };
        entry.sockets = {
          muzzle: visual.scene.getObjectByName('SOCKET_MINT_MUZZLE') || null,
          sight: visual.scene.getObjectByName('SOCKET_MINT_SIGHT') || null,
        };
      } else if (family !== 'grenade') {
        // Identidade Mint montada ao vivo (famílias ainda não assadas).
        const owner = entryKeyFor(this.weapon) === key
          ? this.weapon
          : Object.keys(VM_WEAPON).find((id) => VM_WEAPON[id].family === family && !weaponBaked(id));
        if (owner) attachMintWeapon(entry, owner);
      }
      if (entryKeyFor(this.weapon) === key && !this.utility) {
        // Chegada tardia entra SUBINDO pelo arco de draw, nunca trocando no meio do idle.
        entry.mount.visible = true;
        this.draw(this.weapon);
      }
      console.info('[paid-viewmodel] ready', key, [...clips.keys()]);
      if (this.onReady) this.onReady(this);
      return entry;
    }).catch((error) => {
      this.pending.delete(key);
      console.error(`[paid-viewmodel] ${key}`, error);
      return null;
    });
    this.pending.set(key, pending);
    return pending;
  }

  entry(id = this.weapon) { return this.entries.get(entryKeyFor(id)); }
  active(id = this.weapon) { return Boolean(this.entry(id)); }
  // Estado corrente da máquina (cs16: um de idle|draw|reload|shoot1|shoot2|shoot3).
  state(id = this.weapon) { return this.entry(id)?.state || 'idle'; }
  fov(id = this.weapon, aspect = 16 / 9) {
    // Espelho do vmFovForAspect: meia-tangente HORIZONTAL constante — o FOV autorado
    // parte do aspecto gravado pela câmera GLB e converte para o aspecto corrente.
    const authored = this.entry(id)?.cameraFov;
    const v0 = ((Number.isFinite(authored) ? authored : 80) * Math.PI) / 180;
    const ref = this.entry(id)?.cameraAspect || 16 / 9;
    const a = Number.isFinite(aspect) && aspect > 0 ? aspect : ref;
    const halfH = Math.atan(Math.tan(v0 / 2) * ref);
    return (2 * Math.atan(Math.tan(halfH) / a) * 180) / Math.PI;
  }

  setWeapon(id) {
    const previous = this.weapon;
    this.weapon = id;
    const key = entryKeyFor(id);
    for (const entry of this.entries.values()) {
      const visible = this.utility ? entry === this.utility.entry : entry.key === key;
      // Entrada que sai de cena volta ao idle: fila/pose de reload não fica presa.
      if (!visible && entry.mount.visible) this._idle(entry);
      entry.mount.visible = visible;
    }
    if (!key) return false;
    const entry = this.entries.get(key);
    if (!entry) {
      this._loadFamily(key);
      return false;
    }
    if (previous !== id) this._idle(entry);
    if (entry.family !== 'grenade' && !key.includes('#')) attachMintWeapon(entry, id);
    this._applyRecoilFamily();
    return true;
  }

  _applyRecoilFamily() {
    const family = familyFor(this.weapon);
    if (!family || !this._recoilParams || family === this._recoilFamily) return;
    this._recoilFamily = family;
    this.recoil.setFamily(this._recoilParams, family, VM_WEAPON[this.weapon]?.recoilScale ?? 1);
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
    // Estados por cadência (cs16: shoot1-3 e o draw procedural de pistola)
    // expiram pelo relógio do QC e voltam a idle — não há clipe para "terminar".
    if (active?.stateUntil && this._time >= active.stateUntil && /^(shoot|draw)/.test(active.state || '')) {
      active.state = 'idle';
      active.stateUntil = 0;
    }
    for (const entry of this.entries.values()) {
      if (entry === active && entry.mount.visible) continue;
      // Fila/ação pendente termina mesmo com o mount escondido — sem pose presa.
      if (entry.queue.length > 0 || (entry.action && !entry.action.paused)) entry.mixer.update(step);
    }
    if (!active?.mount.visible) return;
    active.mixer.update(step);
    this._time += step;
    // Dono único do transform do mount: base ∘ arco de draw ∘ recuo (ADS: M6).
    let drawY = 0;
    let drawRx = 0;
    if (active.drawTime < active.drawDuration) {
      active.drawTime = Math.min(active.drawDuration, active.drawTime + step);
      const t = active.drawTime / active.drawDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      drawY = THREE.MathUtils.lerp(-(active.frame.drawDrop ?? 0.22), 0, eased);
      drawRx = THREE.MathUtils.lerp(0.24, 0, eased);
    }
    const recoil = this.recoil.update(step, this.adsAmount);
    const baseRot = active.frame.rotDeg;
    active.mount.rotation.set(
      (baseRot ? baseRot[0] * DEG2RAD : 0) + drawRx + recoil.rx,
      (baseRot ? baseRot[1] * DEG2RAD : 0) + recoil.ry,
      (baseRot ? baseRot[2] * DEG2RAD : 0) + recoil.rz,
    );
    // Recuo gira em torno do pivô autoral: corrige a translação que a rotação
    // fora do pivô induziria (a coronha recua, o cano sobe — não o contrário).
    _pivot.set(recoil.pivot[0], recoil.pivot[1], recoil.pivot[2]);
    _pivotRotated.copy(_pivot).applyEuler(active.mount.rotation);
    active.mount.position.set(
      active.frame.x + recoil.px + (_pivot.x - _pivotRotated.x),
      active.frame.y + drawY + recoil.py + (_pivot.y - _pivotRotated.y),
      active.frame.z + recoil.pz + (_pivot.z - _pivotRotated.z),
    );
    // ADS (M6): o CANO fica colinear com o eixo óptico (rotação do mount) e só
    // então a alça MEDIDA desliza ao centro — não um ponto cruzando em diagonal.
    const ads = this.adsAmount;
    const adsConfig = VM_WEAPON[this.weapon]?.ads;
    const wrap = active.mint?.active;
    if (ads > 0.001 && adsConfig && wrap) {
      if (adsConfig.auto) {
        active.mount.updateWorldMatrix(true, true);
        // Eixo do cano MEDIDO (boca − alça, ambos da malha Mint) — sem assumir
        // convenção de eixo do wrap; é o mesmo par de pontos que o slide usa.
        const muzzlePoint = mintPointScene(active, 'muzzle');
        const sightPoint = mintPointScene(active, 'sight');
        if (muzzlePoint && sightPoint) {
          _adsForward.copy(muzzlePoint).sub(sightPoint).normalize();
          _adsAlign.setFromUnitVectors(_adsForward, _ADS_AXIS);
          _adsBlend.identity().slerp(_adsAlign, ads);
          _adsQuat.setFromEuler(active.mount.rotation).premultiply(_adsBlend);
          active.mount.rotation.setFromQuaternion(_adsQuat);
          active.mount.updateWorldMatrix(true, true);
          const sight = mintPointScene(active, 'sight');
          if (sight) {
            active.mount.position.x += -sight.x * ads;
            active.mount.position.y += -sight.y * ads;
            // Recuar a alça para distância-alvo joga a arma fora do quadro
            // (testado 31/08): calibração fina por família, não fórmula.
          }
        }
      }
      active.mount.position.x += adsConfig.off[0] * ads;
      active.mount.position.y += adsConfig.off[1] * ads;
      active.mount.position.z += (adsConfig.pull + adsConfig.off[2]) * ads;
      active.mount.rotation.x += adsConfig.rotDeg[0] * DEG2RAD * ads;
      active.mount.rotation.y += adsConfig.rotDeg[1] * DEG2RAD * ads;
      active.mount.rotation.z += adsConfig.rotDeg[2] * DEG2RAD * ads;
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
    const cs16 = VM_FAMILY[entry.family]?.cs16;
    // Fuzis sacam com o clipe autoral do pack; o arco procedural fica para as
    // famílias de pistola (o pack não traz equip de pistola) e como fallback.
    if ((entry.golden || VM_FAMILY[entry.family]?.equip !== 'pistol')
      && entry.clips.has('equip_rifle')) {
      entry.drawTime = entry.drawDuration;
      const tocou = this._play(entry, 'equip_rifle', {
        duration: cs16 ? cs16.draw : Math.max(0.3, duration), fade: 0.03,
      });
      if (tocou) entry.state = 'draw';
      return tocou;
    }
    // Pistolas cs16: o arco procedural É o estado draw — cadência do QC e
    // expiração no update (não há clipe para "terminar"). Revisão 29/08.
    const useGameplayTiming = VM_WEAPON[id]?.timing === 'gameplay';
    entry.drawDuration = cs16 && !useGameplayTiming ? cs16.draw : Math.max(0.12, duration || 0.32);
    entry.drawTime = 0;
    entry.state = 'draw';
    entry.stateUntil = this._time + entry.drawDuration;
    return true;
  }

  reload(id, duration, empty = false, faltamBalas = 1) {
    const entry = this.entry(id);
    if (!entry) return false;
    // O clipe fecha no mesmo quadro que `reloadUntil` (game.js `_startReload`):
    // a cadência do QC do CS 1.6 não manda aqui. Régua: P4 do vm-gauntlet.
    const direct = empty && entry.clips.has('reload_empty')
      ? 'reload_empty'
      : entry.clips.has('reload_tactical')
      ? 'reload_tactical'
      : entry.clips.has('reload_empty')
      ? 'reload_empty'
      : '';
    // 'pump_loop'/'bolt_loop' repetem o laço UMA VEZ POR MUNIÇÃO — é assim
    // que o CS 1.6 recarrega cartucho a cartucho.
    const estilo = VM_FAMILY[entry.family]?.reloadStyle;
    const emLaco = estilo === 'pump_loop' || estilo === 'bolt_loop';
    const tocou = direct && !emLaco
      ? this._play(entry, direct, { duration, fade: 0.025 })
      : (() => {
        const sequence = ['reload_start', 'reload_loop', 'reload_end'].filter((name) => entry.clips.has(name));
        if (!sequence.length) {
          return direct ? this._play(entry, direct, { duration, fade: 0.025 }) : false;
        }
        if (emLaco && entry.clips.has('reload_loop')) {
          const faltam = Math.max(1, Math.min(8, Math.round(Number(faltamBalas) || 1)));
          const nomes = [];
          if (entry.clips.has('reload_start')) nomes.push('reload_start');
          for (let i = 0; i < faltam; i += 1) nomes.push('reload_loop');
          if (entry.clips.has('reload_end')) nomes.push('reload_end');
          return this._sequence(entry, nomes, duration);
        }
        return this._sequence(entry, sequence, duration);
      })();
    // Sem tabela cs16 (revólver) o estado ficava preso em 'fire' com o clipe de
    // recarga tocando.
    if (tocou) entry.state = 'reload';
    return tocou;
  }

  shoot(id) {
    const entry = this.entry(id);
    if (!entry) return false;
    const cs16 = VM_FAMILY[entry.family]?.cs16;
    if (entry.golden) {
      entry.state = 'fire';
      return this._play(entry, 'shoot', { fade: 0.01 });
    }
    if (cs16 && VM_WEAPON[id]?.timing !== 'gameplay') {
      // Máquina de 6 estados do QC: shoot1→2→3 cicla como as três sequências
      // originais; recuo SÓ na câmera (GUNFEEL do game.js) — o mount não recua.
      entry.shootCycle = ((entry.shootCycle || 0) % 3) + 1;
      entry.state = `shoot${entry.shootCycle}`;
      entry.stateUntil = this._time + cs16.shoot;
      if (entry.clips.has('shoot')) return this._play(entry, 'shoot', { fade: 0.01 });
      // shotgun: o shoot 1,156s do QC da m3 É o pump — sem este fallback a
      // família que a máquina cronometra ficava muda no tiro (revisão 29/08).
      if (entry.clips.has('pump')) return this._play(entry, 'pump', { fade: 0.02 });
      return true;
    }
    // Recuo procedural em TODO tiro (12/15 famílias não têm clipe de fire);
    // clipe assado entra por cima onde existe, e a shotgun toca o pump.
    this.recoil.shoot(this._time);
    if (entry.clips.has('shoot')) {
      entry.state = 'fire';
      return this._play(entry, 'shoot', { fade: 0.01 });
    }
    if (entry.clips.has('pump')) return this._play(entry, 'pump', { fade: 0.02 });
    return true;
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
    // fim de clipe volta ao idle com FADE: o último frame não fecha nos
    // twists do braço e o snap seco era um pop no fim de toda recarga.
    else this._idle(entry, 0.15);
  }

  _setupGeneralMotion(entry, general) {
    // Camadas General DESLIGADAS (prints do dono 29/08, PARADO): o A_FP_Idle tem
    // floreio no ciclo e o delta aditivo arrancava o braço. Estável > quebrado.
    if (general) entry.generalClips = general;
    // cs16: o estado draw usa o equip_rifle do General como animação única
    // (tracks por nome de bone); nenhuma camada aditiva entra junto.
    const cs16 = VM_FAMILY[entry.family]?.cs16;
    if (cs16 && general?.has('equip_rifle') && !entry.clips.has('equip_rifle')) {
      entry.clips.set('equip_rifle', general.get('equip_rifle'));
    }
  }

  _idle(entry, fade = 0) {
    const clip = entry.clips.get('idle');
    if (!clip) return false;
    entry.state = 'idle';
    entry.queue = [];
    const previous = entry.action;
    const action = entry.mixer.clipAction(clip);
    if (entry.golden) {
      entry.mixer.stopAllAction();
      action.reset().setLoop(THREE.LoopRepeat, Infinity);
      action.enabled = true;
      action.paused = false;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
      action.play();
      entry.mixer.update(0);
      entry.action = action;
      return true;
    }
    if (fade > 0 && previous && previous !== action) {
      // pose congelada do idle entrando por peso: a ação pausada segura o frame
      // 0 enquanto o crossfade dilui a pose final do clipe anterior.
      action.reset().play();
      action.paused = true;
      action.crossFadeFrom(previous, fade, false);
    } else {
      entry.mixer.stopAllAction();
      action.reset().play();
      action.paused = true;
      entry.mixer.update(0);
    }
    entry.action = action;
    return true;
  }

  _play(entry, name, { duration = 0, timeScale = 0, fade = 0, preserveQueue = false } = {}) {
    const clip = entry.clips.get(name);
    if (!clip) return false;
    if (!preserveQueue) entry.queue = [];
    const previous = entry.action;
    const action = entry.mixer.clipAction(clip);
    const playbackRate = timeScale || (duration > 0 ? Math.max(0.01, clip.duration / duration) : 1);
    if (entry.golden) {
      entry.mixer.stopAllAction();
      action.reset();
      action.enabled = true;
      action.paused = false;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(playbackRate);
      action.play();
      entry.mixer.update(0);
      entry.action = action;
      entry.serial += 1;
      return true;
    }
    action.reset();
    action.paused = false;
    action.enabled = true;
    action.clampWhenFinished = true;
    action.setLoop(THREE.LoopOnce, 1);
    action.timeScale = playbackRate;
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
