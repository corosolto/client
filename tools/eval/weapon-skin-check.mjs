import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import {
  WEAPON_SKINS,
  applyWeaponSkinCandidate,
  preloadWeaponSkinCandidate,
  reviewWeaponSkinId,
} from '../../public/js/weapon-skins.js';

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
  'trabalho-13-ak': 'ak',
  'trabalho-13-pistola': 'pistol',
  'estrela-vermelha-ak': 'ak',
  'estrela-vermelha-pistola': 'pistol',
  'estrela-verde-ak': 'ak',
  'estrela-verde-pistola': 'pistol',
  'brasil-22-ak': 'ak',
  'brasil-22-pistola': 'pistol',
  'ouro-ak': 'ak',
  'ouro-pistola': 'pistol',
  'prata-ak': 'ak',
  'prata-pistola': 'pistol',
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
const POLITICAL = Object.freeze({
  'trabalho-13-ak': ['trabalho-13', 'FAZ O L É LULA 13'],
  'trabalho-13-pistola': ['trabalho-13', 'FAZ O L É LULA 13'],
  'estrela-vermelha-ak': ['estrela-vermelha', 'O BRASIL É DOS BRASILEIROS'],
  'estrela-vermelha-pistola': ['estrela-vermelha', 'O BRASIL É DOS BRASILEIROS'],
  'estrela-verde-ak': ['estrela-verde', null],
  'estrela-verde-pistola': ['estrela-verde', null],
  'brasil-22-ak': ['brasil-22', 'O BRASIL É 22'],
  'brasil-22-pistola': ['brasil-22', 'O BRASIL É 22'],
});
const STORE_PRICES = Object.freeze({
  ...Object.fromEntries(Object.keys(POLITICAL).map((id) => [id, 500])),
  'ouro-ak': 900,
  'ouro-pistola': 900,
  'prata-ak': 500,
  'prata-pistola': 500,
});
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
  'trabalho-13-ak': 'trabalhoStripe',
  'trabalho-13-pistola': 'trabalhoStripe',
  'estrela-vermelha-ak': 'estrelaVermelhaBand',
  'estrela-vermelha-pistola': 'estrelaVermelhaBand',
  'estrela-verde-ak': 'estrelaVerdeBand',
  'estrela-verde-pistola': 'estrelaVerdeBand',
  'brasil-22-ak': 'brasilBand',
  'brasil-22-pistola': 'brasilBand',
  'ouro-ak': 'ouroBrush',
  'ouro-pistola': 'ouroBrush',
  'prata-ak': 'prataBrush',
  'prata-pistola': 'prataBrush',
});

function validate(definition, expectedId, expectedWeapon) {
  const storePrice = STORE_PRICES[expectedId] || null;
  assert.equal(definition.id, expectedId);
  assert.equal(definition.status, storePrice ? 'store-active' : CLUB_SKINS.has(expectedId) ? 'permission-needed' : 'candidate');
  assert.equal(definition.approved, !!storePrice);
  assert.equal(definition.certified, !!storePrice);
  assert.equal(definition.runtimeEnabled, !!storePrice);
  assert.deepEqual([...definition.targetWeapons], [expectedWeapon]);
  if (CLUB_SKINS.has(expectedId)) {
    assert.equal(definition.designOrigin, 'project-colorway-with-official-mark');
    assert.equal(definition.rightsStatus, 'permission-needed');
    assert.equal(definition.requiresLicenseForOfficialMarks, true);
    assert.equal(definition.officialMarksIncluded, true);
    assert.equal(definition.markPlacement, 'receiver');
    assert.ok(definition.markAsset.startsWith('/textures/weapon-skins/club-marks/'));
    assert.ok(existsSync(`public${definition.markAsset}`), `${expectedId}: escudo ausente`);
    assert.match(definition.markSourceUrl, /^https:\/\//);
  } else {
    assert.equal(definition.designOrigin, 'project-owned');
    assert.match(definition.inspiration, /original/);
  }
  if (storePrice) {
    assert.equal(definition.storeEnabled, true);
    assert.equal(definition.storePrice, storePrice);
    assert.equal(definition.storeSlot, 'weapon');
    assert.equal(definition.storeWeapon, expectedWeapon);
  }
  if (POLITICAL[expectedId]) {
    const [theme, slogan] = POLITICAL[expectedId];
    assert.equal(definition.theme, theme);
    assert.equal(definition.slogan, slogan);
    assert.equal(definition.rightsStatus, 'political-satire');
    assert.equal(definition.officialMarksIncluded, false);
    assert.equal(definition.markPlacement, 'receiver-inlay');
    assert.equal(definition.sloganPlacement, slogan ? 'barrel-horizontal' : undefined);
    assert.equal(definition.markAsset, `/textures/weapon-skins/political-marks/${theme}.svg`);
    assert.ok(existsSync(`public${definition.markAsset}`), `${expectedId}: símbolo ausente`);
  }
}

if (process.argv.includes('--mutate')) {
  const baseline = WEAPON_SKINS['ondas-cariocas'];
  const political = WEAPON_SKINS['trabalho-13-ak'];
  const mutants = [
    ['approved', { ...baseline, approved: true }, 'ondas-cariocas', 'm4'],
    ['runtime', { ...baseline, runtimeEnabled: true }, 'ondas-cariocas', 'm4'],
    ['universal', { ...baseline, targetWeapons: ['m4', 'ak'] }, 'ondas-cariocas', 'm4'],
    ['borrowed', { ...baseline, designOrigin: 'third-party-reference' }, 'ondas-cariocas', 'm4'],
    ['store-off', { ...political, storeEnabled: false }, 'trabalho-13-ak', 'ak'],
    ['wrong-price', { ...political, storePrice: 900 }, 'trabalho-13-ak', 'ak'],
    ['wrong-slogan', { ...political, slogan: 'texto diferente' }, 'trabalho-13-ak', 'ak'],
    ['wrong-placement', { ...political, markPlacement: 'receiver', sloganPlacement: 'receiver' }, 'trabalho-13-ak', 'ak'],
  ];
  for (const [name, mutant, id, weapon] of mutants) assert.throws(() => validate(mutant, id, weapon), undefined, `${name}: mutante sobreviveu`);
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

const canvasOps = [];
const fakeDocument = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return {
      width: 0,
      height: 0,
      getContext(type) {
        assert.equal(type, '2d');
        return {
          font: '',
          fillStyle: '',
          lineJoin: '',
          lineWidth: 0,
          strokeStyle: '',
          textAlign: '',
          textBaseline: '',
          measureText(text) {
            return { width: text.length * 72 };
          },
          fillText(text) {
            canvasOps.push(['fillText', text]);
          },
          strokeText(text) {
            canvasOps.push(['strokeText', text]);
          },
          fillRect() {
            canvasOps.push(['fillRect']);
          },
        };
      },
    };
  },
  createElementNS(_namespace, tag) {
    assert.equal(tag, 'img');
    const listeners = new Map();
    return {
      width: 512,
      height: 512,
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
      set src(_value) {
        queueMicrotask(() => listeners.get('load')?.());
      },
    };
  },
};
globalThis.document = fakeDocument;
for (const skinId of ['trabalho-13-ak', 'trabalho-13-pistola', 'estrela-verde-ak']) {
  await preloadWeaponSkinCandidate(skinId);
  const weaponId = TARGETS[skinId];
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 1), sourceMaterial));
  assert.equal(applyWeaponSkinCandidate(model, weaponId, skinId), true, `${skinId}: aplicação com marca falhou`);
  const markings = model.children.filter((child) => child.name.startsWith('skin-'));
  const expectedRoles = POLITICAL[skinId][1] ? ['slogan', 'symbol'] : ['symbol'];
  assert.deepEqual([...new Set(markings.map((marking) => marking.userData.markingRole))].sort(), expectedRoles);
  assert.equal(markings.length, expectedRoles.length * 2, `${skinId}: par lateral incompleto`);
  for (const marking of markings) {
    assert.equal(marking.userData.fittedToMesh, true);
    assert.ok(marking.material.isMeshStandardMaterial, `${marking.name}: pintura sem resposta à luz`);
    assert.equal(marking.material.transparent, true);
    assert.equal(marking.material.depthWrite, false);
    assert.ok(Math.abs(marking.position.x) > 0.05, `${marking.name}: marca enterrada na malha`);
    assert.ok(Math.abs(Math.abs(marking.rotation.y) - Math.PI / 2) < 1e-8, `${marking.name}: marca fora da lateral`);
  }
  const slogans = markings.filter((marking) => marking.userData.markingRole === 'slogan');
  for (const slogan of slogans) {
    assert.ok(slogan.geometry.parameters.width >= slogan.geometry.parameters.height * 8, `${slogan.name}: frase não horizontal`);
    const symbol = markings.find((marking) => marking.userData.markingRole === 'symbol' && Math.sign(marking.position.x) === Math.sign(slogan.position.x));
    assert.ok(symbol && slogan.position.z > symbol.position.z, `${slogan.name}: frase não acompanha o cano`);
  }
}
assert.ok(canvasOps.some(([op]) => op === 'fillText'), 'frase não foi desenhada');
assert.ok(!canvasOps.some(([op]) => op === 'fillRect'), 'frase ganhou fundo retangular');
delete globalThis.document;
for (const theme of new Set(Object.values(POLITICAL).map(([theme]) => theme))) {
  const svg = readFileSync(`public/textures/weapon-skins/political-marks/${theme}.svg`, 'utf8');
  for (const slogan of new Set(Object.values(POLITICAL).map(([, slogan]) => slogan).filter(Boolean))) {
    assert.ok(!svg.includes(slogan), `${theme}: frase foi incorporada ao símbolo`);
  }
  for (const [, attributes] of svg.matchAll(/<rect\b([^>]*)>/gi)) {
    const width = Number(attributes.match(/\bwidth="([\d.]+)"/)?.[1] || 0);
    const height = Number(attributes.match(/\bheight="([\d.]+)"/)?.[1] || 0);
    assert.ok(width < 400 || height < 400, `${theme}: símbolo contém placa retangular`);
  }
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const audits = [];
for (const weaponId of [...new Set(Object.values(TARGETS))]) {
  const doc = await io.read(`public/models/weapons/${weaponId}.glb`);
  const primitives = doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives());
  assert.ok(primitives.length > 0, `${weaponId}: sem primitivas`);
  assert.ok(primitives.every((primitive) => primitive.getAttribute('POSITION')), `${weaponId}: sem posições completas`);
  audits.push(`${weaponId}:${primitives.length}`);
}
console.log(`weapon-skin check: ${Object.keys(TARGETS).length} candidates, models=${audits.join(',')}, official-marks=${CLUB_SKINS.size}, store=${Object.keys(STORE_PRICES).length}, runtime=${Object.values(WEAPON_SKINS).filter((skin) => skin.runtimeEnabled).length}`);
