import assert from './portable-assert.mjs';
const array = value => Array.from(value);
const descendants = root => {const result = new Set(); root.traverse(o => result.add(o)); return result;};
const bodyOf = (root, name) => {
  const found = []; root.traverse(o => {if (o.isSkinnedMesh && o.name === name) found.push(o);});
  assert.equal(found.length, 1, 'body identity ambiguous/missing'); return found[0];
};
function assertNoMorph(mesh) {
  const empty = value => value && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === 0;
  assert.ok(empty(mesh.geometry.morphAttributes) && mesh.geometry.morphTargetsRelative === false
    && (mesh.morphTargetInfluences === undefined || Array.isArray(mesh.morphTargetInfluences) && mesh.morphTargetInfluences.length === 0)
    && (mesh.morphTargetDictionary === undefined || empty(mesh.morphTargetDictionary)), 'morph geometry/state unsupported');
}
function geometrySignature(geometry) {
  const describe = attribute => {
    const interleaved = attribute?.isInterleavedBufferAttribute === true;
    assert.ok(interleaved || attribute?.isBufferAttribute, 'BufferAttribute required');
    assert.ok(ArrayBuffer.isView(attribute.array) && !(attribute.array instanceof DataView), 'typed attribute required');
    const stride = interleaved ? attribute.data.stride : attribute.itemSize, offset = interleaved ? attribute.offset : 0;
    assert.ok(Number.isSafeInteger(attribute.itemSize) && attribute.itemSize > 0 && Number.isSafeInteger(attribute.count)
      && Number.isSafeInteger(stride) && stride > 0 && Number.isSafeInteger(offset) && offset >= 0
      && offset + attribute.itemSize <= stride && attribute.count * stride === attribute.array.length, 'attribute shape/stride mismatch');
    assert.ok(typeof attribute.normalized === 'boolean', 'attribute normalized flag invalid');
    assert.ok(array(attribute.array).every(Number.isFinite), 'attribute values must be finite');
    return {type: attribute.array.constructor.name, size: attribute.itemSize, normalized: attribute.normalized, stride, offset, count: attribute.count, values: array(attribute.array)};
  };
  const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([name, a]) => [name, describe(a)]));
  const index = geometry.index ? describe(geometry.index) : null;
  assert.ok(attributes.position?.size === 3, 'position shape mismatch');
  const count = geometry.attributes.position.count;
  assert.ok(Object.values(geometry.attributes).every(a => a.count === count), 'attribute vertex count mismatch');
  if (index) assert.ok(index.size === 1 && !index.normalized && index.values.every(i => Number.isSafeInteger(i) && i >= 0 && i < count), 'index domain mismatch');
  return JSON.stringify({index, attributes});
}
function rigSignature(mesh) {
  const bones = mesh.skeleton.bones;
  assert.equal(new Set(bones).size, bones.length, 'duplicate bone object');
  assert.equal(new Set(bones.map(b => b.name)).size, bones.length, 'ambiguous bone names');
  return bones.map((b, index) => ({name: b.name, parent: bones.indexOf(b.parent), parentName: b.parent?.name, inverse: mesh.skeleton.boneInverses[index].toArray()}));
}
export function prepareLoadedGarment({THREE, base, source, family, contract}) {
  family = structuredClone(family); contract = structuredClone(contract);
  assert.equal(family.version, 'known-family/1'); assert.equal(contract.version, 'garment-rebind-draft/1');
  assert.equal(contract.family, family.family, 'family mismatch'); assert.equal(contract.fit, family.fit, 'fit mismatch');
  assert.equal(contract.sourceAssetSha256, family.sourceAssetSha256, 'base hash contract mismatch');
  assert.equal(contract.sourceBindFingerprintSha256, family.bindFingerprintSha256, 'bind contract mismatch');
  assert.equal(contract.fitApproved, false); assert.equal(contract.artApproved, false); assert.equal(contract.runtimeEnabled, false);
  assert.equal(contract.maskApproved, false); assert.deepEqual(contract.hideTriangleIDs, []);
  base.scene.updateMatrixWorld(true); source.scene.updateMatrixWorld(true);
  const baseBody = bodyOf(base.scene, family.bodyMeshName), meshes = [];
  source.scene.traverse(o => {if (o.isMesh) meshes.push(o);});
  assert.equal(meshes.length, 1, 'standalone contains extra body/mesh');
  const garment = meshes[0]; assert.ok(garment.isSkinnedMesh); assert.equal(garment.name, contract.meshName);
  assertNoMorph(baseBody);
  assertNoMorph(garment);
  assert.equal(source.animations.length, 0, 'standalone must not drive animations');
  assert.ok(!Array.isArray(garment.material), 'single untextured material required');
  assert.ok(!Object.values(garment.material).some(v => v?.isTexture), 'textured material ownership unsupported');
  assert.deepEqual(garment.matrix.toArray(), contract.meshLocalMatrix, 'garment node transform mismatch');
  const expectedRig = rigSignature(baseBody), sourceRig = rigSignature(garment);
  assert.deepEqual(sourceRig, expectedRig, 'authoring skeleton differs from verified base bind/hierarchy');
  assert.deepEqual(contract.joints.map(j => [j.index, j.name]), expectedRig.map((j, i) => [i, j.name]), 'joint map mismatch');
  assert.deepEqual(garment.bindMatrix.toArray(), baseBody.bindMatrix.toArray(), 'authoring bindMatrix mismatch');
  for (const joint of contract.joints) {
    const b = baseBody.skeleton.bones[joint.index], g = garment.skeleton.bones[joint.index];
    assert.equal(base.parser.associations.get(b)?.nodes, joint.sourceNode, 'source joint node map mismatch');
    assert.equal(source.parser.associations.get(g)?.nodes, joint.standaloneNode, 'standalone joint node map mismatch');
    assert.deepEqual(g.matrix.toArray(), b.matrix.toArray(), 'authoring local joint transform mismatch');
  }
  const baseGeometry = geometrySignature(baseBody.geometry), owned = new WeakSet();
  function attach(ctrl, request = {family: family.family, fit: family.fit}) {
    assert.equal(request.family, family.family, 'target family mismatch'); assert.equal(request.fit, family.fit, 'target fit mismatch');
    const owner = ctrl?.model;
    assert.ok(owner && ctrl?.group && ctrl?.mixer?.getRoot() === owner, 'actual controller required');
    assert.ok(ctrl.group.children.includes(owner), 'model not owned by controller');
    assert.ok(!owned.has(owner), 'garment already attached to this model');
    const body = bodyOf(owner, family.bodyMeshName), members = descendants(owner), bones = body.skeleton.bones;
    assertNoMorph(body);
    assert.equal(geometrySignature(body.geometry), baseGeometry, 'target body geometry/weights mismatch');
    assert.deepEqual(rigSignature(body), expectedRig, 'target rig/bind mismatch');
    assert.deepEqual(body.bindMatrix.toArray(), baseBody.bindMatrix.toArray(), 'target bindMatrix mismatch');
    assert.ok(bones.every(b => members.has(b)), 'target uses cache/foreign bones');
    for (const bone of bones) {
      assert.notEqual(bone, baseBody.skeleton.bones[bones.indexOf(bone)], 'target stole authoring bones');
      assert.equal([...members].filter(o => o.isBone && o.name === bone.name).length, 1, 'target ambiguous bone name');
    }
    const geometry = garment.geometry.clone(), material = garment.material.clone();
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = contract.meshName; mesh.position.copy(garment.position); mesh.quaternion.copy(garment.quaternion); mesh.scale.copy(garment.scale);
    mesh.castShadow = true; mesh.frustumCulled = false;
    const skeleton = new THREE.Skeleton(bones.slice(), garment.skeleton.boneInverses.map(m => m.clone()));
    mesh.bind(skeleton, garment.bindMatrix.clone());
    owner.add(mesh); owned.add(owner);
    let disposed = false;
    return {mesh, dispose() {
      if (disposed) return; disposed = true;
      mesh.removeFromParent(); geometry.dispose(); material.dispose(); skeleton.dispose(); owned.delete(owner);
    }};
  }
  return {attach};
}
