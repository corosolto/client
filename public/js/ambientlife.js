import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { VERSION } from './version.js';

const loader = new GLTFLoader();
const templates = new Map();
/* NÃO congelado de propósito: a região append-only do fim do arquivo (vida de céu do
   Joá, r2) junta as chaves novas AQUI, e faz isso DEPOIS de `FAVELA_AMBIENCE_ASSETS`
   já ter tirado o retrato. Assim nenhum mapa que não declara `ambience` no registro
   passa a baixar arara/pássaro/avião — só quem pede. */
const ASSETS = ({
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
const TYPE_ASSET = ({ macaw: 'macaw', songbird: 'songbird', plane: 'plane', rat: 'rat', pigeon: 'pigeonGround', dog: 'dog', cat: 'cat', chicken: 'chicken', cow: 'cow', armadillo: 'armadillo', cockroach: 'cockroach', parrot: 'parrot' });
/* Gaivota e caranguejo nao tem GLB no acervo CC0 e ficam procedurais. Sem esta lista
   o `_add` cai no `|| 'pigeonGround'` e clona um POMBO com outro nome. */
const PROCEDURAIS = new Set(['gull', 'crab']);
/* vida de céu do Joá (r2): tipos com molde Mint e rota própria — ver a região append-only. */
const VOADORES = new Set(['macaw', 'songbird', 'plane']);
const FAUNA_NAME = Object.freeze({ rat: 'rato', pigeon: 'pomba', dog: 'cachorro', cat: 'gato', chicken: 'galinha', cow: 'vaca', armadillo: 'tatu', cockroach: 'barata', parrot: 'papagaio', gull: 'gaivota', crab: 'caranguejo', macaw: 'arara', songbird: 'passaro', plane: 'aviao' });
const QUADS = new Set(['dog', 'cat', 'chicken', 'cow', 'armadillo']);
const SHOT_REACTION_RADIUS = 13;
const DOG_IDLE_TIME = 3;
/* por tipo: duração do susto e velocidade de fuga/caminhada (vaca larga, gato rápido) */
const ALERT_TIME = Object.freeze({ rat: 2.1, dog: 2.6, cat: 2.4, chicken: 2.8, cow: 3.2, pigeon: 3.2, armadillo: 2.4, cockroach: 1.8, parrot: 1.3, gull: 2.6, crab: 1.6, macaw: 2.4, songbird: 2.2, plane: 0 });
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

/* Gaivota: a asa e peca SEPARADA marcada `faunaPart:'wing'` porque e nela que a regua
   mede batida — asa aberta e travada foi o defeito que comprou a AR5 (BUG-57). */
function fallbackGull() {
  const group = new THREE.Group();
  const pena = new THREE.MeshStandardMaterial({ color: 0xf2f3f0, roughness: .9 });
  const manto = new THREE.MeshStandardMaterial({ color: 0x93a3ac, roughness: .92 });
  const bico = new THREE.MeshStandardMaterial({ color: 0xe0a233, roughness: .7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), pena);
  body.scale.set(.78, .74, 1.7); body.userData.faunaPart = 'body'; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.062, 7, 5), pena);
  head.position.set(0, .05, .19); head.userData.faunaPart = 'head'; group.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.019, .075, 5), bico);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, .04, .255); group.add(beak);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.07, .17, 4), manto);
  tail.rotation.x = -Math.PI / 2; tail.scale.set(1, 1, .3); tail.position.set(0, .01, -.23); group.add(tail);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(.5, 6, 4), manto);
    wing.scale.set(.62, .035, .17);
    wing.position.set(side * .32, .03, .02);
    wing.userData.faunaPart = 'wing';
    wing.userData.wingSide = side;
    group.add(wing);
  }
  return group;
}

/* CARANGUEJO da areia: anda de LADO (o `_updateCrab` gira o rumo 90 graus). */
function fallbackCrab() {
  const group = new THREE.Group();
  const casco = new THREE.MeshStandardMaterial({ color: 0xb4562f, roughness: .78 });
  const claro = new THREE.MeshStandardMaterial({ color: 0xe3b489, roughness: .85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 5), casco);
  body.scale.set(1.25, .55, .95); body.position.y = .055; body.userData.faunaPart = 'body'; group.add(body);
  for (const side of [-1, 1]) {
    const olho = new THREE.Mesh(new THREE.SphereGeometry(.014, 5, 4), claro);
    olho.position.set(side * .032, .095, .058); group.add(olho);
    const garra = new THREE.Mesh(new THREE.SphereGeometry(.038, 6, 4), casco);
    garra.scale.set(1, .6, .7); garra.position.set(side * .115, .05, .062);
    garra.userData.faunaPart = 'claw'; group.add(garra);
    for (let i = 0; i < 2; i++) {
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(.006, .005, .085, 3), casco);
      pata.rotation.z = side * 1.0; pata.position.set(side * .085, .028, -.018 - i * .038);
      pata.userData.faunaPart = 'leg'; group.add(pata);
    }
  }
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
  constructor(root, { map, low = false, rats = [], pigeons = [], dogs = [], cats = [], chickens = [], cows = [], armadillos = [], cockroaches = [], parrots = [], gulls = [], crabs = [], macaws = [], songbirds = [], planes = [] }) {
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
    const gullList = low ? gulls.slice(0, 2) : gulls;
    const crabList = low ? crabs.slice(0, 1) : crabs;
    /* Vida de céu (r2): em `low` o bando encolhe mas NÃO some — o avião é uma peça só e
       fica sempre, porque é ele que o dono pediu pelo nome. */
    const macawList = low ? macaws.slice(0, 1) : macaws;
    const songbirdList = low ? songbirds.slice(0, 3) : songbirds;
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
    gullList.forEach((config, index) => this._add('gull', config, index));
    crabList.forEach((config, index) => this._add('crab', config, index));
    macawList.forEach((config, index) => this._add('macaw', config, index));
    songbirdList.forEach((config, index) => this._add('songbird', config, index));
    planes.forEach((config, index) => this._add('plane', config, index));
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
    const loaded = PROCEDURAIS.has(type) ? null : cloneAsset(assetId);
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
      // voador é escalado pelo COMPRIMENTO e girado para a frente do three.js (região append-only)
      if (VOADORES.has(type)) normalizeVoador(type, model);
      animalRoot.add(model);
    } else {
      model = type === 'rat' ? fallbackRat(index) : type === 'dog' ? fallbackDog()
        : type === 'armadillo' ? fallbackArmadillo() : type === 'cockroach' ? fallbackCockroach()
        : type === 'parrot' ? fallbackParrot() : type === 'gull' ? fallbackGull()
        : type === 'crab' ? fallbackCrab() : fallbackPigeon();
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
    /* Voador não declara `pos`: a rota É a posição (centro/raio/altura). O ponto de fase 0
       do circuito faz as vezes de origem, para `snapshot`/`reset` e para a sonda AR3. */
    const rotaVoo = VOADORES.has(type) ? rotaDeVoo(type, config, index) : null;
    const partida = rotaVoo
      ? [rotaVoo.centro[0] + Math.cos(rotaVoo.fase) * rotaVoo.raio, rotaVoo.altura, rotaVoo.centro[1] + Math.sin(rotaVoo.fase) * rotaVoo.raio]
      : config.pos;
    const origin = new THREE.Vector3(...partida);
    const to = new THREE.Vector3(...(config.to || partida));
    this.animals.push({
      id: `${type}-${index}`, type, mode: type === 'pigeon' ? 'ground' : type === 'gull' ? 'planeio'
        : VOADORES.has(type) ? 'circuito' : (config.mode || 'ground'), root: animalRoot, model,
      origin, to, phase: config.phase || 0, radius: config.radius || [2.4, 1.8],
      source: loaded ? 'gltf' : 'fallback', mixer, actions, action: 'idle', state: 'idle', alertUntil: 0,
      alertAt: 0, alertOrigin: origin.clone(), flee: new THREE.Vector3(1, 0, 0),
      routine: origin.clone(), recoverAt: 0, recoverUntil: 0, recoverFrom: origin.clone(),
      rota: rotaVoo,
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
      if (animal.rota) { animal.root.rotation.order = 'YXZ'; this._updateCircuito(animal, 0); }
      else { animal.root.position.copy(animal.origin); animal.root.rotation.set(0, animal.phase, 0); }
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
      if (animal.type === 'plane') continue;   // monomotor a 60 m não ouve tiro de pistola
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
      else if (animal.type === 'gull') this._updateGull(animal, dt);
      else if (animal.type === 'crab') this._updateCrab(animal, dt);
      else if (VOADORES.has(animal.type)) this._updateCircuito(animal, dt);
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
    /* papagaio de POLEIRO (plans/22): não voa; vida = balanço procedural e
       tiro perto = tremida rápida sem sair do poleiro. */
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

  _updateGull(animal) {
    /* Planeio em elipse entre `pos` e `to`, com banking e asa batendo a 2,1 Hz; susto
       perto sobe e acelera. Clausulas B8b/B8c do eval:mansao-beach medem as duas. */
    const assustada = this.time < animal.alertUntil;
    const t = (this.time * (assustada ? .28 : .16) + animal.phase) * Math.PI * 2;
    const cx = (animal.origin.x + animal.to.x) / 2, cz = (animal.origin.z + animal.to.z) / 2;
    const rx = Math.max(3, Math.abs(animal.to.x - animal.origin.x) / 2 + 4);
    const rz = Math.max(3, Math.abs(animal.to.z - animal.origin.z) / 2 + 3);
    const alto = (animal.origin.y + animal.to.y) / 2 + (assustada ? 3.4 : 0);
    animal.root.position.set(cx + Math.cos(t) * rx, alto + Math.sin(t * 1.7 + animal.phase) * .9, cz + Math.sin(t) * rz);
    animal.root.rotation.y = -t + Math.PI / 2;
    animal.root.rotation.z = Math.sin(t) * .34;   // banking
    const bate = Math.sin(this.time * (assustada ? 19 : 13.2) + animal.phase * 3);
    for (const parte of animal.root.children) {
      if (parte.userData?.faunaPart !== 'wing') continue;
      parte.rotation.z = (parte.userData.wingSide || 1) * (.12 + bate * .46);
    }
    animal.state = assustada ? 'flee' : 'planeio';
  }

  _updateCrab(animal) {
    // Caranguejo anda de LADO: o rumo do corpo fica 90 graus do vetor de marcha.
    const alvo = animal.routine;
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(1.9, elapsed * 1.5));
      animal.root.position.y = animal.alertOrigin.y;
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z) + Math.PI / 2;
      animal.state = 'flee';
      return;
    }
    const cycle = (this.time + animal.phase) % 7;
    const andando = cycle < 4.2;
    const k = andando ? .5 - .5 * Math.cos(cycle / 4.2 * Math.PI * 2) : 0;
    alvo.lerpVectors(animal.origin, animal.to, k);
    const recuperando = this._recoverToRoute(animal, alvo, 1.4);
    const rumo = animal.to.clone().sub(animal.origin);
    if (cycle > 2.1) rumo.negate();
    if (rumo.lengthSq() > .001) animal.root.rotation.y = Math.atan2(rumo.x, rumo.z) + Math.PI / 2;
    animal.root.rotation.z = andando ? Math.sin(this.time * 11 + animal.phase) * .07 : 0;
    animal.state = recuperando ? 'recover' : andando ? 'walk' : 'idle';
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
    const gull = this.animals.filter((animal) => animal.type === 'gull').length;
    const crab = this.animals.filter((animal) => animal.type === 'crab').length;
    const macaw = this.animals.filter((animal) => animal.type === 'macaw').length;
    const songbird = this.animals.filter((animal) => animal.type === 'songbird').length;
    const plane = this.animals.filter((animal) => animal.type === 'plane').length;
    return {
      map: this.map, low: this.low, gltf: this.animals.length > 0 && this.animals.every((animal) => animal.source === 'gltf'),
      counts: { rat, pigeon, dog, cat, chicken, cow, armadillo, cockroach, parrot, gull, crab, macaw, songbird, plane,
        total: rat + pigeon + dog + cat + chicken + cow + armadillo + cockroach + parrot + gull + crab + macaw + songbird + plane },
      meshes, triangles: Math.round(triangles),
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

/* FAUNA ESTÁTICA POSICIONÁVEL (BUG-57, região append-only): GLB sem rig, escala por
   comprimento (plans/21-FAUNA-CORREGO.md); yawFix medido em tools/eval/asset-evidence/fauna/. */
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

/* ===========================================================================
   VIDA DE CÉU DO JOÁ (r2, região APPEND-ONLY)
   ---------------------------------------------------------------------------
   Dono: "aviao voando, com propaganda no banner + animais como araras,
   passarinhos voando nao presente". A parte 2 do BUG-57 (vida de céu por bioma)
   estava adiada no cabeçalho do ambience-registry-check à espera da primeira
   referência aprovada; esta é ela.

   TRÊS DECISÕES, E O PORQUÊ DE CADA UMA

   1. ROTA CIRCULAR PARAMÉTRICA, NÃO `pos`/`to`. A gaivota reaproveita `pos`/`to`
      e monta uma elipse a partir deles; para o avião isso seria declarar o raio
      por acidente. Aqui a rota é o que ela é: centro, raio, altura e PERÍODO.
      O período é o número honesto — "lento" é 90 s para dar a volta, não uma
      velocidade que ninguém consegue conferir.

   2. BANKING COM O SINAL DEDUZIDO, NÃO CHUTADO. Um bicho (ou avião) que curva
      inclina PARA DENTRO da curva. Com a convenção do three.js (frente = -Z) e
      `rotation.order = 'YXZ'`, o roll é o Z local e um roll POSITIVO joga o topo
      para o -X local, que na volta anti-horária aponta para FORA. Por isso o
      sinal é negativo: `rotation.z = -banking`. A cláusula CV3 do
      ambience-registry-check mede o produto escalar entre o "cima" do bicho e a
      direção do centro do círculo — se algum dia alguém trocar o sinal, ela fica
      vermelha, porque avião deitando para fora da curva é o defeito.

   3. O MOLDE VEM DEITADO NO EIXO ERRADO E ISSO É MEDIDO, NÃO ASSUMIDO. O
      `aviao_faixa.glb` tem o NARIZ no -X e a faixa no +X (bbox do nó `corpo`
      x ∈ [-0,499; -0,009] contra o nó `faixa` x ∈ [-0,011; 0,499], lido com
      gltf-transform). Girar -PI/2 em Y põe o nariz no -Z, que é a frente do
      three.js — e só então yaw/roll significam o que o nome diz.

   A faixa ganha textura de propaganda própria (`/img/textures/faixa_aviao.webp`,
   fictícia: "RÁDIO TRETA FM 99"). As UV são REESCRITAS por projeção planar a
   partir da posição dos vértices em vez de reaproveitar as do atlas do Mint: a
   faixa é uma fita quase plana no plano XY, então a projeção é exata e não
   depende de onde o Mint resolveu assar a ilha de UV.
   =========================================================================== */
Object.assign(ASSETS, {
  macaw: 'models/ambient/arara_voo.glb',
  songbird: 'models/ambient/passaro_voo.glb',
  plane: 'models/props/aviao_faixa.glb',
});
export const CEU_JOA_ASSETS = Object.freeze(['macaw', 'songbird', 'plane']);
export const MANSAO_AMBIENCE_ASSETS = Object.freeze([...FAVELA_AMBIENCE_ASSETS, ...CEU_JOA_ASSETS]);

/* Tamanho de mundo (m) pelo EIXO LONGO do molde e giro que põe a frente no -Z.
   Avião: 12 m de ponta a ponta com a faixa (a nota do Mint pede escala ~12 sobre o
   molde normalizado em 1 m). Arara 0,95 m de bico a cauda; pássaro 0,30 m. */
const VOO_MOLDE = Object.freeze({
  plane: { comprimento: 12, giro: -Math.PI / 2 },
  macaw: { comprimento: 0.95, giro: 0 },
  songbird: { comprimento: 0.30, giro: 0 },
});

/* Rota de circuito. `config` aceita centro/raio/altura/periodo; o que faltar cai num
   padrão por tipo. `index` abre o bando em leque — mesmo círculo, fases e raios
   ligeiramente diferentes, senão cinco pássaros viram um pássaro com cinco cópias. */
function rotaDeVoo(type, config = {}, index = 0) {
  const padrao = {
    plane: { centro: [0, -30], raio: 150, altura: 62, periodo: 90, banking: 0.20, sobe: 0 },
    macaw: { centro: [-6, 6], raio: 26, altura: 17, periodo: 26, banking: 0.34, sobe: 1.1 },
    songbird: { centro: [4, -18], raio: 14, altura: 12, periodo: 15, banking: 0.40, sobe: 0.8 },
  }[type] || {};
  const espalha = index * 0.9;
  return {
    centro: config.centro || padrao.centro,
    raio: (config.raio || padrao.raio) * (1 + (index % 3) * 0.06),
    altura: (config.altura ?? padrao.altura) + (index % 4) * (type === 'plane' ? 0 : 1.3),
    periodo: config.periodo || padrao.periodo,
    banking: config.banking ?? padrao.banking,
    sobe: config.sobe ?? padrao.sobe,
    fase: (config.phase || 0) + espalha,
    sentido: config.sentido || 1,
  };
}

/* Um passo do circuito. Determinístico em `this.time` — a régua reproduz o quadro sem
   guardar estado, do mesmo jeito que faz com a gaivota. */
FavelaAmbience.prototype._updateCircuito = function _updateCircuito(animal) {
  const r = animal.rota;
  const a = r.sentido * ((this.time / r.periodo) * Math.PI * 2 + r.fase);
  const cx = r.centro[0], cz = r.centro[1];
  animal.root.position.set(
    cx + Math.cos(a) * r.raio,
    r.altura + Math.sin(a * 2 + r.fase) * r.sobe,
    cz + Math.sin(a) * r.raio,
  );
  // tangente do círculo; a frente do three.js é -Z, então o yaw é atan2(-fx, -fz)
  const fx = -Math.sin(a) * r.sentido, fz = Math.cos(a) * r.sentido;
  animal.root.rotation.order = 'YXZ';
  animal.root.rotation.y = Math.atan2(-fx, -fz);
  animal.root.rotation.x = 0;
  animal.root.rotation.z = -r.banking * r.sentido;   // inclina PARA DENTRO (decisão 2)
  // asa batendo só em quem tem asa: o monomotor não bate asa
  if (animal.type !== 'plane') {
    const bate = Math.sin(this.time * (animal.type === 'songbird' ? 11.5 : 6.4) + r.fase * 3);
    for (const parte of animal.root.children) {
      if (parte.userData?.faunaPart !== 'wing') continue;
      parte.rotation.z = (parte.userData.wingSide || 1) * (0.1 + bate * 0.42);
    }
  }
  animal.state = 'circuito';
};

/* O `normalizeModel` do topo escala pela ALTURA e é o certo para bicho que anda. Bicho de
   asa aberta e avião têm de ser escalados pelo COMPRIMENTO — pela altura, uma arara de
   asas abertas viraria do tamanho de um pombo. Este hook roda no `_add` via
   `normalizeVoador`, chamado logo depois do normalizeModel padrão. */
function normalizeVoador(type, model) {
  const molde = VOO_MOLDE[type];
  if (!molde) return;
  model.scale.setScalar(1);
  model.rotation.set(0, 0, 0);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const escala = molde.comprimento / Math.max(0.001, Math.max(size.x, size.z));
  model.scale.setScalar(escala);
  const centro = box.getCenter(new THREE.Vector3());
  model.position.set(-centro.x * escala, -centro.y * escala, -centro.z * escala);
  model.rotation.y = molde.giro;
  if (type === 'plane') pintaFaixa(model);
}

/* Textura de propaganda na FAIXA. Procura o nó `faixa` do molde (o Mint entrega corpo e
   faixa separados justamente para isto) e reescreve as UV por projeção planar do XY. */
function pintaFaixa(model) {
  if (typeof document === 'undefined') return;
  let faixa = null;
  model.traverse((o) => { if (!faixa && o.isMesh && /faixa/i.test(o.name)) faixa = o; });
  if (!faixa) { console.warn('[ambientlife] aviao_faixa sem nó "faixa" — banner fica sem propaganda'); return; }
  const geo = faixa.geometry;
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const lx = Math.max(1e-6, bb.max.x - bb.min.x), ly = Math.max(1e-6, bb.max.y - bb.min.y);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / lx;
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / ly;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const tex = new THREE.TextureLoader().load(`/img/textures/faixa_aviao.webp?v=${VERSION}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  faixa.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  faixa.userData.faixaPintada = true;
}
