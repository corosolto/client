// Retarget Mixamo clips (mixamorig:* rig, FBX) -> Meshy rigs via WORLD-ROTATION DELTAS.
// Same math as tools/retarget-ue2.mjs (proven on the UAL pack), but the source is a
// Mixamo FBX loaded with three's FBXLoader and sampled through an AnimationMixer,
// and the bone map is the Mixamo naming scheme.
// For every mapped bone and frame: tgtWorld = tgtRestWorld ⊗ srcRestWorld⁻¹ ⊗ srcWorld,
// tgtLocal = tgtParentWorld⁻¹ ⊗ tgtWorld. Hips translation keeps target rest XZ
// (in-place: bots move in code) and scales Y bob by the hips-height ratio.
//
// usage: node tools/retarget-mixamo.mjs <fbxDir> <targetChar.glb> <outDir>
// Requires three installed next to the FBX dir (npm i three@0.160.0) — loaded from
// <fbxDir>/node_modules/three/examples/jsm/loaders/FBXLoader.js.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , fbxDir, tgtPath, outDir] = process.argv;
if (!fbxDir || !tgtPath || !outDir) { console.error('usage: retarget-mixamo <fbxDir> <tgtChar.glb> <outDir>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const THREE = await import(pathToFileURL(resolve(fbxDir, 'node_modules/three/build/three.module.js')).href);
const { FBXLoader } = await import(pathToFileURL(resolve(fbxDir, 'node_modules/three/examples/jsm/loaders/FBXLoader.js')).href);

// state -> source FBX (Mixamo rifle set, UnityMixamoLibrary mirror — see SOURCES.md)
// idle usa a variante NÃO-aim (postura quadrada; a aim/bladed deixava os chars corcundas).
// walk volta pra AIM: a não-aim tem stride lento demais (0.84 m/s) e o timeScale estourava
// o cap 3.0 → bots DESLIZAVAM (pé 2.5 vs chão 3.3 m/s). A aim-walk planta (1.43 m/s).
const EXPORT = {
  idle: 'rifle_idle_1',
  walk: 'rifle_aim_walk_1',
  run: 'rifle_aim_run',
  shoot: 'rifle_fire_single',
  death: 'rifle_death_back',
  crouch: 'rifle_crouch_aim_idle',
  crouchwalk: 'rifle_crouch_aim_walk',
  jump: 'rifle_jump',
  walk1h: 'pistol_aim_walk',
  walkfire: 'rifle_walk_fire_single',   // andando atirando (bots em combate em movimento)
};

// Mixamo -> Meshy bone map (mechanical; 'neck' is lowercase in the Meshy rig).
// The UnityMixamoLibrary FBX are Unity-stripped exports: bones have NO 'mixamorig:'
// prefix (Hips/Spine1/Neck...). The map also accepts the canonical prefixed names.
const PREFIX = (n) => [`mixamorig:${n}`, n];
const RAW_MAP = {
  Hips: 'Hips',
  Spine: 'Spine', Spine1: 'Spine01', Spine2: 'Spine02',
  Neck: 'neck', Head: 'Head',
  LeftShoulder: 'LeftShoulder', LeftArm: 'LeftArm',
  LeftForeArm: 'LeftForeArm', LeftHand: 'LeftHand',
  RightShoulder: 'RightShoulder', RightArm: 'RightArm',
  RightForeArm: 'RightForeArm', RightHand: 'RightHand',
  LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg',
  LeftFoot: 'LeftFoot', LeftToeBase: 'LeftToeBase',
  RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg',
  RightFoot: 'RightFoot', RightToeBase: 'RightToeBase',
};
const MAP = {};
for (const [src, tgt] of Object.entries(RAW_MAP)) for (const s of PREFIX(src)) MAP[s] = tgt;
const HIPS_SRC = PREFIX('Hips');
const FPS = 30;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ---- target skeleton (rest pose), same graph code as retarget-ue2 ----------------
function buildGraph(doc) {
  const nodes = new Map();
  for (const n of doc.getRoot().listNodes()) {
    nodes.set(n.getName(), {
      n, name: n.getName(), parent: null, children: [],
      restP: new THREE.Vector3().fromArray(n.getTranslation()),
      restQ: new THREE.Quaternion().fromArray(n.getRotation()),
      restS: new THREE.Vector3().fromArray(n.getScale()),
    });
  }
  for (const g of nodes.values()) for (const c of g.n.listChildren()) {
    const cg = nodes.get(c.getName()); if (cg) { cg.parent = g; g.children.push(cg); }
  }
  return nodes;
}
function restWorldQ(g) {
  if (g._rq) return g._rq;
  g._rq = g.parent ? restWorldQ(g.parent).clone().multiply(g.restQ) : g.restQ.clone();
  return g._rq;
}
function worldPos(g) {
  const chain = [];
  for (let n = g; n; n = n.parent) chain.unshift(n);
  let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
  for (const n of chain) {
    pos.add(n.restP.clone().multiply(scl).applyQuaternion(quat));
    quat.multiply(n.restQ);
    scl.multiply(n.restS);
  }
  return pos;
}
function parentInverse(g) {
  const chain = [];
  for (let n = g.parent; n; n = n.parent) chain.unshift(n);
  let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
  for (const n of chain) {
    pos.add(n.restP.clone().multiply(scl).applyQuaternion(quat));
    quat.multiply(n.restQ);
    scl.multiply(n.restS);
  }
  return { pos, quat, scl };
}

const tgtDoc = await io.read(tgtPath);
const TG = buildGraph(tgtDoc);
const tgtOrder = [];
(function walk(g) { if (g) { tgtOrder.push(g); for (const c of g.children) walk(c); } })([...TG.values()].filter(x => !x.parent)[0]);
const mappedTgt = tgtOrder.filter(g => Object.values(MAP).includes(g.name));
const hipsT = TG.get('Hips');
const tgtHipsRestW = hipsT ? worldPos(hipsT) : new THREE.Vector3();
const tgtHipsParentInv = hipsT ? parentInverse(hipsT) : null;
console.log('target bones mapped:', mappedTgt.length, '/', Object.keys(MAP).length);

// ---- per-state retarget ----------------------------------------------------------
for (const [state, base] of Object.entries(EXPORT)) {
  const file = join(fbxDir, `${base}.fbx`);
  let group;
  try {
    group = new FBXLoader().parse(readFileSync(file).buffer, '');
  } catch (e) { console.warn('FBX parse failed:', base, e.message); continue; }
  const clip = group.animations?.[0];
  if (!clip) { console.warn('sem animacao:', base); continue; }
  group.updateMatrixWorld(true);

  // source bones + rest world quats (bind pose as loaded, before playing the clip)
  const srcBones = new Map(), srcRestWQ = new Map();
  group.traverse(o => {
    if (MAP[o.name]) {
      srcBones.set(o.name, o);
      srcRestWQ.set(o.name, o.getWorldQuaternion(new THREE.Quaternion()));
    }
  });
  // Normalize to TARGET-name -> { bone, restW } (the map carries both prefixed and
  // bare aliases; only one exists in a given FBX).
  const srcByTarget = new Map();
  for (const [srcName, tgtName] of Object.entries(MAP)) {
    const b = srcBones.get(srcName);
    if (b && !srcByTarget.has(tgtName)) srcByTarget.set(tgtName, { bone: b, restW: srcRestWQ.get(srcName) });
  }
  const hipsS = srcByTarget.get('Hips')?.bone;
  if (!hipsS) { console.warn('sem hips:', base); continue; }

  const mixer = new THREE.AnimationMixer(group);
  const action = mixer.clipAction(clip);
  // LoopOnce + clamp: setTime(dur) must hold the LAST frame, not wrap to frame 0
  // (LoopRepeat wrapping made the final baked frame = the standing start pose,
  //  which is exactly what a clampWhenFinished death clip then freezes on).
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const dur = clip.duration;
  const frames = Math.max(2, Math.round(dur * FPS) + 1);
  const times = [], tracksQ = new Map(mappedTgt.map(g => [g.name, []])), trackP = [];

  // Hips Y anchor: the BIND (T-pose, standing) hips height, captured above before the
  // mixer touched the rig — crouch depth must be measured against standing height.
  // (ue2 anchored on the clip's own frame 0, which flattens crouch to standing level.)
  const srcBindY = hipsS.getWorldPosition(new THREE.Vector3()).y || 1;

  for (let fi = 0; fi < frames; fi++) {
    const t = Math.min(dur, fi / FPS);
    times.push(t);
    mixer.setTime(t); group.updateMatrixWorld(true);
    const parentComputed = new Map();
    for (const tg of mappedTgt) {
      const src = srcByTarget.get(tg.name);
      if (!src) continue;
      const srcW = src.bone.getWorldQuaternion(new THREE.Quaternion());
      // WORLD-frame delta form: desiredW = srcWorld ⊗ srcRestWorld⁻¹ ⊗ tgtRestWorld.
      // (ue2 used tgtRest ⊗ srcRest⁻¹ ⊗ srcWorld, which bakes the per-bone axis-
      // convention difference R_t⊗R_s⁻¹ into the pose — arms came out mirrored/flipped.)
      const desiredW = srcW.multiply(src.restW.clone().invert()).multiply(restWorldQ(tg));
      const parentW = tg.parent && parentComputed.has(tg.parent.name) ? parentComputed.get(tg.parent.name) : restWorldQ(tg.parent);
      const local = parentW.clone().invert().multiply(desiredW);
      parentComputed.set(tg.name, desiredW.clone());
      tracksQ.get(tg.name).push(local);
    }
    if (hipsT && tgtHipsParentInv) {
      const srcW = hipsS.getWorldPosition(new THREE.Vector3());
      const tgtW = tgtHipsRestW.clone();
      tgtW.y = tgtHipsRestW.y * (srcW.y / srcBindY); // XZ stays at rest: in-place
      const inv = tgtHipsParentInv;
      const local = tgtW.sub(inv.pos).applyQuaternion(inv.quat.clone().invert()).divide(inv.scl);
      trackP.push(local);
    }
  }

  // write the target-clip GLB: target hierarchy (no mesh) + generated tracks
  const out = new (await import('@gltf-transform/core')).Document();
  const buf = out.createBuffer();
  out.createScene('s');
  const idMap = new Map();
  for (const tg of tgtOrder) {
    const nn = out.createNode(tg.name)
      .setTranslation(tg.restP.toArray()).setRotation(tg.restQ.toArray()).setScale(tg.restS.toArray());
    idMap.set(tg.name, nn);
  }
  for (const tg of tgtOrder) if (tg.parent && idMap.has(tg.parent.name)) idMap.get(tg.parent.name).addChild(idMap.get(tg.name));
  // attach roots to the scene (mirror the source scene's root set)
  for (const tg of tgtOrder) if (!tg.parent || !idMap.has(tg.parent.name)) out.getRoot().listScenes()[0].addChild(idMap.get(tg.name));
  const outAnim = out.createAnimation(state);
  const timeAcc = out.createAccessor().setType('SCALAR').setBuffer(buf).setArray(new Float32Array(times));
  const addTrack = (bn, path, elemSize, arr) => {
    const samp = out.createAnimationSampler()
      .setInput(timeAcc)
      .setOutput(out.createAccessor().setType(elemSize === 4 ? 'VEC4' : 'VEC3').setBuffer(buf).setArray(arr))
      .setInterpolation('LINEAR');
    outAnim.addSampler(samp);
    outAnim.addChannel(out.createAnimationChannel().setTargetNode(idMap.get(bn)).setTargetPath(path).setSampler(samp));
  };
  for (const [bn, quats] of tracksQ) {
    if (!quats.length) continue;
    const arr = new Float32Array(quats.length * 4);
    quats.forEach((q, i) => { arr[i * 4] = q.x; arr[i * 4 + 1] = q.y; arr[i * 4 + 2] = q.z; arr[i * 4 + 3] = q.w; });
    addTrack(bn, 'rotation', 4, arr);
  }
  if (trackP.length) {
    const arr = new Float32Array(trackP.length * 3);
    trackP.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    addTrack('Hips', 'translation', 3, arr);
  }
  await io.write(`${outDir}/${state}.glb`, out);
  console.log('ok:', state, `${base}.fbx (${frames}f, ${dur.toFixed(2)}s)`);
}
console.log('RETARGET COMPLETO ->', outDir);
