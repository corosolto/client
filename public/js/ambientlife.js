import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { VERSION } from './version.js';

const loader = new GLTFLoader();
const templates = new Map();
const ASSETS = Object.freeze({
  rat: 'models/ambient/rat_animated.glb',
  pigeonGround: 'models/ambient/pigeon_ground.glb',
  dog: 'models/ambient/dog_caramelo.glb',
  jacare: 'models/ambient/jacare_corrego.glb',
  capivara: 'models/ambient/capivara_corrego.glb',
  cat: 'models/ambient/cat_telhado.glb',
  chicken: 'models/ambient/galinha_campo.glb',
  cow: 'models/ambient/vaca_campo.glb',
  /* vida 1 (plans/22): Mint estático + locomoção procedural — Quaternius não tem
     tatu/barata/papagaio em nenhum pack (varredura 19/08 no FONTE.md do acervo) */
  armadillo: 'models/ambient/tatu_campo.glb',
  cockroach: 'models/ambient/barata_urbana.glb',
  parrot: 'models/ambient/papagaio_poleiro.glb',
});
export const FAVELA_AMBIENCE_ASSETS = Object.freeze(Object.keys(ASSETS));
const TYPE_ASSET = Object.freeze({ rat: 'rat', pigeon: 'pigeonGround', dog: 'dog', cat: 'cat', chicken: 'chicken', cow: 'cow', armadillo: 'armadillo', cockroach: 'cockroach', parrot: 'parrot' });
const FAUNA_NAME = Object.freeze({ rat: 'rato', pigeon: 'pomba', dog: 'cachorro', cat: 'gato', chicken: 'galinha', cow: 'vaca', armadillo: 'tatu', cockroach: 'barata', parrot: 'papagaio' });
const QUADS = new Set(['dog', 'cat', 'chicken', 'cow', 'armadillo']);
const SHOT_REACTION_RADIUS = 13;
const DOG_IDLE_TIME = 3;
/* por tipo: duração do susto e velocidade de fuga/caminhada (vaca larga, gato rápido) */
const ALERT_TIME = Object.freeze({ rat: 2.1, dog: 2.6, cat: 2.4, chicken: 2.8, cow: 3.2, pigeon: 3.2, armadillo: 2.4, cockroach: 1.8, parrot: 1.3 });
const QUAD_SPEED = Object.freeze({
  dog: { walk: 1, flee: 3.2 }, cat: { walk: 1.1, flee: 3.6 }, chicken: { walk: .55, flee: 2.6 }, cow: { walk: .75, flee: 2.4 },
  armadillo: { walk: .4, flee: 1.5 },   // tatu é bicho de passo curto; fuga é um trote rápido
});

const loadGLB = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

export async function preloadAmbientLife(ids = FAVELA_AMBIENCE_ASSETS) {
  /* lista vazia vinha de main.js/mapview para os mapas sem `ambience` no registro:
     nenhum GLB baixava e a fauna inteira caía no fallback procedural (BUG-57) */
  if (!ids || !ids.length) ids = FAVELA_AMBIENCE_ASSETS;
  await Promise.all([...new Set(ids)].filter((id) => ASSETS[id] && !templates.has(id)).map(async (id) => {
    try {
      const gltf = await loadGLB(`${ASSETS[id]}?v=${VERSION}`);
      let skinned = false;
      gltf.scene.traverse((object) => {
        if (!object.isMesh) return;
        skinned ||= object.isSkinnedMesh;
        object.material.metalness = 0;
        object.material.roughness = Math.max(.72, object.material.roughness ?? .72);
      });
      templates.set(id, { scene: gltf.scene, clips: gltf.animations, skinned });
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

function fallbackArmadillo() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x8a7d6b, roughness: .9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9a08e, roughness: .95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 7), shell);
  body.scale.set(.75, .62, 1.15); body.position.y = .13; group.add(body);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.105, .014, 5, 10), shell);
    band.rotation.y = Math.PI / 2; band.scale.set(1, 1, 1.4); band.position.set(0, .13, -.06 + i * .045); group.add(band);
  }
  const head = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 7), skin);
  head.rotation.x = -Math.PI / 2; head.position.set(0, .11, .24); group.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.008, .02, .2, 5), skin);
  tail.rotation.x = Math.PI / 2 - .25; tail.position.set(0, .08, -.25); group.add(tail);
  return group;
}

function fallbackCockroach() {
  const group = new THREE.Group();
  const chitin = new THREE.MeshStandardMaterial({ color: 0x5a2e18, roughness: .55 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 9, 6), chitin);
  body.scale.set(.72, .3, 1.25); body.position.y = .02; group.add(body);
  for (const side of [-1, 1]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .09, 3), chitin);
    ant.rotation.set(Math.PI / 2 - .3, 0, side * .35); ant.position.set(side * .015, .035, .07); group.add(ant);
  }
  return group;
}

function fallbackParrot() {
  const group = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: .85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.085, 9, 7), green);
  body.scale.set(.8, 1.25, .8); body.position.y = .22; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.052, 8, 6), green);
  head.position.set(0, .37, .02); head.userData.faunaPart = 'head'; group.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.022, .05, 6), new THREE.MeshStandardMaterial({ color: 0xd97b2f, roughness: .7 }));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, .36, .07); group.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.045, .22, .02), green);
  tail.rotation.x = .5; tail.position.set(0, .06, -.1); group.add(tail);
  return group;
}

function cloneAsset(id) {  const template = templates.get(id);
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
  /* alvo em metros de mundo: altura para bichos que andam de lado pro jogador,
     comprimento para rato (silhueta deitada). Vaca 1,75 / gato 0,48 / galinha 0,5. */
  const target = { rat: .36, pigeonGround: .29, dog: 1, cat: .48, chicken: .5, cow: 1.75, armadillo: .55, cockroach: .14, parrot: .34 }[id] || .5;
  const dimension = ['rat', 'armadillo', 'cockroach'].includes(id) ? Math.max(size.x, size.z) : size.y;
  const scale = target / Math.max(.001, dimension);
  // dog: altura 1 m => cernelha ~0,6 (ombro 1,83 de 3,09 de altura no GLB bruto)
  const center = box.getCenter(new THREE.Vector3());
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  /* Mint entrega o tatu com o eixo longo no X — gira pra cara ficar no +Z, mesma
     correção do rato. A barata já vem no Z (bbox 0,91 × 1,0). */
  if (['rat', 'armadillo'].includes(id)) model.rotation.y = -Math.PI / 2;
}

function distanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq < 1e-6) return point.distanceTo(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}

class FavelaAmbience {
  constructor(root, { map, low = false, rats = [], pigeons = [], dogs = [], cats = [], chickens = [], cows = [], armadillos = [], cockroaches = [], parrots = [] }) {
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
    const pigeonList = low ? pigeons.slice(0, 1) : pigeons;
    const dogList = low ? dogs.slice(0, 1) : dogs;
    const catList = low ? cats.slice(0, 1) : cats;
    const chickenList = low ? chickens.slice(0, 1) : chickens;
    const cowList = low ? cows.slice(0, 1) : cows;
    const armadilloList = low ? armadillos.slice(0, 1) : armadillos;
    const cockroachList = low ? cockroaches.slice(0, 1) : cockroaches;
    const parrotList = low ? parrots.slice(0, 1) : parrots;
    this.animals = [];
    ratList.forEach((config, index) => this._add('rat', config, index));
    pigeonList.forEach((config, index) => this._add('pigeon', config, index));
    dogList.forEach((config, index) => this._add('dog', config, index));
    catList.forEach((config, index) => this._add('cat', config, index));
    chickenList.forEach((config, index) => this._add('chicken', config, index));
    cowList.forEach((config, index) => this._add('cow', config, index));
    armadilloList.forEach((config, index) => this._add('armadillo', config, index));
    cockroachList.forEach((config, index) => this._add('cockroach', config, index));
    parrotList.forEach((config, index) => this._add('parrot', config, index));
    this.reset();
  }

  _add(type, config, index) {
    if (type === 'pigeon' && config.mode === 'flight') {
      /* v2.1 (BUG-57): pombo não voa mais — o GLB de voo era estático com asas abertas
         (dono: "deveria ficar so na ponta das lajes ou no chao"). Config não migrada cai
         no chão/laje mantendo o y do config: pomba pousada, não pendurada no céu. */
      if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'))
        console.warn('[ambientlife] mode "flight" depreciado na v2.1 — pombo anda; migre o config para ground (BUG-57)');
    }
    const assetId = TYPE_ASSET[type] || 'pigeonGround';
    const loaded = cloneAsset(assetId);
    const animalRoot = new THREE.Group();
    animalRoot.name = `${type}:${this.map}:${index}`;
    animalRoot.userData.fauna = FAUNA_NAME[type] || 'pomba';
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
      model = type === 'rat' ? fallbackRat(index) : type === 'dog' ? fallbackDog()
        : type === 'armadillo' ? fallbackArmadillo() : type === 'cockroach' ? fallbackCockroach()
        : type === 'parrot' ? fallbackParrot() : fallbackPigeon();
      while (model.children.length) animalRoot.add(model.children[0]);
      model = animalRoot;
    }
    animalRoot.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.nonSolidSurface = true;
      object.castShadow = !this.low;
      object.receiveShadow = true;
    });
    this.group.add(animalRoot);
    const clips = loaded?.clips || [];
    let mixer = null;
    let actions = null;
    if (QUADS.has(type) && clips.length) {
      // clipes Quaternius vêm como 'AnimalArmature|Idle'; casa por sufixo, cai no primeiro
      mixer = new THREE.AnimationMixer(model);
      actions = {};
      for (const [key, pattern] of [['idle', /(^|\|)Idle$/], ['walk', /(^|\|)Walk$/], ['run', /(^|\|)(Run|Gallop)$/]]) {
        const clip = clips.find((item) => pattern.test(item.name))
          || (key === 'run' ? clips.find((item) => /(^|\|)Walk$/.test(item.name)) : clips[0]);
        actions[key] = mixer.clipAction(clip);
      }
      actions.idle.play();
    } else if (!QUADS.has(type)) {
      const clip = clips.find((item) => item.name === (type === 'rat' ? 'Run' : 'Animation')) || clips[0];
      if (clip) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(clip).play();
      }
    }
    const origin = new THREE.Vector3(...config.pos);
    const to = new THREE.Vector3(...(config.to || config.pos));
    this.animals.push({
      id: `${type}-${index}`, type, mode: type === 'pigeon' ? 'ground' : (config.mode || 'ground'), root: animalRoot, model,
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
      animal.state = 'idle';
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
      animal.alertUntil = this.time + (ALERT_TIME[animal.type] || 3.2);
      animal.recoverAt = 0;
      animal.recoverUntil = 0;
      animal.alertOrigin.copy(animal.root.position);
      animal.flee.copy(position).sub(start).setY(0);
      if (animal.flee.lengthSq() < .01) animal.flee.set(Math.sin(animal.phase + 1), 0, Math.cos(animal.phase + 1));
      animal.flee.normalize();
      /* pombo foge a pé pela superfície onde nasceu (v2.1: sem takeoff/flight) */
      animal.state = 'flee';
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
      if (animal.type === 'rat' || animal.type === 'cockroach') this._updateRat(animal, dt);
      else if (animal.type === 'pigeon') this._updatePigeon(animal, dt);
      else if (animal.type === 'parrot') this._updateParrot(animal, dt);
      else this._updateQuad(animal, dt);
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

  _updateQuad(animal) {
    const speed = QUAD_SPEED[animal.type] || QUAD_SPEED.dog;
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(speed.flee * 1.4, elapsed * speed.flee));
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      this._dogAction(animal, 'run');
      return;
    }
    const span = animal.origin.distanceTo(animal.to);
    const leg = span / speed.walk;
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
    /* v2.1 (BUG-57): pombo não voa — anda no chão e pousa na ponta das lajes. O GLB de
       voo (estático, asas abertas) saiu do acervo; alerta foge a pé na própria superfície. */
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(1.4, elapsed * 2.6));
      animal.root.position.y = animal.alertOrigin.y;
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      return;
    }
    const angle = (this.time * .38 + animal.phase) * Math.PI * 2;
    animal.routine.set(animal.origin.x + Math.sin(angle) * .18, animal.origin.y, animal.origin.z + Math.cos(angle) * .12);
    const recovering = this._recoverToRoute(animal, animal.routine, 2.2);
    animal.root.rotation.y = angle + Math.PI / 2;
    animal.state = recovering ? 'recover' : 'walk';
  }

  _updateParrot(animal) {
    /* papagaio de POLEIRO (vida 1, plans/22): não voa — pássaro riggado com voo
       não existe CC0 (a dívida da pomba). Vida = balanço procedural: gingado de
       corpo + virada de cabeça a cada poucos segundos; tiro perto = sobressalto
       (tremida rápida sem sair do poleiro). */
    const t = this.time + animal.phase * 3;
    if (this.time < animal.alertUntil) {
      animal.root.rotation.z = Math.sin(t * 34) * .1;
      animal.root.position.y = animal.origin.y + Math.abs(Math.sin(t * 22)) * .03;
      animal.state = 'flee';
      return;
    }
    animal.root.rotation.z = Math.sin(t * .9) * .055;
    animal.root.rotation.x = Math.sin(t * .63 + 1) * .035;
    animal.root.position.y = animal.origin.y;
    /* virada de cabeça em degrau: 4 s por rumo, interpolação curta entre eles */
    const rumo = Math.floor(t / 4) % 3 - 1;
    const alvo = animal.phase + rumo * .9;
    const k = Math.min(1, (t % 4) / .6);
    animal.root.rotation.y = animal.root.rotation.y + (alvo - animal.root.rotation.y) * k * .3;
    animal.state = 'idle';
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
    const cat = this.animals.filter((animal) => animal.type === 'cat').length;
    const chicken = this.animals.filter((animal) => animal.type === 'chicken').length;
    const cow = this.animals.filter((animal) => animal.type === 'cow').length;
    const armadillo = this.animals.filter((animal) => animal.type === 'armadillo').length;
    const cockroach = this.animals.filter((animal) => animal.type === 'cockroach').length;
    const parrot = this.animals.filter((animal) => animal.type === 'parrot').length;
    return {
      map: this.map, low: this.low, gltf: this.animals.length > 0 && this.animals.every((animal) => animal.source === 'gltf'),
      counts: { rat, pigeon, dog, cat, chicken, cow, armadillo, cockroach, parrot, total: rat + pigeon + dog + cat + chicken + cow + armadillo + cockroach + parrot }, meshes, triangles: Math.round(triangles),
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

/* ═══════════════════════════════════════════════════════════════════════════
   FAUNA ESTÁTICA POSICIONÁVEL (frente B v2.1.0, BUG-57 — região própria, append-only:
   a frente D edita as regiões de cima sem colidir com esta)

   Jacaré/capivara do córrego: GLBs estáticos SEM rig (pipeline Mint de animação é
   humanoid-only) — consumo tipo pigeon_flight: template clonado, sem mixer. Escala
   por COMPRIMENTO (ficha plans/21-FAUNA-CORREGO.md: jacaré ~1,8 m, capivara ~1,0 m).
   Direção do focinho medida no loader real (evidência
   tools/eval/asset-evidence/fauna/): jacaré −X no GLB (yawFix π/2 → +Z), capivara +Z.
   `registerFaunaTemplate` é o MESMO registro que o preload usa — o censo do
   corrego-contract-check injeta stubs de bounds reais por aqui (limitação declarada
   no header dele: GLTFLoader trava em node no caminho de textura). */
const STATIC_FAUNA_META = {
  jacare: { len: 1.8, yawFix: Math.PI / 2 },
  capivara: { len: 1.0, yawFix: 0 },
};

export function registerFaunaTemplate(id, scene, meta = {}) {
  if (!scene) { templates.delete(id); return; }
  const base = STATIC_FAUNA_META[id] || {};
  templates.set(id, { scene, clips: [], skinned: false, meta: { ...base, ...meta } });
}

export function faunaAssetUrl(id) { return ASSETS[id] || null; }

export const CORREGO_FAUNA_ASSETS = Object.freeze([
  ...FAVELA_AMBIENCE_ASSETS, 'jacare', 'capivara',
]);

// Coloca um clone do template com comprimento-alvo, base no chão de `y` e `submerge` m
// afundados. Retorna o Group (userData.faunaAsset/source) ou null sem template — o
// caller decide o fallback procedural (padrão placeProp do repo).
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
