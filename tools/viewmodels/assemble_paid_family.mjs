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
const CLIP_PATTERNS = [
  ['reload_tactical', [/reload[_-]?tac/i, /tac[_-]?reload/i]],
  ['reload_empty', [/reload[_-]?empty/i, /empty[_-]?reload/i]],
  ['reload_start', [/reload[_-]?start/i]],
  ['reload_loop', [/reload[_-]?loop/i]],
  ['reload_end', [/reload[_-]?end/i]],
  ['pump_empty', [/pump[_-]?empty/i]],
  ['pump', [/pump(?![_-]?empty)/i]],
  ['shoot', [/fir(?:e|ing)/i]],
  ['inspect', [/inspect/i]],
];

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

async function findClip(folder, tests) {
  const entries = await fs.readdir(folder);
  const match = entries.find((name) => /\.fbx$/i.test(name) && tests.some((test) => test.test(name)));
  return match ? path.join(folder, match) : null;
}

function convertFbx(source, output) {
  const result = spawnSync(ASSIMP, ['export', source, output, '-fglb2'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Assimp failed for ${source}:\n${result.stdout}\n${result.stderr}`);
  }
}

async function stripRenderables(source) {
  const glb = await fs.readFile(source);
  if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2) {
    throw new Error(`Assimp did not create a GLB 2.0 file: ${source}`);
  }
  const chunks = [];
  for (let offset = 12; offset < glb.length;) {
    const length = glb.readUInt32LE(offset);
    const type = glb.readUInt32LE(offset + 4);
    chunks.push({ type, data: glb.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const jsonChunk = chunks.find((chunk) => chunk.type === 0x4e4f534a);
  if (!jsonChunk) throw new Error(`GLB has no JSON chunk: ${source}`);
  const json = JSON.parse(jsonChunk.data.toString('utf8').replace(/\0+$/g, ''));
  for (const node of json.nodes || []) {
    delete node.mesh;
    delete node.skin;
  }
  for (const key of ['meshes', 'skins', 'materials', 'textures', 'images', 'samplers']) delete json[key];
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const paddedJson = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20);
  jsonBytes.copy(paddedJson);
  jsonChunk.data = paddedJson;
  const total = 12 + chunks.reduce((sum, chunk) => sum + 8 + chunk.data.length, 0);
  const output = Buffer.alloc(total);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(total, 8);
  let offset = 12;
  for (const chunk of chunks) {
    output.writeUInt32LE(chunk.data.length, offset);
    output.writeUInt32LE(chunk.type, offset + 4);
    chunk.data.copy(output, offset + 8);
    offset += 8 + chunk.data.length;
  }
  await fs.writeFile(source, output);
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
  const topLevel = new Set(['ik_foot_root', 'ik_hand_root', 'pelvis']);
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const tracks = new Map();
  let axisConversion = null;

  if (foldRoot) {
    const sourceAnchor = gltf.scene.getObjectByName('ik_hand_root');
    const targetAnchor = targetNodes?.get('ik_hand_root');
    if (!sourceAnchor || !targetAnchor) throw new Error('cannot derive the authored arms axis conversion');
    sourceAnchor.updateMatrix();
    axisConversion = nodeMatrix(targetAnchor).multiply(sourceAnchor.matrix.clone().invert());
  }

  for (const name of targetNames) {
    const source = gltf.scene.getObjectByName(name);
    if (!source) continue;
    source.updateMatrix();
    const target = foldRoot ? null : targetNodes?.get(name);
    const conversion = target
      ? nodeMatrix(target).multiply(source.matrix.clone().invert())
      : null;
    tracks.set(name, { translation: [], rotation: [], scale: [], previous: null, source, conversion });
  }
  for (let frame = 0; frame <= frameCount; frame += 1) {
    const time = Math.min(frame / FPS, clip.duration);
    times[frame] = time;
    mixer.setTime(time);
    for (const [name, track] of tracks) {
      track.source.updateMatrix();
      if (foldRoot && topLevel.has(name)) {
        matrix.multiplyMatrices(axisConversion, track.source.matrix);
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

  for (const [clipName, tests] of CLIP_PATTERNS) {
    const characterFbx = await findClip(path.join(familyRoot, 'Character'), tests);
    const weaponFbx = await findClip(path.join(familyRoot, 'Weapon'), tests);
    // Lado da arma é opcional (ex.: Inspect só existe para os braços — a arma
    // inteira já viaja no ik_hand_gun); sem o lado dos braços não há clipe.
    if (!characterFbx) continue;
    const characterGlb = path.join(rawRoot, `${clipName}-arms.glb`);
    convertFbx(characterFbx, characterGlb);
    await stripRenderables(characterGlb);
    const character = await loadAnimation(characterGlb);
    const armsSample = sampleTargets(character, armsTargets, { foldRoot: true, targetNodes: targetsByName });
    const samples = [armsSample];
    let weaponSample = null;
    if (weaponFbx) {
      const weaponGlb = path.join(rawRoot, `${clipName}-weapon.glb`);
      convertFbx(weaponFbx, weaponGlb);
      await stripRenderables(weaponGlb);
      const weapon = await loadAnimation(weaponGlb);
      weaponSample = sampleTargets(weapon, weaponTargets, { targetNodes: targetsByName });
      samples.push(weaponSample);
    }
    const animation = mergeSamples(document, clipName, samples, targetsByName);
    report.clips.push({
      name: clipName,
      duration: Math.max(armsSample.duration, weaponSample?.duration ?? 0),
      channels: animation.listChannels().length,
      arms: armsSample.tracks.size,
      weapon: weaponSample?.tracks.size ?? 0,
    });
  }
  if (report.clips.length === 0) throw new Error(`no paired character/weapon clips found for ${args.family}`);

  await io.write(outputPath, document);
  report.bytes = (await fs.stat(outputPath)).size;
  await fs.writeFile(path.join(privateRoot, 'assembly-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`CORO_PAID_VIEWMODEL_ASSEMBLY=${JSON.stringify(report)}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
