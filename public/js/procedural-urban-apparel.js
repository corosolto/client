import * as THREE from 'three';

export const URBAN_APPAREL_STATUS = 'fit-proxy-not-mint-asset';
export const URBAN_APPAREL_FAMILIES = Object.freeze([
  'boxy-tee',
  'oversized-tee',
  'shell-jacket',
  'cargo-pants',
  'bermuda-shorts',
  'low-sneaker',
  'chunky-runner',
  'boot',
]);

const CHANNELS = ['getX', 'getY', 'getZ', 'getW'];
const SIDE_BONE = Object.freeze({
  upperArm: Object.freeze({ left: 'LeftUpperArm', right: 'RightUpperArm' }),
  lowerLeg: Object.freeze({ left: 'LeftLowerLeg', right: 'RightLowerLeg' }),
  foot: Object.freeze({ left: 'LeftFoot', right: 'RightFoot' }),
});
const BONE_ALIASES = Object.freeze({
  Spine: Object.freeze(['Spine01', 'Spine']),
  LeftUpperArm: Object.freeze(['LeftUpperArm', 'LeftArm']),
  RightUpperArm: Object.freeze(['RightUpperArm', 'RightArm']),
  LeftLowerLeg: Object.freeze(['LeftLowerLeg', 'LeftLeg']),
  RightLowerLeg: Object.freeze(['RightLowerLeg', 'RightLeg']),
});
const adapter = (id, reason, options = {}) => Object.freeze({ id, reason, ...options });
export const URBAN_BODY_ADAPTERS = Object.freeze({
  'ae201746977859d212aafe3f5f2b97e5152758af7421d0cad439ac00f1f7e400': adapter('weighted-mesh-profeta-calcada', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  '19c0eabefc93a6c0acda0f25631cb7b3ca7d69806ab17abba844be6e94a969a0': adapter('weighted-mesh-lenda-lanhouse', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  '7468d7e4a693443a0d6597c24106c5e4c7756c7410c85f623173df9e1c87bce9': adapter('weighted-mesh-programador-virado', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  '77d1d5d6c6f7cce58846797bea4db5ffe21160f22f1880a7f440b8b1fdccfb07': adapter('weighted-mesh-designer-ux', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  '7e45cde94e8faf3afcd133832440af2a015b8aabc9cb711eb65dfcdfe057e609': adapter('weighted-mesh-microfonildo', 'multi-skinned-mesh:largest-required-weighted-vertex-set', {
    measureFrom: Object.freeze({ Spine: 'Spine02' }),
    measureFromByFamily: Object.freeze({ 'cargo-pants': Object.freeze({ Hips: 'Spine02' }) }),
  }),
  '148997911e43e4489ea7994860cb0a85d24a7e657940ca08949250551c04316b': adapter('weighted-mesh-camera-roxa', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  'c92686566aeef715f5bc9b89f372c1f5bed3a5963f1abeeccb23be2c60a3cc4c': adapter('weighted-mesh-doidinho-bairro', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  'e5a31ca1d72b6a4cb3231757c6a9ad075c3713e8a32722a665f10b3a7f4a177b': adapter('weighted-mesh-motoca-cachorro-loko', 'multi-skinned-mesh:largest-required-weighted-vertex-set'),
  '7714dbb9ff324e0c1fac93de2e0ee2d2fb150c3576eba304840bcaa876ee955e': adapter('bounds-cuca', 'body-local-depth-envelope', { maximumDepth: 1.75 }),
  '6b3839025c194b1418c71c7ddb68a9a9afe59794d50d49c4409197edf6f0093d': adapter('bounds-lobisomem', 'body-local-width-envelope', { maximumWidth: 2.2 }),
  'e94ce8f2be07cc36d56b2107ceaf65dd3536d90dbc900cf8e6eda5c7cd1ca119': adapter('spine02-lula-cyborg', 'spine-region-is-weighted-to-spine02', { measureFrom: Object.freeze({ Spine: 'Spine02' }) }),
  '4db27d13f43fd0f3a06b0d564747e62722e848c1667af4e8fc362923e9716f1b': adapter('spine02-senador-drip', 'spine-region-is-weighted-to-spine02', { measureFrom: Object.freeze({ Spine: 'Spine02' }) }),
  '43eb4d073d4a485b24c3916e0259049667f07440a88c4aac52f27888ed4b48e8': adapter('spine02-zero-um-mandrake', 'spine-region-is-weighted-to-spine02', { measureFrom: Object.freeze({ Spine: 'Spine02' }) }),
  'acecd2a763dc417f6b132a2d555bffd2c6a5e7cf3b1a83a50ee24d938fce4b0f': adapter('roles-mst', 'duplicate-curl-joints-are-outside-required-fit-roles'),
  '98b41671c7b1ca47cffbd4177fd620045cd20ace5d7e6b266911ec24f8aa34d4': adapter('weights-lampiao', 'normalize-weight-sum-for-measurement-read', { normalizeReadWeights: true }),
  '96aa7ef6278dce4d8b11a5d58ab8d9f0c6d0b835b9ab3ab530d5bd1bbeea0048': adapter('weights-mariabonita', 'normalize-weight-sum-for-measurement-read', { normalizeReadWeights: true }),
});
const COLORS = Object.freeze({
  'boxy-tee': 0x315c8c,
  'oversized-tee': 0x4e355f,
  'shell-jacket': 0xb66324,
  'cargo-pants': 0x5d6343,
  'bermuda-shorts': 0x9a7348,
  'low-sneaker': 0xd4d0c8,
  'chunky-runner': 0x3f8185,
  boot: 0x4b352b,
});
const DEFAULT_MINIMUMS = Object.freeze([0.06, 0.06, 0.16]);
const NO_RAYCAST = () => {};
const part = (id, bone, shape, scale, options = {}) => Object.freeze({ id, bone, shape, scale, ...options });
const paired = (id, role, shape, scale, options = {}) => ['left', 'right'].map(side => part(
  `${side}-${id}`,
  SIDE_BONE[role][side],
  shape,
  scale,
  { ...options, side, pairId: id, pairRole: role },
));

const FAMILY_DEFINITIONS = Object.freeze({
  'boxy-tee': Object.freeze({
    silhouette: 'short-wide-body-and-square-sleeves',
    pieces: Object.freeze([
      part('chest', 'Spine02', 'wedge', [1.2, 1.05, 1.16], { taper: [0.96, 1.04] }),
      part('hem', 'Spine', 'box', [1.2, 1.08, 1.14]),
      ...paired('sleeve', 'upperArm', 'box', [1.22, 0.58, 1.25]),
    ]),
  }),
  'oversized-tee': Object.freeze({
    silhouette: 'long-dropped-body-and-elbow-sleeves',
    pieces: Object.freeze([
      part('chest', 'Spine02', 'wedge', [1.46, 1.3, 1.32], { taper: [0.98, 1.12] }),
      part('long-hem', 'Spine', 'box', [1.48, 1.7, 1.3], { offset: [0, -0.16, 0] }),
      ...paired('elbow-sleeve', 'upperArm', 'wedge', [1.52, 1.08, 1.42], { taper: [1, 0.82] }),
    ]),
  }),
  'shell-jacket': Object.freeze({
    silhouette: 'rounded-shell-collar-and-articulated-sleeves',
    pieces: Object.freeze([
      part('shell-chest', 'Spine02', 'cylinder', [1.32, 1.2, 1.34]),
      part('shell-hem', 'Spine', 'wedge', [1.28, 1.22, 1.28], { taper: [1.08, 0.94] }),
      part('stand-collar', 'Spine02', 'cylinder', [0.62, 0.18, 1.06], { offset: [0, 0.58, 0] }),
      ...paired('shell-sleeve', 'upperArm', 'cylinder', [1.34, 1.2, 1.34]),
    ]),
  }),
  'cargo-pants': Object.freeze({
    silhouette: 'relaxed-waist-straight-legs-and-side-pockets',
    pieces: Object.freeze([
      part('waist', 'Hips', 'wedge', [1.24, 0.82, 1.24], { taper: [1.04, 0.96] }),
      ...paired('cargo-leg', 'lowerLeg', 'box', [1.22, 1.06, 1.2]),
      ...paired('cargo-pocket', 'lowerLeg', 'box', [0.48, 0.4, 1.34], { offsetBySide: 0.62, offset: [0, 0.06, 0.2] }),
    ]),
  }),
  'bermuda-shorts': Object.freeze({
    silhouette: 'high-waist-and-separated-wide-knee-length-panels',
    pieces: Object.freeze([
      part('waistband', 'Hips', 'box', [1.2, 0.3, 1.18], { offset: [0, 0.38, 0] }),
      part('left-short', 'Hips', 'wedge', [0.58, 0.88, 1.22], { side: 'left', pairId: 'short-panel', offset: [0.31, -0.42, 0], taper: [1.06, 0.92] }),
      part('right-short', 'Hips', 'wedge', [0.58, 0.88, 1.22], { side: 'right', pairId: 'short-panel', offset: [-0.31, -0.42, 0], taper: [1.06, 0.92] }),
    ]),
  }),
  'low-sneaker': Object.freeze({
    silhouette: 'slim-low-cut-tapered-upper',
    pieces: Object.freeze([
      ...paired('low-upper', 'foot', 'wedge', [1.14, 0.72, 1.12], { taper: [0.78, 1.05], offset: [0, 0.04, 0.08] }),
    ]),
  }),
  'chunky-runner': Object.freeze({
    silhouette: 'layered-angular-upper-and-deep-outsole',
    pieces: Object.freeze([
      ...paired('runner-upper', 'foot', 'wedge', [1.28, 0.96, 1.2], { taper: [0.72, 1.14], offset: [0, 0.14, 0.08] }),
      ...paired('runner-sole', 'foot', 'box', [1.42, 0.34, 1.3], { offset: [0, -0.43, 0.1] }),
    ]),
  }),
  boot: Object.freeze({
    silhouette: 'tall-straight-shaft-and-projecting-toe',
    pieces: Object.freeze([
      ...paired('boot-shaft', 'lowerLeg', 'cylinder', [1.28, 0.72, 1.28], { offset: [0, -0.18, 0] }),
      ...paired('boot-foot', 'foot', 'wedge', [1.28, 0.9, 1.28], { taper: [0.86, 1.12], offset: [0, 0.02, 0.12] }),
    ]),
  }),
});

function profileFor(options) {
  if (options.bodySha256 === undefined) return null;
  if (typeof options.bodySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(options.bodySha256)) return undefined;
  return URBAN_BODY_ADAPTERS[options.bodySha256] || null;
}

function aliasesFor(name) {
  return BONE_ALIASES[name] || [name];
}

function measurementSource(name, profile, family) {
  return profile?.measureFromByFamily?.[family]?.[name] || profile?.measureFrom?.[name] || name;
}

function bodyMetric(body, requiredNames, profile, options) {
  const geometry = body?.geometry;
  const position = geometry?.getAttribute?.('position');
  const skinIndex = geometry?.getAttribute?.('skinIndex');
  const skinWeight = geometry?.getAttribute?.('skinWeight');
  const bones = body?.skeleton?.bones;
  if (!body?.isSkinnedMesh || !position || !skinIndex || !skinWeight || position.itemSize !== 3
    || skinIndex.itemSize < 4 || skinWeight.itemSize < 4 || position.count !== skinIndex.count
    || position.count !== skinWeight.count || !bones?.length) return null;
  const indices = new Map();
  for (const name of requiredNames) {
    const sourceName = measurementSource(name, profile, options.family);
    const match = aliasesFor(sourceName)
      .map(alias => bones.map((bone, index) => bone.name === alias ? index : -1).filter(index => index >= 0))
      .find(indicesForAlias => indicesForAlias.length === 1);
    if (!match) return null;
    indices.set(name, match[0]);
  }
  const counts = new Map(requiredNames.map(name => [name, 0]));
  let weightedVertices = 0;
  for (let vertex = 0; vertex < position.count; vertex++) {
    let total = 0;
    for (let channel = 0; channel < 4; channel++) total += skinWeight[CHANNELS[channel]](vertex);
    if (!Number.isFinite(total) || total <= 0) continue;
    const normalize = profile?.normalizeReadWeights === true;
    if (!normalize && (total < 0.99 || total > 1.01)) continue;
    let matched = false;
    for (const [name, index] of indices) {
      let weight = 0;
      for (let channel = 0; channel < 4; channel++) {
        if (skinIndex[CHANNELS[channel]](vertex) === index) weight += skinWeight[CHANNELS[channel]](vertex);
      }
      if (normalize) weight /= total;
      if (weight >= 0.15) {
        counts.set(name, counts.get(name) + 1);
        matched = true;
      }
    }
    if (matched) weightedVertices++;
  }
  if ([...counts.values()].some(count => count < 8)) return null;
  return { body, weightedVertices, positionCount: position.count, counts, indices };
}

export function selectUrbanBodyCandidate(target, requiredNames, options = {}) {
  if (!options || typeof options !== 'object' || !Array.isArray(requiredNames) || !requiredNames.length) return null;
  const profile = profileFor(options);
  if (profile === undefined) return null;
  const bodies = [];
  if (target?.isSkinnedMesh) bodies.push(target);
  else if (target?.traverse) target.traverse(object => { if (object.isSkinnedMesh) bodies.push(object); });
  const eligible = bodies.map(body => bodyMetric(body, requiredNames, profile, options)).filter(Boolean)
    .sort((left, right) => right.weightedVertices - left.weightedVertices || right.positionCount - left.positionCount);
  if (!eligible.length) return null;
  if (eligible[1] && eligible[0].weightedVertices === eligible[1].weightedVertices
    && eligible[0].positionCount === eligible[1].positionCount) return null;
  const selected = eligible[0];
  return {
    body: selected.body,
    strategy: 'largest-required-weighted-vertex-set',
    meshName: selected.body.name || '(unnamed)',
    weightedVertices: selected.weightedVertices,
    positionCount: selected.positionCount,
    eligibleMeshes: eligible.length,
    observedSkinnedMeshes: bodies.length,
    requiredBones: [...requiredNames],
    resolvedBones: Object.fromEntries([...selected.indices].map(([name, index]) => [name, selected.body.skeleton.bones[index].name])),
    bodySha256: options.bodySha256 || null,
    adapterId: profile?.id || null,
    adapterReason: profile?.reason || null,
    normalizeReadWeights: profile?.normalizeReadWeights === true,
  };
}

function finiteMatrix(matrix) {
  return matrix?.isMatrix4 && matrix.elements.every(Number.isFinite);
}

function safeWorldScale(body) {
  body.updateWorldMatrix(true, false);
  const scale = new THREE.Vector3();
  body.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  const values = scale.toArray().map(Math.abs);
  return values.every(value => Number.isFinite(value) && value >= 0.005 && value <= 5)
    && Math.max(...values) / Math.min(...values) <= 4;
}

function measureBody(body, definition, profile, family) {
  const geometry = body?.geometry;
  const position = geometry?.getAttribute?.('position');
  const skinIndex = geometry?.getAttribute?.('skinIndex');
  const skinWeight = geometry?.getAttribute?.('skinWeight');
  const skeleton = body?.skeleton;
  if (!body?.isSkinnedMesh || !position || !skinIndex || !skinWeight || position.itemSize !== 3
    || skinIndex.itemSize < 4 || skinWeight.itemSize < 4 || position.count !== skinIndex.count
    || position.count !== skinWeight.count || position.count < 8 || !skeleton?.bones?.length
    || skeleton.bones.length !== skeleton.boneInverses?.length || !finiteMatrix(body.bindMatrix)
    || !safeWorldScale(body)) return null;

  const actualNames = new Map();
  for (let index = 0; index < skeleton.bones.length; index++) {
    const name = skeleton.bones[index]?.name;
    if (typeof name !== 'string' || !name || !finiteMatrix(skeleton.boneInverses[index])) return null;
    if (!actualNames.has(name)) actualNames.set(name, []);
    actualNames.get(name).push(index);
  }
  const uniqueIndex = name => {
    const match = aliasesFor(name).map(candidate => actualNames.get(candidate) || [])
      .find(indicesForAlias => indicesForAlias.length === 1);
    return match?.[0] ?? null;
  };
  const requiredNames = [...new Set(definition.pieces.map(piece => piece.bone))];
  const regions = new Map();
  for (const name of requiredNames) {
    const targetIndex = uniqueIndex(name);
    const sourceIndex = uniqueIndex(measurementSource(name, profile, family));
    if (targetIndex === null || sourceIndex === null) return null;
    const toBone = new THREE.Matrix4().multiplyMatrices(skeleton.boneInverses[targetIndex], body.bindMatrix);
    regions.set(name, {
      name,
      targetIndex,
      sourceIndex,
      bone: skeleton.bones[targetIndex],
      bounds: new THREE.Box3(),
      count: 0,
      toBone,
    });
  }
  const bodyBounds = new THREE.Box3();
  const point = new THREE.Vector3(), local = new THREE.Vector3();
  const indices = new Array(4), weights = new Array(4);
  for (let vertex = 0; vertex < position.count; vertex++) {
    point.fromBufferAttribute(position, vertex);
    if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
    let total = 0;
    for (let channel = 0; channel < 4; channel++) {
      const index = skinIndex[CHANNELS[channel]](vertex), weight = skinWeight[CHANNELS[channel]](vertex);
      if (!Number.isSafeInteger(index) || index < 0 || index >= skeleton.bones.length || !Number.isFinite(weight) || weight < 0 || weight > 1) return null;
      indices[channel] = index;
      weights[channel] = weight;
      total += weight;
    }
    if (!Number.isFinite(total) || total <= 0) return null;
    const normalize = profile?.normalizeReadWeights === true;
    if (!normalize && (total < 0.99 || total > 1.01)) return null;
    for (let channel = 0; channel < 4; channel++) {
      const weight = normalize ? weights[channel] / total : weights[channel];
      if (weight < 0.15) continue;
      for (const region of regions.values()) {
        if (region.sourceIndex !== indices[channel]) continue;
        local.copy(point).applyMatrix4(region.toBone);
        if (![local.x, local.y, local.z].every(Number.isFinite)) return null;
        region.bounds.expandByPoint(local);
        region.count++;
      }
    }
    bodyBounds.expandByPoint(point);
  }
  if (bodyBounds.isEmpty() || [...regions.values()].some(region => region.count < 8 || region.bounds.isEmpty())) return null;
  const bodySize = bodyBounds.getSize(new THREE.Vector3());
  const worldBodySize = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
  const maximumWidth = profile?.maximumWidth ?? 2;
  const maximumDepth = profile?.maximumDepth ?? 1.5;
  if (![bodySize.x, bodySize.y, bodySize.z, worldBodySize.x, worldBodySize.y, worldBodySize.z].every(Number.isFinite)
    || bodySize.y < 0.5 || bodySize.y > 3.5 || bodySize.x < 0.12 || bodySize.x > maximumWidth
    || bodySize.z < 0.08 || bodySize.z > maximumDepth || bodySize.y / bodySize.x < 0.75
    || worldBodySize.y <= 0) return null;
  return { bodyBounds, bodySize, worldBodySize, regions };
}

function taperedBox(width, height, depth, topScale, bottomScale) {
  const tx = width * topScale * 0.5, tz = depth * topScale * 0.5;
  const bx = width * bottomScale * 0.5, bz = depth * bottomScale * 0.5;
  const y0 = -height * 0.5, y1 = height * 0.5;
  const vertices = new Float32Array([
    -bx, y0, -bz, bx, y0, -bz, bx, y0, bz, -bx, y0, bz,
    -tx, y1, -tz, tx, y1, -tz, tx, y1, tz, -tx, y1, tz,
  ]);
  const indices = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeGeometry(spec, dimensions, center) {
  let geometry;
  if (spec.shape === 'box') geometry = new THREE.BoxGeometry(...dimensions);
  else if (spec.shape === 'wedge') geometry = taperedBox(dimensions[0], dimensions[1], dimensions[2], ...(spec.taper || [0.9, 1.05]));
  else if (spec.shape === 'cylinder') {
    geometry = new THREE.CylinderGeometry(0.48, 0.52, 1, 10, 1, false);
    geometry.scale(dimensions[0], dimensions[1], dimensions[2]);
  } else return null;
  geometry.translate(center.x, center.y, center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function pairedRegionSize(measurement, spec, target) {
  const own = measurement.regions.get(spec.bone);
  own.bounds.getSize(target);
  if (!spec.pairRole) return target;
  const opposite = SIDE_BONE[spec.pairRole][spec.side === 'left' ? 'right' : 'left'];
  const other = measurement.regions.get(opposite);
  if (!other) return target;
  const otherSize = other.bounds.getSize(new THREE.Vector3());
  return target.add(otherSize).multiplyScalar(0.5);
}

function solidMaterial(family, option) {
  if (option !== undefined) return option?.isMaterial && !Array.isArray(option) ? option : null;
  const material = new THREE.MeshStandardMaterial({ color: COLORS[family], roughness: 0.88, metalness: 0 });
  material.name = `urban-apparel:${family}:solid-proxy`;
  material.userData = { ...material.userData, status: URBAN_APPAREL_STATUS, materialKind: 'solid-replaceable-proxy' };
  return material;
}

function triangleCount(geometry) {
  return (geometry.index?.count || geometry.getAttribute('position').count) / 3;
}

export function createUrbanApparelProxy(target, family, options = {}) {
  const definition = FAMILY_DEFINITIONS[family];
  if (!definition || !options || typeof options !== 'object') return null;
  const profile = profileFor(options);
  if (profile === undefined) return null;
  const requiredNames = [...new Set(definition.pieces.map(piece => piece.bone))];
  const selectionOptions = {...options, family};
  const selection = selectUrbanBodyCandidate(target, requiredNames, selectionOptions);
  const body = selection?.body;
  if (!body) return null;
  const measurement = measureBody(body, definition, profile, family);
  if (!measurement) return null;
  const material = solidMaterial(family, options.material);
  if (!material) return null;
  const ownsMaterial = options.material === undefined;
  const mounts = new Map(), parts = [];
  let triangles = 0;

  for (const spec of definition.pieces) {
    const region = measurement.regions.get(spec.bone);
    const regionSize = pairedRegionSize(measurement, spec, new THREE.Vector3());
    const minimums = spec.minimums || DEFAULT_MINIMUMS;
    const base = [
      Math.max(regionSize.x, measurement.bodySize.x * minimums[0]),
      Math.max(regionSize.y, measurement.bodySize.y * minimums[1]),
      Math.max(regionSize.z, measurement.bodySize.z * minimums[2]),
    ];
    const dimensions = base.map((value, axis) => value * spec.scale[axis]);
    const worldScale = region.bone.getWorldScale(new THREE.Vector3()).toArray().map(Math.abs);
    const maximumWorldDimension = Math.max(...dimensions.map((value, axis) => value * worldScale[axis]));
    if (dimensions.some(value => !Number.isFinite(value) || value <= 0) || !Number.isFinite(maximumWorldDimension)
      || maximumWorldDimension > measurement.worldBodySize.y * 1.2) {
      for (const mesh of parts) mesh.geometry.dispose();
      if (ownsMaterial) material.dispose();
      return null;
    }
    const center = region.bounds.getCenter(new THREE.Vector3());
    if (spec.offset) center.add(new THREE.Vector3(
      spec.offset[0] * regionSize.x,
      spec.offset[1] * regionSize.y,
      spec.offset[2] * regionSize.z,
    ));
    if (spec.offsetBySide) center.x += (spec.side === 'left' ? 1 : -1) * spec.offsetBySide * regionSize.x;
    const geometry = makeGeometry(spec, dimensions, center);
    if (!geometry) {
      for (const mesh of parts) mesh.geometry.dispose();
      if (ownsMaterial) material.dispose();
      return null;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `urban-apparel:${family}:${spec.id}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.raycast = NO_RAYCAST;
    mesh.userData = {
      ...mesh.userData,
      status: URBAN_APPAREL_STATUS,
      family,
      partId: spec.id,
      bone: spec.bone,
      side: spec.side || null,
      pairId: spec.pairId || null,
      shape: spec.shape,
      dimensions: [...dimensions],
      noHit: true,
      replaceWithMintGlb: true,
    };
    let mount = mounts.get(spec.bone);
    if (!mount) {
      mount = new THREE.Group();
      mount.name = `urban-apparel:${family}:${spec.bone}`;
      mount.userData = { status: URBAN_APPAREL_STATUS, family, bone: spec.bone, space: 'bone-local' };
      mounts.set(spec.bone, mount);
    }
    mount.add(mesh);
    parts.push(mesh);
    triangles += triangleCount(geometry);
  }

  const drawCalls = parts.length;
  if (drawCalls > 8 || triangles > 8000) {
    for (const mesh of parts) mesh.geometry.dispose();
    if (ownsMaterial) material.dispose();
    return null;
  }
  for (const [boneName, mount] of mounts) measurement.regions.get(boneName).bone.add(mount);
  const dimensions = {
    body: measurement.bodySize.toArray(),
    source: 'weighted-skinned-mesh-bind-space',
    weightThreshold: 0.15,
    adapterId: profile?.id || null,
    normalizeReadWeights: profile?.normalizeReadWeights === true,
  };
  const renderMetrics = { triangles, drawCalls };
  let disposed = false;
  return {
    family,
    status: URBAN_APPAREL_STATUS,
    body,
    mounts: [...mounts.values()],
    parts,
    material,
    dimensions,
    renderMetrics,
    silhouette: definition.silhouette,
    selection,
    certified: false,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mount of mounts.values()) mount.removeFromParent();
      for (const mesh of parts) mesh.geometry.dispose();
      if (ownsMaterial) material.dispose();
    },
  };
}
