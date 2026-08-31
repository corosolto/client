#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requestedFile = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const file = requestedFile
  ? path.resolve(process.cwd(), requestedFile)
  : path.join(root, 'public/models/viewmodels/coro/ak-hires.glb');
const bytes = fs.readFileSync(file);

if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('AK viewmodel não é GLB válido');
const jsonLength = bytes.readUInt32LE(12);
const jsonType = bytes.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error('GLB sem chunk JSON');
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

const componentReaders = {
  5126: { size: 4, read: (buffer, offset) => buffer.readFloatLE(offset) },
};
const elementWidths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function readAccessor(index) {
  const accessor = gltf.accessors?.[index];
  const view = accessor && gltf.bufferViews?.[accessor.bufferView];
  const component = accessor && componentReaders[accessor.componentType];
  const width = accessor && elementWidths[accessor.type];
  if (!bin || !accessor || !view || !component || !width) return [];
  const stride = view.byteStride || component.size * width;
  const base = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return Array.from({ length: accessor.count }, (_, element) =>
    Array.from({ length: width }, (_, lane) =>
      component.read(bin, base + element * stride + lane * component.size)));
}

function animationTrack(animationName, nodeName, targetPath) {
  const nodeIndex = (gltf.nodes || []).findIndex((node) => node.name === nodeName);
  const animation = (gltf.animations || []).find((candidate) =>
    candidate.name?.split('-').at(-1) === animationName);
  const channel = animation?.channels?.find((candidate) =>
    candidate.target.node === nodeIndex && candidate.target.path === targetPath);
  const sampler = channel && animation.samplers?.[channel.sampler];
  return sampler ? readAccessor(sampler.output) : [];
}

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const mutant = process.argv.includes('--mutante-sem-camera');
const mutantMagazineShrink = process.argv.includes('--mutante-pente-encolhe');
const mutantStaticTrigger = process.argv.includes('--mutante-gatilho-estatico');
const mutantFingerGap = process.argv.includes('--mutante-dedo-sem-contato');
const mutantFrontHole = process.argv.includes('--mutante-sem-oclusor-frontal');
const mutantAds = process.argv.includes('--mutante-sem-ads-autorado');
const mutantAdsCropped = process.argv.includes('--mutante-ads-cortado');
const mutantMagazineMissing = process.argv.includes('--mutante-pente-ausente');
const mutantArmNormalMissing = process.argv.includes('--mutante-braco-sem-normal');
const mutantShootOpen = process.argv.includes('--mutante-final-shoot-aberto');
const mutantReloadOpen = process.argv.includes('--mutante-final-reload-aberto');
const mutantEquipOpen = process.argv.includes('--mutante-final-equip-aberto');
const mutantStaticBolt = process.argv.includes('--mutante-ferrolho-estatico');
const cameraNode = mutant ? null : (gltf.nodes || []).find((node) => node.name === 'AK_Hires_FP_Camera');
const camera = cameraNode && Number.isInteger(cameraNode.camera) ? gltf.cameras?.[cameraNode.camera] : null;
const fov = camera?.perspective?.yfov;
const actions = new Set((gltf.animations || []).map((animation) => animation.name?.split('-').at(-1)));

check(cameraNode, 'câmera AK_Hires_FP_Camera não foi exportada');
check(camera?.type === 'perspective', 'câmera FP precisa ser perspective');
check(Number.isFinite(fov) && Math.abs(fov * 180 / Math.PI - 58) < 0.05,
  `VFOV exportado precisa ser 58°, recebido ${Number.isFinite(fov) ? (fov * 180 / Math.PI).toFixed(3) : 'ausente'}`);
check(Math.abs((camera?.perspective?.aspectRatio || 0) - 1.5) < 1e-4,
  `aspecto da câmera precisa ser 3:2, recebido ${camera?.perspective?.aspectRatio ?? 'ausente'}`);
for (const action of ['Equip', 'Idle', 'Shoot', 'Reload']) check(actions.has(action), `ação ausente: ${action}`);
check(actions.size === 4, `esperadas exatamente 4 ações, recebidas ${actions.size}: ${[...actions].join(', ')}`);
check((gltf.skins || []).length === 1, `esperado 1 rig/skin, recebido ${(gltf.skins || []).length}`);

const strongHandFingerNodes = [
  'f_index.01.R_metarig', 'f_index.02.R_metarig', 'f_index.03.R_metarig',
  'f_middle.01.R_metarig', 'f_middle.02.R_metarig', 'f_middle.03.R_metarig',
  'f_ring.01.R_metarig', 'f_ring.02.R_metarig', 'f_ring.03.R_metarig',
  'f_pinky.01.R_metarig', 'f_pinky.02.R_metarig', 'f_pinky.03.R_metarig',
  'thumb.01.R_metarig', 'thumb.02.R_metarig', 'thumb.03.R_metarig',
];
const nodeNames = new Set((gltf.nodes || []).map((node) => node.name));
const rigNode = (gltf.nodes || []).find((node) => node.name === 'coro_solto_hires_fp_rig');
const isAkm = rigNode?.extras?.weapon_family === 'akm' || path.basename(file) === 'akm-hires.glb';
if (mutantMagazineMissing) nodeNames.delete('coro_solto_project_ak_replacement_magazine');
for (const nodeName of strongHandFingerNodes) {
  check(nodeNames.has(nodeName), `osso ausente na mão forte: ${nodeName}`);
}
for (const nodeName of [
  'Mag_metarig', 'Mag.001_metarig',
  'coro_solto_project_ak_magazine', 'coro_solto_project_ak_replacement_magazine',
]) check(nodeNames.has(nodeName), `pente independente ausente: ${nodeName}`);

const rigScale = rigNode?.scale || [1, 1, 1];
const rigScaleSpread = Math.max(...rigScale) - Math.min(...rigScale);
check(rigScaleSpread < 1e-5 && rigScale[0] > 2.39 && rigScale[0] < 2.40,
  `escala raiz canônica precisa ser uniforme e fixa em ~2,393; recebido ${rigScale.join(',')}`);

const materials = new Map((gltf.materials || []).map((material) => [material.name, material]));
const gloveMaterial = materials.get('CoroSolto_FP_Gloves');
const sleeveMaterial = materials.get('CoroSolto_Mandrake_Sleeves');
const weaponMaterial = materials.get('assault_ak Material');
const hasNormal = (material) => Number.isInteger(material?.normalTexture?.index);
check(!mutantArmNormalMissing && hasNormal(gloveMaterial), 'luva golden sem normal map exportado');
check(!mutantArmNormalMissing && hasNormal(sleeveMaterial), 'manga golden sem normal map exportado');
check(Number.isInteger(weaponMaterial?.pbrMetallicRoughness?.baseColorTexture?.index),
  'AK golden sem base color exportado');
check(hasNormal(weaponMaterial), 'AK golden sem normal map exportado');
check(Number.isInteger(weaponMaterial?.pbrMetallicRoughness?.metallicRoughnessTexture?.index),
  'AK golden sem ORM exportado');
const serializedGltf = JSON.stringify(gltf);
check(!/v_hands_gloves|watch_0|CoroSolto_FP_Watch/i.test(serializedGltf),
  'mapa de luva com marca ou relógio do doador entrou no GLB');
check((gltf.images || []).every((image) => Number.isInteger(image.bufferView)),
  'GLB golden depende de textura externa');

const quaternionAngle = (left, right) => {
  if (!left?.length || !right?.length) return Infinity;
  const dot = left.reduce((sum, value, lane) => sum + value * right[lane], 0);
  return 2 * Math.acos(Math.min(1, Math.abs(dot)));
};
function actionEndpoint(animationName, atEnd) {
  const animation = (gltf.animations || []).find((candidate) =>
    candidate.name?.split('-').at(-1) === animationName);
  const endpoint = new Map();
  for (const channel of animation?.channels || []) {
    const sampler = animation.samplers?.[channel.sampler];
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
    translationM: 0, translationTrack: null,
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
      error = Math.hypot(...actionValue.map((value, lane) => value - idleValue[lane]));
      bucket = 'translationM';
    } else if (targetPath === 'scale') {
      error = Math.max(...actionValue.map((value, lane) => Math.abs(value - idleValue[lane])));
      bucket = 'scale';
    }
    if (bucket && error > worst[bucket]) {
      worst[bucket] = error;
      worst[`${bucket.replace(/(?:Deg|M)$/, '')}Track`] = key;
    }
  }
  return worst;
}

const shootStart = endpointError('Shoot', false);
const shootEndpoint = endpointError('Shoot');
const reloadEndpoint = endpointError('Reload', true, new Set(['Mag_metarig', 'Mag.001_metarig']));
const equipEndpoint = endpointError('Equip');
if (mutantShootOpen) shootEndpoint.rotationDeg = 12;
if (mutantReloadOpen) reloadEndpoint.rotationDeg = 12;
if (mutantEquipOpen) equipEndpoint.rotationDeg = 12;
for (const [label, endpoint] of [
  ['início de Shoot', shootStart],
  ['fim de Shoot', shootEndpoint],
  ['fim de Reload', reloadEndpoint],
  ['fim de Equip', equipEndpoint],
]) {
  check(endpoint.rotationDeg <= 1,
    `${label} não fecha na pose Idle (rotação ${endpoint.rotationDeg.toFixed(3)}°, pior track ${endpoint.rotationTrack})`);
  check(endpoint.translationM <= 0.005,
    `${label} não fecha na pose Idle (translação ${(endpoint.translationM * 1000).toFixed(3)} mm, pior track ${endpoint.translationTrack})`);
  check(endpoint.scale <= 0.01,
    `${label} não fecha na pose Idle (escala ${endpoint.scale.toFixed(5)}, pior track ${endpoint.scaleTrack})`);
}
const exportedTriggerTrack = animationTrack('Shoot', 'f_index.01.R_metarig', 'rotation');
const triggerTrack = mutantStaticTrigger && exportedTriggerTrack.length
  ? exportedTriggerTrack.map(() => exportedTriggerTrack[0])
  : exportedTriggerTrack;
const triggerTravelRadians = triggerTrack.length
  ? Math.max(...triggerTrack.map((quaternion) => quaternionAngle(triggerTrack[0], quaternion)))
  : 0;
const triggerReturnRadians = triggerTrack.length > 1
  ? quaternionAngle(triggerTrack[0], triggerTrack.at(-1))
  : Infinity;
const triggerTravelDeg = triggerTravelRadians * 180 / Math.PI;
const triggerReturnDeg = triggerReturnRadians * 180 / Math.PI;
check(triggerTrack.length >= 3, 'Shoot não possui amostras suficientes no indicador da mão forte');
check(triggerTravelDeg >= 4,
  `indicador não aperta o gatilho durante Shoot (curso angular ${triggerTravelDeg.toFixed(3)}°)`);
check(triggerReturnDeg <= 1,
  `indicador não retorna após Shoot (erro angular ${Number.isFinite(triggerReturnDeg) ? triggerReturnDeg.toFixed(3) : 'ausente'}°)`);

const exportedBoltTrack = animationTrack('Reload', 'Bolt_metarig', 'translation');
const boltTrack = mutantStaticBolt && exportedBoltTrack.length
  ? exportedBoltTrack.map(() => exportedBoltTrack[0])
  : exportedBoltTrack;
const vectorDistance = (left, right) => Math.hypot(...left.map((value, lane) => value - right[lane]));
const boltAt = (fraction) => boltTrack[Math.round((boltTrack.length - 1) * fraction)];
const boltTravelM = boltTrack.length > 2 ? vectorDistance(boltAt(0.60), boltAt(0.68)) : 0;
const boltReturnM = boltTrack.length > 2 ? vectorDistance(boltAt(0.60), boltAt(0.76)) : Infinity;
check(boltTravelM >= 0.03,
  `ferrolho não completa puxada durante Reload (curso ${(boltTravelM * 1000).toFixed(2)} mm)`);
check(boltReturnM <= 0.002,
  `ferrolho não retorna após Reload (erro ${(boltReturnM * 1000).toFixed(2)} mm)`);

const exportedTriggerContact = Number(rigNode?.extras?.strong_hand_trigger_contact_m);
const triggerContact = mutantFingerGap ? Infinity : exportedTriggerContact;
check(Number.isFinite(triggerContact) && triggerContact <= 0.0045,
  `ponta do indicador não encosta no gatilho (vão ${Number.isFinite(triggerContact) ? (triggerContact * 1000).toFixed(2) : 'não medido'} mm)`);

const frontOccluder = mutantFrontHole ? null : (gltf.nodes || []).find((node) =>
  node.name === 'coro_solto_project_akm_front_occluder'
  && node.extras?.occlusion_role === 'seal-front-sky-leak');
check(!isAkm || frontOccluder,
  'AKM não possui vedação interna identificada para impedir céu visível pela frente');

// Contrato de ADS pós-BUG-75: a pose por arma vive em data/vmconfig.js (auto +
// trim residual, M6); aqui a régua cobra o encanamento — config presente, setAim
// consumindo o amount e o game.js alimentando o blend a cada frame.
const authoredVmSource = fs.readFileSync(path.join(root, 'public/js/authoredvm.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const vmconfigSource = fs.readFileSync(path.join(root, 'public/js/data/vmconfig.js'), 'utf8');
const hasAkmAds = !mutantAds
  && !mutantAdsCropped
  && /akm:\s*W\('ak'\)/.test(vmconfigSource)
  && /ads:\s*\{\s*auto:\s*true/.test(vmconfigSource)
  && /setAim\(id[^)]*amount/.test(authoredVmSource)
  && /this\.adsAmount/.test(authoredVmSource)
  && /authored\?\.setAim\(p\.weapon,\s*a\)/.test(gameSource);
check(!isAkm || hasAkmAds,
  'AKM autorada não possui encanamento de ADS (vmconfig.ads + setAim(id, amount) + blend do game.js)');
const hasGoldenRuntime = /ak:\s*\{\s*ready:\s*true/.test(vmconfigSource)
  && /ak:\s*W\('ak',\s*\{\s*baked:\s*true,\s*golden:\s*true/.test(vmconfigSource)
  && /return `gold#\$\{weapon\}`/.test(authoredVmSource)
  && /cameraAspect\s*=\s*authoredCamera\.aspect/.test(authoredVmSource);
check(isAkm || hasGoldenRuntime,
  'AK golden não está ligada como ready ao GLB/câmera embutida no runtime');

const idleMagazineScale = animationTrack('Idle', 'Mag_metarig', 'scale')[0];
const shootMagazineScale = animationTrack('Shoot', 'Mag_metarig', 'scale')
  .map((scale) => mutantMagazineShrink ? scale.map((value) => value * 0.45) : scale);
const magazineScaleError = idleMagazineScale && shootMagazineScale.length
  ? Math.max(...shootMagazineScale.flatMap((scale) => scale.map((value, lane) =>
    Math.abs(value - idleMagazineScale[lane]))))
  : Infinity;
check(magazineScaleError < 1e-4,
  `pente instalado muda de escala durante Shoot (erro máximo ${Number.isFinite(magazineScaleError) ? magazineScaleError.toFixed(6) : 'ausente'})`);

const result = {
  file: path.relative(root, file),
  camera: cameraNode?.name || null,
  vfovDeg: Number.isFinite(fov) ? Number((fov * 180 / Math.PI).toFixed(3)) : null,
  aspect: camera?.perspective?.aspectRatio || null,
  actions: [...actions],
  skins: (gltf.skins || []).length,
  rigScale: rigScale.map((value) => Number(value.toFixed(6))),
  magazines: ['Mag_metarig', 'Mag.001_metarig', 'coro_solto_project_ak_magazine',
    'coro_solto_project_ak_replacement_magazine'].filter((name) => nodeNames.has(name)),
  materials: {
    gloveNormal: hasNormal(gloveMaterial),
    sleeveNormal: hasNormal(sleeveMaterial),
    weaponBase: Number.isInteger(weaponMaterial?.pbrMetallicRoughness?.baseColorTexture?.index),
    weaponNormal: hasNormal(weaponMaterial),
    weaponOrm: Number.isInteger(weaponMaterial?.pbrMetallicRoughness?.metallicRoughnessTexture?.index),
    embeddedImages: (gltf.images || []).filter((image) => Number.isInteger(image.bufferView)).length,
  },
  magazineScaleError: Number.isFinite(magazineScaleError) ? Number(magazineScaleError.toFixed(6)) : null,
  strongHandFingerBones: strongHandFingerNodes.filter((nodeName) => nodeNames.has(nodeName)).length,
  triggerTravelDeg: Number(triggerTravelDeg.toFixed(3)),
  triggerReturnDeg: Number.isFinite(triggerReturnDeg) ? Number(triggerReturnDeg.toFixed(3)) : null,
  triggerContactMm: Number.isFinite(triggerContact) ? Number((triggerContact * 1000).toFixed(3)) : null,
  boltTravelMm: Number((boltTravelM * 1000).toFixed(3)),
  boltReturnMm: Number.isFinite(boltReturnM) ? Number((boltReturnM * 1000).toFixed(3)) : null,
  endpointContinuity: {
    shootStart,
    shoot: shootEndpoint,
    reloadNonMagazine: reloadEndpoint,
    equip: equipEndpoint,
  },
  frontOccluder: frontOccluder?.name || null,
  authoredAds: hasAkmAds,
  goldenRuntime: hasGoldenRuntime,
  ok: failures.length === 0,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
