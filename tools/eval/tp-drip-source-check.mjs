#!/usr/bin/env node
// S3: identidade literal R573 e bytes de origem; contrato e limites no ledger TP-DRIP-SOURCE.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE = 'tools/eval/fixtures/tp-drip-source.json';
const FIXTURE_SHA = '3f9b0fef5909b75d97414d0c0246b5863e2353fd65be403fd95c96e114a8e5a0';
const SELECTION = 'tools/character-kit/gloves/cosmetic-selections.json';
const MESH = 'public/models/gloves/3p/bolsonaro-drip-a938a2d09481.glb';
const SIDES = ['left', 'right'];
const rows = [];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => sha(JSON.stringify(value));
const natural = value => Number.isSafeInteger(value) && value >= 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const infra = (condition, message) => { if (!condition) throw Error(message); };
class ContractError extends Error {}
const expect = (condition, message) => { if (!condition) throw new ContractError(message); };
const keys = (value, names, label) => expect(object(value) && equal(Object.keys(value).sort(), [...names].sort()), `${label}: campos divergentes`);
const read = relative => fs.readFileSync(path.join(ROOT, relative));
function clause(id, description, measure) {
  try { rows.push({ id, status: 'PASS', description, evidence: measure() }); }
  catch (error) {
    if (!(error instanceof ContractError)) throw error;
    rows.push({ id, status: 'RED', description, error: error.message });
  }
}
const skipped = (id, description) => rows.push({ id, status: 'NOT_MEASURED', description, reason: 'F0/F1 sem candidato válido; nenhum crédito' });

// Leitor independente do builder: extrai rows cruas, inclusive buffers intercalados.
function glb(bytes, parseJSON) {
  infra(Buffer.isBuffer(bytes) && bytes.length >= 28, 'GLB truncado');
  infra(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'header GLB inválido');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    infra(offset + 8 <= bytes.length, 'chunk GLB truncado');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    infra(length % 4 === 0 && offset + 8 + length <= bytes.length, 'bounds de chunk GLB inválidos');
    chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) }); offset += 8 + length;
  }
  infra(chunks.length === 2 && chunks[0].type === 0x4e4f534a && chunks[1].type === 0x004e4942, 'GLB JSON/BIN esperado');
  const document = parseJSON(chunks[0].bytes.toString('utf8')), bin = chunks[1].bytes;
  infra(document.asset?.version === '2.0' && document.buffers?.length === 1 && document.buffers[0].uri === undefined, 'buffer GLB não local');
  const length = document.buffers[0].byteLength;
  infra(natural(length) && length <= bin.length && bin.length - length <= 3, 'tamanho BIN inválido');
  return { document, bin };
}
const FORMATS = { 5120: [1, 'readInt8'], 5121: [1, 'readUInt8'], 5122: [2, 'readInt16LE'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] };
const WIDTHS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function accessor(asset, id) {
  const { document: d, bin } = asset;
  infra(natural(id) && id < d.accessors.length, 'accessor ausente');
  const a = d.accessors[id], format = FORMATS[a.componentType], width = WIDTHS[a.type];
  infra(format && width && natural(a.count) && !a.sparse && natural(a.bufferView), 'accessor não suportado');
  const view = d.bufferViews[a.bufferView];
  infra(view && view.buffer === 0, 'bufferView ausente');
  const element = format[0] * width, stride = view.byteStride ?? element;
  const local = a.byteOffset ?? 0, base = view.byteOffset ?? 0;
  infra([local, base, view.byteLength, stride].every(natural) && stride >= element && stride % format[0] === 0, 'layout de accessor inválido');
  infra(base + view.byteLength <= d.buffers[0].byteLength && local + (a.count ? (a.count - 1) * stride + element : 0) <= view.byteLength, 'bounds de accessor inválidos');
  const raw = index => {
    infra(natural(index) && index < a.count, 'índice de accessor fora do domínio');
    return bin.subarray(base + local + index * stride, base + local + index * stride + element);
  };
  const values = index => Array.from({ length: width }, (_, column) => raw(index)[format[1]](column * format[0]));
  return { a, raw, values };
}
function indices(asset, primitive) {
  const reader = accessor(asset, primitive.indices);
  infra(reader.a.type === 'SCALAR' && [5121, 5123, 5125].includes(reader.a.componentType) && reader.a.count % 3 === 0, 'índices triangulares inválidos');
  return Array.from({ length: reader.a.count }, (_, index) => reader.values(index)[0]);
}
function sourceOracle(fixture, bytes, parseJSON) {
  infra(sha(bytes) === fixture.source.sha256 && bytes.length === fixture.source.bytes, 'fonte aprovada ausente/divergente; não medir outra origem');
  const source = glb(bytes, parseJSON), d = source.document, s = fixture.source;
  infra(d.nodes[s.node]?.mesh === s.mesh && d.nodes[s.node]?.skin === 0 && d.skins?.length === 1 && d.skins[0].joints.length === 26, 'identidade da fonte R573 divergente');
  const primitive = d.meshes[s.mesh]?.primitives?.[s.primitive];
  infra(primitive && primitive.indices === 6 && (primitive.mode ?? 4) === 4 && primitive.targets === undefined, 'primitive/accessor R573 divergente');
  const sourceIndices = indices(source, primitive);
  infra(sourceIndices.length === 4951 * 3, 'domínio de faces R573 divergente');
  const selected = SIDES.flatMap(side => fixture.faces[side]);
  infra(selected.length === 840 && new Set(selected).size === 840, 'oracle não é 840 faces disjuntas');
  for (const side of SIDES) {
    const faces = fixture.faces[side];
    infra(faces.length === 420 && faces.every((id, i) => natural(id) && id < 4951 && (!i || id > faces[i - 1])), 'oracle de faces inválido');
    infra(digest(faces) === fixture.review[`${side}FaceIDsSha256`], 'IDs revisados divergentes');
    infra(fixture.wristExtension[side].every(id => faces.includes(id)), 'extensão do punho fora da seleção');
  }
  infra(fixture.wristExtension.left.length === 26 && fixture.wristExtension.right.length === 31, '57 faces do punho não preservadas');
  const excluded = Object.values(fixture.excludedComponents).flat();
  infra(Object.keys(fixture.excludedComponents).length === 8 && !selected.some(id => excluded.includes(id)), 'oracle inclui componente excluído');
  const vertices = new Set(selected.flatMap(id => sourceIndices.slice(id * 3, id * 3 + 3)));
  for (const id of Object.values(primitive.attributes)) {
    const reader = accessor(source, id);
    infra([...vertices].every(vertex => vertex < reader.a.count), 'fonte contém índice de atributo inválido');
  }
  return { ...source, primitive, sourceIndices, vertices };
}
function registration(fixture, candidate, entry, meshBytes, parseJSON) {
  const { pack, variant } = entry, s = fixture.source;
  expect(pack.perspective === '3p' && pack.packageVersion === 1 && pack.skeletonFamily?.schema === 'cs-skeleton-family/1' && pack.skeletonFamily.fingerprintSha256 === s.skeletonFamilySha256, 'família própria 3p incorreta');
  expect(pack.sourceVariants.length === 1 && equal(pack.supportedCharacterIds, ['capitao']), 'família cosmética tem cobertura ambígua');
  expect(pack.visualApproved === false && pack.runtimeEnabled === false && candidate.manifest.visualApproved === false && candidate.manifest.runtimeEnabled === false, 'candidato técnico se autoaprovou');
  expect(pack.handOwnership?.sourceHandRemovalCount === 0 && equal(pack.animationOwnership, { owner: 'character-rig', mode: 'inherit-live-skeleton', animationsEmbedded: false, poseOverrides: false, teleport: false }), 'ownership/pose do candidato mudou');
  expect(variant.id === 'bolsonaro-drip' && equal(variant.characterIds, ['capitao']), 'identidade da variante incorreta');
  expect(equal(variant.source, { kind: 'cosmetic', skinId: 'bolsonaro-drip', path: s.path, sha256: s.sha256, skeletonFamilySha256: s.skeletonFamilySha256, geometrySha256: s.geometrySha256, weightsSha256: s.weightsSha256 }), 'origem/fingerprints não correspondem à fonte aprovada');
  expect(variant.mesh?.path === MESH && variant.mesh.sha256 === sha(meshBytes) && variant.mesh.bindFingerprintSha256 === s.skeletonFamilySha256, 'registro de mesh divergente');
  for (const key of ['geometryFingerprintSha256', 'weightsFingerprintSha256']) expect(/^[a-f0-9]{64}$/.test(variant.mesh[key]), `mesh.${key} inválido`);
  keys(variant.selection, ['path', 'fileSha256', 'recordSha256', 'schema', 'meshPartsSchema'], 'variant.selection');
  expect(variant.selection.path === SELECTION && fs.existsSync(path.join(ROOT, SELECTION)), 'seleção explícita esperada ausente');
  const selectionBytes = read(SELECTION), document = parseJSON(selectionBytes.toString('utf8'));
  keys(document, ['schema', 'entries'], 'cosmetic-selections');
  expect(document.schema === 'cs-glove-cosmetic-selections/1' && document.entries?.length === 1, 'registry cosmético incorreto');
  const record = document.entries[0];
  keys(record, ['id', 'characterId', 'skinId', 'source', 'review', 'selection'], 'registro cosmético');
  expect(record.id === 'bolsonaro-drip' && record.characterId === 'capitao' && record.skinId === 'bolsonaro-drip', 'identidade da seleção incorreta');
  expect(equal(record.source, { path: s.path, sha256: s.sha256, skeletonFamilySha256: s.skeletonFamilySha256 }), 'fonte da seleção incorreta');
  expect(equal(record.review, { recordSha256: fixture.review.recordSha256, scope: 'candidate' }), 'proveniência R573 incorreta');
  const selection = record.selection;
  keys(selection, ['schema', 'meshPartsSchema', 'sourceSha256', 'entries'], 'seleção explícita');
  expect(selection.schema === 'cs-glove-explicit-mesh-parts/1' && selection.meshPartsSchema === 'cs-mesh-part-selection/1' && selection.sourceSha256 === s.sha256 && selection.entries?.length === 1, 'schema/origem da seleção incorreto');
  const part = selection.entries[0];
  keys(part, ['node', 'mesh', 'primitive', 'indexAccessor', 'left', 'right'], 'entrada mesh-parts');
  expect(part.node === 24 && part.mesh === 0 && part.primitive === 0 && part.indexAccessor === 6, 'mesh-parts não aponta à primitive0 original');
  for (const side of SIDES) {
    keys(part[side], ['partName', 'sourceFaceIDs', 'sourceFaceIDsSha256'], side);
    expect(part[side].partName === `glove-${side}` && equal(part[side].sourceFaceIDs, fixture.faces[side]) && part[side].sourceFaceIDsSha256 === fixture.review[`${side}FaceIDsSha256`], `${side}: seleção não é o conjunto literal R573`);
  }
  expect(equal(variant.selection, { path: SELECTION, fileSha256: sha(selectionBytes), recordSha256: digest(selection), schema: selection.schema, meshPartsSchema: selection.meshPartsSchema }), 'hash/layout da seleção publicado incorreto');
  const expectedCoverage = [{ skinId: 'bolsonaro-drip', characterId: 'capitao', sourcePath: s.path, sourceSha256: s.sha256, skeletonFamilySha256: s.skeletonFamilySha256 }];
  expect(equal(candidate.manifest.coverage?.cosmetics, expectedCoverage), 'cobertura cosmética não é separada/exata');
  const catalog = parseJSON(read('public/models/skins/manifest.json').toString('utf8')).skins?.['bolsonaro-drip'];
  expect(catalog?.approved === true && catalog.character === 'capitao' && catalog.model === `/${s.path.slice(7)}` && catalog.sha256 === s.sha256, 'catálogo não aprova a origem exata');
  return { sourceFaceCount: 840, wristFaces: 57, family: s.skeletonFamilySha256 };
}
function geometry(fixture, source, output, variant) {
  const d = output.document;
  expect(d.meshes?.length === 1 && d.meshes[0].primitives?.length === 2, 'derivado deve ter duas partes');
  const sourceToOutput = new Map(), outputToSource = new Map();
  const semantics = Object.keys(source.primitive.attributes).sort();
  for (const side of SIDES) {
    const parts = d.meshes[0].primitives.filter(p => p.extras?.handOwnership === side);
    expect(parts.length === 1, `${side}: parte ausente/duplicada`);
    const primitive = parts[0], faces = fixture.faces[side], actual = indices(output, primitive);
    expect((primitive.mode ?? 4) === 4 && primitive.targets === undefined && actual.length === 1260, `${side}: domínio de triângulos alterado`);
    expect(equal(Object.keys(primitive.attributes).sort(), semantics), `${side}: semantic set perdido/adicionado`);
    for (const semantic of semantics) {
      const before = accessor(source, source.primitive.attributes[semantic]), after = accessor(output, primitive.attributes[semantic]);
      expect(before.a.type === after.a.type && before.a.componentType === after.a.componentType && (before.a.normalized === true) === (after.a.normalized === true) && after.a.count === source.vertices.size, `${side}/${semantic}: formato/count alterado`);
      for (let i = 0; i < actual.length; i++) {
        const sourceVertex = source.sourceIndices[faces[Math.floor(i / 3)] * 3 + i % 3], outputVertex = actual[i];
        expect(natural(outputVertex) && outputVertex < after.a.count, `${side}: índice de saída inválido`);
        expect(!sourceToOutput.has(sourceVertex) || sourceToOutput.get(sourceVertex) === outputVertex, 'sourceVertex duplicado após reindexação');
        expect(!outputToSource.has(outputVertex) || outputToSource.get(outputVertex) === sourceVertex, 'vértices/seams distintos foram soldados');
        sourceToOutput.set(sourceVertex, outputVertex); outputToSource.set(outputVertex, sourceVertex);
        expect(before.raw(sourceVertex).equals(after.raw(outputVertex)), `${side}/${semantic}: row crua diverge em face ${faces[Math.floor(i / 3)]}`);
      }
    }
  }
  expect(sourceToOutput.size === source.vertices.size && outputToSource.size === source.vertices.size, 'bijeção de vértices incompleta');
  expect(equal(d.meshes[0].primitives[0].attributes, d.meshes[0].primitives[1].attributes), 'partes não compartilham os mesmos atributos');
  const metrics = variant.metrics?.after;
  expect(metrics?.triangles === 840 && metrics.leftTriangles === 420 && metrics.rightTriangles === 420 && metrics.vertices === source.vertices.size && metrics.joints === 26, 'métricas não descrevem a geometria real');
  return { faces: 840, left: 420, right: 420, sourceVertices: source.vertices.size, mappedVertices: sourceToOutput.size, semantics, reindexingAllowed: true };
}
function bind(source, output) {
  const before = source.document, after = output.document, skin = before.skins[0], outSkin = after.skins?.[0];
  expect(after.skins?.length === 1 && equal(outSkin?.joints, skin.joints) && outSkin.skeleton === skin.skeleton, 'paleta/ordem de 26 joints alterada');
  const parents = nodes => {
    const result = Array(nodes.length).fill(-1);
    nodes.forEach((node, parent) => (node.children ?? []).forEach(child => {
      infra(natural(child) && child < nodes.length && result[child] === -1, 'hierarquia GLB inválida'); result[child] = parent;
    })); return result;
  };
  const parentA = parents(before.nodes), parentB = parents(after.nodes), required = new Set([...skin.joints, 24]);
  if (skin.skeleton !== undefined) required.add(skin.skeleton);
  for (const node of [...required]) {
    const seen = new Set();
    for (let p = parentA[node]; p >= 0; p = parentA[p]) { infra(!seen.has(p), 'ciclo na fonte'); seen.add(p); required.add(p); }
  }
  for (const id of required) {
    const a = before.nodes[id], b = after.nodes[id];
    expect(b && parentA[id] === parentB[id], `parent de bind alterado: ${id}`);
    for (const key of ['name', 'matrix', 'translation', 'rotation', 'scale']) expect(equal(a[key], b[key]), `${id}.${key} alterado`);
  }
  expect(after.nodes[24]?.mesh === 0 && after.nodes[24]?.skin === 0, 'nó da luva não usa skin/mesh0');
  const a = accessor(source, skin.inverseBindMatrices), b = accessor(output, outSkin.inverseBindMatrices);
  expect(a.a.count === 26 && b.a.count === 26 && a.a.type === b.a.type && a.a.componentType === b.a.componentType, 'IBM layout alterado');
  for (let i = 0; i < 26; i++) expect(a.raw(i).equals(b.raw(i)), `IBM crua alterada: ${i}`);
  expect(equal(before.scene ?? 0, after.scene ?? 0), 'scene ativa alterada');
  expect(equal(before.scenes.map(s => ({ name: s.name, nodes: s.nodes })), after.scenes?.map(s => ({ name: s.name, nodes: s.nodes }))), 'raízes/scenes alteradas');
  expect(!after.animations?.length, 'derivado embute animação nova');
  return { joints: 26, ancestors: required.size, inverseBindMatrices: 26, livePoseOwner: 'character-rig' };
}
function artifactsDigest(artifacts) {
  infra(artifacts instanceof Map, 'factory não retornou Map de artifacts');
  return [...artifacts].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, bytes]) => [file, bytes.length, sha(bytes)]);
}
async function main() {
  if (process.argv.length !== 2) { console.error('uso: node tools/eval/tp-drip-source-check.mjs'); return 2; }
  const { parseMeshPartsJSON: parseJSON } = await import('../character-kit/mesh-parts.mjs');
  const { buildRepositoryArtifacts } = await import('../character-kit/gloves/repository.mjs');
  const raw = read(FIXTURE); infra(sha(raw) === FIXTURE_SHA, 'fixture R573/baseline alterada');
  const fixture = parseJSON(raw.toString('utf8')), sourceBytes = read(fixture.source.path);
  infra(fixture.schema === 'tp-drip-source-oracle/1', 'schema da fixture inválido');
  const source = sourceOracle(fixture, sourceBytes, parseJSON);
  const shippingBytes = read('public/data/gloves-manifest.json');
  const shipping = parseJSON(shippingBytes.toString('utf8'));
  const plain = buildRepositoryArtifacts(ROOT), candidate = buildRepositoryArtifacts(ROOT, { includeCosmetics: true });
  const matches = (candidate.manifest.packages ?? []).flatMap(pack => (pack.sourceVariants ?? []).filter(variant => variant.id === 'bolsonaro-drip').map(variant => ({ pack, variant })));
  const meshBytes = candidate.artifacts.get(MESH);
  clause('F0', 'variante Drip opt-in e GLB derivado existem no resultado real da factory', () => {
    expect(matches.length === 1 && Buffer.isBuffer(meshBytes), `esperado 1 Drip+GLB; variantes=${matches.length}, mesh=${Buffer.isBuffer(meshBytes)}`);
    expect(candidate.artifacts.get('public/data/gloves-manifest.json')?.equals(Buffer.from(`${JSON.stringify(candidate.manifest, null, 2)}\n`)), 'manifest do candidato não corresponde ao artifact serializado');
    return { variants: 1, mesh: MESH, bytes: meshBytes.length };
  });
  const ready = rows.at(-1).status === 'PASS';
  if (ready) {
    clause('F1', 'origem, seleção explícita e cobertura correspondem à revisão R573', () => registration(fixture, candidate, matches[0], meshBytes, parseJSON));
    if (rows.at(-1).status === 'PASS') {
      const output = glb(meshBytes, parseJSON);
      clause('F2', '840 faces, atributos crus e bijeção sourceVertex preservados', () => geometry(fixture, source, output, matches[0].variant));
      clause('F3', '26 joints, ancestrais/TRS e IBMs originais preservados', () => bind(source, output));
    } else { skipped('F2', 'geometria da seleção'); skipped('F3', 'bind da seleção'); }
  } else { skipped('F1', 'registro explícito'); skipped('F2', 'geometria da seleção'); skipped('F3', 'bind da seleção'); }
  clause('F4', 'default, 56 bases+FP, seleção automática e cobertura base intactos', () => {
    expect(equal(artifactsDigest(plain.artifacts), fixture.baseline.artifacts), 'default factory difere dos 58 artifacts congelados');
    expect(plain.artifacts.get('public/data/gloves-manifest.json')?.equals(Buffer.from(`${JSON.stringify(plain.manifest, null, 2)}\n`)), 'manifest default não corresponde ao artifact serializado');
    for (const [file, size, hash] of fixture.baseline.artifacts) {
      const actual = read(file); expect(actual.length === size && sha(actual) === hash, `shipping alterado: ${file}`);
      expect(candidate.artifacts.get(file)?.equals(plain.artifacts.get(file)) || file === 'public/data/gloves-manifest.json', `candidato altera pacote base/FP: ${file}`);
    }
    const extra = [...candidate.artifacts.keys()].filter(file => !plain.artifacts.has(file));
    expect(equal(extra, ready ? [MESH] : []), 'assets extras/ausentes no opt-in');
    const packageIds = candidate.manifest.packages.map(pack => pack.id);
    expect(packageIds.length === shipping.packages.length + (ready ? 1 : 0) && new Set(packageIds).size === packageIds.length, 'pacotes extras/duplicados no opt-in');
    expect(shipping.coverage.thirdPersonSupportedCharacterIds.length === 56 && shipping.coverage.thirdPersonBlockedCharacterIds.length === 18 && shipping.coverage.candidateCharacterIds.length === 74, 'partição base alterada');
    expect(shipping.coverage.cosmetics === undefined && plain.manifest.coverage.cosmetics === undefined, 'default ganhou cobertura cosmética');
    for (const pack of shipping.packages) expect(equal(candidate.manifest.packages.find(p => p.id === pack.id), pack), `pacote base/FP mudou: ${pack.id}`);
    for (const [key, value] of Object.entries(shipping.coverage)) expect(equal(candidate.manifest.coverage[key], value), `coverage base mudou: ${key}`);
    expect(sha(read('tools/character-kit/gloves/selections.json')) === fixture.baseline.selectionsSha256, 'seleção automática alterada');
    return { defaultGlbs: 57, base3p: 56, fp: 1, baseCandidates: 74, baseBlocked: 18 };
  });
  clause('F5', 'fonte do corpo continua byte-idêntica após a factory', () => {
    expect(read(fixture.source.path).equals(sourceBytes), 'factory alterou o corpo aprovado');
    return { bytes: sourceBytes.length, sha256: sha(sourceBytes) };
  });
  console.log(JSON.stringify({ schema: 'tp-drip-source-result/1', scope: 'factory-memory/source-bytes; no Game, render, fit or art approval', rows }));
  return rows.some(row => row.status === 'RED') ? 1 : rows.some(row => row.status === 'NOT_MEASURED') ? 3 : 0;
}
try { process.exitCode = await main(); }
catch (error) { console.error(JSON.stringify({ schema: 'tp-drip-source-result/1', status: 'INFRA', error: String(error.stack || error), rows })); process.exitCode = 3; }
