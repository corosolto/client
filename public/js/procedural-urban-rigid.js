import * as THREE from 'three';
import {selectUrbanBodyCandidate} from './procedural-urban-apparel.js';

export const URBAN_RIGID_VERSION = 'cs-urban-rigid-candidate/1';
export const URBAN_RIGID_TRIANGLE_LIMIT = 5000;

const FAMILY_DEFINITIONS = {
  'backpack-rolltop': { category: 'backpack', slot: 'back', socket: 'Spine02', builder: 'rolltop', palette: [0x26333b, 0xd66a2c, 0x313131] },
  'backpack-triple-pocket': { category: 'backpack', slot: 'back', socket: 'Spine02', builder: 'triplePocket', palette: [0x384735, 0xb7a476, 0x292c28] },
  'backpack-sling': { category: 'backpack', slot: 'back', socket: 'Spine02', builder: 'sling', palette: [0x242a30, 0x4d8b86, 0x202020] },
  'backpack-drypack': { category: 'backpack', slot: 'back', socket: 'Spine02', builder: 'drypack', palette: [0xc48733, 0x273740, 0x333333] },
  'backpack-modular': { category: 'backpack', slot: 'back', socket: 'Spine02', builder: 'modular', palette: [0x4b5145, 0x8d775a, 0x2a2d28] },
  'backpack-tote': { category: 'backpack', slot: 'back', socket: 'LeftHand', builder: 'tote', palette: [0x706554, 0xc95d46, 0x302b27] },
  'backpack-duffel': { category: 'backpack', slot: 'back', socket: 'RightHand', builder: 'duffel', palette: [0x343a43, 0xd0a248, 0x24272b] },
  'headwear-trucker': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'trucker', palette: [0x30404d, 0xe0d4b7, 0x303030] },
  'headwear-boina': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'boina', palette: [0x6c3137, 0x252525, 0x222222] },
  'headwear-beanie': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'beanie', palette: [0x3d5260, 0xb65e44, 0x292929] },
  'headwear-bucket': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'bucket', palette: [0x555f46, 0xc5b98b, 0x30322d] },
  'headwear-balaclava': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'balaclava', palette: [0x2d3034, 0x555c63, 0x202020] },
  'headwear-hair': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'hair', palette: [0x302820, 0x704735, 0x24201d] },
  'headwear-helmet': { category: 'headwear', slot: 'head', socket: 'Head', builder: 'helmet', palette: [0x47535a, 0xa66a35, 0x25292c] },
  'accessory-chain': { category: 'accessory', slot: 'neck', socket: 'Spine02', builder: 'chain', palette: [0xc4a85d, 0x8c7135, 0x292929] },
  'accessory-bandana': { category: 'accessory', slot: 'face', socket: 'Head', builder: 'bandana', palette: [0x8b3f3c, 0xd4bd8c, 0x292929] },
  'accessory-earring': { category: 'accessory', slot: 'piercing', socket: 'Head', builder: 'earring', palette: [0xc8b56b, 0x78652d, 0x292929] },
  'accessory-bracelet': { category: 'accessory', slot: 'wrist', socket: 'RightHand', builder: 'bracelet', palette: [0x537d78, 0xb79a55, 0x292929], sided: true },
  'accessory-modular': { category: 'accessory', slot: 'chest', socket: 'Spine02', builder: 'modularAccessory', palette: [0x41483d, 0xa17d4d, 0x292d28] },
  'accessory-ring': { category: 'accessory', slot: 'hand', socket: 'RightHand', builder: 'ring', palette: [0xb9a05c, 0x496d72, 0x2b2b2b], sided: true },
  'accessory-belt': { category: 'accessory', slot: 'waist', socket: 'Spine02', builder: 'belt', palette: [0x46382e, 0xb58d4f, 0x292929] },
  'accessory-case': { category: 'accessory', slot: 'hand', socket: 'RightHand', builder: 'case', palette: [0x39434a, 0xc0783f, 0x292929], sided: true },
};

const PARAMETER_SCHEMA = Object.freeze({
  size: Object.freeze({ min: 0.75, max: 1.25, default: 1 }),
  width: Object.freeze({ min: 0.75, max: 1.3, default: 1 }),
  height: Object.freeze({ min: 0.75, max: 1.3, default: 1 }),
  depth: Object.freeze({ min: 0.75, max: 1.3, default: 1 }),
  detail: Object.freeze({ min: 0.6, max: 1.4, default: 1 }),
});

export const URBAN_RIGID_FAMILIES = Object.freeze(Object.fromEntries(Object.entries(FAMILY_DEFINITIONS).map(([id, value]) => [id, Object.freeze({
  id,
  geometryFamily: id,
  category: value.category,
  slot: value.slot,
  socket: value.socket,
  allowedSockets: value.sided ? Object.freeze(['LeftHand', 'RightHand']) : Object.freeze([value.socket]),
  status: 'candidate',
  approved: false,
  certified: false,
  finalAsset: false,
  branded: false,
  triangleLimit: URBAN_RIGID_TRIANGLE_LIMIT,
  parameters: PARAMETER_SCHEMA,
})])));
export const URBAN_RIGID_FAMILY_IDS = Object.freeze(Object.keys(URBAN_RIGID_FAMILIES));

const CHANNELS = ['getX', 'getY', 'getZ', 'getW'];
const NO_RAYCAST = () => {};
const finiteMatrix = matrix => matrix?.elements?.length === 16 && matrix.elements.every(Number.isFinite);
const triangleCount = geometry => (geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0) / 3;

function factor(options, name) {
  const schema = PARAMETER_SCHEMA[name], value = options[name] ?? schema.default;
  if (!Number.isFinite(value) || value < schema.min || value > schema.max) throw new RangeError(`${name} outside ${schema.min}..${schema.max}`);
  return value;
}

function color(options, name, fallback) {
  const value = options[name] ?? fallback;
  try { return new THREE.Color(value); } catch { throw new TypeError(`${name} is not a Three color`); }
}


function measuredBounds(body, boneIndex, normalizeReadWeights, measurementIndex = boneIndex) {
  const geometry = body.geometry;
  const position = geometry?.getAttribute('position');
  const skinIndex = geometry?.getAttribute('skinIndex');
  const skinWeight = geometry?.getAttribute('skinWeight');
  const inverse = body.skeleton?.boneInverses?.[boneIndex];
  if (!position || !skinIndex || !skinWeight || position.count !== skinIndex.count || position.count !== skinWeight.count || !finiteMatrix(inverse) || !finiteMatrix(body.bindMatrix)) return null;
  const bodyBounds = new THREE.Box3(), socketBounds = new THREE.Box3();
  const point = new THREE.Vector3(), toSocket = new THREE.Matrix4().copy(inverse).multiply(body.bindMatrix);
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
    bodyBounds.expandByPoint(point);
    let total = 0, weight = 0;
    for (let lane = 0; lane < 4; lane++) {
      const value = skinWeight[CHANNELS[lane]](i);
      if (!Number.isFinite(value) || value < 0 || value > 1) return null;
      total += value;
      if (skinIndex[CHANNELS[lane]](i) === measurementIndex) weight += value;
    }
    if (total <= 0 || (!normalizeReadWeights && (total < 0.99 || total > 1.01))) return null;
    if (normalizeReadWeights) weight /= total;
    if (weight >= 0.25) socketBounds.expandByPoint(point.clone().applyMatrix4(toSocket));
  }
  if (bodyBounds.isEmpty() || socketBounds.isEmpty()) return null;
  const bodySize = bodyBounds.getSize(new THREE.Vector3()), socketSize = socketBounds.getSize(new THREE.Vector3());
  if (![bodySize.x, bodySize.y, bodySize.z, socketSize.x, socketSize.y, socketSize.z].every(value => Number.isFinite(value) && value > 1e-5)) return null;
  return { bodyBounds, socketBounds, bodySize, socketSize, toSocket };
}

function materialsFor(definition, options) {
  const colors = {
    primary: color(options, 'primary', definition.palette[0]),
    accent: color(options, 'accent', definition.palette[1]),
    hardware: color(options, 'hardware', definition.palette[2]),
  };
  const materials = new Map();
  return role => {
    if (!materials.has(role)) materials.set(role, new THREE.MeshStandardMaterial({
      name: `urban-${role}`,
      color: colors[role],
      roughness: role === 'hardware' ? 0.48 : 0.82,
      metalness: role === 'hardware' ? 0.48 : 0.02,
    }));
    return materials.get(role);
  };
}

function partKit(group, material) {
  const add = (name, geometry, role = 'primary', position, rotation, scale) => {
    const mesh = new THREE.Mesh(geometry, material(role));
    mesh.name = name;
    if (position) mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.noHit = true;
    mesh.raycast = NO_RAYCAST;
    group.add(mesh);
    return mesh;
  };
  return {
    box: (name, size, at, role, rotation) => add(name, new THREE.BoxGeometry(...size), role, at, rotation),
    cylinder: (name, radiusTop, radiusBottom, height, segments, at, role, rotation) => add(name, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false), role, at, rotation),
    sphere: (name, radius, at, scale, role, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) => add(name, new THREE.SphereGeometry(radius, 18, 10, 0, phiLength, thetaStart, thetaLength), role, at, null, scale),
    torus: (name, radius, tube, radial, tubular, at, rotation, role, arc = Math.PI * 2) => add(name, new THREE.TorusGeometry(radius, tube, radial, tubular, arc), role, at, rotation),
    ring: (name, inner, outer, segments, at, rotation, role) => add(name, new THREE.RingGeometry(inner, outer, segments), role, at, rotation),
    tube(name, points, radius, role = 'hardware') {
      return add(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 10, radius, 5, false), role);
    },
    panel(name, points, role = 'primary') {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
      geometry.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      return add(name, geometry, role);
    },
  };
}

function dimensions(bounds, options) {
  const size = factor(options, 'size'), width = factor(options, 'width'), height = factor(options, 'height'), depth = factor(options, 'depth');
  const stature = bounds.bodySize.y * bounds.toSocket.getMaxScaleOnAxis() * size;
  return { stature, width, height, depth, detail: factor(options, 'detail'), center: bounds.socketBounds.getCenter(new THREE.Vector3()), socket: bounds.socketSize };
}

function buildRolltop(p, d) {
  const w = d.stature * 0.27 * d.width, h = d.stature * 0.35 * d.height, z = d.stature * 0.105 * d.depth, c = d.center;
  p.box('body', [w, h, z], [c.x, c.y - h * 0.12, d.socket.z * -0.62 - z * 0.55]);
  p.cylinder('rolled-top', z * 0.27, z * 0.27, w * 0.94, 12, [c.x, c.y + h * 0.43, d.socket.z * -0.62 - z * 0.55], 'accent', [0, 0, Math.PI / 2]);
  for (const side of [-1, 1]) p.tube(`strap-${side}`, [[c.x + side * w * 0.34, c.y + h * 0.35, c.z], [c.x + side * w * 0.46, c.y, c.z - z * 0.12], [c.x + side * w * 0.3, c.y - h * 0.5, c.z]], z * 0.055, 'hardware');
}

function buildTriplePocket(p, d) {
  const w = d.stature * 0.3 * d.width, h = d.stature * 0.31 * d.height, z = d.stature * 0.1 * d.depth, c = d.center, back = c.z - d.socket.z * 0.5;
  p.box('body', [w, h, z], [c.x, c.y, back - z * 0.55]);
  p.box('lower-pocket', [w * 0.72, h * 0.27, z * 0.42], [c.x, c.y - h * 0.29, back - z * 1.25], 'accent');
  for (const side of [-1, 1]) p.box(`side-pocket-${side}`, [w * 0.22, h * 0.32, z * 0.34], [c.x + side * w * 0.34, c.y + h * 0.08, back - z * 1.21], side < 0 ? 'accent' : 'hardware');
}

function buildSling(p, d) {
  const w = d.stature * 0.2 * d.width, h = d.stature * 0.35 * d.height, z = d.stature * 0.09 * d.depth, c = d.center;
  p.box('diagonal-pouch', [w, h, z], [c.x + w * 0.18, c.y - h * 0.03, c.z - z], 'primary', [0, 0, -0.24]);
  p.tube('cross-body-strap', [[c.x - w * 1.35, c.y + h * 0.72, c.z], [c.x, c.y + h * 0.05, c.z - z * 0.55], [c.x + w * 1.2, c.y - h * 0.68, c.z]], z * 0.07, 'accent');
  p.box('zipper', [w * 0.72, h * 0.025, z * 0.06], [c.x + w * 0.18, c.y + h * 0.14, c.z - z * 1.55], 'hardware', [0, 0, -0.24]);
}

function buildDrypack(p, d) {
  const r = d.stature * 0.12 * d.width, h = d.stature * 0.38 * d.height, z = d.stature * 0.11 * d.depth, c = d.center;
  p.cylinder('sealed-body', r, r * 0.9, h, 14, [c.x, c.y, c.z - z], 'primary');
  p.cylinder('rolled-seal', z * 0.22, z * 0.22, r * 1.7, 10, [c.x, c.y + h * 0.52, c.z - z], 'accent', [0, 0, Math.PI / 2]);
  for (const side of [-1, 1]) p.box(`side-rail-${side}`, [z * 0.13, h * 0.72, z * 0.12], [c.x + side * r * 0.78, c.y - h * 0.05, c.z - z * 1.77], 'hardware');
}

function buildModular(p, d) {
  const w = d.stature * 0.31 * d.width, h = d.stature * 0.32 * d.height, z = d.stature * 0.105 * d.depth, c = d.center;
  p.box('frame', [w, h, z], [c.x, c.y, c.z - z]);
  for (let row = -1; row <= 1; row++) for (const side of [-1, 1]) p.box(`module-${row}-${side}`, [w * 0.34, h * 0.2, z * 0.34], [c.x + side * w * 0.22, c.y + row * h * 0.25, c.z - z * 1.68], row === 0 ? 'accent' : 'hardware');
  for (const side of [-1, 1]) p.cylinder(`rail-${side}`, z * 0.07, z * 0.07, h * 0.88, 8, [c.x + side * w * 0.44, c.y, c.z - z * 1.25], 'accent');
}

function buildTote(p, d) {
  const w = d.stature * 0.3 * d.width, h = d.stature * 0.3 * d.height, z = d.stature * 0.055 * d.depth, c = d.center, y = c.y - h * 0.72;
  p.box('tote-body', [w, h, z], [c.x, y, c.z]);
  for (const side of [-1, 1]) p.tube(`handle-${side}`, [[c.x + side * w * 0.27, y + h * 0.42, c.z], [c.x + side * w * 0.2, y + h * 0.83, c.z], [c.x, y + h * 0.92, c.z], [c.x - side * w * 0.2, y + h * 0.83, c.z], [c.x - side * w * 0.27, y + h * 0.42, c.z]], z * 0.09, side < 0 ? 'accent' : 'hardware');
  p.box('bottom-panel', [w * 0.88, h * 0.05, z * 1.1], [c.x, y - h * 0.49, c.z], 'accent');
}

function buildDuffel(p, d) {
  const r = d.stature * 0.11 * d.height, length = d.stature * 0.43 * d.width, c = d.center, y = c.y - r * 1.8;
  p.cylinder('barrel', r, r, length, 16, [c.x, y, c.z], 'primary', [0, 0, Math.PI / 2]);
  for (const side of [-1, 1]) p.torus(`end-seam-${side}`, r * 0.83, r * 0.055, 5, 12, [c.x + side * length * 0.49, y, c.z], [0, Math.PI / 2, 0], 'accent');
  for (const side of [-1, 1]) p.tube(`grip-${side}`, [[c.x + side * length * 0.22, y + r * 0.58, c.z], [c.x + side * length * 0.16, y + r * 1.4, c.z], [c.x - side * length * 0.16, y + r * 1.4, c.z], [c.x - side * length * 0.22, y + r * 0.58, c.z]], r * 0.055, side < 0 ? 'accent' : 'hardware');
}

function headSize(d) {
  return { w: d.socket.x * d.width, h: d.socket.y * d.height, z: d.socket.z * d.depth, c: d.center };
}

function buildTrucker(p, d) {
  const { w, h, z, c } = headSize(d), r = w * 0.55;
  p.sphere('crown', 1, [c.x, c.y + h * 0.42, c.z], [r, h * 0.62, Math.max(z * 0.58, r * 0.76)], 'primary', Math.PI * 2, 0, Math.PI / 2);
  p.box('front-panel', [w * 0.76, h * 0.32, z * 0.05], [c.x, c.y + h * 0.42, c.z + z * 0.56], 'accent', [-0.16, 0, 0]);
  p.box('bill', [w * 0.86, h * 0.055, z * 0.76], [c.x, c.y + h * 0.17, c.z + z * 0.78], 'hardware', [-0.09, 0, 0]);
}

function buildBoina(p, d) {
  const { w, h, z, c } = headSize(d);
  p.sphere('soft-disc', 1, [c.x - w * 0.08, c.y + h * 0.64, c.z], [w * 0.68, h * 0.24, z * 0.65], 'primary');
  p.cylinder('stem', w * 0.025, w * 0.035, h * 0.13, 8, [c.x - w * 0.15, c.y + h * 0.89, c.z], 'hardware');
  p.torus('lower-band', w * 0.48, h * 0.025, 5, 18, [c.x, c.y + h * 0.43, c.z], [Math.PI / 2, 0, 0], 'accent');
}

function buildBeanie(p, d) {
  const { w, h, z, c } = headSize(d);
  p.cylinder('knit-crown', w * 0.16, w * 0.51, h * 0.68, 16, [c.x, c.y + h * 0.62, c.z], 'primary');
  p.cylinder('folded-cuff', w * 0.53, w * 0.53, h * 0.18, 16, [c.x, c.y + h * 0.35, c.z], 'accent');
  p.sphere('soft-tip', w * 0.08, [c.x, c.y + h * 1.0, c.z], [1, 0.8, 1], 'hardware');
}

function buildBucket(p, d) {
  const { w, h, z, c } = headSize(d);
  p.cylinder('tapered-crown', w * 0.43, w * 0.51, h * 0.48, 16, [c.x, c.y + h * 0.52, c.z], 'primary');
  p.ring('wide-brim', w * 0.43, w * 0.72, 20, [c.x, c.y + h * 0.27, c.z], [-Math.PI / 2, 0, 0], 'accent');
  p.torus('brim-edge', w * 0.7, h * 0.018, 5, 20, [c.x, c.y + h * 0.27, c.z], [Math.PI / 2, 0, 0], 'hardware');
}

function buildBalaclava(p, d) {
  const { w, h, z, c } = headSize(d), front = c.z + z * 0.55;
  p.sphere('hood', 1, [c.x, c.y + h * 0.49, c.z], [w * 0.57, h * 0.62, z * 0.58], 'primary', Math.PI * 2, 0, Math.PI * 0.62);
  for (const side of [-1, 1]) p.box(`face-side-${side}`, [w * 0.18, h * 0.46, z * 0.06], [c.x + side * w * 0.41, c.y + h * 0.31, front], side < 0 ? 'accent' : 'primary');
  p.box('chin-wrap', [w * 0.68, h * 0.18, z * 0.07], [c.x, c.y + h * 0.1, front], 'accent');
  p.box('brow-wrap', [w * 0.66, h * 0.1, z * 0.07], [c.x, c.y + h * 0.55, front], 'hardware');
}

function buildChain(p, d) {
  const c = d.center, w = d.stature * 0.18 * d.width, h = d.stature * 0.13 * d.height, z = c.z + d.socket.z * 0.6;
  const points = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, x = (t - 0.5) * w; points.push([c.x + x, c.y + h * (0.5 - 1.9 * (t - 0.5) ** 2), z]); }
  p.tube('chain-curve', points, d.stature * 0.006 * d.detail, 'hardware');
  p.torus('pendant-ring', h * 0.16, h * 0.04, 6, 12, [c.x, c.y + h * 0.02, z], [0, 0, 0], 'accent');
  p.box('pendant-bar', [w * 0.08, h * 0.22, d.stature * 0.008], [c.x, c.y - h * 0.13, z], 'primary');
}

function buildBandana(p, d) {
  const { w, h, z, c } = headSize(d), front = c.z + z * 0.61, y = c.y + h * 0.16;
  p.panel('face-triangle', [[c.x - w * 0.48, y + h * 0.13, front], [c.x + w * 0.48, y + h * 0.13, front], [c.x, y - h * 0.48, front]], 'primary');
  p.box('upper-fold', [w * 1.02, h * 0.09, z * 0.05], [c.x, y + h * 0.14, front], 'accent');
  p.panel('left-knot', [[c.x - w * 0.47, y + h * 0.13, c.z], [c.x - w * 0.73, y - h * 0.03, c.z - z * 0.16], [c.x - w * 0.48, y - h * 0.17, c.z]], 'hardware');
}

function buildEarring(p, d, options) {
  const { w, h, z, c } = headSize(d), side = options.side === 'right' ? 1 : -1, x = c.x + side * w * 0.58, y = c.y + h * 0.16;
  p.torus('hoop', h * 0.13, h * 0.025 * d.detail, 6, 14, [x, y, c.z], [0, Math.PI / 2, 0], 'hardware');
  p.sphere('drop', h * 0.045, [x, y - h * 0.17, c.z], [0.75, 1.25, 0.75], 'accent');
}

function buildBracelet(p, d) {
  const c = d.center, radius = Math.max(d.socket.y, d.socket.z) * 0.63 * d.width, tube = radius * 0.1 * d.detail;
  for (let band = -1; band <= 1; band++) p.torus(`band-${band}`, radius * (1 + band * 0.045), tube, 6, 16, [c.x + band * tube * 2.3, c.y, c.z], [0, Math.PI / 2, 0], band === 0 ? 'accent' : 'primary');
  p.box('clasp', [tube * 2, tube * 2.8, tube * 2.8], [c.x, c.y + radius, c.z], 'hardware');
}

function buildModularAccessory(p, d) {
  const c = d.center, w = d.stature * 0.3 * d.width, h = d.stature * 0.22 * d.height, z = c.z + d.socket.z * 0.6;
  for (const side of [-1, 1]) p.tube(`shoulder-webbing-${side}`, [[c.x + side * w * 0.42, c.y + h * 0.75, c.z], [c.x + side * w * 0.48, c.y, z], [c.x + side * w * 0.35, c.y - h * 0.65, z]], d.stature * 0.008 * d.detail, 'primary');
  for (const side of [-1, 0, 1]) p.box(`utility-cell-${side}`, [w * 0.26, h * 0.38, d.stature * 0.045 * d.depth], [c.x + side * w * 0.3, c.y - h * 0.28, z], side === 0 ? 'accent' : 'hardware');
  p.box('cross-webbing', [w, h * 0.08, d.stature * 0.018], [c.x, c.y + h * 0.2, z], 'accent');
}

function buildRing(p, d) {
  const c = d.center, radius = Math.max(d.socket.y, d.socket.z) * 0.2 * d.width, tube = radius * 0.24 * d.detail, x = c.x + d.socket.x * 0.33;
  p.torus('finger-band', radius, tube, 7, 18, [x, c.y, c.z], [0, Math.PI / 2, 0], 'hardware');
  p.cylinder('setting', radius * 0.36, radius * 0.5, radius * 0.42, 8, [x, c.y + radius, c.z], 'accent');
  p.sphere('stone', radius * 0.32, [x, c.y + radius * 1.3, c.z], [1, 0.7, 1], 'primary');
}

function buildBelt(p, d) {
  const c = d.center, radius = d.stature * 0.155 * d.width, y = c.y - d.stature * 0.24 * d.height, tube = d.stature * 0.018 * d.detail;
  p.torus('waist-band', radius, tube, 6, 22, [c.x, y, c.z], [Math.PI / 2, 0, 0], 'primary');
  p.box('buckle', [radius * 0.28, tube * 2.8, tube * 1.2], [c.x, y, c.z + radius], 'accent');
  for (const side of [-1, 1]) p.box(`belt-pocket-${side}`, [radius * 0.34, tube * 4.2, tube * 2.5], [c.x + side * radius * 0.72, y - tube * 0.9, c.z + radius * 0.55], 'hardware');
}

function buildCase(p, d) {
  const c = d.center, w = d.stature * 0.24 * d.width, h = d.stature * 0.18 * d.height, z = d.stature * 0.055 * d.depth, y = c.y - h * 0.72;
  p.box('hard-shell', [w, h, z], [c.x, y, c.z], 'primary');
  p.box('case-edge', [w * 1.03, h * 0.055, z * 1.08], [c.x, y, c.z], 'accent');
  p.tube('case-handle', [[c.x - w * 0.2, y + h * 0.52, c.z], [c.x - w * 0.16, y + h * 0.77, c.z], [c.x + w * 0.16, y + h * 0.77, c.z], [c.x + w * 0.2, y + h * 0.52, c.z]], z * 0.08, 'hardware');
  for (const side of [-1, 1]) p.cylinder(`hinge-${side}`, z * 0.08, z * 0.08, w * 0.12, 8, [c.x + side * w * 0.3, y - h * 0.5, c.z], 'hardware', [0, 0, Math.PI / 2]);
}

function buildHair(p, d) {
  const { w, h, z, c } = headSize(d);
  p.sphere('hair-cap', 1, [c.x, c.y + h * 0.52, c.z - z * 0.02], [w * 0.57, h * 0.56, z * 0.59], 'primary', Math.PI * 2, 0, Math.PI * 0.58);
  for (let tuft = -3; tuft <= 3; tuft++) {
    const x = c.x + tuft * w * 0.12, lift = h * (0.79 + (3 - Math.abs(tuft)) * 0.025);
    p.cylinder(`tuft-${tuft}`, w * 0.018, w * 0.075, h * (0.22 + (tuft & 1) * 0.035), 7, [x, c.y + lift, c.z - z * 0.05], tuft === 0 ? 'accent' : 'primary', [0, 0, tuft * -0.055]);
  }
}

function buildHelmet(p, d) {
  const { w, h, z, c } = headSize(d);
  p.sphere('helmet-shell', 1, [c.x, c.y + h * 0.5, c.z], [w * 0.62, h * 0.68, z * 0.64], 'primary', Math.PI * 2, 0, Math.PI * 0.67);
  p.torus('lower-rim', w * 0.53, h * 0.035, 6, 20, [c.x, c.y + h * 0.23, c.z], [Math.PI / 2, 0, 0], 'accent');
  for (const side of [-1, 1]) p.box(`ear-guard-${side}`, [w * 0.17, h * 0.31, z * 0.13], [c.x + side * w * 0.52, c.y + h * 0.22, c.z], 'hardware');
  p.box('top-ridge', [w * 0.08, h * 0.18, z * 0.7], [c.x, c.y + h * 0.91, c.z], 'accent');
}

const BUILDERS = { rolltop: buildRolltop, triplePocket: buildTriplePocket, sling: buildSling, drypack: buildDrypack, modular: buildModular, tote: buildTote, duffel: buildDuffel, trucker: buildTrucker, boina: buildBoina, beanie: buildBeanie, bucket: buildBucket, balaclava: buildBalaclava, hair: buildHair, helmet: buildHelmet, chain: buildChain, bandana: buildBandana, earring: buildEarring, bracelet: buildBracelet, modularAccessory: buildModularAccessory, ring: buildRing, belt: buildBelt, case: buildCase };

function metricsOf(root) {
  let drawCalls = 0, triangles = 0;
  root.traverse(object => {
    if (!object.isMesh) return;
    drawCalls++;
    triangles += triangleCount(object.geometry);
  });
  return { drawCalls, triangles: Math.round(triangles) };
}

export function auditUrbanRigidCandidate(candidate) {
  if (!candidate?.group?.isGroup || !candidate.socket?.isBone || candidate.group.parent !== candidate.socket) throw new Error('socket attachment invalid');
  const metrics = metricsOf(candidate.group);
  if (metrics.drawCalls < 1 || metrics.triangles <= 0 || metrics.triangles > URBAN_RIGID_TRIANGLE_LIMIT) throw new Error(`performance budget exceeded: ${metrics.triangles} triangles`);
  if (candidate.renderMetrics?.drawCalls !== metrics.drawCalls || candidate.renderMetrics?.triangles !== metrics.triangles) throw new Error('render metrics stale');
  candidate.group.traverse(object => {
    if (!object.isMesh) return;
    if (object.userData.noHit !== true || object.raycast !== NO_RAYCAST) throw new Error('hit isolation invalid');
    if (object.castShadow || object.receiveShadow) throw new Error('shadow isolation invalid');
    if (!object.geometry || !object.material) throw new Error('render resource missing');
  });
  return { ...metrics, socket: candidate.socket.name, family: candidate.family.id };
}

export function mountUrbanRigidCandidate(model, familyId, options = {}) {
  const definition = FAMILY_DEFINITIONS[familyId], family = URBAN_RIGID_FAMILIES[familyId];
  if (!definition || !family) throw new RangeError(`unknown urban rigid family: ${familyId}`);
  const socketName = definition.sided && options.side === 'left' ? 'LeftHand' : definition.socket;
  if (!family.allowedSockets.includes(socketName)) throw new RangeError(`socket not allowed for ${familyId}`);
  const selection = selectUrbanBodyCandidate(model, [socketName], options);
  if (!selection) return null;
  const body = selection.body;
  const indices = body.skeleton.bones.map((bone, index) => bone.name === socketName ? index : -1).filter(index => index >= 0);
  const resolvedSocket = selection.resolvedBones[socketName];
  const measurementIndices = body.skeleton.bones.map((bone, index) => bone.name === resolvedSocket ? index : -1).filter(index => index >= 0);
  if (indices.length !== 1 || measurementIndices.length !== 1) return null;
  const socketIndex = indices[0], bounds = measuredBounds(body, socketIndex, selection.normalizeReadWeights, measurementIndices[0]);
  if (!bounds) return null;
  const group = new THREE.Group();
  group.name = `urban-rigid:${familyId}`;
  group.matrixAutoUpdate = false;
  group.matrix.identity();
  group.visible = options.visible !== false;
  const material = materialsFor(definition, options), parts = partKit(group, material), fitted = dimensions(bounds, options);
  BUILDERS[definition.builder](parts, fitted, options);
  if (!group.children.length) return null;
  const renderMetrics = metricsOf(group);
  if (renderMetrics.triangles > URBAN_RIGID_TRIANGLE_LIMIT) {
    group.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
    return null;
  }
  group.userData = {
    noHit: true,
    familyId,
    geometryFamily: family.geometryFamily,
    slot: family.slot,
    status: 'candidate',
    approved: false,
    certified: false,
    finalAsset: false,
    branded: false,
    renderMetrics: { ...renderMetrics },
  };
  const socket = body.skeleton.bones[socketIndex];
  socket.add(group);
  let disposed = false;
  const candidate = {
    version: URBAN_RIGID_VERSION,
    family,
    group,
    body,
    socket,
    socketIndex,
    bounds,
    renderMetrics,
    selection,
    approved: false,
    certified: false,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      const geometries = new Set(), materials = new Set();
      group.traverse(object => {
        if (!object.isMesh) return;
        geometries.add(object.geometry);
        for (const item of Array.isArray(object.material) ? object.material : [object.material]) materials.add(item);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(item => item.dispose());
      group.userData.disposed = true;
    },
  };
  auditUrbanRigidCandidate(candidate);
  return candidate;
}
