#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const requestedFile = process.argv.slice(2).find((value) => !value.startsWith('--'));
const file = path.resolve(requestedFile || '/Users/ruben/csbrasil-private-assets/generated/viewmodels/pistol/pistol-runtime.glb');
const reportFile = path.resolve(option('runtime-report') || path.join(root, 'artifacts/viewmodels/golden-pistol/runtime-final/runtime-report.json'));
const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);
const gltf = document.getRoot();
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const hasMutant = (name) => process.argv.includes(`--mutante-${name}`);

const requiredClips = ['idle', 'reload_tactical', 'reload_empty', 'shoot'];
const clips = new Map(gltf.listAnimations().map((animation) => [animation.getName(), animation]));
const skins = new Map(gltf.listSkins().map((skin) => [skin.getName(), skin]));
const weaponSkin = skins.get('RIG_WEAPON_PISTOL');
const armsSkin = skins.get('RIG_FP_ARMS');
const weaponNodes = gltf.listNodes().filter((node) => node.getSkin() === weaponSkin && node.getMesh());

function translationExcursion(animationName, nodeName) {
  const animation = clips.get(animationName);
  const channel = animation?.listChannels().find((candidate) =>
    candidate.getTargetNode()?.getName() === nodeName && candidate.getTargetPath() === 'translation');
  const values = channel?.getSampler()?.getOutput()?.getArray();
  if (!values?.length) return 0;
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      low[axis] = Math.min(low[axis], values[index + axis]);
      high[axis] = Math.max(high[axis], values[index + axis]);
    }
  }
  return Math.hypot(...high.map((value, axis) => value - low[axis]));
}

function verticesOwnedBy(skin, jointName) {
  const jointIndex = skin?.listJoints().findIndex((joint) => joint.getName() === jointName) ?? -1;
  if (jointIndex < 0) return 0;
  let owned = 0;
  for (const node of gltf.listNodes().filter((candidate) => candidate.getSkin() === skin && candidate.getMesh())) {
    for (const primitive of node.getMesh().listPrimitives()) {
      const joints = primitive.getAttribute('JOINTS_0')?.getArray();
      const weights = primitive.getAttribute('WEIGHTS_0')?.getArray();
      if (!joints || !weights) continue;
      for (let vertex = 0; vertex < joints.length; vertex += 4) {
        let weight = 0;
        for (let lane = 0; lane < 4; lane += 1) {
          if (joints[vertex + lane] === jointIndex) weight += weights[vertex + lane];
        }
        if (weight > 0.5) owned += 1;
      }
    }
  }
  return owned;
}

for (const clip of requiredClips) check(clips.has(clip), `clip obrigatório ausente: ${clip}`);
check(armsSkin?.listJoints().length === 67, `rig de braços tem ${armsSkin?.listJoints().length ?? 0} ossos; esperado 67`);
check(weaponSkin?.listJoints().length === 8, `rig da pistola tem ${weaponSkin?.listJoints().length ?? 0} ossos; esperado 8`);
check(weaponSkin?.listJoints().some((joint) => joint.getName() === 'Mag'), 'osso Mag ausente');
check(weaponNodes.length === 1, `esperado um mesh skinned da pistola, recebido ${weaponNodes.length}`);

/* Orientação do cano (01/09: a X18 nascia com o cano VERTICAL porque o socket sob
   ik_hand_gun ia com rotação identidade; a "lâmina preta" contra o céu era isso).
   A medida vem do MESMO instrumento que a diagnosticou — vm-glb-inventory.mjs com o
   skinning avaliado no idle@0 — para que régua e diagnóstico não discordem. */
const socketNode = gltf.listNodes().find((node) => node.getName() === 'SOCKET_WEAPON_PISTOL');
const socketRotation = hasMutant('cano-vertical') ? [0, 0, 0, 1] : socketNode?.getRotation();
check(socketNode && socketRotation
  && Math.abs(socketRotation[0] - Math.SQRT1_2) < 1e-3 && Math.abs(socketRotation[3] - Math.SQRT1_2) < 1e-3
  && Math.abs(socketRotation[1]) < 1e-3 && Math.abs(socketRotation[2]) < 1e-3,
  `SOCKET_WEAPON_PISTOL precisa da rotação de filho-de-bone [√½,0,0,√½]; recebido ${JSON.stringify(socketRotation?.map((v) => Number(v.toFixed(4))))}`);
const inventoryPath = path.join(os.tmpdir(), `pistol-inventory-${process.pid}.json`);
const inventoryRun = spawnSync(process.execPath, [
  path.join(root, 'tools/eval/vm-glb-inventory.mjs'), file, '--pose=idle:0', `--saida=${inventoryPath}`,
], { encoding: 'utf8' });
check(inventoryRun.status === 0, `inventário estrutural falhou: ${(inventoryRun.stderr || '').slice(-300)}`);
let orientation = null;
if (inventoryRun.status === 0) {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  fs.rmSync(inventoryPath, { force: true });
  const primitives = inventory.poses[0].primitives;
  const slide = primitives.find((primitive) => primitive.material === 'CoroSolto_finish_dark');
  const barrel = primitives.find((primitive) => primitive.material === 'CoroSolto_finish_barrel');
  const size = slide?.aabbWorld.size.slice();
  if (size && hasMutant('cano-vertical')) [size[1], size[2]] = [size[2], size[1]];
  orientation = size && barrel ? {
    slideSize: size,
    barrelAheadOfSlideM: Number((barrel.centerWorld[2] - slide.centerWorld[2]).toFixed(4)),
  } : null;
  check(orientation && size[2] > 0.15 && size[2] > 3 * size[1] && size[2] > 3 * size[0],
    `slide não é longo em +Z (cano vertical?): tamanho ${JSON.stringify(size)}`);
  check(orientation && orientation.barrelAheadOfSlideM > 0.02,
    `boca do cano não está à frente do slide (${orientation?.barrelAheadOfSlideM ?? 'ausente'} m)`);
}

const measuredMagExcursion = translationExcursion('reload_tactical', 'Mag');
const magExcursion = hasMutant('pente-estatico') ? 0 : measuredMagExcursion;
const measuredBarrelExcursion = translationExcursion('reload_tactical', 'Barrel');
const measuredMagVertices = verticesOwnedBy(weaponSkin, 'Mag');
const magVertices = hasMutant('sem-peso-pente') ? 0 : measuredMagVertices;
check(magExcursion >= 18 && magExcursion <= 24,
  `excursão do pente saiu da trajetória calibrada (${magExcursion.toFixed(3)} unidades; esperado 18–24)`);
check(measuredBarrelExcursion <= 0.01, `corpo da arma acompanha indevidamente o pente (${measuredBarrelExcursion.toFixed(4)} unidades)`);
check(magVertices >= 1000, `pente não possui geometria visível própria (${magVertices} vértices; mínimo 1000)`);

const materials = new Map(gltf.listMaterials().map((material) => [material.getName(), material]));
const polymer = materials.get('CoroSolto_polymer');
const polymerColor = hasMutant('material-lavado') ? [0.5, 0.5, 0.5, 1] : polymer?.getBaseColorFactor();
check(polymerColor?.slice(0, 3).every((channel) => channel < 0.02),
  `polímero perdeu o acabamento escuro (${polymerColor?.slice(0, 3).map((value) => value.toFixed(4)).join(', ') || 'ausente'})`);
for (const [materialName, mapName] of [
  ['CoroSolto_FP_Cloth', 'T_Cloth01_B'],
  ['CoroSolto_FP_Glove', 'T_Glove01_B'],
  ['CoroSolto_FP_Hand', 'T_Arm01_B'],
]) {
  check(materials.get(materialName)?.getBaseColorTexture()?.getName() === mapName,
    `${materialName} não referencia ${mapName}`);
}

const sharedRoot = path.join(path.dirname(path.dirname(file)), 'shared');
const textureSizes = {};
for (const part of ['Arm', 'Cloth', 'Glove']) {
  for (const [kind, expected] of Object.entries({ B: 1024, N: 2048, ORM: 1024 })) {
    const name = `T_${part}01_${kind}`;
    const metadata = await sharp(path.join(sharedRoot, `${name}.webp`)).metadata();
    const actual = hasMutant('textura-1px') && name === 'T_Cloth01_N'
      ? { width: 1, height: 1 }
      : metadata;
    textureSizes[name] = [metadata.width, metadata.height];
    check(actual.width === expected && actual.height === expected,
      `${name} mede ${actual.width}x${actual.height}; esperado ${expected}x${expected}`);
  }
}

const vmconfig = fs.readFileSync(path.join(root, 'public/js/data/vmconfig.js'), 'utf8');
const authoredVm = fs.readFileSync(path.join(root, 'public/js/authoredvm.js'), 'utf8');
const runtimeRoute = !hasMutant('sem-runtime')
  && /pistol:\s*W\('pistol',\s*\{\s*baked:\s*true,\s*runtime:\s*'family',\s*timing:\s*'gameplay'\s*\}\)/.test(vmconfig)
  && /VM_WEAPON\[weapon\]\?\.runtime === 'family'/.test(authoredVm);
check(runtimeRoute, 'runtime não aponta pistol#pistol para o GLB canônico da família');

const frameMatch = /pistol:\s*\{\s*x:\s*([\d.-]+),\s*y:\s*([\d.-]+),\s*z:\s*([\d.-]+),\s*fov:\s*([\d.-]+),\s*rotDeg:\s*\[([^\]]+)\],\s*drawDrop:\s*([\d.-]+)/.exec(authoredVm);
const frame = frameMatch ? {
  x: Number(frameMatch[1]), y: Number(frameMatch[2]), z: Number(frameMatch[3]),
  fov: hasMutant('fov-pacote') ? 84 : Number(frameMatch[4]),
  rotDeg: hasMutant('quadro-antigo') ? [0, 20, -5] : frameMatch[5].split(',').map(Number),
  drawDrop: Number(frameMatch[6]),
} : null;
// Yaw 15° aprovado pelo Ruben em 05/09, mantendo os demais parâmetros.
// Evidência e limite P4 widescreen: VIEWMODEL-ASTRA-PISTOL-HANDOFF.md.
const FRAME_BASE = { x: 0.1, y: -0.1, z: -0.22, fov: 55, rotDeg: '0,15,-5', drawDrop: 0.34 };
check(frame && Math.abs(frame.x - FRAME_BASE.x) < 1e-6 && Math.abs(frame.y - FRAME_BASE.y) < 1e-6 && Math.abs(frame.z - FRAME_BASE.z) < 1e-6,
  `posição-base da pistola divergiu (${frame ? [frame.x, frame.y, frame.z].join(', ') : 'ausente'})`);
check(frame?.fov === FRAME_BASE.fov, `VFOV-base da pistola precisa ser ${FRAME_BASE.fov}°, recebido ${frame?.fov ?? 'ausente'}°`);
check(frame?.drawDrop === FRAME_BASE.drawDrop, `saque da pistola precisa iniciar ${FRAME_BASE.drawDrop} m abaixo, recebido ${frame?.drawDrop ?? 'ausente'}`);
check(frame?.rotDeg.join(',') === FRAME_BASE.rotDeg, `orientação-base divergiu (${frame?.rotDeg.join(', ') || 'ausente'})`);

let runtime = null;
try { runtime = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch { /* reportado abaixo */ }
check(runtime, `relatório do runtime ausente: ${reportFile}`);
const fileBytes = fs.readFileSync(file);
const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');
if (runtime) {
  const renderedFrame = hasMutant('runtime-quadro-antigo')
    ? { ...runtime.frame, rotDeg: [0, 20, -5] } : runtime.frame;
  check(renderedFrame && ['x', 'y', 'z', 'fov', 'drawDrop'].every((key) => renderedFrame[key] === FRAME_BASE[key])
    && renderedFrame.rotDeg?.join(',') === FRAME_BASE.rotDeg,
  'frame efetivo do browser diverge do enquadramento aprovado; recapture sem overrides');
  const actualAspect = runtime.viewport.width / runtime.viewport.height;
  const expectedFov = 2 * Math.atan(Math.tan(FRAME_BASE.fov * Math.PI / 360) * (16 / 9) / actualAspect) * 180 / Math.PI;
  const reloadFrames = runtime.states.filter((state) => state.label.startsWith('reload-'));
  const drawFrames = runtime.states.filter((state) => state.label.startsWith('draw-'));
  const fireFrames = runtime.states.filter((state) => state.label.startsWith('fire-'));
  const testedReloadSync = hasMutant('timing-cs16') ? 1.1 : Math.max(0, ...reloadFrames.map((state) => state.reloadSyncError || 0));
  check(runtime.source === 'pistol#pistol', `browser carregou ${runtime.source}; esperado pistol#pistol`);
  check(runtime.servedGlb?.sha256 === sha256, 'SHA do GLB servido diverge do arquivo validado');
  check(runtime.errors?.length === 0, `runtime registrou erros: ${runtime.errors?.join('; ')}`);
  check(Math.abs((runtime.camera?.fov ?? 0) - expectedFov) < 0.05,
    `câmera 3:2 mede ${runtime.camera?.fov ?? 'ausente'}°; esperado ${expectedFov.toFixed(3)}°`);
  check(drawFrames.length === 5 && drawFrames.every((state) => state.state === 'draw'), 'saque não foi amostrado em cinco frames intermediários');
  check(fireFrames.length === 5 && fireFrames.every((state) => state.clip === 'shoot'), 'disparo não reproduziu o clip shoot em cinco frames');
  check(reloadFrames.length === 9 && reloadFrames.every((state) => state.clip === 'reload_tactical'), 'recarga não reproduziu o clip tático completo');
  check(testedReloadSync <= 0.03, `cadência do clip diverge do gameplay por ${testedReloadSync.toFixed(4)}s`);
  check(runtime.states.some((state) => state.label === 'pos-recarga' && state.state === 'idle'), 'recarga não fecha em idle');
  check(fs.existsSync(path.join(path.dirname(reportFile), 'contact-sheet.png')), 'contact sheet do mesmo runtime está ausente');
}

const result = {
  file,
  sha256,
  runtimeReport: reportFile,
  clips: [...clips.keys()],
  rigs: { arms: armsSkin?.listJoints().length || 0, weapon: weaponSkin?.listJoints().length || 0 },
  orientation,
  magazine: {
    excursion: Number(measuredMagExcursion.toFixed(3)),
    barrelExcursion: Number(measuredBarrelExcursion.toFixed(4)),
    ownedVertices: measuredMagVertices,
  },
  frame,
  textureSizes,
  runtimeRoute,
  ok: failures.length === 0,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
