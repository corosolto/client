import { createHash } from 'node:crypto';
import { inspectBindBytes } from '../bind-inspector.mjs';

export const MANIFEST_SCHEMA = 'glove-package/v1';
export const SELECTION_SCHEMA = 'cs-glove-mesh-parts/1';
export const EXPLICIT_SELECTION_SCHEMA = 'cs-glove-explicit-mesh-parts/1';
export const MESH_PARTS_SCHEMA = 'cs-mesh-part-selection/1';
export const FAMILY_SCHEMA = 'cs-skeleton-family/1';
export const OWNERSHIP_THRESHOLD = 0.5;

export const MATERIAL_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'couro-marinho',
    baseColorFactor: Object.freeze([0.045, 0.105, 0.19, 1]),
    metallicFactor: 0.08,
    roughnessFactor: 0.44,
  }),
  Object.freeze({
    id: 'verde-oliva',
    baseColorFactor: Object.freeze([0.09, 0.14, 0.055, 1]),
    metallicFactor: 0.04,
    roughnessFactor: 0.58,
  }),
  Object.freeze({
    id: 'areia',
    baseColorFactor: Object.freeze([0.34, 0.245, 0.13, 1]),
    metallicFactor: 0.02,
    roughnessFactor: 0.63,
  }),
]);

const COMPONENTS = Object.freeze({
  5120: Object.freeze({ bytes: 1, read: 'readInt8', write: 'writeInt8', max: 127 }),
  5121: Object.freeze({ bytes: 1, read: 'readUInt8', write: 'writeUInt8', max: 255 }),
  5122: Object.freeze({ bytes: 2, read: 'readInt16LE', write: 'writeInt16LE', max: 32767 }),
  5123: Object.freeze({ bytes: 2, read: 'readUInt16LE', write: 'writeUInt16LE', max: 65535 }),
  5125: Object.freeze({ bytes: 4, read: 'readUInt32LE', write: 'writeUInt32LE', max: null }),
  5126: Object.freeze({ bytes: 4, read: 'readFloatLE', write: 'writeFloatLE', max: null }),
});
const ARITIES = Object.freeze({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 });
const must = (condition, message) => { if (!condition) throw new Error(message); };
const natural = value => Number.isSafeInteger(value) && value >= 0;
const validIndex = (value, array) => natural(value) && value < array.length;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalHash = value => sha256(Buffer.from(JSON.stringify(value)));
const clone = value => JSON.parse(JSON.stringify(value));

export function parseGLB(bytes) {
  must(Buffer.isBuffer(bytes), 'GLB bytes required');
  must(bytes.length >= 28, 'truncated GLB');
  must(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'invalid GLB header');
  let offset = 12;
  let document;
  let bin;
  let chunks = 0;
  while (offset < bytes.length) {
    must(offset + 8 <= bytes.length, 'truncated GLB chunk');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    must(length % 4 === 0 && offset + 8 + length <= bytes.length, 'invalid GLB chunk bounds');
    if (chunks === 0) {
      must(type === 0x4e4f534a, 'first GLB chunk must be JSON');
      document = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length));
    } else {
      must(chunks === 1 && type === 0x004e4942, 'only one embedded BIN chunk is supported');
      bin = bytes.subarray(offset + 8, offset + 8 + length);
    }
    offset += 8 + length;
    chunks++;
  }
  must(document?.asset?.version === '2.0' && bin, 'embedded glTF 2 required');
  must(Array.isArray(document.buffers) && document.buffers.length === 1 && !Object.hasOwn(document.buffers[0], 'uri'), 'single embedded buffer required');
  const byteLength = document.buffers[0].byteLength;
  must(natural(byteLength) && byteLength <= bin.length && bin.length - byteLength <= 3, 'BIN byteLength mismatch');
  return { document, bin: bin.subarray(0, byteLength) };
}

export function packGLB(document, bin) {
  must(Buffer.isBuffer(bin), 'BIN bytes required');
  const doc = clone(document);
  doc.buffers = [{ byteLength: bin.length }];
  const json = Buffer.from(JSON.stringify(doc));
  const jsonChunk = Buffer.alloc((json.length + 3) & ~3, 0x20);
  json.copy(jsonChunk);
  const binChunk = Buffer.alloc((bin.length + 3) & ~3);
  bin.copy(binChunk);
  const output = Buffer.alloc(28 + jsonChunk.length + binChunk.length);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonChunk.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(output, 20);
  const binHeader = 20 + jsonChunk.length;
  output.writeUInt32LE(binChunk.length, binHeader);
  output.writeUInt32LE(0x004e4942, binHeader + 4);
  binChunk.copy(output, binHeader + 8);
  return output;
}

function accessorReader(document, bin, accessorId) {
  must(validIndex(accessorId, document.accessors ?? []), 'accessor index out of range');
  const accessor = document.accessors[accessorId];
  must(accessor.sparse === undefined && validIndex(accessor.bufferView, document.bufferViews ?? []), 'sparse or bufferless accessor unsupported');
  const view = document.bufferViews[accessor.bufferView];
  must(view.buffer === 0 && !view.extensions?.EXT_meshopt_compression, 'external or compressed buffer view unsupported');
  const component = COMPONENTS[accessor.componentType];
  const arity = ARITIES[accessor.type];
  must(component && arity && natural(accessor.count), 'unsupported accessor format');
  const width = arity * component.bytes;
  const stride = view.byteStride ?? width;
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  must(base >= 0 && natural(view.byteLength) && base + (Math.max(0, accessor.count - 1) * stride) + width <= (view.byteOffset ?? 0) + view.byteLength && (view.byteOffset ?? 0) + view.byteLength <= bin.length, 'accessor bounds invalid');
  const raw = index => {
    must(natural(index) && index < accessor.count, 'accessor element out of range');
    return bin.subarray(base + index * stride, base + index * stride + width);
  };
  const values = index => {
    const result = [];
    const at = base + index * stride;
    for (let componentIndex = 0; componentIndex < arity; componentIndex++) {
      let value = bin[component.read](at + componentIndex * component.bytes);
      if (accessor.normalized) value = Math.max(-1, value / component.max);
      result.push(Object.is(value, -0) ? 0 : value);
    }
    return result;
  };
  return { accessor, view, component, arity, width, stride, raw, values };
}

function triangleIndices(document, bin, primitive) {
  const positions = accessorReader(document, bin, primitive.attributes.POSITION);
  if (primitive.indices === undefined) {
    must(positions.accessor.count % 3 === 0, 'non-indexed triangle count invalid');
    return { values: Array.from({ length: positions.accessor.count }, (_, index) => index), componentType: 5125 };
  }
  const indices = accessorReader(document, bin, primitive.indices);
  must(indices.accessor.type === 'SCALAR' && [5121, 5123, 5125].includes(indices.accessor.componentType) && indices.accessor.count % 3 === 0, 'triangle indices unsupported');
  return { values: Array.from({ length: indices.accessor.count }, (_, index) => indices.values(index)[0]), componentType: indices.accessor.componentType };
}

function parentTable(nodes) {
  const parents = Array(nodes.length).fill(null);
  nodes.forEach((node, parent) => {
    for (const child of node.children ?? []) {
      must(validIndex(child, nodes), 'child node outside domain');
      must(parents[child] === null, 'node has multiple parents');
      parents[child] = parent;
    }
  });
  return parents;
}

function descendantsInSkin(document, skin, parents, rootName) {
  const roots = skin.joints.filter(joint => document.nodes[joint]?.name === rootName);
  must(roots.length === 1, `${rootName} joint count is ${roots.length}`);
  const selected = new Set();
  for (let jointIndex = 0; jointIndex < skin.joints.length; jointIndex++) {
    const seen = new Set();
    let node = skin.joints[jointIndex];
    while (node !== null) {
      must(!seen.has(node), 'node hierarchy cycle');
      seen.add(node);
      if (node === roots[0]) {
        selected.add(jointIndex);
        break;
      }
      node = parents[node];
    }
  }
  return selected;
}

function influenceReaders(document, bin, primitive, vertexCount) {
  const sets = Object.keys(primitive.attributes)
    .filter(key => /^JOINTS_\d+$/.test(key))
    .map(key => Number(key.slice(7)))
    .sort((a, b) => a - b);
  must(sets.length > 0 && sets.every((value, index) => value === index), 'contiguous joint sets required');
  return sets.map(set => {
    const joints = accessorReader(document, bin, primitive.attributes[`JOINTS_${set}`]);
    const weights = accessorReader(document, bin, primitive.attributes[`WEIGHTS_${set}`]);
    must(joints.accessor.type === 'VEC4' && [5121, 5123].includes(joints.accessor.componentType) && joints.accessor.count === vertexCount, 'JOINTS accessor unsupported');
    must(weights.accessor.type === 'VEC4' && weights.accessor.count === vertexCount, 'WEIGHTS accessor unsupported');
    return { joints, weights };
  });
}

function pointKey(position) {
  return position.map(value => Object.is(value, -0) ? 0 : value).join(',');
}

function faceComponents(faces, positions) {
  const edgeKey = (left, right) => {
    const points = [pointKey(positions.values(left)), pointKey(positions.values(right))].sort();
    return `${points[0]}|${points[1]}`;
  };
  const atEdge = new Map();
  faces.forEach((face, faceIndex) => {
    for (const [left, right] of [[0, 1], [1, 2], [2, 0]]) {
      const key = edgeKey(face.vertices[left], face.vertices[right]);
      if (!atEdge.has(key)) atEdge.set(key, []);
      atEdge.get(key).push(faceIndex);
    }
  });
  const seen = new Set();
  const components = [];
  for (let start = 0; start < faces.length; start++) {
    if (seen.has(start)) continue;
    const queue = [start];
    const component = [];
    seen.add(start);
    while (queue.length) {
      const current = queue.pop();
      component.push(faces[current]);
      for (const [left, right] of [[0, 1], [1, 2], [2, 0]]) {
        const key = edgeKey(faces[current].vertices[left], faces[current].vertices[right]);
        for (const neighbour of atEdge.get(key)) {
          if (!seen.has(neighbour)) {
            seen.add(neighbour);
            queue.push(neighbour);
          }
        }
      }
    }
    components.push(component);
  }
  components.sort((left, right) => right.length - left.length);
  return components;
}

function geometryIsVolumeLike(faces, positions) {
  const keys = new Set();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const face of faces) {
    for (const vertex of face.vertices) {
      const point = positions.values(vertex);
      keys.add(pointKey(point));
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], point[axis]);
        max[axis] = Math.max(max[axis], point[axis]);
      }
    }
  }
  return keys.size >= 4 && min.every((value, axis) => Number.isFinite(value) && max[axis] > value);
}

function countNonzeroWeights(influences, vertexIds) {
  let count = 0;
  for (const vertex of vertexIds) {
    for (const set of influences) for (const weight of set.weights.values(vertex)) if (weight > 0) count++;
  }
  return count;
}

function sourceMetrics(report, jointCount) {
  return {
    vertices: report.primitives.reduce((sum, primitive) => sum + primitive.vertices, 0),
    joints: jointCount,
    nonzeroWeights: report.primitives.reduce((sum, primitive) => sum + primitive.weightedJoints.reduce((part, joint) => part + joint.nonzeroInfluences, 0), 0),
    primitives: report.primitives.length,
  };
}

function incompatibility(id, sourcePath, sourceSha256, status, reasonCode, reason, details = {}, fingerprints = null) {
  return { id, perspective: '3p', source: { path: sourcePath, sha256: sourceSha256 }, status, reasonCode, reason, details, fingerprints };
}

export function inspectThirdPersonCandidate({ id, sourcePath, bytes }) {
  const sourceSha256 = sha256(bytes);
  let bindReport;
  try {
    bindReport = inspectBindBytes(bytes, sourceSha256);
  } catch (error) {
    return { compatible: false, incompatibility: incompatibility(id, sourcePath, sourceSha256, 'incompatible', 'invalid-bind-or-weights', error.message) };
  }
  const fingerprints = {
    skeletonFamilySha256: bindReport.bindFingerprintSha256,
    geometrySha256: bindReport.geometryFingerprintSha256,
    weightsSha256: bindReport.weightsFingerprintSha256,
  };
  try {
    const { document, bin } = parseGLB(bytes);
    must(Array.isArray(document.nodes) && Array.isArray(document.meshes) && Array.isArray(document.skins), 'nodes, meshes and skins required');
    must(document.skins.length === 1, 'exactly one skin required');
    const assignments = document.nodes.flatMap((node, nodeIndex) => node.skin === undefined ? [] : [{ node, nodeIndex }]);
    must(assignments.length === 1 && assignments[0].node.skin === 0 && assignments[0].node.mesh === 0, 'one skin-to-mesh-zero assignment required');
    const parents = parentTable(document.nodes);
    const leftJoints = descendantsInSkin(document, document.skins[0], parents, 'LeftHand');
    const rightJoints = descendantsInSkin(document, document.skins[0], parents, 'RightHand');
    const active = [];
    for (let primitiveIndex = 0; primitiveIndex < document.meshes[0].primitives.length; primitiveIndex++) {
      const primitive = document.meshes[0].primitives[primitiveIndex];
      must((primitive.mode ?? 4) === 4 && primitive.attributes && primitive.targets === undefined, 'triangle primitives without morph targets required');
      const positions = accessorReader(document, bin, primitive.attributes.POSITION);
      must(positions.accessor.type === 'VEC3' && positions.accessor.componentType === 5126, 'float POSITION required');
      const indices = triangleIndices(document, bin, primitive).values;
      must(indices.every(index => natural(index) && index < positions.accessor.count), 'index outside vertex domain');
      const influences = influenceReaders(document, bin, primitive, positions.accessor.count);
      const ownership = (vertex, joints) => {
        let total = 0;
        for (const set of influences) {
          const jointValues = set.joints.values(vertex);
          const weightValues = set.weights.values(vertex);
          for (let slot = 0; slot < 4; slot++) if (joints.has(jointValues[slot])) total += weightValues[slot];
        }
        return total > OWNERSHIP_THRESHOLD;
      };
      const sides = { left: [], right: [] };
      for (let faceId = 0; faceId < indices.length / 3; faceId++) {
        const vertices = indices.slice(faceId * 3, faceId * 3 + 3);
        if (vertices.every(vertex => ownership(vertex, leftJoints))) sides.left.push({ id: faceId, vertices });
        if (vertices.every(vertex => ownership(vertex, rightJoints))) sides.right.push({ id: faceId, vertices });
      }
      if (!sides.left.length && !sides.right.length) continue;
      active.push({ primitiveIndex, primitive, positions, influences, sides });
    }
    must(active.length === 1, `hand selection spans ${active.length} primitives`);
    const selected = active[0];
    must(selected.sides.left.length > 0 && selected.sides.right.length > 0, 'both hand selections must be non-empty');
    const overlap = new Set(selected.sides.left.map(face => face.id));
    must(!selected.sides.right.some(face => overlap.has(face.id)), 'left/right hand face overlap');
    const components = {
      left: faceComponents(selected.sides.left, selected.positions),
      right: faceComponents(selected.sides.right, selected.positions),
    };
    must(components.left.length === 1 && components.right.length === 1, `ambiguous hand components left=${components.left.length} right=${components.right.length}`);
    must(geometryIsVolumeLike(components.left[0], selected.positions) && geometryIsVolumeLike(components.right[0], selected.positions), 'hand selection is empty/flat/degenerate');
    const sourceVertexIds = [...new Set([...selected.sides.left, ...selected.sides.right].flatMap(face => face.vertices))].sort((a, b) => a - b);
    const selection = {
      schema: SELECTION_SCHEMA,
      meshPartsSchema: MESH_PARTS_SCHEMA,
      sourceSha256,
      ownershipThresholdExclusive: OWNERSHIP_THRESHOLD,
      entries: [{
        node: assignments[0].nodeIndex,
        mesh: 0,
        primitive: selected.primitiveIndex,
        left: { partName: 'glove-left', sourceFaceIDs: selected.sides.left.map(face => face.id) },
        right: { partName: 'glove-right', sourceFaceIDs: selected.sides.right.map(face => face.id) },
      }],
    };
    return {
      compatible: true,
      id,
      sourcePath,
      sourceSha256,
      selection,
      bindReport,
      fingerprints,
      metrics: {
        before: sourceMetrics(bindReport, document.skins[0].joints.length),
        selected: {
          vertices: sourceVertexIds.length,
          joints: document.skins[0].joints.length,
          nonzeroWeights: countNonzeroWeights(selected.influences, sourceVertexIds),
          triangles: selected.sides.left.length + selected.sides.right.length,
          leftTriangles: selected.sides.left.length,
          rightTriangles: selected.sides.right.length,
        },
      },
    };
  } catch (error) {
    return {
      compatible: false,
      incompatibility: incompatibility(id, sourcePath, sourceSha256, 'unknown', 'selection-not-robust', error.message, {}, fingerprints),
    };
  }
}

function makeBinWriter() {
  const chunks = [];
  let length = 0;
  const append = bytes => {
    const padding = (4 - (length % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      length += padding;
    }
    const offset = length;
    const copy = Buffer.from(bytes);
    chunks.push(copy);
    length += copy.length;
    return { offset, length: copy.length };
  };
  return { append, finish: () => Buffer.concat(chunks, length) };
}

function outputBuilder(sourceDocument, sourceBin) {
  const writer = makeBinWriter();
  const accessors = [];
  const bufferViews = [];
  const appendBytesAccessor = (bytes, sourceAccessor, minMax = null, target = undefined) => {
    const stored = writer.append(bytes);
    const viewId = bufferViews.length;
    const view = { buffer: 0, byteOffset: stored.offset, byteLength: stored.length };
    if (target !== undefined) view.target = target;
    bufferViews.push(view);
    const accessorId = accessors.length;
    const accessor = {
      bufferView: viewId,
      componentType: sourceAccessor.componentType,
      count: minMax?.count ?? sourceAccessor.count,
      type: sourceAccessor.type,
    };
    if (sourceAccessor.normalized === true) accessor.normalized = true;
    if (minMax?.min) accessor.min = minMax.min;
    if (minMax?.max) accessor.max = minMax.max;
    accessors.push(accessor);
    return accessorId;
  };
  const copyAccessor = (sourceAccessorId, vertexIds = null, target = undefined) => {
    const reader = accessorReader(sourceDocument, sourceBin, sourceAccessorId);
    const ids = vertexIds ?? Array.from({ length: reader.accessor.count }, (_, index) => index);
    const bytes = Buffer.concat(ids.map(index => Buffer.from(reader.raw(index))));
    let minMax = { count: ids.length };
    if (reader.accessor.type === 'VEC3' && sourceAccessorId !== undefined && sourceDocument.accessors[sourceAccessorId].componentType === 5126 && ids.length) {
      const values = ids.map(index => reader.values(index));
      minMax = {
        count: ids.length,
        min: [0, 1, 2].map(axis => Math.min(...values.map(value => value[axis]))),
        max: [0, 1, 2].map(axis => Math.max(...values.map(value => value[axis]))),
      };
    }
    return appendBytesAccessor(bytes, reader.accessor, minMax, target);
  };
  const appendIndices = values => {
    const bytes = Buffer.alloc(values.length * 4);
    values.forEach((value, index) => bytes.writeUInt32LE(value, index * 4));
    return appendBytesAccessor(bytes, { componentType: 5125, count: values.length, type: 'SCALAR' }, { count: values.length }, 34963);
  };
  return { writer, accessors, bufferViews, copyAccessor, appendIndices };
}

function gloveMaterial(variant = MATERIAL_VARIANTS[0]) {
  return {
    name: `csbrasil.gloves.${variant.id}`,
    doubleSided: true,
    pbrMetallicRoughness: {
      baseColorFactor: [...variant.baseColorFactor],
      metallicFactor: variant.metallicFactor,
      roughnessFactor: variant.roughnessFactor,
    },
  };
}

function copyNodeHierarchy(document) {
  return document.nodes.map(node => {
    const output = {};
    for (const key of ['name', 'matrix', 'translation', 'rotation', 'scale', 'children']) if (node[key] !== undefined) output[key] = clone(node[key]);
    return output;
  });
}

function copyScenes(document) {
  return (document.scenes ?? [{ nodes: document.nodes.map((_, index) => index).filter(index => !document.nodes.some(node => (node.children ?? []).includes(index))) }])
    .map(scene => Object.fromEntries(Object.entries(scene).filter(([key]) => ['nodes', 'name'].includes(key)).map(([key, value]) => [key, clone(value)])));
}

export function buildThirdPersonPackage(sourceBytes, selection) {
  const explicit = selection?.schema === EXPLICIT_SELECTION_SCHEMA;
  must((explicit || selection?.schema === SELECTION_SCHEMA) && selection.meshPartsSchema === MESH_PARTS_SCHEMA, 'selection schema mismatch');
  must(selection.sourceSha256 === sha256(sourceBytes), 'selection source digest mismatch');
  if (explicit) {
    must(Object.keys(selection).sort().join(',') === 'entries,meshPartsSchema,schema,sourceSha256', 'explicit selection fields mismatch');
  } else must(selection.ownershipThresholdExclusive === OWNERSHIP_THRESHOLD, 'selection ownership threshold mismatch');
  must(Array.isArray(selection.entries) && selection.entries.length === 1, 'one selection entry required');
  const { document, bin } = parseGLB(sourceBytes);
  const entry = selection.entries[0];
  if (explicit) must(natural(entry?.node) && natural(entry.primitive) && natural(entry.indexAccessor), 'explicit mesh-parts indices invalid');
  const node = document.nodes[entry.node];
  must(node?.skin === 0 && node.mesh === entry.mesh && entry.mesh === 0, 'selection node/mesh/skin mismatch');
  const primitive = document.meshes[entry.mesh]?.primitives?.[entry.primitive];
  must(primitive && (primitive.mode ?? 4) === 4 && primitive.targets === undefined, 'selected primitive unsupported');
  if (explicit) {
    must(Object.keys(entry).sort().join(',') === 'indexAccessor,left,mesh,node,primitive,right', 'explicit entry fields mismatch');
    must(entry.indexAccessor === primitive.indices, 'explicit index accessor mismatch');
  }
  const sourceIndices = triangleIndices(document, bin, primitive).values;
  const faceCount = sourceIndices.length / 3;
  const faceIds = side => {
    const part = entry[side];
    must(part?.partName === `glove-${side}` && Array.isArray(part.sourceFaceIDs) && part.sourceFaceIDs.length > 0, `${side} mesh-parts selection invalid`);
    must(part.sourceFaceIDs.every((faceId, index) => natural(faceId) && faceId < faceCount && (index === 0 || faceId > part.sourceFaceIDs[index - 1])), `${side} face IDs must be sorted/unique/in-range`);
    if (explicit) {
      must(Object.keys(part).sort().join(',') === 'partName,sourceFaceIDs,sourceFaceIDsSha256', `${side} explicit fields mismatch`);
      must(part.sourceFaceIDsSha256 === canonicalHash(part.sourceFaceIDs), `${side} reviewed face digest mismatch`);
    }
    return part.sourceFaceIDs;
  };
  const leftFaces = faceIds('left');
  const rightFaces = faceIds('right');
  const leftSet = new Set(leftFaces);
  must(!rightFaces.some(face => leftSet.has(face)), 'left/right face ownership overlaps');
  const orderedSourceVertices = [];
  const sourceToOutput = new Map();
  const registerFace = faceId => {
    for (const sourceVertex of sourceIndices.slice(faceId * 3, faceId * 3 + 3)) {
      if (!sourceToOutput.has(sourceVertex)) {
        sourceToOutput.set(sourceVertex, sourceToOutput.size);
        orderedSourceVertices.push(sourceVertex);
      }
    }
  };
  leftFaces.forEach(registerFace);
  rightFaces.forEach(registerFace);
  const mappedIndices = faces => faces.flatMap(faceId => sourceIndices.slice(faceId * 3, faceId * 3 + 3).map(vertex => sourceToOutput.get(vertex)));
  const builder = outputBuilder(document, bin);
  const attributes = {};
  for (const [semantic, sourceAccessor] of Object.entries(primitive.attributes)) {
    attributes[semantic] = builder.copyAccessor(sourceAccessor, orderedSourceVertices, 34962);
  }
  const primitives = ['left', 'right'].map(side => {
    const faces = side === 'left' ? leftFaces : rightFaces;
    return {
      attributes,
      indices: builder.appendIndices(mappedIndices(faces)),
      material: 0,
      mode: 4,
      extras: {
        handOwnership: side,
        meshPartsSchema: MESH_PARTS_SCHEMA,
        sourceNode: entry.node,
        sourcePrimitive: entry.primitive,
        sourceFaceCount: faces.length,
        sourceFaceIDsSha256: canonicalHash(faces),
      },
    };
  });
  const skin = clone(document.skins[0]);
  if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = builder.copyAccessor(skin.inverseBindMatrices);
  const nodes = copyNodeHierarchy(document);
  nodes[entry.node].mesh = 0;
  nodes[entry.node].skin = 0;
  const outputDocument = {
    asset: { version: '2.0', generator: 'csbrasil glove package v1' },
    scene: document.scene ?? 0,
    scenes: copyScenes(document),
    nodes,
    meshes: [{ name: `${document.meshes[0].name ?? 'character'}-gloves`, primitives }],
    skins: [skin],
    materials: [gloveMaterial()],
    buffers: [{ byteLength: 0 }],
    bufferViews: builder.bufferViews,
    accessors: builder.accessors,
  };
  const bytes = packGLB(outputDocument, builder.writer.finish());
  const outputSha256 = sha256(bytes);
  const outputReport = inspectBindBytes(bytes, outputSha256);
  const influences = influenceReaders(document, bin, primitive, accessorReader(document, bin, primitive.attributes.POSITION).accessor.count);
  return {
    bytes,
    report: outputReport,
    metrics: {
      vertices: orderedSourceVertices.length,
      joints: document.skins[0].joints.length,
      nonzeroWeights: countNonzeroWeights(influences, orderedSourceVertices),
      triangles: leftFaces.length + rightFaces.length,
      leftTriangles: leftFaces.length,
      rightTriangles: rightFaces.length,
    },
  };
}

export function staticFamilyFingerprint(document) {
  const parents = parentTable(document.nodes);
  const assignments = document.nodes.flatMap((node, index) => /^FPVM_GLOVE_[LR]_MESH$/.test(node.name ?? '') ? [{ node: index, name: node.name, parent: parents[index] }] : []);
  return canonicalHash({
    schema: FAMILY_SCHEMA,
    kind: 'fpvm-static-hands',
    nodes: document.nodes.map((node, index) => ({
      index,
      parent: parents[index],
      children: node.children ?? [],
      name: node.name ?? null,
      matrix: node.matrix ?? null,
      translation: node.translation ?? null,
      rotation: node.rotation ?? null,
      scale: node.scale ?? null,
    })),
    assignments,
  });
}

function staticSourceMetrics(document, bin) {
  let vertices = 0;
  let triangles = 0;
  for (const mesh of document.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    vertices += accessorReader(document, bin, primitive.attributes.POSITION).accessor.count;
    triangles += triangleIndices(document, bin, primitive).values.length / 3;
  }
  return { vertices, joints: 0, nonzeroWeights: 0, primitives: (document.meshes ?? []).reduce((sum, mesh) => sum + mesh.primitives.length, 0), triangles };
}

export function inspectFirstPersonSource({ sourcePath, bytes }) {
  const sourceSha256 = sha256(bytes);
  const { document, bin } = parseGLB(bytes);
  must(!document.skins && !document.animations, 'fpvm_hands must remain a static authored family');
  const names = ['FPVM_GLOVE_L_MESH', 'FPVM_GLOVE_R_MESH'];
  const entries = names.map((name, sideIndex) => {
    const matches = document.nodes.flatMap((node, nodeIndex) => node.name === name ? [{ node, nodeIndex }] : []);
    must(matches.length === 1 && validIndex(matches[0].node.mesh, document.meshes), `${name} node missing/ambiguous`);
    const meshIndex = matches[0].node.mesh;
    const materialPrimitive = document.meshes[meshIndex].primitives.flatMap((primitive, primitiveIndex) => {
      const materialName = document.materials?.[primitive.material]?.name;
      return materialName === 'csbrasil.glove.leather' ? [{ primitive, primitiveIndex }] : [];
    });
    must(materialPrimitive.length === 1, `${name} authored glove primitive missing/ambiguous`);
    return { side: sideIndex === 0 ? 'left' : 'right', node: matches[0].nodeIndex, mesh: meshIndex, primitive: materialPrimitive[0].primitiveIndex };
  });
  return {
    sourcePath,
    sourceSha256,
    familyFingerprintSha256: staticFamilyFingerprint(document),
    entries,
    before: staticSourceMetrics(document, bin),
  };
}

export function buildFirstPersonPackage(sourceBytes, inspection) {
  must(inspection.sourceSha256 === sha256(sourceBytes), 'fpvm source digest mismatch');
  const { document, bin } = parseGLB(sourceBytes);
  must(staticFamilyFingerprint(document) === inspection.familyFingerprintSha256, 'fpvm family fingerprint mismatch');
  const builder = outputBuilder(document, bin);
  const nodes = copyNodeHierarchy(document);
  const meshes = [];
  let vertices = 0;
  let triangles = 0;
  const sideTriangles = { left: 0, right: 0 };
  for (const entry of inspection.entries) {
    const primitive = document.meshes[entry.mesh].primitives[entry.primitive];
    const positionCount = accessorReader(document, bin, primitive.attributes.POSITION).accessor.count;
    const sourceVertices = Array.from({ length: positionCount }, (_, index) => index);
    const attributes = {};
    for (const [semantic, sourceAccessor] of Object.entries(primitive.attributes)) attributes[semantic] = builder.copyAccessor(sourceAccessor, sourceVertices, 34962);
    const sourceIndices = triangleIndices(document, bin, primitive).values;
    const outputPrimitive = {
      attributes,
      indices: builder.appendIndices(sourceIndices),
      material: 0,
      mode: 4,
      extras: { handOwnership: entry.side, selectionMethod: 'authored-glove-primitive', sourceNode: entry.node, sourcePrimitive: entry.primitive },
    };
    const meshIndex = meshes.length;
    meshes.push({ name: `${entry.side}-glove`, primitives: [outputPrimitive] });
    nodes[entry.node].mesh = meshIndex;
    vertices += positionCount;
    triangles += sourceIndices.length / 3;
    sideTriangles[entry.side] += sourceIndices.length / 3;
  }
  const outputDocument = {
    asset: { version: '2.0', generator: 'csbrasil glove package v1' },
    scene: document.scene ?? 0,
    scenes: copyScenes(document),
    nodes,
    meshes,
    materials: [gloveMaterial()],
    buffers: [{ byteLength: 0 }],
    bufferViews: builder.bufferViews,
    accessors: builder.accessors,
  };
  const bytes = packGLB(outputDocument, builder.writer.finish());
  must(staticFamilyFingerprint(parseGLB(bytes).document) === inspection.familyFingerprintSha256, 'fpvm output changed family transform hierarchy');
  return { bytes, metrics: { vertices, joints: 0, nonzeroWeights: 0, triangles, leftTriangles: sideTriangles.left, rightTriangles: sideTriangles.right } };
}

export function parseSelections(bytes) {
  const selections = JSON.parse(bytes.toString('utf8'));
  must(selections?.schema === 'cs-glove-selections/1' && Array.isArray(selections.entries), 'glove selections schema mismatch');
  const ids = selections.entries.map(entry => entry.characterId);
  must(ids.every((id, index) => typeof id === 'string' && (index === 0 || id > ids[index - 1])), 'selection character IDs must be sorted/unique');
  for (const entry of selections.entries) {
    must(entry.selection?.schema === SELECTION_SCHEMA && entry.selection.sourceSha256 === entry.sourceSha256, `selection invalid for ${entry.characterId}`);
  }
  return selections;
}

export function makeSelectionsDocument(compatible) {
  return {
    schema: 'cs-glove-selections/1',
    generatedBy: 'tools/character-kit/gloves/build.mjs',
    entries: compatible
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(candidate => ({ characterId: candidate.id, sourceSha256: candidate.sourceSha256, selection: candidate.selection })),
  };
}


export function mutateGLBAccessor(bytes, semantic) {
  const { document, bin } = parseGLB(bytes);
  let accessorId;
  if (semantic === 'INVERSE_BIND_MATRICES') accessorId = document.skins?.[0]?.inverseBindMatrices;
  else {
    const primitive = document.meshes?.[0]?.primitives?.[0];
    accessorId = primitive?.attributes?.[semantic];
  }
  must(accessorId !== undefined, `${semantic} accessor missing`);
  const reader = accessorReader(document, bin, accessorId);
  const changedBin = Buffer.from(bin);
  const view = document.bufferViews[reader.accessor.bufferView];
  const base = (view.byteOffset ?? 0) + (reader.accessor.byteOffset ?? 0);
  if (semantic === 'JOINTS_0') {
    changedBin[reader.component.write](reader.component.bytes === 1 ? 255 : 65535, base);
  } else if (semantic === 'WEIGHTS_0') {
    const first = Buffer.from(reader.raw(0));
    let other = 1;
    while (other < reader.accessor.count && Buffer.compare(first, reader.raw(other)) === 0) other++;
    must(other < reader.accessor.count, 'distinct weight rows unavailable');
    const otherOffset = base + other * reader.stride;
    const second = Buffer.from(changedBin.subarray(otherOffset, otherOffset + reader.width));
    second.copy(changedBin, base);
    first.copy(changedBin, otherOffset);
  } else {
    must(reader.accessor.componentType === 5126, 'IBM float accessor required');
    changedBin.writeFloatLE(changedBin.readFloatLE(base + 12 * 4) + 0.125, base + 12 * 4);
  }
  return packGLB(document, changedBin);
}
