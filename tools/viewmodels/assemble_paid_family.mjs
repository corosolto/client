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

// Clipes de ARMA convertem via BLENDER, não Assimp: o rig alvo nasceu do import
// FBX do Blender, e o Assimp monta o frame local dos bones com outra convenção —
// o delta do Mag saía girado (pente a 1 m da mão na recarga, medido 29/08).
const BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender';
function convertWeaponFbx(source, output) {
  const script = path.join(REPO_ROOT, 'tools/blender/viewmodels/convert_weapon_clip_fbx.py');
  const result = spawnSync(BLENDER, [
    '-b', '--python-exit-code', '1', '--python', script, '--', source, output,
  ], { encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout.includes('CORO_WEAPON_CLIP_GLB=')) {
    throw new Error(`Blender failed for ${source}:\n${result.stdout.slice(-800)}\n${result.stderr.slice(-400)}`);
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
    // Rebase preservando o PIVÔ da fonte: newLocal = posed ∘ srcRest⁻¹ ∘ targetRest.
    // A forma antiga (targetRest ∘ srcRest⁻¹ ∘ posed) aplicava o delta no frame
    // LOCAL do bone alvo — com o bone Mag do rig da arma a ~0,8 m da geometria
    // (no FBX de animação a cabeça fica a 3 cm do pente), uma rotação de 50°
    // virava um arco de 0,66 m: o pente voava a 1 m da mão (medido 29/08).
    // Delta no frame do PARENT mantém o arco onde o pack o autorou.
    const conversion = target
      ? { srcRestInv: source.matrix.clone().invert(), targetRest: nodeMatrix(target) }
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
        matrix.copy(track.source.matrix)
          .multiply(track.conversion.srcRestInv)
          .multiply(track.conversion.targetRest);
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

function sampleTrackMatrix(track, fraction) {
  const count = track.translation.length / 3;
  const cursor = Math.max(0, Math.min(count - 1, fraction * (count - 1)));
  const first = Math.floor(cursor);
  const second = Math.min(count - 1, first + 1);
  const alpha = cursor - first;
  const position = new Vector3().fromArray(track.translation, first * 3)
    .lerp(new Vector3().fromArray(track.translation, second * 3), alpha);
  const rotation = new Quaternion().fromArray(track.rotation, first * 4)
    .slerp(new Quaternion().fromArray(track.rotation, second * 4), alpha);
  const scale = new Vector3().fromArray(track.scale, first * 3)
    .lerp(new Vector3().fromArray(track.scale, second * 3), alpha);
  return new Matrix4().compose(position, rotation, scale);
}

const leftArmTrack = (name) => /_l$/i.test(name);

function supportPoseAt(sample, fraction) {
  const pose = new Map();
  for (const [name, track] of sample.tracks) {
    if (leftArmTrack(name)) pose.set(name, sampleTrackMatrix(track, fraction));
  }
  return pose;
}

function applySupportPose(sample, pose, blend = null) {
  const smoothstep = (start, end, value) => {
    const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };
  for (const [name, targetMatrix] of pose) {
    const track = sample.tracks.get(name);
    if (!track) continue;
    const targetPosition = new Vector3();
    const targetRotation = new Quaternion();
    const targetScale = new Vector3();
    targetMatrix.decompose(targetPosition, targetRotation, targetScale);
    const translations = [];
    const rotations = [];
    const scales = [];
    let previous = null;
    const count = track.translation.length / 3;
    for (let index = 0; index < count; index += 1) {
      const fraction = count > 1 ? index / (count - 1) : 0;
      const weight = blend
        ? Math.max(
          1 - smoothstep(blend.release[0], blend.release[1], fraction),
          smoothstep(blend.return[0], blend.return[1], fraction),
        )
        : 1;
      const current = sampleTrackMatrix(track, fraction);
      const position = new Vector3();
      const rotation = new Quaternion();
      const scale = new Vector3();
      current.decompose(position, rotation, scale);
      position.lerp(targetPosition, weight);
      rotation.slerp(targetRotation, weight);
      scale.lerp(targetScale, weight);
      translations.push(position.x, position.y, position.z);
      previous = pushQuaternion(rotations, rotation, previous);
      scales.push(scale.x, scale.y, scale.z);
    }
    track.translation = translations;
    track.rotation = rotations;
    track.scale = scales;
  }
}

function replaceAnimationSupportPose(document, clipName, pose) {
  const animation = document.getRoot().listAnimations().find((candidate) => candidate.getName() === clipName);
  if (!animation) throw new Error(`${clipName} animation is missing`);
  for (const channel of animation.listChannels()) {
    const target = channel.getTargetNode();
    const matrix = target && pose.get(target.getName());
    if (!matrix) continue;
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    matrix.decompose(position, rotation, scale);
    const value = channel.getTargetPath() === 'translation' ? position.toArray()
      : channel.getTargetPath() === 'rotation' ? rotation.toArray()
      : scale.toArray();
    const sampler = channel.getSampler();
    const count = sampler.getInput().getCount();
    sampler.getOutput().setArray(new Float32Array(Array.from({ length: count }, () => value).flat()));
  }
}

function sampledWorldMatrix(node, fraction, samples, cache) {
  if (cache.has(node)) return cache.get(node);
  const track = samples.map((sample) => sample?.tracks.get(node.getName())).find(Boolean);
  const local = track ? sampleTrackMatrix(track, fraction) : nodeMatrix(node);
  const parent = node.getParentNode();
  const world = parent
    ? sampledWorldMatrix(parent, fraction, samples, cache).clone().multiply(local)
    : local;
  cache.set(node, world);
  return world;
}

function bakeMagazineGrip(armsSample, weaponSample, targetsByName, grip) {
  const mag = targetsByName.get('Mag');
  const hand = targetsByName.get(grip.handBone);
  const track = weaponSample.tracks.get('Mag');
  if (!mag || !hand || !track || !mag.getParentNode()) throw new Error('magazine grip nodes are missing');
  const samples = [armsSample, weaponSample];
  const referenceCache = new Map();
  const handReference = sampledWorldMatrix(hand, grip.reference, samples, referenceCache);
  const magReference = sampledWorldMatrix(mag, grip.reference, samples, referenceCache);
  const handToMag = handReference.clone().invert().multiply(magReference);
  const smoothstep = (start, end, value) => {
    const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };
  const translations = [];
  const rotations = [];
  let previous = null;
  const count = track.translation.length / 3;
  for (let index = 0; index < count; index += 1) {
    const fraction = count > 1 ? index / (count - 1) : 0;
    const cache = new Map();
    const currentLocal = sampleTrackMatrix(track, fraction);
    const currentPosition = new Vector3();
    const currentRotation = new Quaternion();
    const currentScale = new Vector3();
    currentLocal.decompose(currentPosition, currentRotation, currentScale);
    const desiredWorld = sampledWorldMatrix(hand, fraction, samples, cache).clone().multiply(handToMag);
    const desiredLocal = sampledWorldMatrix(mag.getParentNode(), fraction, samples, cache)
      .clone().invert().multiply(desiredWorld);
    const desiredPosition = new Vector3();
    const desiredRotation = new Quaternion();
    const desiredScale = new Vector3();
    desiredLocal.decompose(desiredPosition, desiredRotation, desiredScale);
    const weight = smoothstep(grip.engage[0], grip.engage[1], fraction)
      * (1 - smoothstep(grip.release[0], grip.release[1], fraction));
    currentPosition.lerp(desiredPosition, weight);
    currentRotation.slerp(desiredRotation, weight);
    translations.push(currentPosition.x, currentPosition.y, currentPosition.z);
    previous = pushQuaternion(rotations, currentRotation, previous);
  }
  track.translation = translations;
  track.rotation = rotations;
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

function mergeSamples(document, clipName, samples, targetsByName, duration) {
  const root = document.getRoot();
  root.listAnimations().filter((animation) => animation.getName() === clipName).forEach((animation) => animation.dispose());
  const animation = document.createAnimation(clipName);
  const buffer = root.listBuffers()[0] || document.createBuffer('viewmodel-animation');

  for (const sample of samples) {
    // Braços e arma têm contagens de frames diferentes, mas compartilham a
    // mesma fase autoral; sem normalização o pente termina antes da mão chegar.
    const timeScale = sample.duration > 0 ? duration / sample.duration : 1;
    const times = Math.abs(timeScale - 1) < 1e-6
      ? sample.times : Float32Array.from(sample.times, (time) => time * timeScale);
    for (const [name, track] of sample.tracks) {
      const target = targetsByName.get(name);
      if (!target) continue;
      addTrack(document, animation, buffer, target, 'translation', times, track.translation);
      addTrack(document, animation, buffer, target, 'rotation', times, track.rotation);
      addTrack(document, animation, buffer, target, 'scale', times, track.scale);
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
  if (args.family === 'pistol') {
    const socket = targetsByName.get('SOCKET_WEAPON_PISTOL');
    const handGun = targetsByName.get('ik_hand_gun');
    if (!socket || !handGun) throw new Error('pistol is missing its deferred weapon socket');
    handGun.addChild(socket);
    // O rig da arma traz a conversão FBX 0.01 e agora herda a mesma conversão
    // dos braços; o socket cancela apenas essa segunda escala.
    const weaponScale = family.weaponScale ?? 1;
    socket.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1])
      .setScale([100 * weaponScale, 100 * weaponScale, 100 * weaponScale]);
  }
  const armsSkin = root.listSkins().find((skin) => skin.getName() === 'RIG_FP_ARMS');
  const weaponSkin = root.listSkins().find((skin) => skin.getName() === `RIG_WEAPON_${args.family.toUpperCase()}`);
  if (!armsSkin || !weaponSkin) throw new Error('base GLB is missing the authored arm or weapon skin');
  const armsTargets = armsSkin.listJoints().map((node) => node.getName());
  const weaponTargets = weaponSkin.listJoints().map((node) => node.getName());
  const report = { schemaVersion: 1, family: args.family, input: basePath, output: outputPath, fps: FPS, clips: [] };
  let supportPose = null;

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
    if (family.supportGrip && clipName === family.supportGrip.sourceClip) {
      supportPose = supportPoseAt(armsSample, family.supportGrip.reference);
    }
    if (supportPose && clipName.startsWith('reload')) applySupportPose(armsSample, supportPose, family.supportGrip);
    if (supportPose && clipName === 'shoot') applySupportPose(armsSample, supportPose);
    const samples = [armsSample];
    let weaponSample = null;
    if (weaponFbx) {
      const weaponGlb = path.join(rawRoot, `${clipName}-weapon.glb`);
      convertWeaponFbx(weaponFbx, weaponGlb);
      await stripRenderables(weaponGlb);
      const weapon = await loadAnimation(weaponGlb);
      weaponSample = sampleTargets(weapon, weaponTargets, { targetNodes: targetsByName });
      if (clipName.startsWith('reload') && family.magTranslationScale) {
        const translation = weaponSample.tracks.get('Mag')?.translation;
        const rest = targetsByName.get('Mag')?.getTranslation();
        if (translation && rest) {
          for (let index = 0; index < translation.length; index += 3) {
            for (let axis = 0; axis < 3; axis += 1) {
              translation[index + axis] = rest[axis]
                + (translation[index + axis] - rest[axis]) * family.magTranslationScale;
            }
          }
        }
      }
      if (clipName.startsWith('reload') && family.magGrip) {
        bakeMagazineGrip(armsSample, weaponSample, targetsByName, family.magGrip);
      }
      samples.push(weaponSample);
    }
    const duration = Math.max(armsSample.duration, weaponSample?.duration ?? 0);
    const animation = mergeSamples(document, clipName, samples, targetsByName, duration);
    report.clips.push({
      name: clipName,
      duration,
      channels: animation.listChannels().length,
      arms: armsSample.tracks.size,
      weapon: weaponSample?.tracks.size ?? 0,
      weaponTimeScale: weaponSample ? duration / weaponSample.duration : null,
      magazineGrip: weaponSample && clipName.startsWith('reload') ? family.magGrip || null : null,
    });
  }
  if (report.clips.length === 0) throw new Error(`no paired character/weapon clips found for ${args.family}`);
  if (family.supportGrip) {
    if (!supportPose?.size) throw new Error(`${args.family} support grip source clip was not assembled`);
    replaceAnimationSupportPose(document, 'idle', supportPose);
    report.supportGrip = { ...family.supportGrip, tracks: supportPose.size };
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
