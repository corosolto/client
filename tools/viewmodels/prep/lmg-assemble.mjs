#!/usr/bin/env node
/** Monta as recargas do doador MGX5 e o equip compartilhado na candidata LMG.
 *
 * Lê os raw-clips já convertidos (braços+arma, mesmos nomes de bone do rig),
 * reamostra a 60 Hz com o rebase que preserva o pivô da fonte (a matemática do
 * assemble_paid_family.mjs) e grava as animações por cirurgia direta no GLB
 * (JSON+BIN), sem dependência de transform de document. Recargas retimadas
 * para o relógio do Game (5,0 s; weapons.js reload) e o relatório mede os
 * eventos do mecanismo (Feed_Tray/Bag/Lever) contra o áudio (18/62/86%).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const SOURCE = path.resolve(REPO_ROOT, '../vm-astra-pistol');
const NM = path.join(SOURCE, 'node_modules');
const { AnimationMixer, LoopOnce, Matrix4, Quaternion, Vector3 } = await import(`${NM}/three/index.js`);
const { GLTFLoader } = await import(`${NM}/three/addons/loaders/GLTFLoader.js`);

const OUTDIR = path.join(REPO_ROOT, 'artifacts/viewmodels/prep/lmg/lmg-candidate');
const GAME_RELOAD = 5.0; // weapons.js lmg.reload — o clipe fecha no reloadUntil
const FPS = 60;

async function loadAnimation(file) {
  const bytes = await fs.readFile(file);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
  });
  if (gltf.animations.length !== 1) throw new Error(`esperava 1 animação em ${file}`);
  return gltf;
}

function nodeMatrix(node) {
  return new Matrix4().compose(
    new Vector3().fromArray(node.getTranslation()),
    new Quaternion().fromArray(node.getRotation()),
    new Vector3().fromArray(node.getScale()),
  );
}

function pushQuaternion(values, quaternion, previous) {
  if (previous && previous.dot(quaternion) < 0) {
    quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
  }
  values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  return quaternion.clone();
}

function sampleTargets(gltf, targetNames, targetsByName, { foldRoot = false } = {}) {
  const mixer = new AnimationMixer(gltf.scene);
  const action = mixer.clipAction(gltf.animations[0]);
  action.setLoop(LoopOnce, 0);
  action.clampWhenFinished = true;
  action.play();
  const clip = gltf.animations[0];
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
    const targetAnchor = targetsByName.get('ik_hand_root');
    if (!sourceAnchor || !targetAnchor) throw new Error('âncora ik_hand_root ausente');
    sourceAnchor.updateMatrix();
    axisConversion = nodeMatrix(targetAnchor).multiply(sourceAnchor.matrix.clone().invert());
  }
  for (const name of targetNames) {
    const source = gltf.scene.getObjectByName(name);
    if (!source) continue;
    source.updateMatrix();
    const target = targetsByName.get(name);
    // rebase preservando o PIVÔ da fonte: newLocal = posed ∘ srcRest⁻¹ ∘ targetRest
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

function mechanismEvents(sample, duration, bone) {
  const track = sample.tracks.get(bone);
  if (!track) return null;
  const count = track.rotation.length / 4;
  let maxA = 0, maxT = 0;
  for (let i = 0; i < count; i += 1) {
    const a = 2 * Math.acos(Math.min(1, Math.abs(track.rotation[i * 4 + 3])));
    if (a > maxA) { maxA = a; maxT = (i / (count - 1)) * duration; }
  }
  return { bone, max_angle_deg: Math.round((maxA * 180) / Math.PI), at_s: Number(maxT.toFixed(3)) };
}

async function readGlb(file) {
  const data = await fs.readFile(file);
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error(`não é GLB: ${file}`);
  const chunks = [];
  for (let offset = 12; offset < data.length;) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    chunks.push({ type, data: data.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const jsonChunk = chunks.find((c) => c.type === 0x4e4f534a);
  if (!jsonChunk) throw new Error(`GLB sem chunk JSON: ${file}`);
  const binChunk = chunks.find((c) => c.type === 0x004e4942);
  return { json: JSON.parse(jsonChunk.data.toString('utf8').replace(/\0+$/g, '')), bin: binChunk?.data || Buffer.alloc(0) };
}

async function writeGlb(file, json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const paddedJson = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20);
  jsonBytes.copy(paddedJson);
  const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const total = 12 + 8 + paddedJson.length + 8 + binPadded.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  let offset = 12;
  out.writeUInt32LE(paddedJson.length, offset);
  out.writeUInt32LE(0x4e4f534a, offset + 4);
  paddedJson.copy(out, offset + 8);
  offset += 8 + paddedJson.length;
  out.writeUInt32LE(binPadded.length, offset);
  out.writeUInt32LE(0x004e4942, offset + 4);
  binPadded.copy(out, offset + 8);
  await fs.writeFile(file, out);
}

async function main() {
  const { json: doc, bin } = await readGlb(path.join(OUTDIR, 'lmg-candidate.glb'));
  const binBuffer = Buffer.from(bin);
  const nodesByName = new Map(doc.nodes.map((n, i) => [n.name, i]));
  const jointsOf = (skinName) => {
    const skin = doc.skins.find((s) => s.name === skinName);
    if (!skin) throw new Error(`skin ausente: ${skinName}`);
    return skin.joints.map((j) => doc.nodes[j].name);
  };
  const armsTargets = jointsOf('RIG_FP_ARMS');
  const weaponTargets = jointsOf('RIG_WEAPON_LMG');
  const targetsByName = new Map();
  for (const n of doc.nodes) {
    targetsByName.set(n.name, {
      getTranslation: () => n.translation || [0, 0, 0],
      getRotation: () => n.rotation || [0, 0, 0, 1],
      getScale: () => n.scale || [1, 1, 1],
    });
  }

  const appendAccessor = (type, arr, minmax = false) => {
    const bytes = Buffer.from(new Float32Array(arr).buffer);
    binChunks.push(bytes);
    const view = { buffer: 0, byteOffset: totalBinLength() - bytes.length, byteLength: bytes.length };
    doc.bufferViews.push(view);
    const acc = { bufferView: doc.bufferViews.length - 1, componentType: 5126, count: arr.length / components(type), type };
    if (minmax) { acc.min = [Math.min(...arr)]; acc.max = [Math.max(...arr)]; }
    doc.accessors.push(acc);
    return doc.accessors.length - 1;
  };
  const binChunks = [Buffer.from(bin)];
  const totalBinLength = () => binChunks.reduce((s, c) => s + c.length, 0);
  const components = (type) => ({ SCALAR: 1, VEC3: 3, VEC4: 4 })[type];

  const clips = [
    { name: 'reload_tactical', duration: GAME_RELOAD,
      arms: `${SOURCE}/public/private-assets/viewmodels/lmg/raw-clips/reload_tactical-arms.glb`,
      weapon: `${SOURCE}/public/private-assets/viewmodels/lmg/raw-clips/reload_tactical-weapon.glb` },
    { name: 'reload_empty', duration: GAME_RELOAD,
      arms: `${SOURCE}/public/private-assets/viewmodels/lmg/raw-clips/reload_empty-arms.glb`,
      weapon: `${SOURCE}/public/private-assets/viewmodels/lmg/raw-clips/reload_empty-weapon.glb` },
    { name: 'equip_rifle', duration: 1.0, // CS 1.6 v_m249 draw = 31f @30 = 1,0 s
      arms: `${SOURCE}/public/private-assets/viewmodels/shared/raw-general/equip_rifle.glb`,
      weapon: null },
  ];
  doc.animations = (doc.animations || []).filter((a) => !clips.some((c) => c.name === a.name));
  const report = { schemaVersion: 1, fps: FPS, game_reload_s: GAME_RELOAD, clips: [] };
  for (const clip of clips) {
    const armsSample = sampleTargets(await loadAnimation(clip.arms), armsTargets, targetsByName, { foldRoot: true });
    const samples = [armsSample];
    let weaponSample = null;
    if (clip.weapon) {
      weaponSample = sampleTargets(await loadAnimation(clip.weapon), weaponTargets, targetsByName);
      samples.push(weaponSample);
    }
    const timeScale = clip.duration / armsSample.duration;
    const channels = [];
    const samplers = [];
    for (const sample of samples) {
      // braços e arma têm contagens de frames diferentes: tempos POR AMOSTRA,
      // senão input/output divergem (importador recusa; lição do assembler)
      const scale = clip.duration / sample.duration;
      const times = Array.from(sample.times, (t) => t * scale);
      for (const [bone, track] of sample.tracks) {
        const node = nodesByName.get(bone);
        if (node === undefined) continue;
        for (const [pathName, arr, type] of [
          ['translation', track.translation, 'VEC3'],
          ['rotation', track.rotation, 'VEC4'],
          ['scale', track.scale, 'VEC3'],
        ]) {
          const inputIdx = appendAccessor('SCALAR', times, true);
          const outputIdx = appendAccessor(type, arr);
          channels.push({ sampler: samplers.length, target: { node, path: pathName } });
          samplers.push({ input: inputIdx, output: outputIdx, interpolation: 'LINEAR' });
        }
      }
    }
    doc.animations.push({ name: clip.name, channels, samplers });
    report.clips.push({
      name: clip.name,
      duration: clip.duration,
      source_duration: Number(armsSample.duration.toFixed(4)),
      channels: channels.length,
      arms: armsSample.tracks.size,
      weapon: weaponSample?.tracks.size ?? 0,
      time_scale: Number(timeScale.toFixed(4)),
      mechanism: weaponSample
        ? ['Feed_Tray', 'Bag', 'Lever'].map((b) => mechanismEvents(weaponSample, clip.duration, b))
        : [],
    });
  }
  report.game_audio_events_s = { magOut: 0.9, magIn: 3.1, bolt: 4.3 }; // 18/62/86% de 5,0 s (game.js _reloadLayers)
  doc.buffers[0].byteLength = totalBinLength();

  const output = path.join(OUTDIR, 'lmg-runtime-candidate.glb');
  await writeGlb(output, doc, Buffer.concat(binChunks));
  report.output = output;
  report.bytes = (await fs.stat(output)).size;
  await fs.writeFile(path.join(OUTDIR, 'assembly-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`LMG_ASSEMBLED=${JSON.stringify(report)}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
