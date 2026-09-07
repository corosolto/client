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

/** Desvio angular (graus) de cada frame vs o frame 0. */
function angleSeries(track) {
  const n = track.rotation.length / 4;
  const q0 = new Quaternion(track.rotation[0], track.rotation[1], track.rotation[2], track.rotation[3]);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const q = new Quaternion(track.rotation[i * 4], track.rotation[i * 4 + 1], track.rotation[i * 4 + 2], track.rotation[i * 4 + 3]);
    out.push(2 * Math.acos(Math.min(1, Math.abs(q.dot(q0)))) * 180 / Math.PI);
  }
  return out;
}

/** Âncoras do doador para o relógio do jogo (game.js _reloadLayers 18/62/86%). */
function warpAnchors(weaponSample, targets, label) {
  const series = {};
  for (const bone of ['Feed_Tray', 'Bag']) {
    const track = weaponSample.tracks.get(bone);
    series[bone] = track ? angleSeries(track) : null;
  }
  const T = weaponSample.duration;
  const toT = (arr, i) => (i / (arr.length - 1)) * T;
  const firstSig = (arr) => {
    if (!arr) return null;
    const max = Math.max(...arr);
    if (max < 2) return null; // sem movimento real (tática não gira a tampa)
    const i = arr.findIndex((a) => a > 0.25 * max);
    return i >= 0 ? toT(arr, i) : null;
  };
  const lastSig = (arr) => {
    if (!arr) return null;
    const max = Math.max(...arr);
    if (max < 2) return null;
    for (let i = arr.length - 1; i >= 0; i -= 1) if (arr[i] > 0.25 * max) return toT(arr, i);
    return null;
  };
  const bag = series.Bag;
  const tIn = bag ? toT(bag, bag.indexOf(Math.max(...bag))) : null;
  if (tIn === null) {
    console.error(`WARP ${label}: sem evento de caixa; warp uniforme`);
    return [[0, 0], [T, targets.total]];
  }
  const cand = [firstSig(series.Feed_Tray), firstSig(bag)].filter((t) => t !== null);
  const tOut = cand.length ? Math.min(...cand) : null;
  const tBoltRaw = lastSig(series.Feed_Tray);
  const anchors = [[0, 0]];
  if (tOut !== null && tOut > 0.05 && tOut < tIn - 0.05) anchors.push([tOut, targets.open]);
  anchors.push([tIn, targets.in]);
  if (tBoltRaw !== null && tBoltRaw > tIn + 0.05 && tBoltRaw < T - 0.05) anchors.push([tBoltRaw, targets.bolt]);
  anchors.push([T, targets.total]);
  // proibido animação lenta como peso: razão local de taxas limitada; quando
  // viola, descarta-se a âncora de saída (evento medido e reportado)
  const MAX_RATE = 2.5;
  const rates = (a) => a.slice(1).map(([t1, o1], i) => (o1 - a[i][1]) / (t1 - a[i][0]));
  while (Math.max(...rates(anchors)) > MAX_RATE && anchors.length > 3) {
    anchors.splice(1, 1); // remove a âncora de saída, preserva 0/caixa/fim
  }
  console.error(`WARP ${label}: T=${T.toFixed(3)} tOut=${tOut && tOut.toFixed(3)} tIn=${tIn.toFixed(3)} tBolt=${tBoltRaw && tBoltRaw.toFixed(3)} anchors=${JSON.stringify(anchors.map(([t, o]) => [Number(t.toFixed(3)), o]))}`);
  return anchors;
}

/** Reamostra um sample pelo warp piecewise-linear doador→saída. */
function resample(sample, anchors, duration, fps = FPS) {
  const inv = (outT) => {
    for (let i = 1; i < anchors.length; i += 1) {
      if (outT <= anchors[i][1]) {
        const [t0, o0] = anchors[i - 1];
        const [t1, o1] = anchors[i];
        return t0 + (t1 - t0) * (outT - o0) / Math.max(1e-9, o1 - o0);
      }
    }
    return sample.duration;
  };
  const frames = Math.round(duration * fps);
  const times = new Float32Array(frames + 1);
  const tracks = new Map();
  for (const [name, track] of sample.tracks) {
    const n = track.translation.length / 3;
    const pick = (outT) => {
      const dt = Math.max(0, Math.min(sample.duration, inv(outT)));
      const x = dt / sample.duration * (n - 1);
      const i = Math.min(n - 2, Math.floor(x));
      const a = x - i;
      return { i, a };
    };
    const tr = []; const ro = []; const sc = [];
    let prev = null;
    for (let f = 0; f <= frames; f += 1) {
      const outT = (f / frames) * duration;
      times[f] = outT;
      const { i, a } = pick(outT);
      for (let c = 0; c < 3; c += 1) {
        tr.push(track.translation[(i + 1) * 3 + c] * a + track.translation[i * 3 + c] * (1 - a));
        sc.push(track.scale[(i + 1) * 3 + c] * a + track.scale[i * 3 + c] * (1 - a));
      }
      const qa = new Quaternion(track.rotation[i * 4], track.rotation[i * 4 + 1], track.rotation[i * 4 + 2], track.rotation[i * 4 + 3]);
      const qb = new Quaternion(track.rotation[(i + 1) * 4], track.rotation[(i + 1) * 4 + 1], track.rotation[(i + 1) * 4 + 2], track.rotation[(i + 1) * 4 + 3]);
      const q = qa.slerp(qb, a);
      prev = pushQuaternion(ro, q, prev);
    }
    tracks.set(name, { translation: tr, rotation: ro, scale: sc });
  }
  return { duration, times, tracks };
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

/** Transplanta materiais+texturas reais (doador p/ braços e cinto, Mint p/ arma). */
async function transplantMaterials(doc, binChunks, assignments) {
  const srcCache = new Map();
  const readSrc = async (file) => {
    if (!srcCache.has(file)) srcCache.set(file, await readGlb(file));
    return srcCache.get(file);
  };
  doc.samplers = doc.samplers || [];
  doc.textures = doc.textures || [];
  doc.images = doc.images || [];
  doc.extensionsUsed = doc.extensionsUsed || [];
  const texRemap = new Map();
  const materialIndex = new Map();
  for (const [nodeNames, srcFile, matName] of assignments) {
    const { json: src, bin: srcBin } = await readSrc(srcFile);
    const mIdx = (src.materials || []).findIndex((m) => m.name === matName);
    if (mIdx < 0) throw new Error(`material ausente em ${srcFile}: ${matName}`);
    const key = `${srcFile}#${matName}`;
    if (materialIndex.has(key)) continue;
    const samRemap = new Map();
    const imgRemap = new Map();
    const copyTextures = (mat) => {
      const walk = (obj) => {
        for (const [k, v] of Object.entries(obj || {})) {
          if (v && typeof v === 'object' && Number.isInteger(v.index) && /texture/i.test(k)) {
            if (!texRemap.has(`${key}#${v.index}`)) {
              const tex = src.textures[v.index];
              let sampler;
              if (tex.sampler !== undefined) {
                if (!samRemap.has(tex.sampler)) {
                  doc.samplers.push({ ...(src.samplers[tex.sampler] || {}) });
                  samRemap.set(tex.sampler, doc.samplers.length - 1);
                }
                sampler = samRemap.get(tex.sampler);
              }
              let source;
              const webp = (tex.extensions || {})['EXT_texture_webp'] || (tex.extensions || {})['KHR_texture_basisu'];
              if (tex.source === undefined && webp && Number.isInteger(webp.source)) {
                tex.source = webp.source;
              }
              if (tex.source !== undefined) {
                if (!imgRemap.has(tex.source)) {
                  const img = src.images[tex.source];
                  const sView = src.bufferViews[img.bufferView];
                  const data = Buffer.from(srcBin.subarray(sView.byteOffset, sView.byteOffset + sView.byteLength));
                  const offset = binChunks.reduce((sum, c) => sum + c.length, 0);
                  binChunks.push(data);
                  doc.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length });
                  doc.images.push({ bufferView: doc.bufferViews.length - 1, mimeType: img.mimeType, name: img.name });
                  imgRemap.set(tex.source, doc.images.length - 1);
                }
                source = imgRemap.get(tex.source);
              }
              doc.textures.push({ ...(sampler !== undefined ? { sampler } : {}), ...(source !== undefined ? { source } : {}) });
              texRemap.set(`${key}#${v.index}`, doc.textures.length - 1);
            }
            v.index = texRemap.get(`${key}#${v.index}`);
          } else if (v && typeof v === 'object') {
            walk(v);
          }
        }
      };
      walk(mat);
    };
    const mat = JSON.parse(JSON.stringify(src.materials[mIdx]));
    copyTextures(mat);
    doc.materials.push(mat);
    for (const ext of src.extensionsUsed || []) {
      if (!doc.extensionsUsed.includes(ext)) doc.extensionsUsed.push(ext);
    }
    materialIndex.set(key, doc.materials.length - 1);
  }
  let assigned = 0;
  for (const [nodeNames, srcFile, matName] of assignments) {
    const matIdx = materialIndex.get(`${srcFile}#${matName}`);
    for (const nodeName of nodeNames) {
      const node = doc.nodes.find((n) => n.name === nodeName);
      if (!node || node.mesh === undefined) continue;
      for (const prim of doc.meshes[node.mesh].primitives) {
        prim.material = matIdx;
        assigned += 1;
      }
    }
  }
  return assigned;
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
  const AUDIO = { open: 0.9, in: 3.1, bolt: 4.3, total: GAME_RELOAD };
  for (const clip of clips) {
    let armsSample = sampleTargets(await loadAnimation(clip.arms), armsTargets, targetsByName, { foldRoot: true });
    let weaponSample = null;
    if (clip.weapon) {
      weaponSample = sampleTargets(await loadAnimation(clip.weapon), weaponTargets, targetsByName);
    }
    // sincroniza os eventos do mecanismo com o relógio do jogo: warp temporal
    // por âncoras (tampa→0,9 s, caixa→3,1 s, fechamento→4,3 s), aplicado IGUAL
    // a braços e arma para preservar a fase autoral entre os lados
    let warp = null;
    if (weaponSample) {
      const anchors = warpAnchors(weaponSample, AUDIO, clip.name);
      if (anchors) {
        warp = { anchors, before: ['Feed_Tray', 'Bag', 'Lever'].map((b) => mechanismEvents(weaponSample, GAME_RELOAD, b)) };
        armsSample = resample(armsSample, anchors, clip.duration);
        weaponSample = resample(weaponSample, anchors, clip.duration);
      }
    }
    const samples = [armsSample];
    if (weaponSample) samples.push(weaponSample);
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
      warp: warp ? { anchors: warp.anchors.map(([t, o]) => [Number(t.toFixed(3)), o]), events_before: warp.before } : null,
    });
  }
  report.game_audio_events_s = { magOut: 0.9, magIn: 3.1, bolt: 4.3 }; // 18/62/86% de 5,0 s (game.js _reloadLayers)

  // materiais/texturas reais no lugar dos simples do build
  const donorGlb = `${SOURCE}/public/private-assets/viewmodels/lmg/lmg-runtime.glb`;
  const mintGlb = path.join(REPO_ROOT, 'public/models/weapons/lmg.glb');
  report.materials_assigned = await transplantMaterials(doc, binChunks, [
    [[['GEO_FP_SK_Cloth_01'], donorGlb, 'CoroSolto_FP_Cloth']],
    [[['GEO_FP_SK_Glove_01'], donorGlb, 'CoroSolto_FP_Glove']],
    [[['GEO_FP_SK_Hand'], donorGlb, 'CoroSolto_FP_Hand']],
    [[['GEO_LMG_DONOR_BELT'], donorGlb, 'CoroSolto_Bullet'],
     [['GEO_LMG_MINT_BODY', 'GEO_LMG_MINT_COVER', 'GEO_LMG_MINT_BOX', 'GEO_LMG_MINT_LEVER'], mintGlb, 'lmg Material']],
  ].flat().map(([names, file, mat]) => [names, file, mat]));
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
