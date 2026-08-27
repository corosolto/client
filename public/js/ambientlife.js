import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { VERSION } from './version.js';

const loader = new GLTFLoader();
const templates = new Map();
const ASSETS = Object.freeze({
  rat: 'models/ambient/rat_animated.glb',
  pigeonGround: 'models/ambient/pigeon_ground.glb',
  pigeonFlight: 'models/ambient/pigeon_flight.glb',
  dog: 'models/ambient/dog_caramelo.glb',
});
export const FAVELA_AMBIENCE_ASSETS = Object.freeze(Object.keys(ASSETS));
const SHOT_REACTION_RADIUS = 13;
const DOG_WALK_SPEED = 1;
const DOG_IDLE_TIME = 3;

const loadGLB = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

export async function preloadAmbientLife(ids = FAVELA_AMBIENCE_ASSETS) {
  await Promise.all([...new Set(ids)].filter((id) => faunaAssetUrl(id) && !templates.has(id)).map(async (id) => {
    try {
      const gltf = await loadGLB(`${faunaAssetUrl(id)}?v=${VERSION}`);
      let skinned = false;
      gltf.scene.traverse((object) => {
        if (!object.isMesh) return;
        skinned ||= object.isSkinnedMesh;
        object.material.metalness = 0;
        object.material.roughness = Math.max(.72, object.material.roughness ?? .72);
      });
      templates.set(id, { scene: gltf.scene, clips: gltf.animations, skinned, meta: { ...(STATIC_FAUNA_META[id] || {}) } });
    } catch (error) {
      console.warn('[ambientlife] GLB não carregou', id, error);
    }
  }));
}

function fallbackRat(index) {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x5f5044 : 0x4b4a48, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xa27672, roughness: .95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.065, 9, 6), fur);
  body.scale.set(.5, .43, 1.12); body.position.y = .01; body.userData.faunaPart = 'body'; group.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(.038, .085, 8), fur);
  head.rotation.x = -Math.PI / 2; head.position.set(0, .01, .088); head.userData.faunaPart = 'head'; group.add(head);
  for (const x of [-.026, .026]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.021, 7, 5), skin);
    ear.scale.set(1, .36, 1); ear.position.set(x, .052, .066); ear.userData.faunaPart = 'ear'; group.add(ear);
  }
  for (const [x, z] of [[-.035, -.04], [.035, -.04], [-.032, .045], [.032, .045]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.0065, .010, .036, 6), fur);
    leg.rotation.z = x < 0 ? .18 : -.18; leg.position.set(x, -.033, z); leg.userData.faunaPart = 'leg'; group.add(leg);
  }
  const points = [[0, -.01, -.06], [.035, -.018, -.11], [.06, -.01, -.16], [.025, 0, -.205]];
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3(points.slice(i, i + 2).map((point) => new THREE.Vector3(...point)));
    const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 3, [.0065, .0045, .0025][i], 4), skin);
    tail.userData.faunaPart = 'curved-tail'; group.add(tail);
  }
  for (const child of group.children) child.position.y += .052;
  return group;
}

function fallbackPigeon() {
  const group = new THREE.Group();
  const feather = new THREE.MeshStandardMaterial({ color: 0x657078, roughness: .92 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.13, 9, 7), feather);
  body.scale.set(.72, 1.1, 1.35); body.position.y = .17; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), feather);
  head.position.set(0, .32, .11); group.add(head);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(.11, .3, 5), feather);
    wing.rotation.z = side * 1.05; wing.position.set(side * .15, .19, 0); group.add(wing);
  }
  return group;
}

function fallbackDog() {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: .95 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe4c59a, roughness: .95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.22, .26, .62), fur);
  body.position.y = .46; group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .22), fur);
  head.position.set(0, .66, .4); group.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(.11, .1, .14), cream);
  snout.position.set(0, .62, .55); group.add(snout);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.05, .11, 4), fur);
    ear.position.set(side * .07, .8, .36); group.add(ear);
  }
  for (const [x, z] of [[-.08, .24], [.08, .24], [-.08, -.24], [.08, -.24]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.028, .024, .34, 6), fur);
    leg.position.set(x, .17, z); group.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.02, .012, .3, 5), fur);
  tail.rotation.x = -.8; tail.position.set(0, .62, -.38); group.add(tail);
  return group;
}

function cloneAsset(id) {
  const template = templates.get(id);
  if (!template) return null;
  return {
    model: template.skinned ? skeletonClone(template.scene) : template.scene.clone(true),
    clips: template.clips,
  };
}

function normalizeModel(id, model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const target = id === 'rat' ? .36 : id === 'pigeonGround' ? .29 : id === 'dog' ? 1 : .62;
  const dimension = id === 'pigeonGround' || id === 'dog' ? size.y : Math.max(size.x, size.z);
  const scale = target / Math.max(.001, dimension);
  // dog: altura 1 m => cernelha ~0,6 (ombro 1,83 de 3,09 de altura no GLB bruto)
  const center = box.getCenter(new THREE.Vector3());
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  if (id === 'rat') model.rotation.y = -Math.PI / 2;
}

function distanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq < 1e-6) return point.distanceTo(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}

class FavelaAmbience {
  constructor(root, { map, low = false, rats = [], pigeons = [], dogs = [] }) {
    this.map = map;
    this.low = low;
    this.time = 0;
    this.paused = false;
    this.ready = true;
    this.group = new THREE.Group();
    this.group.name = `AMBIENT_LIFE_${map}`;
    this.group.userData.ambientLife = true;
    root.add(this.group);
    const ratList = low ? rats.slice(0, 1) : rats;
    const flight = pigeons.find((pigeon) => pigeon.mode === 'flight') || pigeons[0];
    const pigeonList = low ? (flight ? [flight] : []) : pigeons;
    const dogList = low ? dogs.slice(0, 1) : dogs;
    this.animals = [];
    ratList.forEach((config, index) => this._add('rat', config, index));
    pigeonList.forEach((config, index) => this._add('pigeon', config, index));
    dogList.forEach((config, index) => this._add('dog', config, index));
    this.reset();
  }

  _add(type, config, index) {
    const assetId = type === 'rat' ? 'rat' : type === 'dog' ? 'dog' : config.mode === 'flight' ? 'pigeonFlight' : 'pigeonGround';
    const loaded = cloneAsset(assetId);
    const animalRoot = new THREE.Group();
    animalRoot.name = `${type}:${this.map}:${index}`;
    animalRoot.userData.fauna = type === 'rat' ? 'rato' : type === 'dog' ? 'cachorro' : 'pomba';
    animalRoot.userData.nonCollider = true;
    animalRoot.userData.motion = 'deterministic-run-idle';
    animalRoot.userData.bodyLength = type === 'rat' ? .142 : undefined;
    animalRoot.userData.bodyAspect = type === 'rat' ? 2.05 : undefined;
    animalRoot.userData.taperedTail = type === 'rat' || undefined;
    animalRoot.userData.poseId = `${type}-${index % 2}`;
    animalRoot.userData.albedoId = `${type}-${index % 2}`;
    let model;
    if (loaded) {
      model = loaded.model;
      normalizeModel(assetId, model);
      animalRoot.add(model);
    } else {
      model = type === 'rat' ? fallbackRat(index) : type === 'dog' ? fallbackDog() : fallbackPigeon();
      while (model.children.length) animalRoot.add(model.children[0]);
      model = animalRoot;
    }
    animalRoot.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.nonSolidSurface = true;
      object.castShadow = config.mode !== 'flight' && !this.low;
      object.receiveShadow = true;
    });
    this.group.add(animalRoot);
    const clips = loaded?.clips || [];
    let mixer = null;
    let actions = null;
    if (type === 'dog' && clips.length) {
      // clipes Quaternius vêm como 'AnimalArmature|Idle'; casa por sufixo, cai no primeiro
      mixer = new THREE.AnimationMixer(model);
      actions = {};
      for (const [key, pattern] of [['idle', /(^|\|)Idle$/], ['walk', /(^|\|)Walk$/], ['run', /(^|\|)(Run|Gallop)$/]]) {
        const clip = clips.find((item) => pattern.test(item.name)) || clips[0];
        actions[key] = mixer.clipAction(clip);
      }
      actions.idle.play();
    } else if (type !== 'dog') {
      const clip = clips.find((item) => item.name === (type === 'rat' ? 'Run' : 'Animation')) || clips[0];
      if (clip) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(clip).play();
      }
    }
    const origin = new THREE.Vector3(...config.pos);
    const to = new THREE.Vector3(...(config.to || config.pos));
    this.animals.push({
      id: `${type}-${index}`, type, mode: config.mode || 'ground', root: animalRoot, model,
      origin, to, phase: config.phase || 0, radius: config.radius || [2.4, 1.8],
      source: loaded ? 'gltf' : 'fallback', mixer, actions, action: 'idle', state: 'idle', alertUntil: 0,
      alertAt: 0, alertOrigin: origin.clone(), flee: new THREE.Vector3(1, 0, 0),
      routine: origin.clone(), recoverAt: 0, recoverUntil: 0, recoverFrom: origin.clone(),
    });
  }

  setPaused(value) { this.paused = !!value; }

  reset() {
    this.time = 0;
    for (const animal of this.animals) {
      animal.alertUntil = 0;
      animal.alertAt = 0;
      animal.recoverAt = 0;
      animal.recoverUntil = .8;
      animal.recoverFrom.copy(animal.origin);
      animal.state = animal.mode === 'flight' ? 'fly' : 'idle';
      animal.root.position.copy(animal.origin);
      animal.root.rotation.set(0, animal.phase, 0);
      if (animal.actions) {
        animal.mixer.stopAllAction();
        animal.actions.idle.reset().play();
        animal.action = 'idle';
      }
      animal.mixer?.setTime(0);
    }
  }

  onShot(start, end) {
    let reacted = 0;
    for (const animal of this.animals) {
      const position = animal.root.getWorldPosition(new THREE.Vector3());
      if (distanceToSegment(position, start, end) > SHOT_REACTION_RADIUS) continue;
      animal.alertAt = this.time;
      animal.alertUntil = this.time + (animal.type === 'rat' ? 2.1 : animal.type === 'dog' ? 2.6 : 3.2);
      animal.recoverAt = 0;
      animal.recoverUntil = 0;
      animal.alertOrigin.copy(animal.root.position);
      animal.flee.copy(position).sub(start).setY(0);
      if (animal.flee.lengthSq() < .01) animal.flee.set(Math.sin(animal.phase + 1), 0, Math.cos(animal.phase + 1));
      animal.flee.normalize();
      animal.state = animal.type === 'pigeon' ? 'takeoff' : 'flee';
      reacted++;
    }
    return reacted;
  }

  update(dt, playerPosition) {
    this.time += Math.max(0, Math.min(.05, dt));
    for (const animal of this.animals) {
      if (playerPosition && this.time >= animal.alertUntil && animal.root.position.distanceToSquared(playerPosition) < 4.84) {
        const from = new THREE.Vector3(playerPosition.x, animal.root.position.y, playerPosition.z);
        this.onShot(from, animal.root.position.clone());
      }
      if (animal.type === 'rat') this._updateRat(animal, dt);
      else if (animal.type === 'dog') this._updateDog(animal, dt);
      else this._updatePigeon(animal, dt);
      animal.mixer?.update(dt);
    }
  }

  _updateRat(animal) {
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(2.7, elapsed * 2.05));
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      return;
    }
    const cycle = (this.time + animal.phase) % 5;
    const moving = cycle < 3.2;
    const t = moving ? .5 - .5 * Math.cos(cycle / 3.2 * Math.PI * 2) : 0;
    animal.routine.lerpVectors(animal.origin, animal.to, t);
    const recovering = this._recoverToRoute(animal, animal.routine, 1.6);
    const direction = animal.to.clone().sub(animal.origin);
    if (cycle > 1.6) direction.negate();
    if (direction.lengthSq() > .001) animal.root.rotation.y = Math.atan2(direction.x, direction.z);
    animal.state = recovering ? 'recover' : moving ? 'run' : 'idle';
  }

  _dogAction(animal, name) {
    if (!animal.actions || animal.action === name) return;
    animal.actions[name].reset().crossFadeFrom(animal.actions[animal.action], .25, false).play();
    animal.action = name;
  }

  _updateDog(animal) {
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(4.5, elapsed * 3.2));
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      this._dogAction(animal, 'run');
      return;
    }
    const span = animal.origin.distanceTo(animal.to);
    const leg = span / DOG_WALK_SPEED;
    const cycle = (this.time + animal.phase) % (2 * (DOG_IDLE_TIME + leg));
    let moving = false;
    let direction = null;
    if (cycle < DOG_IDLE_TIME) animal.routine.copy(animal.origin);
    else if (cycle < DOG_IDLE_TIME + leg) {
      animal.routine.lerpVectors(animal.origin, animal.to, (cycle - DOG_IDLE_TIME) / leg);
      moving = span > .05;
      direction = animal.to.clone().sub(animal.origin);
    } else if (cycle < 2 * DOG_IDLE_TIME + leg) animal.routine.copy(animal.to);
    else {
      animal.routine.lerpVectors(animal.to, animal.origin, (cycle - 2 * DOG_IDLE_TIME - leg) / leg);
      moving = span > .05;
      direction = animal.origin.clone().sub(animal.to);
    }
    const recovering = this._recoverToRoute(animal, animal.routine, 2);
    if (direction && direction.lengthSq() > .001) animal.root.rotation.y = Math.atan2(direction.x, direction.z);
    animal.state = recovering ? 'recover' : moving ? 'walk' : 'idle';
    this._dogAction(animal, recovering || moving ? 'walk' : 'idle');
  }

  _updatePigeon(animal) {
    const flight = animal.mode === 'flight' || this.time < animal.alertUntil;
    if (!flight) {
      const angle = (this.time * .38 + animal.phase) * Math.PI * 2;
      animal.routine.set(animal.origin.x + Math.sin(angle) * .18, animal.origin.y, animal.origin.z + Math.cos(angle) * .12);
      const recovering = this._recoverToRoute(animal, animal.routine, 2.2);
      animal.root.rotation.y = angle + Math.PI / 2;
      animal.state = recovering ? 'recover' : 'walk';
      return;
    }
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, elapsed * 3.1);
      animal.root.position.y += Math.min(5, elapsed * 2.4);
      animal.root.rotation.z = Math.sin(elapsed * 8) * .24;
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'takeoff';
      return;
    }
    const angle = this.time * .42 + animal.phase;
    animal.routine.set(
      animal.origin.x + Math.cos(angle) * animal.radius[0],
      animal.origin.y + Math.sin(angle * 2.3) * .28,
      animal.origin.z + Math.sin(angle) * animal.radius[1],
    );
    const recovering = this._recoverToRoute(animal, animal.routine, 2.2);
    const dx = -Math.sin(angle) * animal.radius[0];
    const dz = Math.cos(angle) * animal.radius[1];
    animal.root.rotation.set(.04, Math.atan2(dx, dz), THREE.MathUtils.clamp(-Math.sin(angle) * .28, -.3, .3));
    animal.state = recovering ? 'recover' : 'fly';
  }

  _recoverToRoute(animal, target, duration) {
    if (animal.alertUntil > 0 && this.time >= animal.alertUntil && animal.recoverUntil === 0) {
      animal.recoverAt = this.time;
      animal.recoverUntil = this.time + duration;
      animal.recoverFrom.copy(animal.root.position);
    }
    if (animal.recoverUntil > this.time) {
      const progress = THREE.MathUtils.smoothstep(this.time, animal.recoverAt, animal.recoverUntil);
      animal.root.position.lerpVectors(animal.recoverFrom, target, progress);
      return true;
    }
    animal.root.position.copy(target);
    if (animal.recoverUntil > 0) {
      animal.alertUntil = 0;
      animal.recoverUntil = 0;
    }
    return false;
  }

  snapshot() {
    return this.animals.map((animal) => ({
      id: animal.id, type: animal.type, state: animal.state,
      x: +animal.root.position.x.toFixed(4), y: +animal.root.position.y.toFixed(4), z: +animal.root.position.z.toFixed(4),
      clipTime: +(animal.mixer?.time || 0).toFixed(4),
    }));
  }

  report() {
    let meshes = 0, triangles = 0;
    for (const animal of this.animals) animal.root.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;
      meshes++;
      const geometry = object.geometry;
      triangles += (geometry.index?.count || geometry.attributes.position?.count || 0) / 3;
    });
    const rat = this.animals.filter((animal) => animal.type === 'rat').length;
    const pigeon = this.animals.filter((animal) => animal.type === 'pigeon').length;
    const dog = this.animals.filter((animal) => animal.type === 'dog').length;
    return {
      map: this.map, low: this.low, gltf: this.animals.length > 0 && this.animals.every((animal) => animal.source === 'gltf'),
      counts: { rat, pigeon, dog, total: rat + pigeon + dog }, meshes, triangles: Math.round(triangles),
    };
  }

  dispose() {
    for (const animal of this.animals) animal.mixer?.stopAllAction();
    this.group.removeFromParent();
  }
}

export function createFavelaAmbience(root, options) {
  return new FavelaAmbience(root, options);
}

/* ---------------------------------------------------------------------------
   FAUNA ESTÁTICA POSICIONÁVEL — região append-only
   GLB sem rig, escala por comprimento, posto à mão pelo builder do mapa (o córrego
   põe um jacaré no leito e uma capivara na margem). Fica FORA de `ASSETS` de
   propósito: `FAVELA_AMBIENCE_ASSETS` alimenta o preload de TODO mapa de favela e
   não pode crescer, senão todo mapa passa a baixar bicho que não usa.
   --------------------------------------------------------------------------- */
const STATIC_FAUNA = Object.freeze({
  jacare: 'models/ambient/jacare_corrego.glb',
  capivara: 'models/ambient/capivara_corrego.glb',
});
/* len = comprimento alvo em metros; yawFix gira o modelo até a CARA olhar pro +Z,
   que é a convenção de `placeFauna` (o `ry` do caller soma em cima disso). */
const STATIC_FAUNA_META = Object.freeze({
  jacare: { len: 1.8, yawFix: Math.PI / 2 },
  capivara: { len: 1.0, yawFix: 0 },
});

export function faunaAssetUrl(id) { return ASSETS[id] || STATIC_FAUNA[id] || null; }

export const CORREGO_FAUNA_ASSETS = Object.freeze([
  ...FAVELA_AMBIENCE_ASSETS, 'jacare', 'capivara',
]);

/* Gancho de régua: em node o GLTFLoader trava na textura, então o harness injeta a
   cena à mão. Produção NÃO chama — quem carrega é `preloadAmbientLife`, e ele aplica
   o MESMO STATIC_FAUNA_META, senão régua e jogo mediriam escalas diferentes. */
export function registerFaunaTemplate(id, scene, meta = {}) {
  if (!scene) { templates.delete(id); return; }
  templates.set(id, { scene, clips: [], skinned: false, meta: { ...(STATIC_FAUNA_META[id] || {}), ...meta } });
}

// Retorna o Group clonado na base `y` (com `submerge` m afundados) ou null sem
// template — o caller decide o fallback procedural.
export function placeFauna(id, { x = 0, y = 0, z = 0, ry = 0, targetLen, submerge = 0 } = {}) {
  const template = templates.get(id);
  if (!template) return null;
  const model = template.scene.clone(true);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const alvo = targetLen || template.meta?.len;
  const len = Math.max(size.x, size.z) || 1;
  const s = (alvo && alvo > 0) ? alvo / len : 1;
  model.scale.setScalar(s);
  const yawFix = template.meta?.yawFix || 0;
  const root = new THREE.Group();
  root.position.set(x, y - box.min.y * s - submerge, z);
  root.rotation.y = ry + yawFix;
  root.userData.faunaAsset = id;
  root.userData.source = 'gltf';
  root.add(model);
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.userData.nonSolidSurface = true;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return root;
}
