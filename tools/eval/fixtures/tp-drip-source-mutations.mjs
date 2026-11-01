// Causas validadas em R740; altera somente o candidato real em memória.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const W = fileURLToPath(new URL('../../../', import.meta.url));
const MODE = process.env.CSBR_TP_DRIP_CASE;
const MESH = 'public/models/gloves/3p/bolsonaro-drip-a938a2d09481.glb';
const FIX = JSON.parse(fs.readFileSync(path.join(W, 'tools/eval/fixtures/tp-drip-source.json')));
const { parseGLB, packGLB } = await import(pathToFileURL(path.join(W, 'tools/character-kit/gloves/core.mjs')).href);
const { inspectBindBytes } = await import(pathToFileURL(path.join(W, 'tools/character-kit/bind-inspector.mjs')).href);
const MODES = new Set(['ring-id', 'cuff-id', 'omit57', 'swap-lr', 'curl-name', 'ibm', 'weight', 'reindex-control']);
if (!MODES.has(MODE)) throw Error('TP_DRIP_INJECTOR_INFRA: unknown mode');
const NONCE = process.env.CSBR_TP_DRIP_NONCE;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha(JSON.stringify(value));
const must = (ok, message) => { if (!ok) throw Error('TP_DRIP_INJECTOR_INFRA: ' + message); };
const clone = value => JSON.parse(JSON.stringify(value));
const emit = row => {
  const file = process.env.CSBR_TP_DRIP_RECEIPT;
  must(typeof NONCE === 'string' && NONCE.length > 0 && typeof file === 'string' && path.isAbsolute(file) && path.basename(file) === MODE + '.injection.jsonl', 'receipt identity');
  fs.appendFileSync(file, JSON.stringify({ nonce: NONCE, mode: MODE, ...row }) + '\n');
};
const sourceHash = FIX.source.sha256;
const selectionModes = new Set(['ring-id', 'cuff-id', 'omit57', 'swap-lr']);
export function mutateDripSelection(selection, sourceBytes) {
  must(selection.schema === 'cs-glove-explicit-mesh-parts/1' && sha(sourceBytes) === sourceHash, 'cosmetic source/schema');
  if (!selectionModes.has(MODE)) {
    emit({ stage: 'selection', changed: false, selectionHash: hash(selection) });
    return selection;
  }
  const changed = clone(selection), entry = changed.entries[0], before = hash(selection);
  let detail;
  if (MODE === 'ring-id' || MODE === 'cuff-id') {
    const side = MODE === 'ring-id' ? 'right' : 'left';
    const component = MODE === 'ring-id' ? 'R02' : 'L02';
    const replacement = FIX.excludedComponents[component][0];
    const removed = entry[side].sourceFaceIDs.find(id => !FIX.wristExtension[side].includes(id));
    must(!entry[side].sourceFaceIDs.includes(replacement) && replacement < 4951, 'replacement valid/disjoint');
    entry[side].sourceFaceIDs = entry[side].sourceFaceIDs.filter(id => id !== removed).concat(replacement).sort((a, b) => a - b);
    detail = { side, component, removed, replacement };
  } else if (MODE === 'omit57') {
    for (const side of ['left', 'right']) entry[side].sourceFaceIDs = entry[side].sourceFaceIDs.filter(id => !FIX.wristExtension[side].includes(id));
    detail = { removedLeft: 26, removedRight: 31 };
  } else {
    const left = entry.left.sourceFaceIDs;
    entry.left.sourceFaceIDs = entry.right.sourceFaceIDs;
    entry.right.sourceFaceIDs = left;
    detail = { swappedFaceMembership: true, partNamesUnchanged: true };
  }
  for (const side of ['left', 'right']) {
    const ids = entry[side].sourceFaceIDs;
    must(ids.length > 0 && ids.every((id, i) => Number.isInteger(id) && id >= 0 && id < 4951 && (!i || id > ids[i - 1])), 'sorted/unique/in-range selection');
    entry[side].sourceFaceIDsSha256 = hash(ids);
  }
  must(!entry.left.sourceFaceIDs.some(id => entry.right.sourceFaceIDs.includes(id)), 'sides disjoint');
  must(hash(changed) !== before, 'selection mutation applied');
  emit({ stage: 'selection', changed: true, originalHash: before, usedHash: hash(changed), leftCount: entry.left.sourceFaceIDs.length, rightCount: entry.right.sourceFaceIDs.length, declaredRecordUnchanged: true, detail });
  return changed;
}
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
function rowInfo(d, accessorId) {
  const a = d.accessors[accessorId], v = d.bufferViews[a.bufferView], element = WIDTH[a.type] * SIZE[a.componentType];
  must(v.buffer === 0 && Number.isInteger(element), 'accessor layout');
  const stride = v.byteStride ?? element, start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return { a, element, stride, offset: i => start + i * stride };
}
function mutateBuffer(bytes) {
  const parsed = parseGLB(bytes), d = clone(parsed.document), bin = Buffer.from(parsed.bin), primitives = d.meshes[0].primitives;
  must(primitives.length === 2 && d.skins[0].joints.length === 26, 'actual Drip output');
  let detail;
  if (MODE === 'curl-name') {
    const ids = d.skins[0].joints.filter(id => d.nodes[id].name === 'Curl_R');
    must(ids.length === 1 && !d.nodes.some(node => node.name === '__tp_drip_removed_Curl_R'), 'unique Curl_R');
    d.nodes[ids[0]].name = '__tp_drip_removed_Curl_R';
    detail = { node: ids[0], oldName: 'Curl_R', newName: '__tp_drip_removed_Curl_R', curlNamesRemaining: d.nodes.filter(node => node.name === 'Curl_R').length, jointSlots: 26, topologyDeletion: false };
  } else if (MODE === 'ibm') {
    const info = rowInfo(d, d.skins[0].inverseBindMatrices);
    must(info.a.type === 'MAT4' && info.a.componentType === 5126 && info.a.count === 26, 'IBM format');
    const offset = info.offset(0) + 12 * 4, before = bin.readFloatLE(offset);
    bin.writeFloatLE(before + .125, offset);
    must(Number.isFinite(bin.readFloatLE(offset)) && bin.readFloatLE(offset) !== before, 'IBM translation changed');
    detail = { jointSlot: 0, matrixElement: 12, before, after: bin.readFloatLE(offset), affineTranslationOnly: true };
  } else if (MODE === 'weight') {
    const info = rowInfo(d, primitives[0].attributes.WEIGHTS_0), joints = rowInfo(d, primitives[0].attributes.JOINTS_0);
    must(info.a.componentType === 5126 && info.a.type === 'VEC4' && [5121, 5123].includes(joints.a.componentType), 'weight/joint format');
    let found = false;
    for (let vertex = 0; vertex < info.a.count && !found; vertex++) {
      const offset = info.offset(vertex), values = Array.from({ length: 4 }, (_, i) => bin.readFloatLE(offset + i * 4));
      const donor = values.findIndex(value => value === 1);
      if (donor < 0 || values.some((value, i) => i !== donor && value !== 0)) continue;
      const j = Array.from({ length: 4 }, (_, i) => bin[joints.a.componentType === 5121 ? 'readUInt8' : 'readUInt16LE'](joints.offset(vertex) + i * SIZE[joints.a.componentType]));
      const receiver = values.findIndex((value, i) => value === 0 && j[i] !== j[donor] && j[i] < 26);
      if (receiver < 0) continue;
      bin.writeFloatLE(.875, offset + donor * 4); bin.writeFloatLE(.125, offset + receiver * 4);
      detail = { vertex, donor, receiver, joints: j, before: values, after: Array.from({ length: 4 }, (_, i) => bin.readFloatLE(offset + i * 4)), sumBefore: 1, sumAfter: 1 };
      found = true;
    }
    must(found, 'rigid vertex with distinct valid receiver');
  } else if (MODE === 'reindex-control') {
    const semantics = primitives[0].attributes, n = d.accessors[semantics.POSITION].count, original = Buffer.from(bin);
    must(JSON.stringify(semantics) === JSON.stringify(primitives[1].attributes), 'shared output attributes');
    for (const accessorId of new Set(Object.values(semantics))) {
      const info = rowInfo(d, accessorId); must(info.a.count === n, 'attribute count');
      for (let output = 0; output < n; output++) original.copy(bin, info.offset(output), info.offset(n - 1 - output), info.offset(n - 1 - output) + info.element);
    }
    for (const p of primitives) {
      const info = rowInfo(d, p.indices); must(info.a.type === 'SCALAR' && info.a.componentType === 5125, 'index format');
      for (let i = 0; i < info.a.count; i++) {
        const old = original.readUInt32LE(info.offset(i)); must(old < n, 'valid source output index'); bin.writeUInt32LE(n - 1 - old, info.offset(i));
      }
    }
    detail = { vertices: n, permutation: 'i -> n-1-i', semantics: Object.keys(semantics), indicesRemapped: true };
  } else return { bytes, detail: null };
  const output = packGLB(d, bin);
  must(!output.equals(bytes), 'GLB mutation applied');
  parseGLB(output);
  return { bytes: output, detail };
}
const artifactSignature = artifacts => hash([...artifacts].map(([p, b]) => [p, b.length, sha(b)]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
export function mutateDripReturn(result, includeCosmetics) {
  if (!includeCosmetics) {
    emit({ stage: 'default', changed: false, artifacts: result.artifacts.size, signature: artifactSignature(result.artifacts) });
    return result;
  }
  const variants = result.manifest.packages.flatMap(pack => pack.sourceVariants.filter(v => v.id === 'bolsonaro-drip'));
  must(variants.length === 1 && Buffer.isBuffer(result.artifacts.get(MESH)), 'real opt-in Drip present');
  const variant = variants[0], beforeBytes = result.artifacts.get(MESH), before = sha(beforeBytes), claimedBind = variant.mesh.bindFingerprintSha256;
  const changed = mutateBuffer(beforeBytes);
  const actual = inspectBindBytes(changed.bytes, sha(changed.bytes));
  if (changed.detail) {
    result.artifacts.set(MESH, changed.bytes);
    variant.mesh.sha256 = sha(changed.bytes);
    variant.mesh.geometryFingerprintSha256 = actual.geometryFingerprintSha256;
    variant.mesh.weightsFingerprintSha256 = actual.weightsFingerprintSha256;
    // Deliberately preserve the producer's source-family claim: F3 must read actual bytes.
    variant.mesh.bindFingerprintSha256 = claimedBind;
    result.artifacts.set('public/data/gloves-manifest.json', Buffer.from(JSON.stringify(result.manifest, null, 2) + '\n'));
  }
  must(variant.mesh.sha256 === sha(result.artifacts.get(MESH)), 'container digest refreshed');
  must(result.artifacts.get('public/data/gloves-manifest.json').equals(Buffer.from(JSON.stringify(result.manifest, null, 2) + '\n')), 'manifest serialization coherent');
  const doc = parseGLB(changed.bytes).document;
  emit({ stage: 'return', afterRealProducerInspector: true, mutatedContainer: !!changed.detail, beforeSHA256: before, afterSHA256: sha(changed.bytes), actualInspectorValidatedContainer: true, claimedBind, actualBind: actual.bindFingerprintSha256, actualGeometry: actual.geometryFingerprintSha256, actualWeights: actual.weightsFingerprintSha256, manifestSerialized: true, sideTriangles: doc.meshes[0].primitives.map(p => ({ side: p.extras.handOwnership, triangles: doc.accessors[p.indices].count / 3 })), metrics: variant.metrics.after, detail: changed.detail, signature: artifactSignature(result.artifacts), actualModuleUrls: ['tools/character-kit/gloves/core.mjs', 'tools/character-kit/bind-inspector.mjs'].map(p => pathToFileURL(path.join(W, p)).href) });
  return result;
}
