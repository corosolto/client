// Proper retarget: UE5-mannequin clips -> Meshy rigs via WORLD-ROTATION DELTAS.
// For every mapped bone and frame: delta = srcWorld * inv(srcRestWorld), then
// tgtWorld = delta * tgtRestWorld, tgtLocal = inv(tgtParentWorld) * tgtWorld.
// This handles different rest orientations/proportions between the skeletons.
// Hips translation is scaled by hip-height ratio (XZ zeroed: bots move in code).
//
// usage: node tools/retarget-ue2.mjs <source.glb> <targetChar.glb> <outDir>
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mkdirSync } from 'node:fs';
import * as THREE from '../public/vendor/three.module.js';

const MAP = {
  pelvis: 'Hips',
  spine_01: 'Spine', spine_02: 'Spine01', spine_03: 'Spine02',
  neck_01: 'Neck', head: 'Head',
  clavicle_l: 'LeftShoulder', upperarm_l: 'LeftArm', lowerarm_l: 'LeftForeArm', hand_l: 'LeftHand',
  clavicle_r: 'RightShoulder', upperarm_r: 'RightArm', lowerarm_r: 'RightForeArm', hand_r: 'RightHand',
  thigh_l: 'LeftUpLeg', calf_l: 'LeftLeg', foot_l: 'LeftFoot', ball_l: 'LeftToeBase',
  thigh_r: 'RightUpLeg', calf_r: 'RightLeg', foot_r: 'RightFoot', ball_r: 'RightToeBase',
};
const EXPORT = {
  idle: 'Pistol_Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop',
  shoot: 'Pistol_Shoot', death: 'Death01', crouch: 'Crouch_Idle_Loop',
  crouchwalk: 'Crouch_Fwd_Loop', jump: 'Jump_Start',
};
const FPS = 30;

const [, , srcPath, tgtPath, outDir] = process.argv;
if (!srcPath || !tgtPath || !outDir) { console.error('usage: retarget-ue2 <src> <tgtChar> <outDir>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

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
const roots = (g) => [...g.values()].filter(x => !x.parent || !g.get(x.parent.name));
function worldQ(g, overrides) {
  if (g._wq) return g._wq;
  const local = overrides.get(g.name)?.q ?? g.restQ;
  g._wq = g.parent ? worldQ(g.parent, overrides).clone().multiply(local) : local.clone();
  return g._wq;
}
function clearWQ(g) { for (const x of g.values()) x._wq = null; }
function restWorldQ(g) {
  if (g._rq) return g._rq;
  g._rq = g.parent ? restWorldQ(g.parent).clone().multiply(g.restQ) : g.restQ.clone();
  return g._rq;
}

const srcDoc = await io.read(srcPath);
const tgtDoc = await io.read(tgtPath);
const SG = buildGraph(srcDoc), TG = buildGraph(tgtDoc);

function sampleChannel(ch, t) {
  const s = ch.getSampler();
  const times = s.getInput().getArray(), vals = s.getOutput().getArray();
  const last = times.length - 1, size = s.getOutput().getElementSize();
  let i = 0; while (i < last && times[i + 1] < t) i++;
  const t0 = times[i], t1 = times[Math.min(i + 1, last)];
  const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  const j = Math.min(i + 1, last);
  if (size === 4) return new THREE.Quaternion().fromArray(vals, i * 4).slerp(new THREE.Quaternion().fromArray(vals, j * 4), f);
  return new THREE.Vector3().fromArray(vals, i * 3).lerp(new THREE.Vector3().fromArray(vals, j * 3), f);
}

// target bone order: parents before children (only mapped ones, respecting hierarchy)
const tgtOrder = [];
(function walk(g) { if (g) { tgtOrder.push(g); for (const c of g.children) walk(c); } })([...TG.values()].filter(x => !x.parent)[0]);
const mappedTgt = tgtOrder.filter(g => Object.values(MAP).includes(g.name));

for (const [state, srcClipName] of Object.entries(EXPORT)) {
  const anim = srcDoc.getRoot().listAnimations().find(a => a.getName() === srcClipName);
  if (!anim) { console.warn('clip ausente:', srcClipName); continue; }
  const channels = anim.listChannels();
  const dur = Math.max(...channels.map(c => c.getSampler().getInput().getArray().at(-1)));
  const frames = Math.max(2, Math.round(dur * FPS) + 1);
  const times = [], tracksQ = new Map(mappedTgt.map(g => [g.name, []])), trackP = [];
  const hipsS = SG.get('pelvis'), hipsT = TG.get('Hips');
  // Full world transforms (position with rotation+scale chain) — needed because the UE
  // GLB is Z-up-in-local (rotated root) and the target rig is in cm units.
  function worldPos(g, overrides = new Map()) {
    const chain = [];
    for (let n = g; n; n = n.parent) chain.unshift(n);
    let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
    for (const n of chain) {
      const lp = overrides.get(n.name)?.p ?? n.restP;
      const lq = overrides.get(n.name)?.q ?? n.restQ;
      const ls = n.restS;
      pos.add(lp.clone().multiply(scl).applyQuaternion(quat));
      quat.multiply(lq);
      scl.multiply(ls);
    }
    return pos;
  }
  const srcHipsRestW = hipsS ? worldPos(hipsS) : new THREE.Vector3();
  const tgtHipsRestW = hipsT ? worldPos(hipsT) : new THREE.Vector3();
  // build frame-0 overrides to anchor the clip's own base pose (UE bind pose is NOT the
  // animation's base pose — anchoring on bind made the character float)
  const overrides0 = new Map();
  for (const ch of channels) {
    const nm = ch.getTargetNode()?.getName(); if (!nm) continue;
    if (!overrides0.has(nm)) overrides0.set(nm, {});
    overrides0.get(nm)[ch.getTargetPath() === 'translation' ? 'p' : 'q'] = sampleChannel(ch, 0);
  }
  const srcAnimBaseY = hipsS ? worldPos(hipsS, overrides0).y : 1;
  // target hips parent world transform (for world→local conversion of the written track)
  function parentInverse(g) {
    // returns [pos, quat, scale] of the parent chain
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
  const tgtHipsParentInv = hipsT ? parentInverse(hipsT) : null;

  for (let fi = 0; fi < frames; fi++) {
    const t = Math.min(dur, fi / FPS);
    times.push(t);
    // pose the source at t
    const overrides = new Map();
    for (const ch of channels) {
      const nm = ch.getTargetNode()?.getName(); if (!nm) continue;
      if (!overrides.has(nm)) overrides.set(nm, {});
      overrides.get(nm)[ch.getTargetPath() === 'translation' ? 'p' : 'q'] = sampleChannel(ch, t);
    }
    clearWQ(SG);
    const parentComputed = new Map(); // tgtName -> world quat (retargeted)
    for (const tg of mappedTgt) {
      const srcName = Object.keys(MAP).find(k => MAP[k] === tg.name);
      const sg = SG.get(srcName);
      if (!sg) continue;
      // STANDARD retarget form: tgtWorld = tgtRestWorld ⊗ srcRestWorld⁻¹ ⊗ srcWorld,
      // then tgtLocal = tgtParentWorld⁻¹ ⊗ tgtWorld. (The earlier delta-on-the-wrong-side
      // was the calibration bug — order matters, quaternions don't commute.)
      const desiredW = restWorldQ(tg).clone().multiply(restWorldQ(sg).invert()).multiply(worldQ(sg, overrides));
      const parentW = tg.parent && parentComputed.has(tg.parent.name) ? parentComputed.get(tg.parent.name) : restWorldQ(tg.parent);
      const local = parentW.clone().invert().multiply(desiredW);
      parentComputed.set(tg.name, desiredW.clone());
      tracksQ.get(tg.name).push(local);
    }
    // hips translation: tgt height = tgt rest height × (src animated height / src clip-base
    // height), so the character keeps its own proportions with the clip's bob, XZ at rest
    if (hipsS && hipsT && tgtHipsParentInv) {
      const srcW = worldPos(hipsS, overrides);
      const tgtW = tgtHipsRestW.clone();
      tgtW.y = tgtHipsRestW.y * (srcAnimBaseY ? srcW.y / srcAnimBaseY : 1);
      // world -> target-hips local (inverse of the parent chain transform)
      const inv = tgtHipsParentInv;
      const local = tgtW.clone().sub(inv.pos)
        .applyQuaternion(inv.quat.clone().invert())
        .divide(inv.scl);
      trackP.push(local);
    }
  }

  // write the target-clip GLB: target hierarchy (no mesh) + generated tracks
  const out = new (await import('@gltf-transform/core')).Document();
  const buf = out.createBuffer();
  const scn = out.createScene('s');
  const idMap = new Map();
  for (const tg of tgtOrder) {
    const nn = out.createNode(tg.name)
      .setTranslation(tg.restP.toArray()).setRotation(tg.restQ.toArray()).setScale(tg.restS.toArray());
    idMap.set(tg.name, nn);
  }
  for (const tg of tgtOrder) if (tg.parent && idMap.has(tg.parent.name)) idMap.get(tg.parent.name).addChild(idMap.get(tg.name));
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
  console.log('ok:', state, `(${frames}f, ${dur.toFixed(2)}s)`);
}
console.log('RETARGET COMPLETO ->', outDir);
