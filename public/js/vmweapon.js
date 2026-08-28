// Identidade Mint no viewmodel pago (BUG-75 M3): a malha da PRÓPRIA arma entra
// no socket da mão do pack; a genérica KINEMATION fica oculta atrás dela.
import * as THREE from 'three';
import { weaponModel } from './weapons.js';
import { VM_FAMILY, VM_WEAPON } from './data/vmconfig.js';

const DEG = Math.PI / 180;
const _q = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Raiz da arma do pack no GLB: SOCKET_WEAPON_* (ou a própria rig quando o FBX
// exporta a armature como raiz). É ela que cavalga o ik_hand_gun desde o M1.
export function weaponSocketOf(entry) {
  if (entry._weaponSocket !== undefined) return entry._weaponSocket;
  let socket = null;
  let rig = null;
  entry.scene.traverse((node) => {
    if (!socket && /^SOCKET_WEAPON_/.test(node.name)) socket = node;
    if (!rig && /^RIG_WEAPON_/.test(node.name)) rig = node;
  });
  entry._weaponSocket = socket || rig || null;
  return entry._weaponSocket;
}

function hidePackGun(entry) {
  for (const mesh of entry.weaponMeshes) {
    if (!/^UTILITY_/.test(mesh.name)) mesh.visible = false;
  }
}

// Base automática do encaixe: leva o -Z (cano) e +Y da câmera para o LOCAL do
// socket no idle — alinha o wrap Mint sem calibração; mount/trim são resíduo.
function autoBasis(entry, socket) {
  entry.scene.updateMatrixWorld(true);
  socket.getWorldQuaternion(_q);
  const inverse = _q.clone().invert();
  _z.set(0, 0, -1).applyQuaternion(inverse).normalize();
  _y.set(0, 1, 0).applyQuaternion(inverse);
  _y.addScaledVector(_z, -_y.dot(_z)).normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  return new THREE.Quaternion().setFromRotationMatrix(_m);
}

// Tier 2 (config-gated): separa triângulos dentro da caixa (gun-space, metros)
// num mesh próprio parentado ao bone da arma do pack (Mag/Charge) — o resto fica.
export function splitParts(entry, wrap, partsCfg) {
  if (!partsCfg) return false;
  const socket = weaponSocketOf(entry);
  if (!socket) return false;
  let did = false;
  for (const [part, spec] of Object.entries(partsCfg)) {
    if (!spec?.box || !spec.bone) continue;
    const bone = entry.scene.getObjectByName(spec.bone);
    const mesh = wrap.getObjectByProperty('isMesh', true);
    if (!bone || !mesh?.geometry) continue;
    try {
      const box = new THREE.Box3(
        new THREE.Vector3(...spec.box.min),
        new THREE.Vector3(...spec.box.max),
      );
      const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const pos = source.attributes.position;
      const inside = [];
      const outside = [];
      wrap.updateMatrixWorld(true);
      const toGun = wrap.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i).applyMatrix4(toGun);
        b.fromBufferAttribute(pos, i + 1).applyMatrix4(toGun);
        c.fromBufferAttribute(pos, i + 2).applyMatrix4(toGun);
        const centroid = a.add(b).add(c).multiplyScalar(1 / 3);
        (box.containsPoint(centroid) ? inside : outside).push(i);
      }
      if (!inside.length) continue;
      const build = (triangles) => {
        const geometry = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(source.attributes)) {
          const item = attribute.itemSize;
          const array = new attribute.array.constructor(triangles.length * 3 * item);
          let cursor = 0;
          for (const start of triangles) {
            for (let vertex = 0; vertex < 3; vertex += 1) {
              for (let lane = 0; lane < item; lane += 1) {
                array[cursor] = attribute.array[(start + vertex) * item + lane];
                cursor += 1;
              }
            }
          }
          geometry.setAttribute(name, new THREE.BufferAttribute(array, item));
        }
        return geometry;
      };
      mesh.geometry = build(outside);
      const partMesh = new THREE.Mesh(build(inside), mesh.material);
      partMesh.name = `mint_part_${part}`;
      partMesh.frustumCulled = false;
      partMesh.castShadow = false;
      // O fragmento nasce no espaço do bone com o mesmo transform visual do wrap.
      bone.updateWorldMatrix(true, false);
      partMesh.matrix.copy(bone.matrixWorld.clone().invert().multiply(mesh.matrixWorld));
      partMesh.matrix.decompose(partMesh.position, partMesh.quaternion, partMesh.scale);
      bone.add(partMesh);
      wrap.userData.mintParts = wrap.userData.mintParts || [];
      wrap.userData.mintParts.push(partMesh);
      did = true;
    } catch (error) {
      console.warn(`[mint-viewmodel] Tier 2 falhou em ${part}; segue Tier 1`, error);
    }
  }
  return did;
}

// Monta (ou troca) a arma Mint do jogador no socket da família. Wraps ficam em
// cache por entry — ak→akm troca de malha sem recarregar a família.
export function attachMintWeapon(entry, weaponId) {
  const weaponConfig = VM_WEAPON[weaponId];
  const familyConfig = weaponConfig && VM_FAMILY[weaponConfig.family];
  const socket = weaponSocketOf(entry);
  if (!weaponConfig || !familyConfig || !socket) return null;
  hidePackGun(entry);

  let mint = entry.mint;
  if (!mint) {
    mint = entry.mint = { holder: new THREE.Group(), wraps: new Map(), weaponId: '' };
    mint.holder.name = 'mint_weapon_holder';
  }
  if (mint.holder.parent !== socket) socket.add(mint.holder);

  const basis = autoBasis(entry, socket);
  socket.getWorldScale(_scale);
  const worldScale = Math.max(1e-6, (_scale.x + _scale.y + _scale.z) / 3);
  const mountRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    familyConfig.mount.rotDeg[0] * DEG,
    familyConfig.mount.rotDeg[1] * DEG,
    familyConfig.mount.rotDeg[2] * DEG,
  ));
  mint.holder.quaternion.copy(basis.multiply(mountRot));
  // mount.pos é dado em METROS; o socket vive na escala da armature (÷worldScale).
  mint.holder.position.set(...familyConfig.mount.pos).divideScalar(worldScale);
  mint.holder.scale.setScalar(familyConfig.mount.scale / worldScale);

  let wrap = mint.wraps.get(weaponId);
  if (!wrap) {
    wrap = weaponModel(weaponId);
    if (!wrap) return null;
    wrap.name = `mint_weapon_${weaponId}`;
    if (weaponConfig.parts) splitParts(entry, wrap, weaponConfig.parts);
    mint.wraps.set(weaponId, wrap);
    mint.holder.add(wrap);
  }
  // Trim reaplicado a cada attach: o editor calibra ao vivo mutando o vmconfig.
  const trim = weaponConfig.trim;
  wrap.position.set(...trim.pos);
  wrap.rotation.set(trim.rotDeg[0] * DEG, trim.rotDeg[1] * DEG, trim.rotDeg[2] * DEG);
  wrap.scale.setScalar((wrap.userData.metrics?.norm || 1) * trim.scale);
  for (const [id, candidate] of mint.wraps) {
    candidate.visible = id === weaponId;
    for (const part of candidate.userData.mintParts || []) part.visible = id === weaponId;
  }
  mint.weaponId = weaponId;
  mint.active = wrap;
  return wrap;
}

// Ponto medido (muzzle|sight) da arma Mint ativa no espaço da CÂMERA (vmScene).
// metrics.norm cancela a escala do wrap para a medida não entrar duas vezes.
export function mintPointScene(entry, kind) {
  const wrap = entry.mint?.active;
  const metrics = wrap?.userData?.metrics;
  if (!wrap || !metrics) return null;
  const point = (kind === 'sight' ? metrics.sight : metrics.muzzle).clone()
    .divideScalar(metrics.norm || 1);
  wrap.updateWorldMatrix(true, false);
  return wrap.localToWorld(point);   // vmScene == espaço da câmera
}

// Mesmo ponto em espaço de MUNDO — flash e tracer nascem da arma visível.
export function mintPointWorld(entry, kind, camera) {
  if (!camera) return null;
  const point = mintPointScene(entry, kind);
  return point ? camera.localToWorld(point) : null;
}
