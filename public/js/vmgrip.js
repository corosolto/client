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

// #991: reautoriza a pega K sem deslocar a lâmina nem alterar o tempo dos golpes.
export function corrigirPegaFaca(gltf) {
  if (!PEGAS_ATIVAS) return false;
  const cavityLocal = [-9.5, -6.5, 0];
  const scene = gltf.scene, blade = scene.getObjectByName('MELEE_KNIFE');
  const hand = scene.getObjectByName('hand_r'), upper = scene.getObjectByName('upperarm_r');
  const lower = scene.getObjectByName('lowerarm_r');
  const twist = scene.getObjectByName('lowerarm_twist_01_r');
  if (!blade || !hand || !upper || !lower || !twist || scene.userData.knifeGripCorrected) return false;
  const index = scene.getObjectByName('index_01_r'), pinky = scene.getObjectByName('pinky_01_r');
  if (!index || !pinky) return false;
  const handle = referencialCaboFaca(blade.geometry), grip = handle.centre;
  const mixer = new THREE.AnimationMixer(scene);
  const rotation = (node) => node.getWorldQuaternion(new THREE.Quaternion());
  const at = (node) => node.getWorldPosition(new THREE.Vector3());
  const setWorld = (bone, quaternion) => {
    bone.quaternion.copy(rotation(bone.parent).invert().multiply(quaternion));
    scene.updateMatrixWorld(true);
  };
  const corrections = [];
  const bones = [upper, lower, hand, twist];
  const skeleton = scene.getObjectByName('GEO_FP_SK_Glove_01').skeleton;
  const bindWorld = (bone) => skeleton.boneInverses[skeleton.bones.indexOf(bone)].clone().invert();
  const lowerBindInverse = bindWorld(lower).invert();
  const bindRotation = (bone) => {
    const quaternion = new THREE.Quaternion();
    lowerBindInverse.clone().multiply(bindWorld(bone)).decompose(new THREE.Vector3(), quaternion, new THREE.Vector3());
    return quaternion;
  };
  const handBind = bindRotation(hand), twistBind = bindRotation(twist);
  for (const clip of gltf.animations) {
    const source = clip.tracks.find((track) => track.name === `${hand.name}.quaternion`);
    if (!source) throw Error(`faca sem rotação do punho em ${clip.name}`);
    const values = bones.map(() => []);
    const action = mixer.clipAction(clip).reset().play();
    for (const time of source.times) {
      mixer.setTime(Math.min(time, clip.duration - 1e-6)); scene.updateMatrixWorld(true);
      const across = at(index).sub(at(pinky)).normalize();
      const shaft = handle.axis.clone().transformDirection(blade.matrixWorld);
      if (shaft.dot(across) < 0) shaft.negate();
      const scale = hand.getWorldScale(new THREE.Vector3());
      const centre = grip.clone().applyMatrix4(blade.matrixWorld).addScaledVector(shaft, -cavityLocal[2] * scale.z);
      const a = at(upper), b = at(lower), c = at(hand);
      const first = a.distanceTo(b), second = b.distanceTo(c);
      const targetRotation = new THREE.Quaternion().setFromUnitVectors(across, shaft).multiply(rotation(hand));
      const localCavity = new THREE.Vector3(cavityLocal[0], cavityLocal[1], 0).multiply(scale);
      const target = centre.clone().sub(localCavity.clone().applyQuaternion(targetRotation));
      const reach = first + second - 1e-4;
      if (a.distanceTo(target) > reach) {
        const desired = a.clone().sub(centre);
        desired.addScaledVector(shaft, -desired.dot(shaft)).normalize();
        const radial = target.clone().sub(centre).normalize();
        const turn = Math.atan2(shaft.dot(radial.clone().cross(desired)), radial.dot(desired));
        const start = targetRotation.clone();
        const atRoll = (angle) => centre.clone().sub(localCavity.clone().applyQuaternion(
          new THREE.Quaternion().setFromAxisAngle(shaft, angle).multiply(start)));
        let low = 0, high = 1;
        if (a.distanceTo(atRoll(turn)) <= reach) {
          for (let step = 0; step < 16; step++) {
            const middle = (low + high) / 2;
            if (a.distanceTo(atRoll(turn * middle)) > reach) low = middle; else high = middle;
          }
        }
        targetRotation.copy(new THREE.Quaternion().setFromAxisAngle(shaft, turn * high).multiply(start));
        target.copy(atRoll(turn * high));
      }
      const offset = target.clone().sub(a), axial = offset.dot(shaft);
      if (offset.lengthSq() > reach * reach) {
        const discriminant = axial * axial - offset.lengthSq() + reach * reach;
        if (discriminant < 0) throw Error(`faca fora do alcance em ${clip.name}`);
        target.addScaledVector(shaft, -axial + Math.sign(axial) * Math.sqrt(discriminant));
      }
      const distance = a.distanceTo(target);
      const direction = target.clone().sub(a).normalize();
      const pole = b.clone().sub(a);
      pole.addScaledVector(direction, -pole.dot(direction)).normalize();
      const cosine = (first * first + distance * distance - second * second) / (2 * first * distance);
      const elbow = a.clone().addScaledVector(direction, first * cosine).addScaledVector(pole, first * Math.sqrt(1 - cosine * cosine));
      setWorld(upper, new THREE.Quaternion().setFromUnitVectors(b.clone().sub(a).normalize(), elbow.clone().sub(a).normalize()).multiply(rotation(upper)));
      const nowB = at(lower), nowC = at(hand);
      setWorld(lower, new THREE.Quaternion().setFromUnitVectors(nowC.clone().sub(nowB).normalize(), target.clone().sub(nowB).normalize()).multiply(rotation(lower)));
      setWorld(hand, targetRotation);
      const delta = hand.quaternion.clone().multiply(handBind.clone().invert());
      const torsion = new THREE.Quaternion(delta.x, 0, 0, delta.w).normalize();
      twist.quaternion.copy(new THREE.Quaternion().slerp(torsion, 0.5).multiply(twistBind));
      bones.forEach((bone, i) => values[i].push(...bone.quaternion.toArray()));
    }
    corrections.push({ clip, tracks: bones.map((bone, i) => new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, source.times.slice(), values[i])) });
    action.stop();
  }
  mixer.stopAllAction(); mixer.uncacheRoot(scene);
  for (const { clip, tracks } of corrections) {
    const names = new Set(tracks.map((track) => track.name));
    clip.tracks = [...clip.tracks.filter((track) => !names.has(track.name)), ...tracks];
  }
  scene.userData.knifeGripCorrected = true;
  return true;
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
