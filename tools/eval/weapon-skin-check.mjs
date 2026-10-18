import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import { WEAPON_SKINS, applyWeaponSkinCandidate, reviewWeaponSkinId } from '../../public/js/weapon-skins.js';

const TARGETS = Object.freeze({
  'ondas-cariocas': 'm4',
  'mosaico-paulista': 'scar',
  'nacao-rubro-negra': 'ak',
  'alvinegra-paulista': 'ak',
  'celeste-mineira': 'ak',
  'tricolor-gaucha': 'ak',
  'tricolor-baiana': 'ak',
  'verde-alviverde': 'ak',
  'tricolor-morumbi': 'ak',
  'alvinegra-praiana': 'ak',
});
const CLUB_SKINS = new Set([
  'nacao-rubro-negra',
  'alvinegra-paulista',
  'celeste-mineira',
  'tricolor-gaucha',
  'tricolor-baiana',
  'verde-alviverde',
  'tricolor-morumbi',
  'alvinegra-praiana',
]);
const SHADER_TOKENS = Object.freeze({
  'ondas-cariocas': 'rioPhase',
  'mosaico-paulista': 'paulistaCell',
  'nacao-rubro-negra': 'rubroWave',
  'alvinegra-paulista': 'alvinegraWave',
  'celeste-mineira': 'celestePhase',
  'tricolor-gaucha': 'gauchaBand',
  'tricolor-baiana': 'baianaBand',
  'verde-alviverde': 'palmeirasBand',
  'tricolor-morumbi': 'spfcBand',
  'alvinegra-praiana': 'santosWave',
});

function validate(definition, expectedId, expectedWeapon) {
  assert.equal(definition.id, expectedId);
  assert.equal(definition.status, CLUB_SKINS.has(expectedId) ? 'permission-needed' : 'candidate');
  assert.equal(definition.approved, false);
  assert.equal(definition.certified, false);
  assert.equal(definition.runtimeEnabled, false);
  assert.deepEqual([...definition.targetWeapons], [expectedWeapon]);
  if (CLUB_SKINS.has(expectedId)) {
    assert.equal(definition.designOrigin, 'project-colorway-with-official-mark');
    assert.equal(definition.rightsStatus, 'permission-needed');
    assert.equal(definition.requiresLicenseForOfficialMarks, true);
    assert.equal(definition.officialMarksIncluded, true);
    assert.equal(definition.markPlacement, 'stock');
    assert.ok(definition.markAsset.startsWith('/textures/weapon-skins/club-marks/'));
    assert.ok(existsSync(`public${definition.markAsset}`), `${expectedId}: escudo ausente`);
    assert.match(definition.markSourceUrl, /^https:\/\//);
  } else {
    assert.equal(definition.designOrigin, 'project-owned');
    assert.match(definition.inspiration, /original/);
  }
}

if (process.argv.includes('--mutate')) {
  const mutants = [
    ['approved', { ...WEAPON_SKINS['ondas-cariocas'], approved: true }],
    ['runtime', { ...WEAPON_SKINS['ondas-cariocas'], runtimeEnabled: true }],
    ['universal', { ...WEAPON_SKINS['ondas-cariocas'], targetWeapons: ['m4', 'ak'] }],
    ['borrowed', { ...WEAPON_SKINS['ondas-cariocas'], designOrigin: 'third-party-reference' }],
  ];
  for (const [name, mutant] of mutants) assert.throws(() => validate(mutant, 'ondas-cariocas', 'm4'), undefined, `${name}: mutante sobreviveu`);
  console.log(`weapon-skin mutate: ${mutants.length}/${mutants.length} killed`);
  process.exit(0);
}

for (const [skinId, weaponId] of Object.entries(TARGETS)) validate(WEAPON_SKINS[skinId], skinId, weaponId);
assert.equal(reviewWeaponSkinId(), null, 'skin de revisão não pode ligar fora do navegador debug');
const sourceMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8, metalness: 0.7 });
for (const [skinId, weaponId] of Object.entries(TARGETS)) {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial));
  assert.equal(applyWeaponSkinCandidate(model, weaponId, skinId), true, `${skinId}: aplicação falhou`);
  const material = model.children[0].material;
  assert.notEqual(material, sourceMaterial, `${skinId}: material compartilhado não foi clonado`);
  assert.equal(material.userData.weaponSkin, skinId);
  const shader = {
    vertexShader: 'void main() {\n#include <begin_vertex>\n}',
    fragmentShader: 'void main() {\n#include <map_fragment>\n}',
  };
  material.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /vWeaponSkinLocal = position/);
  assert.match(shader.fragmentShader, new RegExp(SHADER_TOKENS[skinId]));
}
assert.equal(sourceMaterial.map, null, 'skin vazou para o material original');
const incompatible = new THREE.Group();
incompatible.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial));
assert.equal(applyWeaponSkinCandidate(incompatible, 'ak', 'ondas-cariocas'), false);
assert.equal(incompatible.children[0].material, sourceMaterial);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const audits = [];
for (const weaponId of [...new Set(Object.values(TARGETS))]) {
  const doc = await io.read(`public/models/weapons/${weaponId}.glb`);
  const primitives = doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives());
  assert.ok(primitives.length > 0, `${weaponId}: sem primitivas`);
  assert.ok(primitives.every((primitive) => primitive.getAttribute('POSITION')), `${weaponId}: sem posições completas`);
  audits.push(`${weaponId}:${primitives.length}`);
}
console.log(`weapon-skin check: ${Object.keys(TARGETS).length} candidates, models=${audits.join(',')}, official-marks=${CLUB_SKINS.size}, permission-needed=${CLUB_SKINS.size}, runtime=0`);
