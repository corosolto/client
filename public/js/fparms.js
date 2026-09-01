import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VERSION } from './version.js';
import { gripPoints, ONE_HANDED, PISTOLS } from './weapons.js';

export const FP_OFF = new URLSearchParams(location.search).get('fpoff') === '1';

let armsTemplate = null;
let armsLoading = null;
const loader = new GLTFLoader();
const target = new THREE.Vector3();
const support = new THREE.Vector3();
const temporaryQ = new THREE.Quaternion();
const localQ = new THREE.Quaternion();
const rootQ = new THREE.Quaternion();
const handRotation = new THREE.Euler();

export function preloadFPArms() {
  if (!armsLoading) {
    armsLoading = new Promise((resolve, reject) => loader.load(
      `models/viewmodels/fpvm_hands.glb?v=${VERSION}-anatomy4`, resolve, undefined, reject,
    )).then((asset) => { armsTemplate = asset.scene; }).catch((error) => {
      console.warn('[fparms] molde FP indisponível', error);
    });
  }
  return armsLoading;
}

function find(node, name) {
  let found = null;
  node.traverse((child) => { if (!found && child.name === name) found = child; });
  return found;
}

function cloneTemplate() {
  return skeletonClone(armsTemplate);
}

export function buildFPArms() {
  if (!armsTemplate) return null;
  const model = cloneTemplate();
  const right = find(model, 'FPVM_HAND_R');
  const left = find(model, 'FPVM_HAND_L');
  const reload = find(model, 'FPVM_RELOAD_PROPS');
  const magazine = find(model, 'FPVM_MAGAZINE');
  const bolt = find(model, 'FPVM_BOLT_HANDLE');
  if (!right || !left || !reload || !magazine || !bolt) return null;
  const group = new THREE.Group();
  group.name = 'fpvm.authored.hands';
  group.add(model);
  // O molde é modelado em escala de revisão; no espaço de arma real ele precisa
  // caber entre o gatilho e o guarda-mão, sem cobrir a tela.
  model.scale.setScalar(.27);
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.frustumCulled = false;
  });
  magazine.visible = false;
  bolt.visible = false;
  return { group, model, right, left, reload, magazine, bolt, currentWeapon: null };
}

function setHandWorld(arms, hand, worldPoint, weaponQ, rotation) {
  arms.group.updateWorldMatrix(true, false);
  hand.parent.worldToLocal(worldPoint);
  hand.position.copy(worldPoint);
  arms.group.getWorldQuaternion(rootQ).invert();
  localQ.copy(rootQ).multiply(weaponQ);
  handRotation.set(rotation[0], rotation[1], rotation[2], 'XYZ');
  hand.quaternion.copy(localQ.multiply(temporaryQ.setFromEuler(handRotation)));
}

function reloadPose(arms, rw, weaponId, reloadK) {
  const active = reloadK > 0 && reloadK < 1;
  arms.magazine.visible = active;
  arms.bolt.visible = active && reloadK > .72 && reloadK < .91;
  if (!active) return;
  // A mão direita fica no grip. A esquerda entra para manipular o pente e o
  // ferrolho, mantendo a arma inteira visível durante toda a recarga.
  arms.left.visible = true;
  const phase = reloadK < .28 ? reloadK / .28
    : reloadK < .62 ? 1 - (reloadK - .28) / .34 : 0;
  target.set(.10, -.14 - .16 * phase, .04 + .13 * phase);
  rw.localToWorld(target);
  arms.group.updateWorldMatrix(true, false);
  arms.reload.parent.worldToLocal(target);
  arms.reload.position.copy(target);
  rw.getWorldQuaternion(temporaryQ);
  arms.group.getWorldQuaternion(rootQ).invert();
  arms.reload.quaternion.copy(rootQ.multiply(temporaryQ));
  if (PISTOLS.has(weaponId)) arms.reload.rotation.x += .42 * phase;
  const handPhase = reloadK < .18 ? reloadK / .18
    : reloadK < .72 ? 1 : 1 - (reloadK - .72) / .28;
  support.set(PISTOLS.has(weaponId) ? -.075 : .035, -.08 - .11 * handPhase, .035 + .06 * handPhase);
  rw.localToWorld(support);
  rw.getWorldQuaternion(temporaryQ);
  setHandWorld(arms, arms.left, support, temporaryQ, [.22, 0, .38]);
}

export function poseToWeapon(arms, weaponGroup, weaponId, reloadK = 0) {
  if (!arms || !weaponGroup) return;
  const rw = weaponGroup.getObjectByName('rw') || weaponGroup;
  rw.updateWorldMatrix(true, false);
  rw.getWorldQuaternion(temporaryQ);
  const grip = gripPoints(weaponId);
  target.copy(grip.grip).add(new THREE.Vector3(0, -.045, .018));
  rw.localToWorld(target);
  setHandWorld(arms, arms.right, target, temporaryQ, [.05, 0, -.10]);

  const oneHanded = ONE_HANDED.has(weaponId);
  arms.left.visible = !oneHanded;
  if (!oneHanded && grip.fore) {
    support.copy(grip.fore).add(new THREE.Vector3(0, -.035, -.020));
    rw.localToWorld(support);
    setHandWorld(arms, arms.left, support, temporaryQ, [.20, 0, .30]);
  }
  if (weaponId === 'knife') {
    arms.left.visible = true;
    support.copy(grip.grip).add(new THREE.Vector3(.10, -.10, -.10));
    rw.localToWorld(support);
    setHandWorld(arms, arms.left, support, temporaryQ, [.45, 0, .70]);
  }
  reloadPose(arms, rw, weaponId, reloadK);
  arms.currentWeapon = weaponId;
}
