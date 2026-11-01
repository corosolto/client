import * as THREE from 'three';
import { VM_WEAPON } from './data/vmconfig.js';
import { GOLDEN_VER } from './data/goldenver.js';

// Boca medida na face do cano, no espaço do Rifle e fixada à revisão do asset.
// R106/R107: rig/revisão diferente conserva o fallback e exige nova calibração.
export function attachGoldenBarrel(entry) {
  if (entry?.key !== 'gold#ak' || entry.golden !== true) return null;
  const spec = VM_WEAPON.ak.bocaGolden;
  if (!spec || spec.revision !== GOLDEN_VER.ak) return null;
  const bodies = (entry.weaponMeshes || []).filter(m => m.name === spec.mesh);
  const body = bodies.length === 1 ? bodies[0] : null;
  const bone = body?.skeleton?.bones?.[spec.boneIndex];
  const identity = new THREE.Matrix4().elements;
  if (!body?.isSkinnedMesh || body.bindMode !== 'attached'
      || body.geometry?.attributes?.position?.count !== spec.vertices
      || !body.bindMatrix.elements.every((v, i) => v === identity[i])
      || body.geometry.morphAttributes.position?.length || body.morphTargetInfluences?.length
      || !bone?.isBone || bone.name !== spec.bone
      || body.skeleton.bones.filter(b => b.name === spec.bone).length !== 1
      || !Array.isArray(spec.point) || spec.point.length !== 3 || !spec.point.every(Number.isFinite)) return null;
  // Factory de cada cópia: não recria sockets ao disparar ou reequipar.
  const current = entry.sockets?.boca;
  if (current?.name === 'SOCKET_GOLD_BARREL' && current.parent === bone) return current;
  const socket = new THREE.Object3D();
  socket.name = 'SOCKET_GOLD_BARREL';
  socket.position.fromArray(spec.point);
  bone.add(socket);
  entry.sockets = { ...entry.sockets, boca: socket };
  return socket;
}
