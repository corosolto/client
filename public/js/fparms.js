// Viewmodel de braços 1P: MESMO personagem/esqueleto da 3ª pessoa, braços posados
// por IK no espaço da arma; na recarga a mão percorre foregrip→carregador→ferrolho.
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { getCharTemplate, getCharClips, measurePalmLocal } from './glbchars.js';
import { gripPoints, weaponMetrics, PISTOLS } from './weapons.js';
import { solveCCDIK } from './handik.js';

const qs = new URLSearchParams(location.search);
export const FP_OFF = qs.get('fpoff') === '1';
const MUTANTE = qs.get('fprigmut') || '';
const TARGET_HEIGHT = 1.72;
const BODY_Y = Number.parseFloat(qs.get('fpy')) || -1.48;
const BODY_Z = Number.parseFloat(qs.get('fpz')) || 0.02;
const FP_SCALE = Number.parseFloat(qs.get('fps')) || 0.93;
const BASE_T = 0.58;
const BOLT_ACTION = new Set(['awp', 'mosin']);

const vec = () => new THREE.Vector3();
const _tmp = vec(), _eff = vec(), _shoulder = vec();
const _qGun = new THREE.Quaternion(), _qParent = new THREE.Quaternion();
const _qWanted = new THREE.Quaternion(), _qModelInv = new THREE.Quaternion();
const _qFixR = new THREE.Quaternion(), _qFixL = new THREE.Quaternion();
const _qCorr = new THREE.Quaternion();
const _axis = vec(), _pR = vec(), _pL = vec();
const _euler = new THREE.Euler();

export function preloadFPArms() {
  // O template e os clipes já são carregados por preloadCharacterAssets().
  return Promise.resolve();
}

function bone(model, exact, re) {
  let found = null;
  model.traverse((o) => {
    if (!found && o.isBone && (o.name === exact || re.test(o.name))) found = o;
  });
  return found;
}

function curlBones(model, side) {
  const out = [];
  const re = side === 'R' ? /curl[_ .-]?r|right.*curl/i : /curl[_ .-]?l|left.*curl/i;
  model.traverse((o) => { if (o.isBone && re.test(o.name)) out.push(o); });
  return out;
}

function reach(chain) {
  const at = (o) => o.getWorldPosition(vec());
  const b = chain.bones;
  if (b.length < 2) return 0.55;
  let total = 0;
  for (let i = 0; i < b.length - 1; i++) total += at(b[i]).distanceTo(at(b[i + 1]));
  total += at(b[b.length - 1]).distanceTo(at(chain.end));
  total += chain.endOffset.length();
  return total || 0.55;
}

function hideNonFp(arms) {
  if (arms.head) arms.head.scale.setScalar(0.0001);
  for (const leg of arms.legs) leg.scale.setScalar(0.0001);
}

function setBasePose(arms, weaponId) {
  arms.curlR.forEach((b, i) => { b.rotation.x = arms.curlBindR[i]; });
  arms.curlL.forEach((b, i) => { b.rotation.x = arms.curlBindL[i]; });
  const clipName = PISTOLS.has(weaponId) ? 'idle1h' : 'idle';
  const clip = arms.clips[clipName] || arms.clips.idle;
  if (!clip) return false;
  if (arms.baseClip !== clip) {
    arms.mixer.stopAllAction();
    arms.baseAction = arms.mixer.clipAction(clip);
    arms.baseAction.reset().play();
    arms.baseClip = clip;
  }
  arms.mixer.setTime(Math.min(BASE_T, Math.max(0, clip.duration - 1 / 60)));
  hideNonFp(arms);
  arms.model.updateWorldMatrix(true, true);
  return true;
}

function palmWorld(chain, out) {
  return out.copy(chain.endOffset).applyMatrix4(chain.end.matrixWorld);
}

function orientationBasis(arms) {
  // Preserva a orientação anatômica da pose retargetada do personagem e só alinha
  // o eixo entre as palmas ao eixo da arma.
  arms.model.getWorldQuaternion(_qModelInv).invert();
  _qFixR.copy(_qModelInv).multiply(arms.chainR.end.getWorldQuaternion(new THREE.Quaternion()));
  _qFixL.copy(_qModelInv).multiply(arms.chainL.end.getWorldQuaternion(new THREE.Quaternion()));
  palmWorld(arms.chainR, _pR);
  palmWorld(arms.chainL, _pL);
  _axis.copy(_pL).sub(_pR).normalize().applyQuaternion(_qModelInv);
  if (_axis.lengthSq() > 1e-6) {
    _qCorr.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _axis);
    _qFixR.premultiply(_qCorr);
    _qFixL.premultiply(_qCorr);
  }
}

function orientHand(chain, qFix, qGun, extra = null) {
  _qWanted.copy(qGun);
  if (extra) _qWanted.multiply(extra);
  _qWanted.multiply(qFix);
  chain.end.parent.getWorldQuaternion(_qParent).invert();
  chain.end.quaternion.copy(_qParent.multiply(_qWanted)).normalize();
  chain.end.updateWorldMatrix(false, true);
}

function poseHand(chain, qFix, qGun, target, extra = null) {
  for (let i = 0; i < 2; i++) {
    orientHand(chain, qFix, qGun, extra);
    solveCCDIK(chain.bones, chain.end, target, { iterations: 18, endOffset: chain.endOffset });
  }
  orientHand(chain, qFix, qGun, extra);
  return palmWorld(chain, _eff).distanceTo(target);
}

function lerp3(a, b, t, out) {
  const k = THREE.MathUtils.smoothstep(t, 0, 1);
  return out.copy(a).lerp(b, k);
}

function segment(k, a, b) {
  return THREE.MathUtils.clamp((k - a) / (b - a), 0, 1);
}

function sockets(arms, rw, weaponId) {
  const gp = gripPoints(weaponId);
  const met = weaponMetrics(weaponId) || rw.userData?.metrics;
  const inv = 1 / ((met && met.norm) || 1);
  const muzzleZ = met ? met.muzzle.z * inv : 0.45;
  const box = met?.box;
  const fore = gp.fore ? gp.fore.clone() : new THREE.Vector3(-0.018 * inv, -0.005 * inv, 0.025 * inv);
  const shoulder = arms.chainL.bones[0] || arms.chainL.end;
  shoulder.getWorldPosition(_shoulder);
  const maxReach = arms.reachL * 0.94;
  for (let i = 0; i < 8; i++) {
    _tmp.copy(fore);
    if (rw.localToWorld(_tmp).distanceTo(_shoulder) <= maxReach) break;
    fore.z *= 0.86;
  }
  const width = box ? Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) * inv : 0.045 * inv;
  return {
    grip: gp.grip.clone(),
    fore,
    support: new THREE.Vector3(-0.026 * inv, -0.006 * inv, 0.018 * inv),
    magazine: new THREE.Vector3(-0.018 * inv, -0.105 * inv, 0.018 * inv),
    magazineOut: new THREE.Vector3(-0.055 * inv, -0.235 * inv, -0.015 * inv),
    bolt: new THREE.Vector3(width + 0.018 * inv, 0.028 * inv, muzzleZ * 0.22),
    boltBack: new THREE.Vector3(width + 0.026 * inv, 0.018 * inv, muzzleZ * 0.10),
    slide: new THREE.Vector3(0, 0.035 * inv, muzzleZ * 0.30),
    slideBack: new THREE.Vector3(0, 0.045 * inv, muzzleZ * 0.12),
  };
}

function reloadTargets(arms, weaponId, k, s) {
  const r = arms.localR.copy(s.grip);
  const l = arms.localL.copy(PISTOLS.has(weaponId) ? s.support : s.fore);
  let phase = 'hold';
  if (!(k > 0) || MUTANTE === 'recarga-global') return { r, l, phase };

  if (weaponId === 'shotgun') {
    phase = k < 0.14 || k > 0.88 ? 'hold' : 'pump';
    const back = arms.scratchA.copy(s.fore); back.z *= 0.42;
    if (k >= 0.14 && k < 0.48) lerp3(s.fore, back, segment(k, 0.14, 0.48), l);
    else if (k < 0.88) lerp3(back, s.fore, segment(k, 0.48, 0.88), l);
    return { r, l, phase };
  }

  if (BOLT_ACTION.has(weaponId)) {
    phase = k < 0.18 || k > 0.92 ? 'hold' : 'bolt';
    if (k < 0.42) lerp3(s.grip, s.bolt, segment(k, 0.18, 0.42), r);
    else if (k < 0.63) lerp3(s.bolt, s.boltBack, segment(k, 0.42, 0.63), r);
    else if (k < 0.78) lerp3(s.boltBack, s.bolt, segment(k, 0.63, 0.78), r);
    else lerp3(s.bolt, s.grip, segment(k, 0.78, 0.92), r);
    return { r, l, phase };
  }

  const home = PISTOLS.has(weaponId) ? s.support : s.fore;
  if (k < 0.14) phase = 'hold';
  else if (k < 0.72) phase = 'magazine';
  else if (k < 0.92) phase = PISTOLS.has(weaponId) ? 'slide' : 'bolt';
  if (k < 0.32) lerp3(home, s.magazine, segment(k, 0.14, 0.32), l);
  else if (k < 0.46) lerp3(s.magazine, s.magazineOut, segment(k, 0.32, 0.46), l);
  else if (k < 0.62) lerp3(s.magazineOut, s.magazine, segment(k, 0.46, 0.62), l);
  else if (k < 0.72) l.copy(s.magazine);
  else if (PISTOLS.has(weaponId) && k < 0.82) lerp3(s.magazine, s.slide, segment(k, 0.72, 0.82), l);
  else if (PISTOLS.has(weaponId) && k < 0.87) lerp3(s.slide, s.slideBack, segment(k, 0.82, 0.87), l);
  else if (PISTOLS.has(weaponId)) lerp3(s.slideBack, home, segment(k, 0.87, 1), l);
  else if (k < 0.82) lerp3(s.magazine, s.bolt, segment(k, 0.72, 0.82), l);
  else if (k < 0.88) lerp3(s.bolt, s.boltBack, segment(k, 0.82, 0.88), l);
  else lerp3(s.boltBack, home, segment(k, 0.88, 1), l);
  return { r, l, phase };
}

export function buildFPArms(def = {}) {
  const template = getCharTemplate(def.id);
  const clips = getCharClips(def.id);
  if (!template || !clips?.idle) return null;
  const model = skeletonClone(template);
  model.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(model);
  const h = bbox.max.y - bbox.min.y || 1;
  const scale = TARGET_HEIGHT * FP_SCALE / h;
  model.scale.setScalar(scale);
  model.position.y = -bbox.min.y * scale;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = false;
    if (o.material) o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
  });
  const group = new THREE.Group();
  group.name = `fp-character-${def.id}`;
  group.rotation.y = Math.PI;
  group.position.set(0, BODY_Y, BODY_Z);
  group.add(model);

  const rShoulder = bone(model, 'RightShoulder', /right.?shoulder/i);
  const rArm = bone(model, 'RightArm', /right.?arm/i);
  const rFore = bone(model, 'RightForeArm', /right.?forearm/i);
  const rHand = bone(model, 'RightHand', /right.?hand/i);
  const lShoulder = bone(model, 'LeftShoulder', /left.?shoulder/i);
  const lArm = bone(model, 'LeftArm', /left.?arm/i);
  const lFore = bone(model, 'LeftForeArm', /left.?forearm/i);
  const lHand = bone(model, 'LeftHand', /left.?hand/i);
  if (!rArm || !rFore || !rHand || !lArm || !lFore || !lHand) return null;
  const curlR = curlBones(model, 'R'), curlL = curlBones(model, 'L');
  const curlBindR = curlR.map((b) => b.rotation.x);
  const curlBindL = curlL.map((b) => b.rotation.x);
  const chainR = { bones: [rShoulder, rArm, rFore].filter(Boolean), end: rHand, endOffset: measurePalmLocal(model, rHand, curlR) };
  const chainL = { bones: [lShoulder, lArm, lFore].filter(Boolean), end: lHand, endOffset: measurePalmLocal(model, lHand, curlL) };
  const arms = {
    group, model, clips, mixer: new THREE.AnimationMixer(model), baseClip: null, baseAction: null,
    sourceId: MUTANTE === 'generico' ? '__generic__' : def.id,
    head: bone(model, 'Head', /head/i),
    legs: [bone(model, 'LeftUpLeg', /left.?upleg/i), bone(model, 'RightUpLeg', /right.?upleg/i)].filter(Boolean),
    chainR, chainL, curlR, curlL, curlBindR, curlBindL,
    reachR: 0.55, reachL: 0.55,
    localR: vec(), localL: vec(), targetR: vec(), targetL: vec(), scratchA: vec(),
    phase: 'hold', _errR: Infinity, _errL: Infinity,
    gripError() { return { r: this._errR, l: this._errL }; },
  };
  group.updateWorldMatrix(true, true);
  setBasePose(arms, 'ak');
  arms.reachR = reach(chainR);
  arms.reachL = reach(chainL);
  return arms;
}

export function poseToWeapon(arms, weaponGroup, weaponId, reloadK = 0, knifeSwing = 0) {
  if (!arms || !weaponGroup || !setBasePose(arms, weaponId)) return;
  const rw = weaponGroup.getObjectByName('rw') || weaponGroup;
  rw.updateWorldMatrix(true, false);
  rw.getWorldQuaternion(_qGun);
  orientationBasis(arms);
  const s = sockets(arms, rw, weaponId);
  const targets = reloadTargets(arms, weaponId, reloadK, s);
  arms.phase = weaponId === 'knife' && knifeSwing > 0.03 ? 'slash' : targets.phase;
  arms.targetR.copy(rw.localToWorld(targets.r));
  arms.targetL.copy(rw.localToWorld(targets.l));
  const knifeQ = weaponId === 'knife'
    ? new THREE.Quaternion().setFromEuler(_euler.set(-0.35 * knifeSwing, 0.22 * knifeSwing, -0.40, 'XYZ'))
    : null;
  arms._errR = poseHand(arms.chainR, _qFixR, _qGun, arms.targetR, knifeQ);
  if (weaponId === 'knife') {
    const root = arms.group.parent;
    root.updateWorldMatrix(true, false);
    arms.targetL.copy(root.localToWorld(_tmp.set(-0.24, -0.62, -0.22)));
    solveCCDIK(arms.chainL.bones, arms.chainL.end, arms.targetL, { iterations: 12, endOffset: arms.chainL.endOffset });
    arms._errL = null;
  } else {
    arms._errL = poseHand(arms.chainL, _qFixL, _qGun, arms.targetL);
  }
  for (const b of arms.curlR) b.rotation.x += 0.72;
  for (const b of arms.curlL) b.rotation.x += weaponId === 'knife' ? 0.18 : 0.68;
  hideNonFp(arms);
}
