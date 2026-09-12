import * as THREE from 'three';
import { placeProp } from './mapprops.js';

export const LAJES_SKY_PROPS = Object.freeze(['helicoptero_pm']);
export const LAJES_KITE_CONFIGS = Object.freeze([
  Object.freeze({ ancora: [-11, 3.1, -26], alt: 17, raio: 22, fase: 3.4, giro: .35 }),
  Object.freeze({ ancora: [11, 3.1, 25], alt: 20, raio: 20, fase: .1, giro: .4 }),
  Object.freeze({ ancora: [-7, 3.1, 12], alt: 24, raio: 24, fase: 1.6, giro: .3 }),
  Object.freeze({ ancora: [7, 3.1, -12], alt: 19, raio: 23, fase: -1.1, giro: .35 }),
  Object.freeze({ ancora: [-11, 3.1, -8], alt: 29, raio: 29, fase: .7, giro: .4 }),
  Object.freeze({ ancora: [11, 3.1, 8], alt: 26, raio: 26, fase: 2.6, giro: .25 }),
  Object.freeze({ ancora: [-9, 3.1, 18], alt: 22, raio: 30, fase: -1.8, giro: .3 }),
  Object.freeze({ ancora: [9, 3.1, -18], alt: 32, raio: 34, fase: 2.2, giro: .4 }),
]);

const disabled = () => typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('lajessky') === '0';
const mark = object => {
  object.userData.nonCollider = true;
  object.userData.nonSolidSurface = true;
  if (object.isMesh) { object.castShadow = false; object.receiveShadow = false; }
};

export function attachLajesKitePresentation(ambience) {
  if (!ambience?.pipaSky || disabled()) return null;
  if (ambience.lajesKitePresentation) return ambience.lajesKitePresentation;
  const children = ambience.pipaSky.group.children;
  const kites = [];
  for (const carrier of children.filter(o => o.userData.skyLife === 'pipa')) {
    const model = carrier.children[0];
    let mesh = null;
    model?.traverse(object => {
      if (object.isMesh && /^Red_Yellow_Diamond_Kite(?:_\d+)?$/.test(object.name)) mesh = object;
    });
    const line = children[children.indexOf(carrier) + 1];
    if (!mesh?.isMesh || !line?.isLine) continue;
    model.updateWorldMatrix(true, true);
    const local = model.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
    const bounds = new THREE.Box3(), point = new THREE.Vector3();
    const positions = mesh.geometry.attributes.position;
    // GLB pipa-lajes: rabiola abaixo de Y=.02; a vela ocupa a metade superior.
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) < .02) continue;
      bounds.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(local));
    }
    if (bounds.isEmpty()) continue;
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 1.2 / Math.max(.001, size.x, size.y);
    model.scale.setScalar(scale);
    model.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
    model.userData.lajesSailSize = size.multiplyScalar(scale).toArray();
    kites.push({ carrier, model, line, anchor: new THREE.Vector3() });
  }
  let time = 0, disposed = false;
  const update = dt => {
    time += Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .05) : 0;
    for (const [i, kite] of kites.entries()) {
      const toward = kite.anchor.fromBufferAttribute(kite.line.geometry.attributes.position, 0)
        .sub(kite.carrier.position);
      // A vela enfrenta a linha/vento, não a velocidade tangencial nem a câmera.
      kite.carrier.rotation.y = Math.atan2(toward.x, toward.z) + Math.sin(time * 2.3 + i) * .09;
      kite.carrier.rotation.x = -.6 * Math.atan2(toward.y, Math.hypot(toward.x, toward.z));
    }
  };
  update(0);
  const previousUpdate = ambience.update.bind(ambience);
  ambience.update = (dt, playerPosition) => {
    previousUpdate(dt, playerPosition);
    if (!disposed && !ambience.paused) update(dt);
  };
  const previousDispose = ambience.dispose.bind(ambience);
  ambience.dispose = () => { disposed = true; previousDispose(); };
  ambience.lajesKitePresentation = {
    count: kites.length,
    snapshot: () => kites.map(kite => ({ source: 'gltf', sailSize: kite.model.userData.lajesSailSize,
      scale: kite.model.scale.x, rotation: kite.carrier.rotation.toArray().slice(0, 3), disposed })),
  };
  return ambience.lajesKitePresentation;
}

export function attachLajesSky(ambience, root, options = {}) {
  if (!ambience || disabled()) return null;
  if (ambience.lajesSky) return ambience.lajesSky;
  const { length = 9.5, altitude = 38, radiusX = 62, radiusZ = 84,
    centerX = 0, centerZ = 8, period = 105, phase = -.75 } = options;
  const group = new THREE.Group();
  group.name = 'LAJES_SKY'; group.userData.skyLife = 'helicopter';
  const carrier = new THREE.Group();
  carrier.name = 'LAJES_HELICOPTER'; carrier.userData.skyLife = 'helicopter';
  const model = placeProp('helicoptero_pm', { targetH: 1 });
  let rotorMain = null, rotorTail = null;
  if (model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = length / Math.max(.001, size.x, size.z);
    // Escala pelo comprimento medido; targetLen do loader usa média com altura.
    model.scale.multiplyScalar(scale);
    model.position.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
    rotorMain = model.getObjectByName('rotor_main');
    rotorTail = model.getObjectByName('rotor_tail');
    carrier.add(model);
  }
  carrier.userData.source = model ? 'gltf' : 'missing-glb';
  carrier.userData.asset = 'helicoptero_pm';
  group.add(carrier); group.traverse(mark); root.add(group);
  let time = 0, disposed = false;
  const update = dt => {
    const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .05) : 0;
    time += step;
    const angle = phase + time * Math.PI * 2 / Math.max(1, period);
    carrier.position.set(centerX + Math.cos(angle) * radiusX,
      altitude + Math.sin(angle * 2 + .4) * 1.5, centerZ + Math.sin(angle) * radiusZ);
    // O nariz do GLB aponta para +X; a tangente da órbita define o rumo.
    carrier.rotation.y = Math.atan2(-radiusZ * Math.cos(angle), -radiusX * Math.sin(angle));
    carrier.rotation.z = -.045;
    if (rotorMain) rotorMain.rotation.y = (time * 39) % (Math.PI * 2);
    if (rotorTail) rotorTail.rotation.z = (time * 64) % (Math.PI * 2);
  };
  update(0);
  const previousUpdate = ambience.update.bind(ambience);
  ambience.update = (dt, playerPosition) => {
    previousUpdate(dt, playerPosition);
    if (!disposed && !ambience.paused) update(dt);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    // clone(true) compartilha materiais/geometrias do cache de props.
    group.removeFromParent();
  };
  const previousDispose = ambience.dispose.bind(ambience);
  ambience.dispose = () => { dispose(); previousDispose(); };
  ambience.lajesSky = {
    group, dispose,
    snapshot: () => ({ source: carrier.userData.source, asset: 'helicoptero_pm',
      position: carrier.position.toArray(), heading: carrier.rotation.y,
      rotorMain: !!rotorMain, rotorTail: !!rotorTail,
      rotorAngles: [rotorMain?.rotation.y ?? null, rotorTail?.rotation.z ?? null],
      length, disposed }),
  };
  return ambience.lajesSky;
}

export function addLajesBackdrop(root, { low = false } = {}) {
  if (disabled()) return null;
  const segments = low ? 96 : 160;
  const radii = Array.from({ length: low ? 13 : 25 }, (_, i) => 72 + i / (low ? 12 : 24) * 213);
  const positions = [], colors = [], indices = [];
  const green = new THREE.Color(0x36594c), earth = new THREE.Color(0x586b50);
  for (let row = 0; row < radii.length; row++) {
    const r = radii[row];
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const ridge = 20 + 22 * Math.pow(.5 + .5 * Math.sin(angle * 2 + .7), 2)
        + 15 * Math.pow(.5 + .5 * Math.sin(angle * 3 - 1.2), 4);
      const envelope = Math.sin(row / (radii.length - 1) * Math.PI);
      const fine = Math.sin(angle * 13 + row * .8) * 1.6 + Math.sin(angle * 23) * .65;
      const height = -9 + envelope * (ridge + fine);
      positions.push(Math.cos(angle) * r, height, Math.sin(angle) * r);
      const color = green.clone().lerp(earth, .3 + .2 * Math.sin(angle * 5 + row));
      colors.push(color.r, color.g, color.b);
      if (row < radii.length - 1 && i < segments) {
        const a = row * (segments + 1) + i, b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'LAJES_MORRO_BACKDROP'; mesh.userData.skyLife = 'urban-hills'; mark(mesh);
  root.add(mesh);
  let disposed = false;
  return { group: mesh, dispose() {
    if (disposed) return;
    disposed = true; mesh.removeFromParent(); geometry.dispose(); material.dispose();
  } };
}

export function addLajesSkyDome(root) {
  if (disabled()) return null;
  const geometry = new THREE.SphereGeometry(330, 32, 20);
  const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { zenith: { value: new THREE.Color(0x468ab6) }, horizon: { value: new THREE.Color(0xc6d7df) } },
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 zenith;uniform vec3 horizon;varying vec3 direction;void main(){float h=pow(max(normalize(direction).y,0.0),0.65);gl_FragColor=vec4(mix(horizon,zenith,h),1.0);}',
    toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'LAJES_SKY_DOME';
  mesh.renderOrder = -100; mesh.frustumCulled = false; mark(mesh); root.add(mesh);
  return { dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); } };
}
