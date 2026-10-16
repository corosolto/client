import * as THREE from 'three';

export const PEGAS_ATIVAS = typeof location === 'undefined' || new URLSearchParams(location.search).get('vmgrip') !== '0';

export function referencialCaboFaca(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox, span = (box.max.z - box.min.z) / 3;
  const ends = [new THREE.Box3(), new THREE.Box3()];
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, i);
    if (point.z < box.min.z + span * 0.2) ends[0].expandByPoint(point);
    if (point.z > box.min.z + span * 0.8 && point.z < box.min.z + span) ends[1].expandByPoint(point);
  }
  const start = ends[0].getCenter(new THREE.Vector3()), finish = ends[1].getCenter(new THREE.Vector3());
  return { centre: start.clone().add(finish).multiplyScalar(0.5), axis: finish.sub(start).normalize() };
}

// #991: afasta a falange proximal do guarda-mato e mantém a ponta junto ao gatilho.
export function corrigirPegaRevolver(gltf) {
  if (!PEGAS_ATIVAS) return false;
  if (gltf.scene.userData.revolverGripCorrected) return false;
  const offsets = new Map([
    ['index_01_r.quaternion', new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.1, -0.5))],
    ['index_02_r.quaternion', new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.6)],
    ['index_03_r.quaternion', new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.6)],
  ]);
  for (const clip of gltf.animations) for (const track of clip.tracks) {
    const offset = offsets.get(track.name);
    if (!offset) continue;
    for (let i = 0; i < track.values.length; i += 4) {
      new THREE.Quaternion().fromArray(track.values, i).multiply(offset).normalize().toArray(track.values, i);
    }
  }
  gltf.scene.userData.revolverGripCorrected = true;
  return true;
}
