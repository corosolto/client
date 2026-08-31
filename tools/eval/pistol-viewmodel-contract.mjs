#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requestedFile = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const file = requestedFile
  ? path.resolve(process.cwd(), requestedFile)
  : path.join(root, 'public/models/viewmodels/coro/pistol-hires.glb');
const bytes = fs.readFileSync(file);

if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('viewmodel da pistola não é GLB válido');
const jsonLength = bytes.readUInt32LE(12);
if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB sem chunk JSON');
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).trim());

const chunks = new Map();
let chunkOffset = 12;
while (chunkOffset + 8 <= bytes.length) {
  const length = bytes.readUInt32LE(chunkOffset);
  const type = bytes.readUInt32LE(chunkOffset + 4);
  chunks.set(type, bytes.subarray(chunkOffset + 8, chunkOffset + 8 + length));
  chunkOffset += 8 + length;
}
const bin = chunks.get(0x004e4942);
const elementWidths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(index) {
  const accessor = gltf.accessors?.[index];
  const view = accessor && gltf.bufferViews?.[accessor.bufferView];
  const width = accessor && elementWidths[accessor.type];
  if (!bin || !accessor || !view || accessor.componentType !== 5126 || !width) return [];
  const stride = view.byteStride || 4 * width;
  const base = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return Array.from({ length: accessor.count }, (_, element) =>
    Array.from({ length: width }, (_, lane) =>
      bin.readFloatLE(base + element * stride + lane * 4)));
}

function animation(name) {
  return (gltf.animations || []).find((candidate) => candidate.name?.split('-').at(-1) === name);
}

function animationTrack(animationName, nodeName, targetPath) {
  const nodeIndex = (gltf.nodes || []).findIndex((node) => node.name === nodeName);
  const action = animation(animationName);
  const channel = action?.channels?.find((candidate) =>
    candidate.target.node === nodeIndex && candidate.target.path === targetPath);
  const sampler = channel && action.samplers?.[channel.sampler];
  return sampler ? readAccessor(sampler.output) : [];
}

const vectorDistance = (left, right) =>
  left?.length && right?.length
    ? Math.hypot(...left.map((value, lane) => value - right[lane]))
    : Infinity;
const quaternionAngle = (left, right) => {
  if (!left?.length || !right?.length) return Infinity;
  const dot = left.reduce((sum, value, lane) => sum + value * right[lane], 0);
  return 2 * Math.acos(Math.min(1, Math.abs(dot)));
};

function actionEndpoint(animationName, atEnd) {
  const action = animation(animationName);
  const endpoint = new Map();
  for (const channel of action?.channels || []) {
    const sampler = action.samplers?.[channel.sampler];
    const values = sampler ? readAccessor(sampler.output) : [];
    const nodeName = gltf.nodes?.[channel.target.node]?.name;
    if (!nodeName || !values.length) continue;
    endpoint.set(`${nodeName}:${channel.target.path}`, atEnd ? values.at(-1) : values[0]);
  }
  return endpoint;
}

function endpointError(actionName, atEnd = true, excludedNodes = new Set()) {
  const action = actionEndpoint(actionName, atEnd);
  const idle = actionEndpoint('Idle', false);
  const worst = {
    rotationDeg: 0, rotationTrack: null,
    translation: 0, translationTrack: null,
    scale: 0, scaleTrack: null,
  };
  for (const [key, actionValue] of action) {
    const separator = key.lastIndexOf(':');
    const nodeName = key.slice(0, separator);
    const targetPath = key.slice(separator + 1);
    const idleValue = idle.get(key);
    if (!idleValue || excludedNodes.has(nodeName)) continue;
    let error = 0;
    let bucket = null;
    if (targetPath === 'rotation') {
      error = quaternionAngle(actionValue, idleValue) * 180 / Math.PI;
      bucket = 'rotationDeg';
    } else if (targetPath === 'translation') {
      error = vectorDistance(actionValue, idleValue);
      bucket = 'translation';
    } else if (targetPath === 'scale') {
      error = Math.max(...actionValue.map((value, lane) => Math.abs(value - idleValue[lane])));
      bucket = 'scale';
    }
    if (bucket && error > worst[bucket]) {
      worst[bucket] = error;
      worst[`${bucket.replace(/Deg$/, '')}Track`] = key;
    }
  }
  return worst;
}

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const mutantStaticDraw = process.argv.includes('--mutante-saque-estatico');
const mutantBrokenDrawContact = process.argv.includes('--mutante-contato-saque');
const mutantStaticShoot = process.argv.includes('--mutante-tiro-estatico');
const mutantMagazineMissing = process.argv.includes('--mutante-sem-pente');
const mutantReloadOpen = process.argv.includes('--mutante-final-recarga-aberto');
const mutantRuntimeMissing = process.argv.includes('--mutante-sem-runtime');

const cameraNode = (gltf.nodes || []).find((node) => node.name === 'Pistol_Hires_FP_Camera');
const camera = cameraNode && Number.isInteger(cameraNode.camera) ? gltf.cameras?.[cameraNode.camera] : null;
const fov = camera?.perspective?.yfov;
const actions = new Set((gltf.animations || []).map((candidate) => candidate.name?.split('-').at(-1)));
const nodeNames = new Set((gltf.nodes || []).map((node) => node.name));
if (mutantMagazineMissing) {
  nodeNames.delete('coro_solto_project_pistol_magazine');
  nodeNames.delete('coro_solto_project_pistol_fresh_magazine');
}

check(cameraNode, 'câmera Pistol_Hires_FP_Camera não foi exportada');
check(camera?.type === 'perspective', 'câmera FP precisa ser perspective');
check(Number.isFinite(fov) && Math.abs(fov * 180 / Math.PI - 58) < 0.05,
  `VFOV exportado precisa repetir os 58° aprovados na AK, recebido ${Number.isFinite(fov) ? (fov * 180 / Math.PI).toFixed(3) : 'ausente'}°`);
check(Math.abs((camera?.perspective?.aspectRatio || 0) - 1.5) < 1e-4,
  `aspecto da câmera precisa ser 3:2, recebido ${camera?.perspective?.aspectRatio ?? 'ausente'}`);
for (const name of ['Equip', 'Idle', 'Shoot', 'Reload']) check(actions.has(name), `ação ausente: ${name}`);
check(actions.size === 4, `esperadas exatamente 4 ações, recebidas ${actions.size}: ${[...actions].join(', ')}`);
check((gltf.skins || []).length === 1, `esperado 1 rig/skin, recebido ${(gltf.skins || []).length}`);
for (const name of [
  'CoroMagazine', 'CoroFreshMagazine',
  'coro_solto_project_pistol_magazine', 'coro_solto_project_pistol_fresh_magazine',
]) check(nodeNames.has(name), `carregador independente ausente: ${name}`);

const equipRoot = animationTrack('Equip', '_rootJoint', 'translation');
const equipWeapon = animationTrack('Equip', 'CoroWeapon', 'translation');
const equipMagazine = animationTrack('Equip', 'CoroMagazine', 'translation');
const equipTravel = mutantStaticDraw || equipRoot.length < 2
  ? 0
  : Math.max(...equipRoot.map((value) => vectorDistance(value, equipRoot.at(-1))));
const rigidTrackError = (reference, candidate) => {
  if (reference.length < 2 || reference.length !== candidate.length) return Infinity;
  const referenceEnd = reference.at(-1);
  const candidateEnd = candidate.at(-1);
  return Math.max(...reference.map((value, index) => vectorDistance(
    value.map((lane, axis) => lane - referenceEnd[axis]),
    candidate[index].map((lane, axis) => lane - candidateEnd[axis]),
  )));
};
const drawRigidError = mutantBrokenDrawContact
  ? 1
  : Math.max(rigidTrackError(equipRoot, equipWeapon), rigidTrackError(equipRoot, equipMagazine));
check(equipRoot.length >= 3, 'Equip não possui amostras intermediárias suficientes');
check(equipTravel >= 8,
  `Equip não executa saque legível até Idle (curso da raiz ${equipTravel.toFixed(3)} unidades; mínimo 8)`);
check(drawRigidError <= 0.05,
  `Equip separa mão, arma ou pente (erro rígido ${Number.isFinite(drawRigidError) ? drawRigidError.toFixed(4) : 'ausente'} unidades)`);

const shootRoot = animationTrack('Shoot', '_rootJoint', 'translation');
const shootTravel = mutantStaticShoot || shootRoot.length < 2
  ? 0
  : Math.max(...shootRoot.map((value) => vectorDistance(value, shootRoot[0])));
check(shootRoot.length >= 5, 'Shoot não possui amostras intermediárias suficientes');
check(shootTravel >= 2.5,
  `Shoot não tem recoil autorado legível (curso da raiz ${shootTravel.toFixed(3)} unidades; mínimo 2,5)`);

const triggerTrack = animationTrack('Shoot', 'R_point2_032', 'rotation');
const triggerTravel = triggerTrack.length
  ? Math.max(...triggerTrack.map((value) => quaternionAngle(triggerTrack[0], value))) * 180 / Math.PI
  : 0;
const triggerReturn = triggerTrack.length > 1
  ? quaternionAngle(triggerTrack[0], triggerTrack.at(-1)) * 180 / Math.PI
  : Infinity;
check(triggerTravel >= 10, `indicador não aperta o gatilho (curso ${triggerTravel.toFixed(3)}°)`);
check(triggerReturn <= 1, `indicador não retorna após Shoot (erro ${triggerReturn.toFixed(3)}°)`);

const oldMagazine = animationTrack('Reload', 'CoroMagazine', 'translation');
const freshMagazine = animationTrack('Reload', 'CoroFreshMagazine', 'translation');
const trackTravel = (track) => track.length
  ? Math.max(...track.map((value) => vectorDistance(value, track[0])))
  : 0;
const oldMagazineTravel = trackTravel(oldMagazine);
const freshMagazineTravel = trackTravel(freshMagazine);
check(oldMagazineTravel >= 10,
  `carregador usado não percorre extração legível (${oldMagazineTravel.toFixed(3)} unidades)`);
check(freshMagazineTravel >= 10,
  `carregador novo não percorre inserção legível (${freshMagazineTravel.toFixed(3)} unidades)`);

const shootStart = endpointError('Shoot', false);
const shootEnd = endpointError('Shoot');
const equipEnd = endpointError('Equip');
const reloadEnd = endpointError('Reload', true, new Set(['CoroMagazine', 'CoroFreshMagazine']));
if (mutantReloadOpen) reloadEnd.rotationDeg = 12;
for (const [label, endpoint] of [
  ['início de Shoot', shootStart],
  ['fim de Shoot', shootEnd],
  ['fim de Equip', equipEnd],
  ['fim de Reload', reloadEnd],
]) {
  check(endpoint.rotationDeg <= 1,
    `${label} não fecha em Idle (rotação ${endpoint.rotationDeg.toFixed(3)}°, ${endpoint.rotationTrack})`);
  check(endpoint.translation <= 0.05,
    `${label} não fecha em Idle (translação ${endpoint.translation.toFixed(4)}, ${endpoint.translationTrack})`);
  check(endpoint.scale <= 0.01,
    `${label} não fecha em Idle (escala ${endpoint.scale.toFixed(5)}, ${endpoint.scaleTrack})`);
}

const materials = new Map((gltf.materials || []).map((material) => [material.name, material]));
const weaponMaterial = materials.get('pistol Material');
check(Number.isInteger(weaponMaterial?.pbrMetallicRoughness?.baseColorTexture?.index),
  'pistola sem base color exportado');
check(Number.isInteger(weaponMaterial?.normalTexture?.index), 'pistola sem normal map exportado');
check(Number.isInteger(weaponMaterial?.pbrMetallicRoughness?.metallicRoughnessTexture?.index),
  'pistola sem ORM exportado');
check((gltf.images || []).every((image) => Number.isInteger(image.bufferView)),
  'GLB da pistola depende de textura externa');

const vmconfigSource = fs.readFileSync(path.join(root, 'public/js/data/vmconfig.js'), 'utf8');
const authoredVmSource = fs.readFileSync(path.join(root, 'public/js/authoredvm.js'), 'utf8');
const goldenRuntime = !mutantRuntimeMissing
  && /pistol:\s*\{\s*ready:\s*true/.test(vmconfigSource)
  && /pistol:\s*W\('pistol',\s*\{\s*baked:\s*true,\s*golden:\s*true/.test(vmconfigSource)
  && /return `gold#\$\{weapon\}`/.test(authoredVmSource);
check(goldenRuntime, 'pistola golden não está ligada ao carregador/câmera do GLB no runtime');

const result = {
  file: path.relative(root, file),
  camera: cameraNode?.name || null,
  vfovDeg: Number.isFinite(fov) ? Number((fov * 180 / Math.PI).toFixed(3)) : null,
  aspect: camera?.perspective?.aspectRatio || null,
  actions: [...actions],
  skins: (gltf.skins || []).length,
  equipTravel: Number(equipTravel.toFixed(3)),
  drawRigidError: Number.isFinite(drawRigidError) ? Number(drawRigidError.toFixed(5)) : null,
  shootTravel: Number(shootTravel.toFixed(3)),
  triggerTravelDeg: Number(triggerTravel.toFixed(3)),
  triggerReturnDeg: Number.isFinite(triggerReturn) ? Number(triggerReturn.toFixed(3)) : null,
  magazineTravel: {
    spent: Number(oldMagazineTravel.toFixed(3)),
    fresh: Number(freshMagazineTravel.toFixed(3)),
  },
  endpointContinuity: { shootStart, shootEnd, equipEnd, reloadEnd },
  goldenRuntime,
  ok: failures.length === 0,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
