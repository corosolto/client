#!/usr/bin/env node
/** Assemble normalized paid reload clips into a self-contained family GLB.
 *
 * Assimp preserves the pack's ASCII FBX keyframes, but exposes FBX helper nodes
 * that must never reach runtime.  The authored transform values themselves match
 * Blender's skeleton exactly.  We resample them at 60 Hz, fold the FBX root into
 * the three top-level arm bones, and write tracks directly onto the base GLB.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../node_modules/@gltf-transform/extensions/dist/index.js';
import {
  AnimationMixer,
  LoopOnce,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const DEFAULT_MANIFEST = path.join(REPO_ROOT, 'tools/viewmodels/paid-pack-manifest.json');
const DEFAULT_EXTRACTED = '/Users/ruben/csbrasil-private-assets/generated/extracted';
const ASSIMP = '/opt/homebrew/bin/assimp';
const FPS = 60;

function parseArgs(argv) {
  const args = { manifest: DEFAULT_MANIFEST, extracted: DEFAULT_EXTRACTED };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`unexpected argument: ${key}`);
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  if (!args.family) throw new Error('--family is required');
  return args;
}

function assertPrivateOutput(output) {
  const relative = path.relative(REPO_ROOT, output);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
    throw new Error(`refusing to write licensed GLB inside public repository: ${output}`);
  }
}

async function findClip(folder, kind) {
  const entries = await fs.readdir(folder);
  const tests = kind === 'reload_tactical'
    ? [/reload[_-]?tac/i]
    : [/reload[_-]?empty/i, /empty[_-]?reload/i];
  const match = entries.find((name) => /\.fbx$/i.test(name) && tests.some((test) => test.test(name)));
  if (!match) throw new Error(`missing ${kind} FBX in ${folder}`);
  return path.join(folder, match);
}

function convertFbx(source, output) {
  const result = spawnSync(ASSIMP, ['export', source, output, '-fglb2'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Assimp failed for ${source}:\n${result.stdout}\n${result.stderr}`);
  }
}

async function loadAnimation(source) {
  const bytes = await fs.readFile(source);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
  });
  if (gltf.animations.length !== 1) {
    throw new Error(`expected one animation in ${source}, found ${gltf.animations.length}`);
  }
  return gltf;
}

function prepareAnimation(gltf) {
  const mixer = new AnimationMixer(gltf.scene);
  const clip = gltf.animations[0];
  const action = mixer.clipAction(clip);
  action.setLoop(LoopOnce, 0);
  action.clampWhenFinished = true;
  action.play();
  return { mixer, clip };
}

function pushQuaternion(values, quaternion, previous) {
  if (previous && previous.dot(quaternion) < 0) {
    quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
  }
  values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  return quaternion.clone();
}

function nodeMatrix(node) {
  return new Matrix4().compose(
    new Vector3().fromArray(node.getTranslation()),
    new Quaternion().fromArray(node.getRotation()),
    new Vector3().fromArray(node.getScale()),
  );
}

function sampleTargets(gltf, targetNames, { foldRoot = false, targetNodes = null } = {}) {
  const { mixer, clip } = prepareAnimation(gltf);
  const frameCount = Math.round(clip.duration * FPS);
  const times = new Float32Array(frameCount + 1);
  const sourceRoot = foldRoot ? gltf.scene.getObjectByName('root') : null;
  const topLevel = new Set(['ik_foot_root', 'ik_hand_root', 'pelvis']);
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const tracks = new Map();

  for (const name of targetNames) {
    const source = gltf.scene.getObjectByName(name);
    if (!source) continue;
    source.updateMatrix();
    const target = targetNodes?.get(name);
    const conversion = target
      ? nodeMatrix(target).multiply(source.matrix.clone().invert())
      : null;
    tracks.set(name, { translation: [], rotation: [], scale: [], previous: null, source, conversion });
  }
  if (foldRoot && !sourceRoot) throw new Error('character clip has no FBX root node');

  for (let frame = 0; frame <= frameCount; frame += 1) {
    const time = Math.min(frame / FPS, clip.duration);
    times[frame] = time;
    mixer.setTime(time);
    if (sourceRoot) sourceRoot.updateMatrix();

    for (const [name, track] of tracks) {
      track.source.updateMatrix();
      if (foldRoot && topLevel.has(name)) {
        matrix.multiplyMatrices(sourceRoot.matrix, track.source.matrix);
        matrix.decompose(position, quaternion, scale);
      } else if (track.conversion) {
        matrix.multiplyMatrices(track.conversion, track.source.matrix);
        matrix.decompose(position, quaternion, scale);
      } else {
        position.copy(track.source.position);
        quaternion.copy(track.source.quaternion);
        scale.copy(track.source.scale);
      }
      track.translation.push(position.x, position.y, position.z);
      track.previous = pushQuaternion(track.rotation, quaternion, track.previous);
      track.scale.push(scale.x, scale.y, scale.z);
    }
  }
  mixer.stopAllAction();
  return { duration: clip.duration, times, tracks };
}

function addTrack(document, animation, buffer, targetNode, pathName, times, values) {
  const itemSize = pathName === 'rotation' ? 4 : 3;
  const input = document.createAccessor(`${animation.getName()}_${targetNode.getName()}_time`, buffer)
    .setType('SCALAR')
    .setArray(times);
  const output = document.createAccessor(`${animation.getName()}_${targetNode.getName()}_${pathName}`, buffer)
    .setType(itemSize === 4 ? 'VEC4' : 'VEC3')
    .setArray(new Float32Array(values));
  const sampler = document.createAnimationSampler()
    .setInput(input)
    .setOutput(output)
    .setInterpolation('LINEAR');
  const channel = document.createAnimationChannel()
    .setTargetNode(targetNode)
    .setTargetPath(pathName)
    .setSampler(sampler);
  animation.addSampler(sampler).addChannel(channel);
}

function mergeSamples(document, clipName, samples, targetsByName) {
  const root = document.getRoot();
  root.listAnimations().filter((animation) => animation.getName() === clipName).forEach((animation) => animation.dispose());
  const animation = document.createAnimation(clipName);
  const buffer = root.listBuffers()[0] || document.createBuffer('viewmodel-animation');

  for (const sample of samples) {
    for (const [name, track] of sample.tracks) {
      const target = targetsByName.get(name);
      if (!target) continue;
      addTrack(document, animation, buffer, target, 'translation', sample.times, track.translation);
      addTrack(document, animation, buffer, target, 'rotation', sample.times, track.rotation);
      addTrack(document, animation, buffer, target, 'scale', sample.times, track.scale);
    }
  }
  return animation;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await fs.readFile(path.resolve(args.manifest), 'utf8'));
  const family = manifest.families[args.family];
  if (!family || family.externalWeapon) throw new Error(`family ${args.family} is not directly buildable`);

  const familyRoot = path.join(path.resolve(args.extracted), manifest.source.assetRoot, family.source);
  const privateRoot = path.resolve(manifest.output.privateRoot, args.family);
  const basePath = path.resolve(args.input || path.join(privateRoot, `${args.family}.glb`));
  const outputPath = path.resolve(args.output || path.join(privateRoot, `${args.family}-runtime.glb`));
  const rawRoot = path.join(privateRoot, 'raw-clips');
  assertPrivateOutput(outputPath);
  await fs.mkdir(rawRoot, { recursive: true });

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.read(basePath);
  const root = document.getRoot();
  const targetsByName = new Map(root.listNodes().map((node) => [node.getName(), node]));
  const armsSkin = root.listSkins().find((skin) => skin.getName() === 'RIG_FP_ARMS');
  const weaponSkin = root.listSkins().find((skin) => skin.getName() === `RIG_WEAPON_${args.family.toUpperCase()}`);
  if (!armsSkin || !weaponSkin) throw new Error('base GLB is missing the authored arm or weapon skin');
  const armsTargets = armsSkin.listJoints().map((node) => node.getName());
  const weaponTargets = weaponSkin.listJoints().map((node) => node.getName());
  const report = { schemaVersion: 1, family: args.family, input: basePath, output: outputPath, fps: FPS, clips: [] };

  for (const clipName of ['reload_tactical', 'reload_empty']) {
    const characterFbx = await findClip(path.join(familyRoot, 'Character'), clipName);
    const weaponFbx = await findClip(path.join(familyRoot, 'Weapon'), clipName);
    const characterGlb = path.join(rawRoot, `${clipName}-arms.glb`);
    const weaponGlb = path.join(rawRoot, `${clipName}-weapon.glb`);
    convertFbx(characterFbx, characterGlb);
    convertFbx(weaponFbx, weaponGlb);
    const [character, weapon] = await Promise.all([loadAnimation(characterGlb), loadAnimation(weaponGlb)]);
    const armsSample = sampleTargets(character, armsTargets, { foldRoot: true });
    const weaponSample = sampleTargets(weapon, weaponTargets, { targetNodes: targetsByName });
    const animation = mergeSamples(document, clipName, [armsSample, weaponSample], targetsByName);
    report.clips.push({
      name: clipName,
      duration: Math.max(armsSample.duration, weaponSample.duration),
      channels: animation.listChannels().length,
      arms: armsSample.tracks.size,
      weapon: weaponSample.tracks.size,
    });
  }

  await io.write(outputPath, document);
  report.bytes = (await fs.stat(outputPath)).size;
  await fs.writeFile(path.join(privateRoot, 'assembly-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`CORO_PAID_VIEWMODEL_ASSEMBLY=${JSON.stringify(report)}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
