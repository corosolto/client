import * as THREE from 'three';
import { attachMintWeapon } from '../../../public/js/vmweapon.js';
import { VM_WEAPON } from '../../../public/js/data/vmconfig.js';
import { setWeaponModel } from '../../../public/js/weapons.js';

// Igualdade aritmética da montagem, não tolerância estética. BUG-VM-FECHAMENTO-RUBEN.
const EPSILON = 64 * 2 ** -23;

function fixture(interleaved) {
  const scene = new THREE.Group(), socket = new THREE.Group();
  socket.name = 'SOCKET_WEAPON_TEST';
  socket.scale.setScalar(0.01);
  socket.rotation.y = Math.PI;
  scene.add(socket);
  const body = [0, 0.3, 0.4, 0.4, 0.3, 0.4, 0.2, 0, 0.4, 0.2, 0.6, 0.4, 0.2, 0.3, 0, 0.2, 0.3, 0.8];
  const positions = [...body, ...body.map((v, i) => v + [10, 20, 30][i % 3])];
  const count = positions.length / 3, bodyCount = body.length / 3;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const indices = [], weights = [], packed = [];
  for (let i = 0; i < count; i++) {
    const joint = i < bodyCount ? 1 : 0;
    indices.push(joint, 0, 0, 0);
    weights.push(1, 0, 0, 0);
    packed.push(0, 0, joint, 0, 0, 0, 1, 0, 0, 0, 0);
  }
  if (interleaved) {
    const buffer = new THREE.InterleavedBuffer(new Float32Array(packed), 11);
    geometry.setAttribute('skinIndex', new THREE.InterleavedBufferAttribute(buffer, 4, 2));
    geometry.setAttribute('skinWeight', new THREE.InterleavedBufferAttribute(buffer, 4, 6));
  } else {
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  }
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  const moving = new THREE.Bone(), neutral = new THREE.Bone();
  moving.name = 'Mag'; neutral.name = 'neutral_bone';
  socket.add(mesh, moving, neutral);
  scene.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([moving, neutral]));
  neutral.position.set(2, 3, 4);
  moving.position.set(7, 8, 9);
  scene.position.set(0.2, 0.4, -0.3);
  scene.rotation.set(0.1, -0.2, 0.3);
  scene.updateWorldMatrix(true, true);
  return { scene, socket, weaponMeshes: [mesh], expected: new THREE.Vector3(2.2, 3.3, 4.4) };
}

export function auditAuthoredAttach(attach = attachMintWeapon) {
  const checks = [];
  const check = (name, error) => checks.push({ name, error, ok: Number.isFinite(error) && error <= EPSILON });
  for (const weapon of ['deagle', 'revolver38', 'shotgun', 'g3']) {
    const source = new THREE.Group();
    source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.2), new THREE.MeshBasicMaterial()));
    setWeaponModel(weapon, source);
    const corrected = weapon === 'deagle' || weapon === 'revolver38';
    let packedPosition;
    for (const interleaved of [false, true]) {
      const entry = fixture(interleaved);
      const wrap = attach(entry, weapon);
      entry.scene.updateMatrixWorld(true);
      const center = new THREE.Box3().setFromObject(wrap).getCenter(new THREE.Vector3());
      entry.socket.worldToLocal(center);
      // Os controles conservam a âncora crua antiga; as duas famílias usam corpo deformado.
      const expected = corrected ? entry.expected : new THREE.Vector3(5.2, 10.3, 15.4);
      check(`${weapon}/${interleaved ? 'interleaved' : 'packed'}/center`, center.distanceTo(expected));
      if (interleaved) check(`${weapon}/representation`, center.distanceTo(packedPosition));
      else packedPosition = center.clone();
      if (corrected) {
        const matrix = entry.mint.holder.matrix.clone();
        entry.scene.rotation.set(0.31, -0.17, 0.12);
        entry.scene.position.set(0.2, -0.4, 0.1);
        entry.scene.updateMatrixWorld(true);
        attach(entry, weapon);
        entry.scene.updateMatrixWorld(true);
        check(`${weapon}/${interleaved ? 'interleaved' : 'packed'}/reattach`,
          Math.max(...matrix.elements.map((v, i) => Math.abs(v - entry.mint.holder.matrix.elements[i]))));
      }
    }
  }
  const original = VM_WEAPON.deagle.namedParts;
  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.2), new THREE.MeshBasicMaterial()));
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), new THREE.MeshBasicMaterial());
  magazine.name = 'GEO-test-magazine';
  magazine.position.set(0.1, -0.1, 0.02);
  source.add(magazine);
  setWeaponModel('deagle', source);
  try {
    delete VM_WEAPON.deagle.namedParts;
    const control = fixture(true);
    const controlWrap = attach(control, 'deagle');
    control.scene.updateMatrixWorld(true);
    const expected = controlWrap.getObjectByName(magazine.name).matrixWorld.clone();
    VM_WEAPON.deagle.namedParts = { mag: { mesh: magazine.name, bone: 'Mag' } };
    const entry = fixture(true), wrap = attach(entry, 'deagle');
    entry.scene.updateMatrixWorld(true);
    const bone = entry.scene.getObjectByName('Mag');
    const part = entry.scene.getObjectByName(magazine.name);
    const matrixError = (a, b) => Math.max(...a.elements.map((v, i) => Math.abs(v - b.elements[i])));
    check('named-part/parent', part.parent === bone ? 0 : 1);
    check('named-part/assembled-position', matrixError(part.matrixWorld, expected));
    const local = bone.matrixWorld.clone().invert().multiply(expected);
    bone.position.add(new THREE.Vector3(3, -2, 1));
    bone.rotation.set(0.3, -0.5, 0.7);
    entry.scene.updateMatrixWorld(true);
    check('named-part/follows-joint', matrixError(part.matrixWorld, bone.matrixWorld.clone().multiply(local)));
    attach(entry, 'deagle');
    entry.scene.updateMatrixWorld(true);
    check('named-part/reattach', matrixError(part.matrixWorld, bone.matrixWorld.clone().multiply(local)));
    check('named-part/unique', (wrap.userData.mintParts?.length || 0) === 1 ? 0 : 1);
    attach(entry, 'revolver38');
    check('named-part/hide', part.visible ? 1 : 0);
    attach(entry, 'deagle');
    check('named-part/show', part.visible ? 0 : 1);
  } finally {
    if (original === undefined) delete VM_WEAPON.deagle.namedParts;
    else VM_WEAPON.deagle.namedParts = original;
  }
  return { ok: checks.every((c) => c.ok), checks };
}
