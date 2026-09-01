#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
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
  rotDeg: frameMatch[5].split(',').map(Number),
  drawDrop: Number(frameMatch[6]),
} : null;
check(frame && Math.abs(frame.x - 0.15) < 1e-6 && Math.abs(frame.y + 0.015) < 1e-6 && Math.abs(frame.z + 0.2) < 1e-6,
  `posição-base da pistola divergiu (${frame ? [frame.x, frame.y, frame.z].join(', ') : 'ausente'})`);
check(frame?.fov === 60, `VFOV-base da pistola precisa ser 60°, recebido ${frame?.fov ?? 'ausente'}°`);
check(frame?.drawDrop === 0.34, `saque da pistola precisa iniciar 0,34 m abaixo, recebido ${frame?.drawDrop ?? 'ausente'}`);
check(frame?.rotDeg.join(',') === '-9,12,-2', `orientação-base divergiu (${frame?.rotDeg.join(', ') || 'ausente'})`);

let runtime = null;
try { runtime = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch { /* reportado abaixo */ }
check(runtime, `relatório do runtime ausente: ${reportFile}`);
const fileBytes = fs.readFileSync(file);
const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');
if (runtime) {
  const actualAspect = runtime.viewport.width / runtime.viewport.height;
  const expectedFov = 2 * Math.atan(Math.tan(60 * Math.PI / 360) * (16 / 9) / actualAspect) * 180 / Math.PI;
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
