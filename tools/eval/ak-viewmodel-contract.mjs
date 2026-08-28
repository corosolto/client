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
const cameraNode = mutant ? null : (gltf.nodes || []).find((node) => node.name === 'AK_Hires_FP_Camera');
const camera = cameraNode && Number.isInteger(cameraNode.camera) ? gltf.cameras?.[cameraNode.camera] : null;
const fov = camera?.perspective?.yfov;
const actions = new Set((gltf.animations || []).map((animation) => animation.name?.split('-').at(-1)));

check(cameraNode, 'câmera AK_Hires_FP_Camera não foi exportada');
check(camera?.type === 'perspective', 'câmera FP precisa ser perspective');
check(Number.isFinite(fov) && Math.abs(fov * 180 / Math.PI - 58) < 0.05,
  `VFOV exportado precisa ser 58°, recebido ${Number.isFinite(fov) ? (fov * 180 / Math.PI).toFixed(3) : 'ausente'}`);
for (const action of ['Idle', 'Shoot', 'Reload']) check(actions.has(action), `ação ausente: ${action}`);
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
for (const nodeName of strongHandFingerNodes) {
  check(nodeNames.has(nodeName), `osso ausente na mão forte: ${nodeName}`);
}

const quaternionAngle = (left, right) => {
  if (!left?.length || !right?.length) return Infinity;
  const dot = left.reduce((sum, value, lane) => sum + value * right[lane], 0);
  return 2 * Math.acos(Math.min(1, Math.abs(dot)));
};
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

const exportedTriggerContact = Number(rigNode?.extras?.strong_hand_trigger_contact_m);
const triggerContact = mutantFingerGap ? Infinity : exportedTriggerContact;
check(!isAkm || (Number.isFinite(triggerContact) && triggerContact <= 0.0045),
  `ponta do indicador não encosta no gatilho da AKM (vão ${Number.isFinite(triggerContact) ? (triggerContact * 1000).toFixed(2) : 'não medido'} mm)`);

const frontOccluder = mutantFrontHole ? null : (gltf.nodes || []).find((node) =>
  node.name === 'coro_solto_project_akm_front_occluder'
  && node.extras?.occlusion_role === 'seal-front-sky-leak');
check(!isAkm || frontOccluder,
  'AKM não possui vedação interna identificada para impedir céu visível pela frente');

const authoredVmSource = fs.readFileSync(path.join(root, 'public/js/authoredvm.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const akmAdsBlock = authoredVmSource.match(
  /'akm-hires'\s*:\s*Object\.freeze\(\{([\s\S]*?)\}\),/,
)?.[1] || '';
const akmAdsYaw = Number(akmAdsBlock.match(
  /rotation:\s*new THREE\.Euler\(\s*[^,]+,\s*([^,]+)/,
)?.[1]);
const exportedAkmAdsX = Number(akmAdsBlock.match(
  /position:\s*new THREE\.Vector3\(\s*([^,]+)/,
)?.[1]);
const akmAdsX = mutantAdsCropped ? -0.30 : exportedAkmAdsX;
const hasAkmAds = !mutantAds
  && /SELF_CONTAINED_ADS\s*=\s*Object\.freeze\([\s\S]*?'akm-hires'\s*:/.test(authoredVmSource)
  && Number.isFinite(akmAdsYaw)
  && akmAdsYaw <= -0.50
  && Number.isFinite(akmAdsX)
  && akmAdsX >= -1.20
  && akmAdsX <= -0.80
  && /setAim\s*\(id,\s*amount\)/.test(authoredVmSource)
  && /authored\?\.setAim\(p\.weapon,\s*a\)/.test(gameSource);
check(!isAkm || hasAkmAds,
  `AKM autorada não possui pose ADS frontal e enquadrada durante o botão direito (yaw ${Number.isFinite(akmAdsYaw) ? akmAdsYaw.toFixed(3) : 'ausente'} rad, x ${Number.isFinite(akmAdsX) ? akmAdsX.toFixed(3) : 'ausente'})`);

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
  actions: [...actions],
  skins: (gltf.skins || []).length,
  magazineScaleError: Number.isFinite(magazineScaleError) ? Number(magazineScaleError.toFixed(6)) : null,
  strongHandFingerBones: strongHandFingerNodes.filter((nodeName) => nodeNames.has(nodeName)).length,
  triggerTravelDeg: Number(triggerTravelDeg.toFixed(3)),
  triggerReturnDeg: Number.isFinite(triggerReturnDeg) ? Number(triggerReturnDeg.toFixed(3)) : null,
  triggerContactMm: Number.isFinite(triggerContact) ? Number((triggerContact * 1000).toFixed(3)) : null,
  frontOccluder: frontOccluder?.name || null,
  authoredAds: hasAkmAds,
  authoredAdsYawRad: Number.isFinite(akmAdsYaw) ? Number(akmAdsYaw.toFixed(3)) : null,
  authoredAdsX: Number.isFinite(akmAdsX) ? Number(akmAdsX.toFixed(3)) : null,
  ok: failures.length === 0,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
