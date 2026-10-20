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

const TARGETS = Object.freeze(Object.fromEntries(Object.values(WEAPON_SKINS)
  .flatMap((skin) => skin.targetWeapons.map((weaponId) => [skin.id, weaponId]))));
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
  'trabalho-13-ak': ['trabalho-13', 'FAZ O L É LULA 13', 'trabalho-13.svg'],
  'trabalho-13-pistola': ['trabalho-13', 'FAZ O L É LULA 13', 'estrela-amarela.svg'],
  'estrela-vermelha-ak': ['estrela-vermelha', 'O BRASIL É DOS BRASILEIROS', 'estrela-vermelha.svg'],
  'estrela-vermelha-pistola': ['estrela-vermelha', 'O BRASIL É DOS BRASILEIROS', 'estrela-vermelha.svg'],
  'estrela-verde-ak': ['estrela-verde', null, 'estrela-verde.svg'],
  'estrela-verde-pistola': ['estrela-verde', null, 'estrela-verde.svg'],
  'brasil-22-ak': ['brasil-22', 'O BRASIL É 22', 'brasil-22.svg'],
  'brasil-22-pistola': ['brasil-22', 'O BRASIL É 22', 'brasil-22.svg'],
});
const STORE_PRICES = Object.freeze({
  'ondas-cariocas': 500,
  'mosaico-paulista': 500,
  ...Object.fromEntries(Object.keys(POLITICAL).map((id) => [id, 500])),
  'tamo-junto-ak': 500,
  'tamo-junto-pistola': 500,
  'e-nois-ak': 500,
  'e-nois-pistola': 500,
  'camo-selva-ak': 500,
  'camo-selva-pistola': 500,
  'tropicalente-ak': 500,
  'tropicalente-pistola': 500,
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
  'trabalho-13-ak': 'trabalhoGold',
  'trabalho-13-pistola': 'trabalhoGold',
  'estrela-vermelha-ak': 'estrelaVermelhaSlide',
  'estrela-vermelha-pistola': 'estrelaVermelhaSlide',
  'estrela-verde-ak': 'estrelaVerdeBand',
  'estrela-verde-pistola': 'estrelaVerdeBand',
  'brasil-22-ak': 'brasilSlide',
  'brasil-22-pistola': 'brasilSlide',
  'tamo-junto-ak': 'tamoAkFlow',
  'tamo-junto-pistola': 'tamoPistolChevron',
  'e-nois-ak': 'noisAkWave',
  'e-nois-pistola': 'noisPistolStep',
  'camo-selva-ak': 'camoSelvaAk',
  'camo-selva-pistola': 'camoSelvaPistol',
  'tropicalente-ak': 'tropicalTeal',
  'tropicalente-pistola': 'tropicalTeal',
  'ouro-ak': 'ouroBrush',
  'ouro-pistola': 'ouroBrush',
  'prata-ak': 'prataBrush',
  'prata-pistola': 'prataBrush',
});

function validate(definition, expectedId, expectedWeapon) {
  /* Peças de pack (pack-*) vendem pelo pacote: loja ativa sem preço avulso (storePrice 0). */
  const bundled = expectedId.startsWith('pack-');
  const storePrice = Object.hasOwn(STORE_PRICES, expectedId) ? STORE_PRICES[expectedId] : null;
  const inStore = bundled || storePrice !== null;
  assert.equal(definition.id, expectedId);
  assert.equal(definition.status, inStore ? 'store-active' : CLUB_SKINS.has(expectedId) ? 'permission-needed' : 'candidate');
  assert.equal(definition.approved, inStore);
  assert.equal(definition.certified, inStore);
  assert.equal(definition.runtimeEnabled, inStore);
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
    assert.ok(['project-owned', 'public-domain-adaptation'].includes(definition.designOrigin), `${expectedId}: origem de design não é do projeto`);
    /* Fora do conjunto de clubes, marca oficial não entra: a lane rio shippa sem escudo. */
    assert.equal(definition.officialMarksIncluded, false, `${expectedId}: marca oficial fora do conjunto permission-needed`);
    assert.notEqual(definition.rightsStatus, 'permission-needed', `${expectedId}: estado de permissão fora do conjunto de clubes`);
    assert.match(definition.inspiration, definition.designOrigin === 'public-domain-adaptation' ? /dom[íi]nio p[úu]blico|adapta/ : /original/, `${expectedId}: sem procedência`);
  }
  if (bundled) {
    /* Peça de bundle: renderiza e acompanha o pack; nunca tem venda avulsa na loja. */
    assert.equal(definition.storeEnabled, false, `${expectedId}: peça de pack à venda avulsa`);
    assert.equal(definition.storePrice, 0, `${expectedId}: peça de pack ganhou preço avulso`);
  } else if (storePrice !== null) {
    assert.equal(definition.storeEnabled, true);
    assert.equal(definition.storePrice, storePrice);
    assert.equal(definition.storeSlot, 'weapon');
    assert.equal(definition.storeWeapon, expectedWeapon);
  }
  if (POLITICAL[expectedId]) {
    const [theme, slogan, mark] = POLITICAL[expectedId];
    assert.equal(definition.theme, theme);
    assert.equal(definition.slogan, slogan);
    assert.equal(definition.rightsStatus, 'political-satire');
    assert.equal(definition.officialMarksIncluded, false);
    assert.equal(definition.markPlacement, 'receiver-inlay');
    assert.equal(definition.sloganPlacement, slogan ? 'barrel-horizontal' : undefined);
    assert.equal(definition.markAsset, `/textures/weapon-skins/political-marks/${mark}`);
    assert.ok(existsSync(`public${definition.markAsset}`), `${expectedId}: símbolo ausente`);
  }
}

if (process.argv.includes('--mutate')) {
  /* A lane inteira virou loja: o candidato de referência é o recorte sem loja da colorway em produção. */
  const baseline = { ...WEAPON_SKINS['ondas-cariocas'], status: 'candidate', approved: false, certified: false, runtimeEnabled: false, storeEnabled: false, storePrice: null };
  const political = WEAPON_SKINS['trabalho-13-ak'];
  const lane = WEAPON_SKINS['ondas-cariocas'];
  const mutants = [
    ['approved', { ...baseline, approved: true }, 'ondas-cariocas', 'm4'],
    ['runtime', { ...baseline, runtimeEnabled: true }, 'ondas-cariocas', 'm4'],
    ['universal', { ...baseline, targetWeapons: ['m4', 'ak'] }, 'ondas-cariocas', 'm4'],
    ['borrowed', { ...baseline, designOrigin: 'third-party-reference' }, 'ondas-cariocas', 'm4'],
    ['store-off', { ...political, storeEnabled: false }, 'trabalho-13-ak', 'ak'],
    ['wrong-price', { ...political, storePrice: 900 }, 'trabalho-13-ak', 'ak'],
    ['wrong-slogan', { ...political, slogan: 'texto diferente' }, 'trabalho-13-ak', 'ak'],
    ['wrong-placement', { ...political, markPlacement: 'receiver', sloganPlacement: 'receiver' }, 'trabalho-13-ak', 'ak'],
    ['lane-price', { ...lane, storePrice: 900 }, 'ondas-cariocas', 'm4'],
    ['lane-marks', { ...lane, officialMarksIncluded: true }, 'ondas-cariocas', 'm4'],
    ['lane-rights', { ...lane, rightsStatus: 'permission-needed' }, 'ondas-cariocas', 'm4'],
    ['pack-price', { ...WEAPON_SKINS['pack-dourado-ak'], storePrice: 500 }, 'pack-dourado-ak', 'ak'],
    ['pack-solo', { ...WEAPON_SKINS['pack-dourado-ak'], storeEnabled: true }, 'pack-dourado-ak', 'ak'],
  ];
  for (const [name, mutant, id, weapon] of mutants) assert.throws(() => validate(mutant, id, weapon), undefined, `${name}: mutante sobreviveu`);
  console.log(`weapon-skin mutate: ${mutants.length}/${mutants.length} killed`);
  process.exit(0);
}

for (const [skinId, weaponId] of Object.entries(TARGETS)) validate(WEAPON_SKINS[skinId], skinId, weaponId);
/* Lane rio em produção (decisão do dono 19/10): colorways originais, sem marca de clube, T$ 500. */
assert.equal(WEAPON_SKINS['ondas-cariocas'].status, 'store-active');
assert.equal(WEAPON_SKINS['mosaico-paulista'].status, 'store-active');
assert.deepEqual([...WEAPON_SKINS['ondas-cariocas'].targetWeapons], ['m4']);
assert.deepEqual([...WEAPON_SKINS['mosaico-paulista'].targetWeapons], ['scar']);
assert.equal(WEAPON_SKINS['ondas-cariocas'].rightsStatus, 'original-safe');
assert.equal(WEAPON_SKINS['ondas-cariocas'].officialMarksIncluded, false);
/* Limites de leitura pinados nos layouts que efetivamente shipparam (z aponta para a boca do cano). */
assert.ok(WEAPON_SKINS['brasil-22-ak'].sloganLayout.height >= 0.045, 'Brasil 22 AK continua ilegível');
assert.ok(WEAPON_SKINS['brasil-22-pistola'].sloganLayout.height >= 0.08, 'Brasil 22 pistola continua pequena');
assert.ok(WEAPON_SKINS['estrela-vermelha-ak'].sloganLayout.height >= 0.05, 'Estrela Vermelha AK encolheu');
assert.ok(WEAPON_SKINS['estrela-vermelha-pistola'].sloganLayout.height >= 0.08, 'Estrela Vermelha pistola encolheu');
assert.equal(WEAPON_SKINS['estrela-vermelha-ak'].sloganAspect, 6, 'frase Estrela Vermelha AK extrapola o cano');
assert.equal(WEAPON_SKINS['estrela-vermelha-pistola'].sloganAspect, 6, 'frase Estrela Vermelha pistola extrapola o ferrolho');
assert.ok(WEAPON_SKINS['trabalho-13-pistola'].markLayout.height >= 0.10, 'símbolo Trabalho 13 continua pequeno');
assert.ok(WEAPON_SKINS['estrela-verde-ak'].markLayout.height >= 0.08, 'estrela verde AK continua pequena');
assert.ok(WEAPON_SKINS['estrela-verde-pistola'].markLayout.height >= 0.13, 'estrela verde pistola continua pequena');
assert.ok(WEAPON_SKINS['brasil-22-pistola'].markLayout.y <= -0.10, 'símbolo Brasil 22 não foi movido para a área verde');
assert.ok(WEAPON_SKINS['tropicalente-ak'].markLayout.height <= 0.10, 'impressão Tropicalente AK extrapola o corpo');
assert.ok(WEAPON_SKINS['tropicalente-pistola'].markLayout.height >= 0.15, 'impressão Tropicalente pistola continua pequena');
assert.ok(WEAPON_SKINS['tropicalente-pistola'].sloganLayout.height >= 0.08, 'texto Tropicalente pistola continua pequeno');
for (const id of ['trabalho-13-pistola', 'tamo-junto-pistola', 'e-nois-pistola']) {
  assert.ok(WEAPON_SKINS[id].sloganLayout.height >= 0.085, `${id}: texto continua pequeno`);
}
for (const id of ['tamo-junto-ak', 'tamo-junto-pistola', 'e-nois-ak', 'e-nois-pistola', 'tropicalente-ak', 'tropicalente-pistola']) {
  assert.equal(WEAPON_SKINS[id].preserveBase, true, `${id}: corpo original não preservado`);
}
for (const id of ['ouro-ak', 'ouro-pistola', 'prata-ak', 'prata-pistola']) {
  assert.equal(WEAPON_SKINS[id].storeEnabled, true, `${id}: metal ausente da loja`);
}
assert.equal(reviewWeaponSkinId(), null, 'skin de revisão não pode ligar fora do navegador debug');
const sourceMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8, metalness: 0.7 });
for (const [skinId, weaponId] of Object.entries(TARGETS)) {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial));
  assert.equal(applyWeaponSkinCandidate(model, weaponId, skinId), true, `${skinId}: aplicação falhou`);
  const material = model.children[0].material;
  assert.notEqual(material, sourceMaterial, `${skinId}: material compartilhado não foi clonado`);
  assert.equal(material.userData.weaponSkin, skinId);
  assert.equal(material.color.getHex(), WEAPON_SKINS[skinId].preserveBase ? sourceMaterial.color.getHex() : 0xffffff, `${skinId}: tratamento incorreto do corpo`);
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
for (const skinId of [
  'trabalho-13-ak',
  'trabalho-13-pistola',
  'estrela-vermelha-pistola',
  'estrela-verde-ak',
  'brasil-22-pistola',
  'tamo-junto-ak',
  'e-nois-pistola',
  'tropicalente-ak',
  'tropicalente-pistola',
]) {
  await preloadWeaponSkinCandidate(skinId);
  const definition = WEAPON_SKINS[skinId];
  const weaponId = TARGETS[skinId];
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 1), sourceMaterial));
  assert.equal(applyWeaponSkinCandidate(model, weaponId, skinId), true, `${skinId}: aplicação com marca falhou`);
  const markings = model.children.filter((child) => child.name.startsWith('skin-'));
  const expectedRoles = [
    ...(definition.slogan ? ['slogan'] : []),
    ...(definition.markAsset ? ['symbol'] : []),
  ];
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
    assert.ok(slogan.geometry.parameters.width >= slogan.geometry.parameters.height * 6, `${slogan.name}: frase não horizontal`);
    const symbol = markings.find((marking) => marking.userData.markingRole === 'symbol' && Math.sign(marking.position.x) === Math.sign(slogan.position.x));
    if (symbol) assert.ok(slogan.position.y > symbol.position.y && Math.hypot(slogan.position.y - symbol.position.y, slogan.position.z - symbol.position.z) > 0.06, `${slogan.name}: frase não acompanha a parte superior`);
  }
}
assert.ok(canvasOps.some(([op]) => op === 'fillText'), 'frase não foi desenhada');
assert.ok(!canvasOps.some(([op]) => op === 'fillRect'), 'frase ganhou fundo retangular');
delete globalThis.document;
const slogans = new Set(Object.values(WEAPON_SKINS).map((skin) => skin.slogan).filter(Boolean));
const projectMarks = Object.values(WEAPON_SKINS)
  .filter((skin) => skin.markAsset && !skin.officialMarksIncluded)
  .map((skin) => skin.markAsset);
for (const asset of new Set(projectMarks)) {
  const svg = readFileSync(`public${asset}`, 'utf8');
  for (const slogan of slogans) assert.ok(!svg.includes(slogan), `${asset}: frase foi incorporada ao símbolo`);
  for (const [, attributes] of svg.matchAll(/<rect\b([^>]*)>/gi)) {
    const width = Number(attributes.match(/\bwidth="([\d.]+)"/)?.[1] || 0);
    const height = Number(attributes.match(/\bheight="([\d.]+)"/)?.[1] || 0);
    /* Placa de fundo = retângulo grande de canto vivo; base de bandeira arredondada (rx) não é placa. */
    const rx = Number(attributes.match(/\brx="([\d.]+)"/)?.[1] || 0);
    assert.ok(width < 800 || height < 400 || rx >= 8, `${asset}: símbolo contém placa retangular`);
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
