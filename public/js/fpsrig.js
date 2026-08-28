// Rig de braços 1P dedicado: os personagens Mint têm mão rígida sem dedos, então
// o viewmodel usa uma armature CC0 estilo GoldSrc (30 bones de dedo) tingida por personagem.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { gripPoints, weaponMetrics, PISTOLS } from './weapons.js';
import { solveCCDIK } from './handik.js';

const qs = new URLSearchParams(location.search);
export const FP_OFF = qs.get('fpoff') === '1';
const MUTANT = qs.get('fprigmut') || '';
const CURL_SIGN = Number(qs.get('fpcurl')) || 1;
const CURL_AMOUNT = Number(qs.get('fpcurlamt')) || 3.0;
const CURL_AXIS = qs.get('fpcurlaxis') || 'x';
// O GLB traz os clipes do Blender; as rotações de dedo entram aditivas após o IK
// do socket — o bake de eixos do glTF sobrescreveria o bind em alguns loaders.
const BLENDER_GRIP = qs.get('fpblender') === '1';
const rotParam = (key, fallback) => {
  const p = (qs.get(key) || '').split(',').map(Number);
  return p.length === 3 && p.every(Number.isFinite) ? p.map((x) => THREE.MathUtils.degToRad(x)) : fallback;
};
// Os bones de socket WRAD já definem eixos palma-para-frente; o cant genérico
// de ±90° era o que quebrava pistolas e facas.
const ROT_R = rotParam('fprrot', [0, 0, 0]);
const ROT_L = rotParam('fplrot', [0, Math.PI, 0]);
const ROT_L_OVERRIDE = qs.has('fplrot');
const BOLT_ACTION = new Set(['awp', 'mosin', 'm400']);
const ARMS_URL = '/models/viewmodels/fp-arms.glb';

let template = null;
let templateClips = [];
let loading = null;

const v3 = () => new THREE.Vector3();
const qa = () => new THREE.Quaternion();
const _targetR = v3(), _targetL = v3();
const _gunQ = qa(), _parentInvQ = qa(), _wantedQ = qa(), _modelInvQ = qa();
const _scratchQ = qa();

export function preloadFPArms() {
  if (template) return Promise.resolve(template);
  if (loading) return loading;
  loading = new GLTFLoader().loadAsync(ARMS_URL).then((gltf) => {
    template = gltf.scene;
    templateClips = gltf.animations || [];
    template.updateMatrixWorld(true);
    return template;
  }).catch((err) => {
    console.error('fp arms rig', err);
    template = null;
    return null;
  });
  return loading;
}

function findBone(root, name) {
  let found = null;
  const wanted = name.replace(/[^a-z0-9]/gi, '').toLowerCase();
  root.traverse((o) => {
    if (!found && o.isBone && o.name.replace(/[^a-z0-9]/gi, '').toLowerCase() === wanted) found = o;
  });
  return found;
}

function socketOffset(wrist, socket) {
  wrist.updateWorldMatrix(true, false);
  socket.updateWorldMatrix(true, false);
  return wrist.worldToLocal(socket.getWorldPosition(v3()));
}

function capturePose(root) {
  const pose = [];
  root.traverse((o) => {
    if (o.isBone) pose.push({ bone: o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
  });
  return pose;
}

function resetPose(arms) {
  for (const x of arms.bindPose) {
    x.bone.position.copy(x.p);
    x.bone.quaternion.copy(x.q);
    x.bone.scale.copy(x.s);
  }
  arms.model.updateWorldMatrix(true, true);
}

function fingerBones(model, side) {
  const suffix = new RegExp(`${side}$`, 'i');
  const fingers = [];
  model.traverse((o) => {
    if (o.isBone && o.name.startsWith('finger_') && suffix.test(o.name)) fingers.push(o);
  });
  return fingers;
}

function closeHand(bones, amount, triggerOpen = false) {
  for (const b of bones) {
    const thumb = b.name.includes('thumb');
    // WRAD nomeia `finger_index1.r` etc.; a regex antiga ignorava o ponto do lado,
    // tratava tudo como falange 1 e virava o polegar de lado (o espinho das pistolas).
    const digit = Number((b.name.match(/([123])[^0-9]*[rl]$/i) || [])[1] || 1);
    if (thumb) {
      // O polegar tem roll próprio no rig WRAD: dobrá-lo só em X
      // produzia o gancho comprido do build antigo.
      const right = /r$/i.test(b.name);
      // Pós-glTF o skin roda com a mão trocada vs. o pose space do Blender: base
      // vira para a palma oposta (o sinal antigo apontava o polegar para fora).
      if (digit === 1) b.rotateZ((right ? -0.20 : -0.55) * amount);
      b.rotateX([0, 0.34, 0.52, 0.42][digit] * amount);
      continue;
    }
    let angle = [0, 0.58, 0.82, 0.70][digit];
    if (triggerOpen && b.name.includes('index')) angle *= digit === 1 ? 0.34 : 0.18;
    const turn = CURL_SIGN * angle * amount * CURL_AMOUNT;
    if (CURL_AXIS === 'z') b.rotateZ(turn);
    else if (CURL_AXIS === 'y') b.rotateY(turn);
    else b.rotateX(turn);
  }
}

function holdClipFor(weaponId) {
  if (weaponId === 'knife') return 'hold_knife';
  if (PISTOLS.has(weaponId)) return 'hold_pistol';
  if (weaponId === 'shotgun') return 'hold_shotgun';
  if (BOLT_ACTION.has(weaponId)) return 'hold_bolt';
  return 'hold_rifle';
}

function applyBlenderGrip(arms, weaponId) {
  if (!BLENDER_GRIP || !arms.mixer) return false;
  const wanted = holdClipFor(weaponId);
  let selected = false;
  for (const [name, action] of arms.holdActions) {
    action.enabled = name === wanted;
    action.paused = false;
    action.setEffectiveWeight(name === wanted ? 1 : 0);
    if (name === wanted) selected = true;
  }
  if (selected) arms.mixer.setTime(1 / 30);
  return selected;
}

function reach(chain) {
  const pts = chain.bones.map((b) => b.getWorldPosition(v3()));
  pts.push(chain.end.getWorldPosition(v3()));
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += pts[i - 1].distanceTo(pts[i]);
  const endPos = chain.end.getWorldPosition(v3());
  const palmPos = palmWorld(chain, v3());
  return n + endPos.distanceTo(palmPos);
}

function palmWorld(chain, out) {
  return out.copy(chain.endOffset).applyMatrix4(chain.end.matrixWorld);
}

function handSocketRelative(wrist, socket) {
  const wq = wrist.getWorldQuaternion(qa()).invert();
  return wq.multiply(socket.getWorldQuaternion(qa()));
}

function orientWrist(chain, relQ, gunQ, side, weaponId) {
  // O socket do rig-fonte aponta ao longo da palma: gira para empunhadura
  // vertical de pistola/fuzil mantendo um cant leve estilo CS.
  const knife = weaponId === 'knife';
  const rot = side === 'r' ? ROT_R
    : (ROT_L_OVERRIDE ? ROT_L : (PISTOLS.has(weaponId) ? ROT_L : [Math.PI, 0, 0]));
  const gripQ = qa().setFromEuler(new THREE.Euler(
    knife ? rot[0] - 0.20 : rot[0], rot[1], rot[2], 'XYZ',
  ));
  _wantedQ.copy(gunQ).multiply(gripQ).multiply(_scratchQ.copy(relQ).invert());
  chain.end.parent.getWorldQuaternion(_parentInvQ).invert();
  chain.end.quaternion.copy(_parentInvQ.multiply(_wantedQ)).normalize();
  chain.end.updateWorldMatrix(false, true);
}

function poseHand(chain, relQ, gunQ, target, side, weaponId) {
  const wristTarget = v3();
  for (let i = 0; i < 3; i++) {
    orientWrist(chain, relQ, gunQ, side, weaponId);
    const wristNow = chain.end.getWorldPosition(v3());
    const offsetWorld = palmWorld(chain, v3()).sub(wristNow);
    wristTarget.copy(target).sub(offsetWorld);
    solveCCDIK(chain.bones, chain.end, wristTarget, { iterations: 28 });
  }
  orientWrist(chain, relQ, gunQ, side, weaponId);
  return palmWorld(chain, v3()).distanceTo(target);
}

function smoothLerp(out, a, b, t) {
  return out.copy(a).lerp(b, THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(t, 0, 1), 0, 1));
}

function seg(k, a, b) { return THREE.MathUtils.clamp((k - a) / (b - a), 0, 1); }

function weaponSockets(arms, rw, weaponId) {
  const gp = gripPoints(weaponId);
  const met = weaponMetrics(weaponId) || rw.userData?.metrics;
  const inv = 1 / ((met && met.norm) || 1);
  const muzzleZ = met ? met.muzzle.z * inv : 0.45;
  const box = met?.box;
  // gripPoints está em metros reais e o local do weaponModel em unidades pré-
  // normalização: sem a escala inversa, todo socket de apoio caía no carregador.
  const fore = gp.fore?.clone().multiplyScalar(inv)
    || new THREE.Vector3(-0.018 * inv, -0.005 * inv, 0.025 * inv);
  // Nunca recuar a mão de apoio ao carregador em silêncio (o clamp antigo dava a
  // mesma pose errada a todo fuzil): o CCD IK busca o socket autoral e reporta o erro.
  const width = box ? Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) * inv : 0.045 * inv;
  return {
    grip: gp.grip.clone(),
    fore,
    // Empunhadura de pistola a duas mãos: palma de apoio fora e à frente da mão
    // que atira — quase no mesmo ponto, as luvas se interpenetravam num nó.
    pistol: new THREE.Vector3(-0.038 * inv, -0.020 * inv, 0.026 * inv),
    mag: new THREE.Vector3(-0.018 * inv, -0.105 * inv, 0.018 * inv),
    // Carregador extraído fica DENTRO do quadro 1P; o alvo anterior descia a
    // mão de apoio para baixo da câmera e a recarga parecia sumiço.
    magOut: new THREE.Vector3(-0.070 * inv, -0.140 * inv, 0.020 * inv),
    bolt: new THREE.Vector3(width + 0.018 * inv, 0.030 * inv, muzzleZ * 0.24),
    boltBack: new THREE.Vector3(width + 0.026 * inv, 0.016 * inv, muzzleZ * 0.11),
    slide: new THREE.Vector3(0, 0.038 * inv, muzzleZ * 0.30),
    slideBack: new THREE.Vector3(0, 0.044 * inv, muzzleZ * 0.14),
  };
}

function animatedTargets(arms, weaponId, k, s, knifeSwing) {
  const r = arms.localR.copy(s.grip);
  const homeL = weaponId === 'knife' ? arms.knifeGuard : (PISTOLS.has(weaponId) ? s.pistol : s.fore);
  const l = arms.localL.copy(homeL);
  let phase = 'hold';

  if (weaponId === 'knife') {
    if (knifeSwing > 0.001) {
      phase = 'slash';
      r.x += Math.sin(knifeSwing * Math.PI) * -0.05;
      r.y += Math.sin(knifeSwing * Math.PI) * 0.035;
      r.z += Math.sin(knifeSwing * Math.PI) * -0.055;
      l.x += Math.sin(knifeSwing * Math.PI) * 0.025;
    }
    return { r, l, phase };
  }
  if (!(k > 0) || MUTANT === 'recarga-global') return { r, l, phase };

  if (weaponId === 'shotgun') {
    phase = k < 0.14 || k > 0.88 ? 'hold' : 'pump';
    arms.temp.copy(s.fore); arms.temp.z *= 0.38;
    if (k < 0.48) smoothLerp(l, s.fore, arms.temp, seg(k, 0.14, 0.48));
    else smoothLerp(l, arms.temp, s.fore, seg(k, 0.48, 0.88));
    return { r, l, phase };
  }

  if (BOLT_ACTION.has(weaponId)) {
    phase = k < 0.16 || k > 0.93 ? 'hold' : 'bolt';
    if (k < 0.40) smoothLerp(r, s.grip, s.bolt, seg(k, 0.16, 0.40));
    else if (k < 0.62) smoothLerp(r, s.bolt, s.boltBack, seg(k, 0.40, 0.62));
    else if (k < 0.79) smoothLerp(r, s.boltBack, s.bolt, seg(k, 0.62, 0.79));
    else smoothLerp(r, s.bolt, s.grip, seg(k, 0.79, 0.93));
    return { r, l, phase };
  }

  phase = k < 0.13 ? 'hold' : k < 0.70 ? 'magazine' : (PISTOLS.has(weaponId) ? 'slide' : 'bolt');
  if (k < 0.30) smoothLerp(l, homeL, s.mag, seg(k, 0.13, 0.30));
  else if (k < 0.45) smoothLerp(l, s.mag, s.magOut, seg(k, 0.30, 0.45));
  else if (k < 0.61) smoothLerp(l, s.magOut, s.mag, seg(k, 0.45, 0.61));
  else if (k < 0.70) l.copy(s.mag);
  else if (PISTOLS.has(weaponId) && k < 0.81) smoothLerp(l, s.mag, s.slide, seg(k, 0.70, 0.81));
  else if (PISTOLS.has(weaponId) && k < 0.87) smoothLerp(l, s.slide, s.slideBack, seg(k, 0.81, 0.87));
  else if (PISTOLS.has(weaponId)) smoothLerp(l, s.slideBack, homeL, seg(k, 0.87, 1));
  else if (k < 0.81) smoothLerp(l, s.mag, s.bolt, seg(k, 0.70, 0.81));
  else if (k < 0.88) smoothLerp(l, s.bolt, s.boltBack, seg(k, 0.81, 0.88));
  else smoothLerp(l, s.boltBack, homeL, seg(k, 0.88, 1));
  return { r, l, phase };
}

export function buildFPArms(def = {}) {
  if (!template) return null;
  const model = skeletonClone(template);
  let skinned = 0;
  model.traverse((o) => {
    if (o.isSkinnedMesh) {
      skinned++;
      o.frustumCulled = false;
      o.castShadow = false;
      o.receiveShadow = false;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      const skin = new THREE.Color(def.skin ?? 0xd19a72);
      // Cor da luva é equipamento, não camisa (pal.shirt branca estourava as
      // mãos no mapa da piscina); a identidade fica na pele do braço.
      const glove = new THREE.Color(def.glove ?? 0x182238);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.color) m.color.copy(m.name.toLowerCase().includes('glove') ? glove : skin)
          .lerp(new THREE.Color(0xffffff), m.name.toLowerCase().includes('glove') ? 0.02 : 0.08);
        m.roughness = Math.max(0.72, m.roughness ?? 1);
        m.metalness = 0;
      }
    } else if (o.isMesh) o.visible = false;
  });
  if (!skinned) return null;

  // Calibrado na câmera FPS isolada de 62°: os dois sockets de palma ficam a
  // ≤2 mm dos alvos da arma sem esticar nenhum braço.
  model.scale.setScalar(Number(qs.get('fparmscale')) || 0.09);
  const group = new THREE.Group();
  group.name = `fp-rig-${def.id || 'player'}`;
  group.position.set(0, Number(qs.get('fparmy')) || -0.32, Number(qs.get('fparmz')) || -0.30);
  group.add(model);

  // Malhas Mint são peça única (carregador não destaca): um prop de carregador
  // segue a mão de apoio na recarga, com a arma sempre visível.
  const magProp = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.145, 0.030),
    new THREE.MeshStandardMaterial({ color: 0x20252c, roughness: 0.68, metalness: 0.25 }),
  );
  magProp.name = 'fp-reload-magazine';
  magProp.visible = false;
  group.add(magProp);

  const wristR = findBone(model, 'wrist.r'), wristL = findBone(model, 'wrist.l');
  const socketR = findBone(model, 'socket.r'), socketL = findBone(model, 'socket.l');
  const chainR = { bones: ['shoulder.r', 'bicep.r', 'forearm.r'].map((n) => findBone(model, n)), end: wristR };
  const chainL = { bones: ['shoulder.l', 'bicep.l', 'forearm.l'].map((n) => findBone(model, n)), end: wristL };
  if ([...chainR.bones, ...chainL.bones, wristR, wristL, socketR, socketL].some((x) => !x)) return null;

  group.updateWorldMatrix(true, true);
  chainR.endOffset = socketOffset(wristR, socketR);
  chainL.endOffset = socketOffset(wristL, socketL);
  const arms = {
    group, model, magProp, chainR, chainL, socketR, socketL,
    bindPose: capturePose(model),
    fingersR: fingerBones(model, 'r'), fingersL: fingerBones(model, 'l'),
    relR: handSocketRelative(wristR, socketR), relL: handSocketRelative(wristL, socketL),
    localR: v3(), localL: v3(), temp: v3(),
    // Guarda da mão de apoio visível embaixo-à-esquerda, como na faca clássica
    // do CS, em vez de cair abaixo da câmera do viewmodel.
    knifeGuard: new THREE.Vector3(-0.18, 0.00, 0.10),
    reachR: reach(chainR), reachL: reach(chainL),
    sourceId: MUTANT === 'generico' ? '__generic__' : def.id,
    phase: 'hold', _errR: Infinity, _errL: Infinity,
    gripError() { return { r: this._errR, l: this._errL }; },
  };
  // Articulação de dedo vem do Blender (só tracks de dedo entram aqui);
  // ombro/cotovelo alinham aos sockets da arma Mint para a mão não descolar.
  arms.mixer = new THREE.AnimationMixer(model);
  arms.holdActions = new Map();
  for (const src of templateClips.filter((clip) => clip.name.startsWith('hold_'))) {
    const tracks = src.tracks.filter((track) => track.name.toLowerCase().includes('finger_'));
    if (!tracks.length) continue;
    const action = arms.mixer.clipAction(new THREE.AnimationClip(src.name, src.duration, tracks));
    action.play();
    action.paused = false;
    action.enabled = false;
    arms.holdActions.set(src.name, action);
  }
  return arms;
}

export function poseToWeapon(arms, weaponGroup, weaponId, reloadK = 0, knifeSwing = 0) {
  if (!arms || !weaponGroup) return;
  // Pistolas vivem mais baixas e perto da lente que fuzis: sobe/centraliza os
  // ombros para os antebraços entrarem por baixo do quadro, sem palmas soltas.
  arms.group.position.x = PISTOLS.has(weaponId) ? 0.06 : 0;
  arms.group.position.y = PISTOLS.has(weaponId) ? -0.23 : -0.32;
  arms.group.position.z = -0.30;
  arms.group.updateWorldMatrix(true, true);
  resetPose(arms);
  const blenderGrip = applyBlenderGrip(arms, weaponId);
  const rw = weaponGroup.getObjectByName('rw') || weaponGroup;
  rw.updateWorldMatrix(true, false);
  rw.getWorldQuaternion(_gunQ);
  const s = weaponSockets(arms, rw, weaponId);
  const t = animatedTargets(arms, weaponId, reloadK, s, knifeSwing);
  _targetR.copy(t.r); rw.localToWorld(_targetR);
  if (weaponId === 'knife') _targetL.copy(t.l).applyMatrix4(arms.group.matrixWorld);
  else { _targetL.copy(t.l); rw.localToWorld(_targetL); }

  arms._errR = poseHand(arms.chainR, arms.relR, _gunQ, _targetR, 'r', weaponId);
  arms._errL = poseHand(arms.chainL, arms.relL, _gunQ, _targetL, 'l', weaponId);

  const magazineMove = t.phase === 'magazine';
  arms.magProp.visible = magazineMove;
  if (magazineMove) {
    // Prop deslocado do centro da palma: os dedos envolvem o terço superior
    // em vez de ocluí-lo por inteiro.
    arms.temp.set(PISTOLS.has(weaponId) ? -0.018 : -0.026, -0.030, 0.018).applyQuaternion(_gunQ);
    arms.magProp.position.copy(_targetL).add(arms.temp);
    arms.group.worldToLocal(arms.magProp.position);
    arms.group.getWorldQuaternion(_modelInvQ).invert();
    arms.magProp.quaternion.copy(_modelInvQ.multiply(_gunQ));
    arms.magProp.rotateX(0.12);
    if (PISTOLS.has(weaponId)) arms.magProp.scale.set(0.62, 0.62, 0.62);
    else arms.magProp.scale.set(1, 1, 1);
  }
  arms.debug = {
    dR: arms.chainR.bones[0].getWorldPosition(v3()).distanceTo(_targetR),
    dL: arms.chainL.bones[0].getWorldPosition(v3()).distanceTo(_targetL),
  };
  // Forma aditiva preserva o quaternion de bind de cada bone do Blender;
  // valores/forma vêm da pose de empunhadura autoral acima.
  if (!blenderGrip) {
    // Em escala de viewmodel, dedo de gatilho meio aberto vira espinho solto:
    // empunhadura cilíndrica fechada, indicador alinhado ao guarda-mato.
    closeHand(arms.fingersR, weaponId === 'knife' ? 1.30 : 1, false);
    closeHand(arms.fingersL, weaponId === 'knife' ? 0.88 : 0.82, false);
  }
  arms.model.updateWorldMatrix(true, true);
  arms.phase = t.phase;
}
