// Compact CCD (Cyclic Coordinate Descent) IK for the support hand.
//
// The Meshy rig has real arm bones (Shoulder → Arm → ForeArm → Hand) but NO
// finger bones, so we can't curl fingers — but we CAN pose the whole arm so the
// (baked, closed) support hand lands on the weapon's foregrip. This is how
// semi-pro games (Krunker-ish) make the off hand adapt to each weapon's length:
// the weapon defines a grip point, and the arm IK-tracks it every frame after
// the body animation runs.
//
// solveCCDIK(chain, end, targetWorld, opts) rotates each bone in `chain`
// (root → ... → parent-of-end) so `end`'s effector point reaches targetWorld.
// Bones are plain THREE.Bone/Object3D; rotations are written in parent-local
// space. Call AFTER mixer.update() each frame so it overrides the clip's arm.
import * as THREE from 'three';

const _pj = new THREE.Vector3();
const _pe = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _wq = new THREE.Quaternion();
const _pwq = new THREE.Quaternion();
const _off = new THREE.Vector3();
const _tgt = new THREE.Vector3();   // alvo já recortado pelo alcance (NÃO reusar _v1: ele é escrito dentro do laço do CCD)

// chain: [rootBone, ...midBones]  (end effector bone passed separately)
// end: the end bone; its effector point = end origin + endOffset (in end-local space)
// targetWorld: THREE.Vector3 the effector should reach
export function solveCCDIK(chain, end, targetWorld, opts = {}) {
  const iterations = opts.iterations ?? 10;
  const maxStep = opts.maxStep ?? 0.6;      // clamp per-joint rotation (rad) for stability
  const endOffset = opts.endOffset || null; // local offset to the palm
  const root = chain[0];
  if (!root) return;
  root.updateWorldMatrix(true, true);

  const effWorld = () => {
    if (endOffset) { _off.copy(endOffset); return end.localToWorld(_off); }
    return end.getWorldPosition(_pe);
  };

  /* ── ALCANCE: o CCD não pode perseguir um alvo que o braço não atinge ──────────
     PORQUÊ (rodada da RÉGUA): este solver não tinha NENHUM teste de alcance. Quando o
     guarda-mão da arma cai fora do alcance do braço de apoio — e cai, porque o alvo vem
     de `gripPoints(arma)` (weapons.js:121-126), que é função da ARMA, enquanto o alcance
     é função do PERSONAGEM — o CCD faz a única coisa que pode: gira TODAS as juntas na
     direção do alvo, iteração após iteração, até o braço ficar reto apontando pra lá. Como
     a primeira junta da cadeia é o ombro (LeftArm), o resultado visual é o ombro arrancado
     do tronco e o braço esticado atravessando o peito — e ele NUNCA converge, então gasta
     as 8 iterações inteiras todo quadro, em todo bot, pra chegar num lugar impossível.
     Uma AWP de 1,15 m num personagem de braço curto é exatamente esse caso.
     Conserto: o alvo é PROJETADO na esfera de alcance da cadeia antes de resolver. O braço
     estica na direção certa e para — que é o que um braço faz. O comprimento é medido no
     próprio esqueleto (soma dos segmentos + a palma), então vale pra qualquer rig sem
     tabela por personagem. `opts.reach = false` desliga.                              */
  let alcanceUsado = null;
  if (opts.reach !== false) {
    root.getWorldPosition(_pj);
    let alcance = 0;
    for (let i = 1; i < chain.length; i++) {
      chain[i].getWorldPosition(_pe);
      chain[i - 1].getWorldPosition(_v1);
      alcance += _pe.distanceTo(_v1);
    }
    end.getWorldPosition(_pe);
    chain[chain.length - 1].getWorldPosition(_v1);
    alcance += _pe.distanceTo(_v1);
    if (endOffset) alcance += endOffset.length();
    // 0,98: encostar no limite exato deixa a cadeia perfeitamente reta, e cadeia reta é
    // singular pro CCD (o eixo do produto vetorial vira ruído). 2% de folga mantém um
    // resíduo de flexão no cotovelo e a solução estável.
    alcance *= 0.98;
    _v2.subVectors(targetWorld, _pj);
    const d = _v2.length();
    if (d > alcance && alcance > 1e-5) {
      _v2.multiplyScalar(alcance / d);
      targetWorld = _tgt.copy(_pj).add(_v2);
      alcanceUsado = { pedido: d, alcance };
    }
  }

  for (let it = 0; it < iterations; it++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const joint = chain[i];
      joint.getWorldPosition(_pj);
      const e = effWorld();
      _v1.subVectors(e, _pj);
      _v2.subVectors(targetWorld, _pj);
      const l1 = _v1.length(), l2 = _v2.length();
      if (l1 < 1e-6 || l2 < 1e-6) continue;
      _v1.divideScalar(l1); _v2.divideScalar(l2);
      let dot = Math.max(-1, Math.min(1, _v1.dot(_v2)));
      let angle = Math.acos(dot);
      if (angle < 1e-4) continue;
      if (angle > maxStep) angle = maxStep;
      _axis.crossVectors(_v1, _v2);
      if (_axis.lengthSq() < 1e-10) continue;
      _axis.normalize();
      _q.setFromAxisAngle(_axis, angle);              // world-space delta
      joint.getWorldQuaternion(_wq);
      _wq.premultiply(_q);                            // new world orientation
      if (joint.parent) {
        joint.parent.getWorldQuaternion(_pwq).invert();
        joint.quaternion.copy(_pwq).multiply(_wq).normalize();
      } else {
        joint.quaternion.copy(_wq).normalize();
      }
      joint.updateWorldMatrix(false, true);
    }
    if (effWorld().distanceToSquared(targetWorld) < 1e-6) break;
  }
  // devolve o recorte para quem quiser MEDIR (invariante C4/CHR4): `null` = alvo estava
  // ao alcance; objeto = quanto o alvo excedia o braço.
  return alcanceUsado;
}
