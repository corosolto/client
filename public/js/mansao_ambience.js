import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFavelaAmbience, preloadAmbientLife, cloneAmbientLifeAsset, registerFaunaTemplate } from './ambientlife.js';
import { VERSION } from './version.js';

export const MANSAO_AMBIENCE_ASSETS = Object.freeze(['rat', 'pigeonGround', 'parrot']);
export const MANSAO_SKY_ASSETS = Object.freeze({
  macaw: 'models/ambient/mansao_arara_voo.glb',
  songbird: 'models/ambient/passaro_voo.glb',
  plane: 'models/props/aviao_faixa.glb',
});
const VOADORES = new Set(Object.keys(MANSAO_SKY_ASSETS));
const ALERT_TIME = { gull: 2.6, crab: 1.6 };
let preloadPending;
export async function preloadMansaoAmbience() {
  if (preloadPending) return preloadPending;
  preloadPending = (async () => {
    const loader = new GLTFLoader();
    await preloadAmbientLife(MANSAO_AMBIENCE_ASSETS);
    const results = await Promise.all(Object.entries(MANSAO_SKY_ASSETS).map(async ([id, url]) => {
      if (cloneAmbientLifeAsset(id)) return null;
      try {
        const gltf = await loader.loadAsync(`${url}?v=${VERSION}`);
        registerFaunaTemplate(id, gltf.scene);
        return null;
      } catch (error) {
        console.warn('[mansao_ambience] asset ausente', url, error);
        return id;
      }
    }));
    return { missingAssets: results.filter(Boolean) };
  })();
  try { return await preloadPending; } finally { preloadPending = null; }
}

// Geometria e rotas recuperadas de map2/mansao; procedência em docs/maps/MANSAO-R2.md.
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

function distanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq < 1e-6) return point.distanceTo(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}

class MansaoAmbience {
  constructor(root, options = {}) {
    this.map = options.map || 'mansao';
    this.low = !!options.low;
    this.base = createFavelaAmbience(root, options);
    this.group = new THREE.Group();
    this.group.name = 'AMBIENT_LIFE_MANSAO_COAST';
    this.group.userData.ambientLife = true;
    root.add(this.group);
    this.extraAnimals = [];
    this.missingAssets = [];
    this.paused = false;
    this.ready = true;
    this.time = 0;
    const families = { gull: 'gulls', crab: 'crabs', macaw: 'macaws', songbird: 'songbirds', plane: 'planes' };
    for (const [type, key] of Object.entries(families)) {
      const configs = options[key] || [];
      const max = this.low ? ({ gull: 2, crab: 1, macaw: 1, songbird: 3, plane: 1 })[type] : configs.length;
      configs.slice(0, max).forEach((config, index) => this._add(type, config, index));
    }
    this.animals = [...this.base.animals, ...this.extraAnimals];
    this.reset();
  }

  _add(type, config, index) {
    const loaded = VOADORES.has(type) ? cloneAmbientLifeAsset(type) : null;
    if (VOADORES.has(type) && !loaded) {
      if (!this.missingAssets.includes(type)) this.missingAssets.push(type);
      return;
    }
    const root = new THREE.Group();
    root.name = `${type}:${this.map}:${index}`;
    root.userData.fauna = ({ gull: 'gaivota', crab: 'caranguejo', macaw: 'arara', songbird: 'passaro', plane: 'aviao' })[type];
    root.userData.nonCollider = true;
    root.userData.motion = VOADORES.has(type) ? 'deterministic-circuit' : 'deterministic-run-idle';
    let model = loaded?.model;
    if (model) { normalizeVoador(type, model); root.add(model); }
    else {
      model = type === 'gull' ? fallbackGull() : fallbackCrab();
      while (model.children.length) root.add(model.children[0]);
      model = root;
    }
    root.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.nonSolidSurface = true;
      object.castShadow = !this.low && !VOADORES.has(type);
      object.receiveShadow = true;
    });
    const wingDeformations = type === 'macaw' || type === 'songbird' ? prepareWingDeformation(type, model) : [];
    const rota = VOADORES.has(type) ? rotaDeVoo(type, config, index) : null;
    const origin = new THREE.Vector3(...(config.pos || [0, 0, 0]));
    const to = new THREE.Vector3(...(config.to || config.pos || [0, 0, 0]));
    this.group.add(root);
    this.extraAnimals.push({
      id: `${type}-${index}`, type, root, model, origin, to, rota, wingDeformations,
      phase: config.phase || 0, mode: rota ? 'circuito' : type === 'gull' ? 'planeio' : 'ground',
      source: loaded ? 'gltf' : 'procedural', state: 'idle', alertUntil: 0, alertAt: 0,
      alertOrigin: origin.clone(), flee: new THREE.Vector3(1, 0, 0), routine: origin.clone(),
      recoverAt: 0, recoverUntil: 0, recoverFrom: origin.clone(),
    });
  }

  setPaused(value) { this.paused = !!value; this.base.setPaused(value); }
  pause(value = true) { this.setPaused(value); }
  reset() {
    this.time = 0;
    this.base.reset();
    for (const animal of this.extraAnimals) {
      animal.alertUntil = animal.alertAt = animal.recoverAt = animal.recoverUntil = 0;
      animal.state = 'idle';
      animal.root.rotation.set(0, animal.phase, 0);
      animal.root.position.copy(animal.origin);
      if (animal.rota) { this._updateCircuito(animal); animal.origin.copy(animal.root.position); }
      animal.recoverFrom.copy(animal.origin);
    }
  }

  onShot(start, end) {
    let reacted = this.base.onShot(start, end);
    for (const animal of this.extraAnimals) {
      if (animal.rota) continue;
      const position = animal.root.getWorldPosition(new THREE.Vector3());
      if (distanceToSegment(position, start, end) > 13) continue;
      animal.alertAt = this.time;
      animal.alertUntil = this.time + ALERT_TIME[animal.type];
      animal.recoverAt = animal.recoverUntil = 0;
      animal.alertOrigin.copy(animal.root.position);
      animal.flee.copy(position).sub(start).setY(0);
      if (animal.flee.lengthSq() < .01) animal.flee.set(Math.sin(animal.phase + 1), 0, Math.cos(animal.phase + 1));
      animal.flee.normalize();
      animal.state = 'flee';
      reacted++;
    }
    return reacted;
  }
  notifyShot(start, end) { return this.onShot(start, end); }

  update(dt, playerPosition) {
    if (this.paused || !this.ready) return;
    dt = Math.max(0, Math.min(.05, dt));
    this.time += dt;
    this.base.update(dt, playerPosition);
    for (const animal of this.extraAnimals) {
      if (!animal.rota && playerPosition && this.time >= animal.alertUntil && animal.root.position.distanceToSquared(playerPosition) < 4.84)
        this.onShot(new THREE.Vector3(playerPosition.x, animal.root.position.y, playerPosition.z), animal.root.position.clone());
      if (animal.type === 'gull') this._updateGull(animal);
      else if (animal.type === 'crab') this._updateCrab(animal);
      else this._updateCircuito(animal);
    }
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
    return [...this.base.snapshot(), ...this.extraAnimals.map((a) => ({
      id: a.id, type: a.type, state: a.state,
      x: +a.root.position.x.toFixed(4), y: +a.root.position.y.toFixed(4), z: +a.root.position.z.toFixed(4), clipTime: 0,
    }))];
  }
  debugSnapshot() { return { animals: this.snapshot(), missingAssets: [...this.missingAssets] }; }
  report() {
    const result = this.base.report();
    for (const type of ['gull', 'crab', ...VOADORES]) result.counts[type] = 0;
    for (const a of this.extraAnimals) {
      result.counts[a.type]++;
      a.root.traverse((object) => {
        if (!object.isMesh || !object.geometry) return;
        result.meshes++;
        result.triangles += (object.geometry.index?.count || object.geometry.attributes.position?.count || 0) / 3;
      });
    }
    result.counts.total = this.animals.length;
    result.triangles = Math.round(result.triangles);
    result.gltf = this.animals.length > 0 && this.animals.every((a) => a.source === 'gltf');
    result.missingAssets = [...this.missingAssets];
    return result;
  }
  dispose() {
    if (!this.ready) return;
    this.base.dispose();
    for (const a of this.extraAnimals) for (const wing of a.wingDeformations) wing.geometry.dispose();
    for (const a of this.extraAnimals) a.root.traverse((o) => {
      if (!o.isMesh) return;
      if (a.source === 'procedural') { o.geometry?.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) m?.dispose(); }
      else if (o.userData.faixaPintada) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); }
    });
    this.group.removeFromParent();
    this.ready = false;
  }
}

export function createMansaoAmbience(root, options) { return new MansaoAmbience(root, options); }

const VOO_MOLDE = Object.freeze({
  plane: { comprimento: 12, giro: -Math.PI / 2 },
  macaw: { comprimento: 0.95, giro: -Math.PI / 2 },
  songbird: { comprimento: 0.30, giro: 0 },
});

// Rota de circuito; o que faltar no config cai no padrão do tipo. `index` abre o
// bando em leque, senão cinco pássaros viram um pássaro com cinco cópias.
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

// Um passo do circuito, determinístico em `this.time`: a régua reproduz o quadro
// sem guardar estado, como já faz com a gaivota.
MansaoAmbience.prototype._updateCircuito = function _updateCircuito(animal) {
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
    for (const wing of animal.wingDeformations) deformWing(wing, bate * .42);
  }
  animal.state = 'circuito';
};

// Animação procedural nova sobre o GLB histórico; faixas medidas por mansao-ambience-check.mjs.
// Faixas centrais preservadas; pivô Y é a mediana do colar de 0.03 além da raiz medida no teste.
function prepareWingDeformation(type, model) {
  const parts = [];
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry = mesh.geometry.clone();
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const rest = new Float32Array(position.count * 3);
    const restNormals = normal ? new Float32Array(normal.count * 3) : null;
    const lateral = type === 'macaw' ? 2 : 0, cut = type === 'macaw' ? .10 : .18;
    const hingeY = type === 'macaw' ? .02636718563735485 : .0615234449505806;
    const weights = new Float32Array(position.count);
    let travel = 0;
    for (let i = 0; i < position.count; i++) {
      const point = [position.getX(i), position.getY(i), position.getZ(i)];
      rest.set(point, i * 3);
      if (normal) restNormals.set([normal.getX(i), normal.getY(i), normal.getZ(i)], i * 3);
      const span = Math.abs(point[lateral]) - cut;
      if (span <= 0 || (type === 'songbird' && point[2] >= 0)) continue;
      weights[i] = THREE.MathUtils.smoothstep(span, 0, .10);
      travel = Math.max(travel, 2 * Math.sin(.42 / 2) * Math.hypot(span, point[1] - hingeY));
    }
    // Algumas versões do Three vendorizado não expõem setUsage no atributo;
    // needsUpdate abaixo continua garantindo o upload dos vértices deformados.
    position.setUsage?.(THREE.DynamicDrawUsage);
    normal?.setUsage?.(THREE.DynamicDrawUsage);
    geometry.computeBoundingBox(); geometry.boundingBox.expandByScalar(travel);
    geometry.computeBoundingSphere(); geometry.boundingSphere.radius += travel;
    parts.push({ geometry, rest, restNormals, weights, lateral, cut, hingeY });
  });
  return parts;
}

function deformWing(wing, angle) {
  const { geometry, rest, restNormals, weights, lateral, cut, hingeY } = wing;
  const position = geometry.attributes.position, normal = geometry.attributes.normal;
  for (let i = 0; i < weights.length; i++) {
    if (!weights[i]) continue;
    const k = i * 3, side = Math.sign(rest[k + lateral]);
    const span = Math.abs(rest[k + lateral]) - cut, y = rest[k + 1] - hingeY;
    const a = angle * weights[i], c = Math.cos(a), s = Math.sin(a);
    position.setY(i, hingeY + y * c + span * s);
    const across = side * (cut + span * c - y * s);
    if (lateral === 0) position.setX(i, across); else position.setZ(i, across);
    if (normal && restNormals) {
      const ny = restNormals[k + 1], ns = restNormals[k + lateral];
      normal.setY(i, ny * c + side * ns * s);
      if (lateral === 0) normal.setX(i, ns * c - side * ny * s);
      else normal.setZ(i, ns * c - side * ny * s);
    }
  }
  position.needsUpdate = true;
  if (normal) normal.needsUpdate = true;
}

// O normalizeModel do topo escala pela ALTURA (certo para bicho que anda); asa
// aberta e avião têm de ser escalados pelo COMPRIMENTO.
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

// Propaganda na FAIXA: acha o nó `faixa` do molde e reescreve as UV por projeção
// planar do XY, em vez de reaproveitar a ilha do atlas do Mint.
function pintaFaixa(model) {
  if (typeof document === 'undefined' || typeof Image === 'undefined' || /node/i.test(globalThis.navigator?.userAgent || '')) return;
  let faixa = null;
  model.traverse((o) => { if (!faixa && o.isMesh && /faixa/i.test(o.name)) faixa = o; });
  if (!faixa) { console.warn('[ambientlife] aviao_faixa sem nó "faixa" — banner fica sem propaganda'); return; }
  const geo = faixa.geometry = faixa.geometry.clone();
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
