import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareGarment} from './garment/node.mjs';
import {prepareLoadedGarment} from './garment/core.mjs';
import {exampleBytes, dependencies} from './garment/synthetic-profile.mjs';
import {TRUSTED_RECORD_JSON} from './garment/example-record.mjs';
const {THREE, parseGLB, clone} = await dependencies();
const record = JSON.parse(TRUSTED_RECORD_JSON);
async function fixture() {
  const kit = await prepareGarment({THREE, parseGLB, baseBytes: exampleBytes(), garmentBytes: exampleBytes(true)});
  const gltf = await parseGLB(exampleBytes()), model = clone(gltf.scene), group = new THREE.Group(); group.add(model);
  const ctrl = {model, group, mixer: new THREE.AnimationMixer(model)};
  return {kit, ctrl, body: model.getObjectByName('SyntheticBody')};
}
test('attach owns clone resources; idempotent dispose and reattach preserve body/cache', async () => {
  const {kit, ctrl, body} = await fixture(), originalGeometry = body.geometry, originalMaterial = body.material, bones = body.skeleton.bones.slice();
  const first = kit.attach(ctrl); let geometryDisposals = 0, materialDisposals = 0, skeletonDisposals = 0;
  first.mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  first.mesh.material.addEventListener('dispose', () => materialDisposals++);
  const disposeSkeleton = first.mesh.skeleton.dispose.bind(first.mesh.skeleton);
  first.mesh.skeleton.dispose = () => {skeletonDisposals++; disposeSkeleton();};
  assert.notEqual(first.mesh.geometry, originalGeometry); assert.notEqual(first.mesh.material, originalMaterial);
  assert.deepEqual(first.mesh.skeleton.bones, bones); assert.equal(first.mesh.parent, ctrl.model);
  assert.throws(() => kit.attach(ctrl), /already attached/);
  first.dispose(); first.dispose(); assert.deepEqual([geometryDisposals, materialDisposals, skeletonDisposals], [1, 1, 1]);
  assert.equal(first.mesh.parent, null); assert.equal(body.geometry, originalGeometry); assert.equal(body.material, originalMaterial);
  assert.deepEqual(body.skeleton.bones, bones); const second = kit.attach(ctrl); second.dispose();
});
test('two cloned targets remain independent and follow their own joint', async () => {
  const {kit, ctrl, body} = await fixture(), other = await fixture(), a = kit.attach(ctrl), b = kit.attach(other.ctrl);
  assert.notEqual(a.mesh.skeleton.bones[0], b.mesh.skeleton.bones[0]);
  body.skeleton.bones[0].position.x = 0.5; ctrl.model.updateMatrixWorld(true); a.mesh.skeleton.update();
  const point = a.mesh.applyBoneTransform(0, new THREE.Vector3()); assert.equal(point.x, 0.5);
  assert.equal(other.body.skeleton.bones[0].position.x, 0); a.dispose(); assert.equal(b.mesh.parent, other.ctrl.model); b.dispose();
});
const mutants = {
  position: b => {b.geometry.attributes.position.array[0] = 0.01;},
  weights: b => {b.geometry.attributes.skinWeight.array[0] = 0.5;},
  normalized: b => {b.geometry.attributes.skinWeight.normalized = true;},
  index: b => {b.geometry.setIndex([0, 1, 3]);},
  inverseBind: b => {b.skeleton.boneInverses[0].elements[12] = 1;},
  bindMatrix: b => {b.bindMatrix.elements[12] = 1;},
  hierarchy: b => {b.skeleton.bones[0].remove(b.skeleton.bones[1]);},
  foreignBone: b => {b.skeleton.bones[0] = new THREE.Bone(); b.skeleton.bones[0].name = 'Hips';},
  morph: b => {b.geometry.morphAttributes.position = [b.geometry.attributes.position.clone()];},
};
for (const [name, mutate] of Object.entries(mutants)) test('target mutation refused: ' + name, async () => {
  const {kit, ctrl, body} = await fixture(); mutate(body); assert.throws(() => kit.attach(ctrl));
  assert.equal(ctrl.model.getObjectByName('SyntheticGarment'), undefined);
});
for (const name of ['missingOwner', 'wrongMixer', 'duplicateName', 'family', 'fit']) test('ownership/request refused: ' + name, async () => {
  const {kit, ctrl, body} = await fixture(); let request;
  if (name === 'missingOwner') ctrl.group.remove(ctrl.model);
  if (name === 'wrongMixer') ctrl.mixer = new THREE.AnimationMixer(new THREE.Group());
  if (name === 'duplicateName') {const bone = new THREE.Bone(); bone.name = body.skeleton.bones[0].name; ctrl.model.add(bone);}
  if (name === 'family') request = {family: 'wrong', fit: record.family.fit};
  if (name === 'fit') request = {family: record.family.family, fit: 'wrong'};
  assert.throws(() => kit.attach(ctrl, request));
});
for (const kind of ['extraMesh', 'animation', 'texture', 'jointTRS', 'approval', 'hide']) test('authoring domain refused: ' + kind, async () => {
  const base = await parseGLB(exampleBytes()), source = await parseGLB(exampleBytes(true)), contract = structuredClone(record.contract);
  const mesh = source.scene.getObjectByName('SyntheticGarment');
  if (kind === 'extraMesh') source.scene.add(new THREE.Mesh());
  if (kind === 'animation') source.animations.push(new THREE.AnimationClip('not allowed', 1, []));
  if (kind === 'texture') mesh.material.map = new THREE.Texture();
  if (kind === 'jointTRS') {mesh.skeleton.bones[0].position.x = 1; mesh.skeleton.bones[0].updateMatrix();}
  if (kind === 'approval') contract.fitApproved = true;
  if (kind === 'hide') contract.hideTriangleIDs = [0];
  assert.throws(() => prepareLoadedGarment({THREE, base, source, family: record.family, contract}));
});
