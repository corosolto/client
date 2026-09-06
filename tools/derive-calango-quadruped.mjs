import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = 'public/models/ambient/lagarto_sertao.glb';
const file = 'public/models/ambient/calango_quadrupede.glb';
const bytes = readFileSync(source), sourceSha = createHash('sha256').update(bytes).digest('hex');
if (sourceSha !== '5ef08bdcf2390e44a0e1956568392b2f5885fd450257c077257a50c3b5b4650a') throw Error('Derivação exige lagarto de origem identificado.');
const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
let binary = Buffer.from(bytes.subarray(28 + jsonLength));
const primitive = gltf.meshes[0].primitives[0];
function values(id) {
  const a = gltf.accessors[id], v = gltf.bufferViews[a.bufferView], width = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const size = a.componentType === 5123 ? 2 : 4, method = a.componentType === 5123 ? 'readUInt16LE' : 'readFloatLE';
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, c) => binary[method]((v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || size * width) + c * size)));
}
function append(rows, type, componentType = 5126) {
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3 }[type], size = componentType === 5123 ? 2 : 4;
  const data = Buffer.alloc(rows.length * width * size), method = componentType === 5123 ? 'writeUInt16LE' : 'writeFloatLE';
  rows.forEach((row, i) => row.forEach((v, c) => data[method](v, (i * width + c) * size)));
  const pad = Buffer.alloc((4 - binary.length % 4) % 4), offset = binary.length + pad.length;
  binary = Buffer.concat([binary, pad, data]);
  const bufferView = gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length }) - 1;
  return gltf.accessors.push({ bufferView, componentType, count: rows.length, type, min: Array.from({ length: width }, (_, c) => Math.min(...rows.map(r => r[c]))), max: Array.from({ length: width }, (_, c) => Math.max(...rows.map(r => r[c]))) }) - 1;
}
const positions = values(primitive.attributes.POSITION), normals = values(primitive.attributes.NORMAL), indices = values(primitive.indices).flat();
const parent = positions.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
const unite = (a, b) => { parent[find(a)] = find(b); }, byPosition = new Map();
positions.forEach((p, i) => { const key = p.join(','); if (byPosition.has(key)) unite(i, byPosition.get(key)); else byPosition.set(key, i); });
for (let i = 0; i < indices.length; i += 3) { unite(indices[i], indices[i + 1]); unite(indices[i], indices[i + 2]); }
const parts = new Map(); positions.forEach((_, i) => { const key = find(i); if (!parts.has(key)) parts.set(key, []); parts.get(key).push(i); });
const rocks = [...parts.values()].filter(group => group.length === 207 && Math.max(...group.map(i => positions[i][1])) < 0);
if (rocks.length !== 1) throw Error('Pedra desconectada não identificada de modo único.');
const rock = new Set(rocks[0]), retained = indices.filter(i => !rock.has(i));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const legId = ([x, , z]) => (x < -.175 ? 0 : 2) + (z > 0 ? 0 : 1);
const legWeight = ([x, , z]) => (x < -.34 || x > .09 ? 0 : smooth(.055, .115, Math.abs(z)));
const feet = [0, 1, 2, 3].map(id => {
  const ids = [...new Set(retained)].filter(i => legId(positions[i]) === id && legWeight(positions[i]) === 1);
  return ids.reduce((best, i) => positions[i][1] < positions[best][1] ? i : best, ids[0]);
});
const ground = Math.min(...feet.map(i => positions[i][1]));
const output = positions.map((p, i) => {
  const [x, y, z] = p, weight = legWeight(p), lift = (ground - positions[feet[legId(p)]][1]) * weight;
  return [z, Math.max(0, y + lift - ground), -x];
});
// Remove a pedra, conserva UV/material e coloca os quatro apoios no mesmo solo.
const textureCoordinates = values(primitive.attributes.TEXCOORD_0);
const used = [...new Set(retained)].sort((a, b) => a - b), remap = new Map(used.map((value, index) => [value, index]));
primitive.indices = append(retained.map(i => [remap.get(i)]), 'SCALAR', 5123);
primitive.attributes.TEXCOORD_0 = append(used.map(i => textureCoordinates[i]), 'VEC2');
primitive.attributes.POSITION = append(used.map(i => output[i]), 'VEC3');
primitive.attributes.NORMAL = append(used.map(i => { const [x, y, z] = normals[i]; return [z, y, -x]; }), 'VEC3');
const morphs = [[], [], [], []];
positions.forEach((p, i) => {
  const weight = rock.has(i) ? 0 : legWeight(p), id = legId(p), diagonal = id === 0 || id === 3;
  morphs[0].push([0, 0, weight * .035 * (diagonal ? 1 : -1)]);
  morphs[1].push([0, diagonal ? weight * .023 : 0, 0]);
  morphs[2].push([0, diagonal ? 0 : weight * .023, 0]);
  morphs[3].push([smooth(.10, .49, p[0]) * .023, 0, 0]);
});
primitive.targets = morphs.map(rows => ({ POSITION: append(used.map(i => rows[i]), 'VEC3') }));
gltf.meshes[0].weights = [0, 0, 0, 0];
gltf.meshes[0].extras = { targetNames: ['passada-diagonal', 'apoios-esquerda-frente', 'apoios-direita-frente', 'cauda'] };
gltf.nodes[0].name = 'Calango quadrupede';
const times = Array.from({ length: 33 }, (_, i) => i / 32 * .48);
const weights = times.flatMap((t, i) => {
  const sine = Math.sin(i / 32 * Math.PI * 2);
  return [-Math.cos(i / 32 * Math.PI * 2), Math.max(0, sine), Math.max(0, -sine), Math.sin(i / 32 * Math.PI * 2 - .6)].map(v => [v]);
});
gltf.animations = [{ name: 'Run', samplers: [{ input: append(times.map(t => [t]), 'SCALAR'), output: append(weights, 'SCALAR'), interpolation: 'LINEAR' }], channels: [{ sampler: 0, target: { node: 0, path: 'weights' } }] }];
gltf.extras = { source, sourceSha256: sourceSha, tool: 'tools/derive-calango-quadruped.mjs', removedStoneVertices: rock.size, contacts: feet.map(i => remap.get(i)), facing: '+Z', pose: 'quadruped', animation: 'diagonal limb morphs and tail; authored locally; no Mint rig claim' };
const liveAccessors = [...new Set([primitive.indices, ...Object.values(primitive.attributes), ...primitive.targets.flatMap(t => Object.values(t)), ...gltf.animations.flatMap(a => a.samplers.flatMap(s => [s.input, s.output]))])];
const accessorMap = new Map(liveAccessors.map((id, i) => [id, i]));
gltf.accessors = liveAccessors.map(id => gltf.accessors[id]);
primitive.indices = accessorMap.get(primitive.indices);
for (const attrs of [primitive.attributes, ...primitive.targets]) for (const key of Object.keys(attrs)) attrs[key] = accessorMap.get(attrs[key]);
for (const animation of gltf.animations) for (const sampler of animation.samplers) { sampler.input = accessorMap.get(sampler.input); sampler.output = accessorMap.get(sampler.output); }
gltf.bufferViews[gltf.accessors[primitive.indices].bufferView].target = 34963;
for (const attrs of [primitive.attributes, ...primitive.targets]) for (const id of Object.values(attrs)) gltf.bufferViews[gltf.accessors[id].bufferView].target = 34962;
const liveViews = [...new Set([...gltf.images.map(i => i.bufferView), ...gltf.accessors.map(a => a.bufferView)])], viewMap = new Map(liveViews.map((id, i) => [id, i]));
let compact = Buffer.alloc(0);
gltf.bufferViews = liveViews.map(id => { const view = gltf.bufferViews[id], pad = Buffer.alloc((4 - compact.length % 4) % 4), offset = compact.length + pad.length; compact = Buffer.concat([compact, pad, binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)]); return { ...view, byteOffset: offset }; });
for (const owner of [...gltf.images, ...gltf.accessors]) owner.bufferView = viewMap.get(owner.bufferView);
binary = compact;
gltf.buffers[0].byteLength = binary.length;
const json = Buffer.from(JSON.stringify(gltf)), jsonPad = Buffer.alloc((4 - json.length % 4) % 4, 0x20), binPad = Buffer.alloc((4 - binary.length % 4) % 4);
const head = Buffer.alloc(20); head.writeUInt32LE(0x46546c67); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + json.length + jsonPad.length + binary.length + binPad.length, 8); head.writeUInt32LE(json.length + jsonPad.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
const binHead = Buffer.alloc(8); binHead.writeUInt32LE(binary.length + binPad.length); binHead.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([head, json, jsonPad, binHead, binary, binPad]); writeFileSync(file, result);
console.log(JSON.stringify({ file, bytes: result.length, sha256: createHash('sha256').update(result).digest('hex'), triangles: retained.length / 3, contacts: feet.map(i => ({ vertex: i, position: output[i] })), sourceSha256: sourceSha }));
