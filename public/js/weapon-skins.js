import * as THREE from 'three';
import { WEAPON_SKINS } from './data/weapon-skin-definitions.js';
export { WEAPON_SKINS };
const PATTERN_FRAGMENT = Object.freeze({
  'ondas-cariocas': `
    float rioPhase = (vWeaponSkinLocal.y + 0.1728515625) * 8.6
      + 0.28 * sin(vWeaponSkinLocal.x * 19.5);
    float rioWave = 0.5 + 0.5 * sin(rioPhase * 6.28318530718);
    float rioEdge = max(fwidth(rioWave) * 1.25, 0.012);
    float rioWhite = smoothstep(0.5 - rioEdge, 0.5 + rioEdge, rioWave);
    diffuseColor.rgb *= mix(vec3(0.015, 0.019, 0.021), vec3(0.91, 0.90, 0.85), rioWhite);
  `,
  'mosaico-paulista': `
    vec2 paulistaP = vec2(vWeaponSkinLocal.x + 0.4990234375, vWeaponSkinLocal.y + 0.1474609375);
    float paulistaModule = 0.066;
    vec2 paulistaCell = floor(paulistaP / paulistaModule);
    vec2 paulistaLocal = fract(paulistaP / paulistaModule);
    float paulistaColumn = mod(paulistaCell.x, 4.0);
    float paulistaRow = mod(paulistaCell.y, 4.0);
    float paulistaAA = max(fwidth(paulistaLocal.x) + fwidth(paulistaLocal.y), 0.012);
    float paulistaWhite = 0.0;
    if (paulistaRow < 0.5) {
      if (paulistaColumn < 0.5) paulistaWhite = 1.0 - smoothstep(1.0 - paulistaAA, 1.0 + paulistaAA, paulistaLocal.x + paulistaLocal.y);
      else if (paulistaColumn < 1.5) paulistaWhite = 0.0;
      else if (paulistaColumn < 2.5) paulistaWhite = smoothstep(-paulistaAA, paulistaAA, paulistaLocal.x - paulistaLocal.y);
      else paulistaWhite = 1.0;
    } else if (paulistaRow < 1.5) {
      if (paulistaColumn < 0.5) paulistaWhite = 1.0;
      else if (paulistaColumn < 1.5) paulistaWhite = smoothstep(-paulistaAA, paulistaAA, paulistaLocal.y - paulistaLocal.x);
      else if (paulistaColumn < 2.5) paulistaWhite = 0.0;
      else paulistaWhite = smoothstep(1.0 - paulistaAA, 1.0 + paulistaAA, paulistaLocal.x + paulistaLocal.y);
    } else if (paulistaRow < 2.5) {
      if (paulistaColumn < 0.5) paulistaWhite = smoothstep(-paulistaAA, paulistaAA, paulistaLocal.x - paulistaLocal.y);
      else if (paulistaColumn < 1.5) paulistaWhite = 1.0;
      else if (paulistaColumn < 2.5) paulistaWhite = 1.0 - smoothstep(1.0 - paulistaAA, 1.0 + paulistaAA, paulistaLocal.x + paulistaLocal.y);
      else paulistaWhite = 0.0;
    } else {
      if (paulistaColumn < 0.5) paulistaWhite = 0.0;
      else if (paulistaColumn < 1.5) paulistaWhite = smoothstep(1.0 - paulistaAA, 1.0 + paulistaAA, paulistaLocal.x + paulistaLocal.y);
      else if (paulistaColumn < 2.5) paulistaWhite = 1.0;
      else paulistaWhite = smoothstep(-paulistaAA, paulistaAA, paulistaLocal.y - paulistaLocal.x);
    }
    diffuseColor.rgb *= mix(vec3(0.012, 0.016, 0.018), vec3(0.93, 0.92, 0.87), paulistaWhite);
  `,
  'nacao-rubro-negra': `
    float rubroWave = 0.5 + 0.5 * sin((vWeaponSkinLocal.y + 0.1513671875) * 54.0);
    float rubroRed = smoothstep(0.46, 0.54, rubroWave);
    diffuseColor.rgb *= mix(vec3(0.008, 0.009, 0.011), vec3(0.72, 0.012, 0.018), rubroRed);
  `,
  'alvinegra-paulista': `
    float alvinegraWave = 0.5 + 0.5 * sin((vWeaponSkinLocal.x + 0.4990234375) * 43.0);
    float alvinegraWhite = smoothstep(0.46, 0.54, alvinegraWave);
    diffuseColor.rgb *= mix(vec3(0.008, 0.010, 0.012), vec3(0.90, 0.89, 0.84), alvinegraWhite);
  `,
  'celeste-mineira': `
    float celestePhase = fract(
      (vWeaponSkinLocal.x + 0.4990234375) * 4.8
      + (vWeaponSkinLocal.y + 0.1513671875) * 2.5
    );
    float celesteLine = 1.0 - smoothstep(0.105, 0.16, abs(celestePhase - 0.5));
    diffuseColor.rgb *= mix(vec3(0.025, 0.20, 0.72), vec3(0.92, 0.93, 0.91), celesteLine);
  `,
  'tricolor-gaucha': `
    float gauchaBand = fract((vWeaponSkinLocal.y + 0.1513671875) * 10.8);
    vec3 gauchaColor = gauchaBand < 0.333333
      ? vec3(0.07, 0.48, 0.78)
      : (gauchaBand < 0.666667 ? vec3(0.008, 0.012, 0.015) : vec3(0.91, 0.91, 0.87));
    diffuseColor.rgb *= gauchaColor;
  `,
  'tricolor-baiana': `
    float baianaBand = fract(
      (vWeaponSkinLocal.x + 0.4990234375) * 3.8
      + (vWeaponSkinLocal.y + 0.1513671875) * 3.8
    );
    vec3 baianaColor = baianaBand < 0.333333
      ? vec3(0.75, 0.018, 0.025)
      : (baianaBand < 0.666667 ? vec3(0.92, 0.92, 0.88) : vec3(0.025, 0.19, 0.67));
    diffuseColor.rgb *= baianaColor;
  `,
  'verde-alviverde': `
    float palmeirasBand = fract(
      (vWeaponSkinLocal.y + 0.1513671875) * 4.2
      + (vWeaponSkinLocal.z + 0.4990234375) * 3.0
    );
    float palmeirasWhite = 1.0 - smoothstep(0.10, 0.18, abs(palmeirasBand - 0.5));
    diffuseColor.rgb *= mix(vec3(0.005, 0.28, 0.10), vec3(0.92, 0.93, 0.88), palmeirasWhite);
  `,
  'tricolor-morumbi': `
    float spfcBand = fract((vWeaponSkinLocal.y + 0.1513671875) * 8.4);
    vec3 spfcColor = spfcBand < 0.56
      ? vec3(0.93, 0.92, 0.88)
      : (spfcBand < 0.78 ? vec3(0.77, 0.015, 0.025) : vec3(0.008, 0.010, 0.012));
    diffuseColor.rgb *= spfcColor;
  `,
  'alvinegra-praiana': `
    float santosWave = 0.5 + 0.5 * sin(
      (vWeaponSkinLocal.y + vWeaponSkinLocal.z + 0.650390625) * 48.0
    );
    float santosBlack = smoothstep(0.70, 0.78, santosWave);
    diffuseColor.rgb *= mix(vec3(0.92, 0.91, 0.86), vec3(0.008, 0.010, 0.012), santosBlack);
  `,
});
const THEME_FRAGMENT = Object.freeze({
  'trabalho-13': `
    float trabalhoStripe = fract(
      (vWeaponSkinLocal.y + 0.3798828125) * 5.4
      + (vWeaponSkinLocal.z + 0.0927734375) * 2.2
    );
    float trabalhoGold = 1.0 - smoothstep(0.08, 0.15, abs(trabalhoStripe - 0.5));
    diffuseColor.rgb *= mix(vec3(0.48, 0.006, 0.018), vec3(0.92, 0.57, 0.05), trabalhoGold);
  `,
  'estrela-vermelha': `
    float estrelaVermelhaBand = 0.5 + 0.5 * sin(
      (vWeaponSkinLocal.y + vWeaponSkinLocal.z + 0.47265625) * 34.0
    );
    float estrelaVermelhaInk = smoothstep(0.58, 0.72, estrelaVermelhaBand);
    diffuseColor.rgb *= mix(vec3(0.91, 0.88, 0.77), vec3(0.68, 0.006, 0.025), estrelaVermelhaInk);
  `,
  'estrela-verde': `
    float estrelaVerdeBand = fract(
      (vWeaponSkinLocal.x + 0.4990234375) * 3.4
      + (vWeaponSkinLocal.y + 0.3798828125) * 2.3
    );
    float estrelaVerdeGold = 1.0 - smoothstep(0.10, 0.18, abs(estrelaVerdeBand - 0.5));
    diffuseColor.rgb *= mix(vec3(0.015, 0.42, 0.16), vec3(0.94, 0.72, 0.08), estrelaVerdeGold);
  `,
  'brasil-22': `
    float brasilBand = fract(
      (vWeaponSkinLocal.y + 0.3798828125) * 3.8
      + (vWeaponSkinLocal.z + 0.0927734375) * 1.8
    );
    vec3 brasilColor = brasilBand < 0.46
      ? vec3(0.008, 0.38, 0.14)
      : (brasilBand < 0.76 ? vec3(0.95, 0.72, 0.04) : vec3(0.015, 0.16, 0.55));
    diffuseColor.rgb *= brasilColor;
  `,
  ouro: `
    float ouroBrush = 0.90 + 0.10 * sin(
      vWeaponSkinLocal.z * 210.0 + vWeaponSkinLocal.y * 37.0
    );
    diffuseColor.rgb *= vec3(0.92, 0.61, 0.11) * ouroBrush;
  `,
  prata: `
    float prataBrush = 0.89 + 0.11 * sin(
      vWeaponSkinLocal.z * 240.0 + vWeaponSkinLocal.y * 31.0
    );
    diffuseColor.rgb *= vec3(0.72, 0.79, 0.84) * prataBrush;
  `,
});
const patternFragment = (skinId) => PATTERN_FRAGMENT[skinId] || THEME_FRAGMENT[WEAPON_SKINS[skinId]?.theme];
const MATERIAL_PROFILE = Object.freeze({
  gold: Object.freeze({ roughness: 0.18, metalness: 0.96, envMapIntensity: 1.65 }),
  silver: Object.freeze({ roughness: 0.16, metalness: 0.98, envMapIntensity: 1.72 }),
  default: Object.freeze({ roughness: 0.5, metalness: 0.48, envMapIntensity: 1.15 }),
});
const MARK_LAYOUT = Object.freeze({
  ak: Object.freeze({ x: 0.041, y: 0.052, z: -0.08, clubHeight: 0.09, graphicHeight: 0.12 }),
  pistol: Object.freeze({ x: 0.096, y: 0.085, z: 0.05, clubHeight: 0.16, graphicHeight: 0.20 }),
});

const markTextures = new Map();
const markLoads = new Map();

export function preloadWeaponSkinCandidate(skinId) {
  const asset = WEAPON_SKINS[skinId]?.markAsset;
  if (!asset) return Promise.resolve(null);
  if (!markLoads.has(skinId)) {
    markLoads.set(skinId, new THREE.TextureLoader().loadAsync(asset).then((texture) => {
      texture.name = `${skinId}__${WEAPON_SKINS[skinId]?.officialMarksIncluded ? 'official_mark_permission_needed' : 'project_mark'}`;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      markTextures.set(skinId, texture);
      return texture;
    }));
  }
  return markLoads.get(skinId);
}

function attachSkinMark(model, weaponId, skinId) {
  const texture = markTextures.get(skinId);
  const definition = WEAPON_SKINS[skinId];
  const layout = MARK_LAYOUT[weaponId];
  if (!texture || !definition || !layout) return;
  const aspect = (texture.image?.width || 1) / (texture.image?.height || 1);
  const height = definition.officialMarksIncluded ? layout.clubHeight : layout.graphicHeight;
  const geometry = new THREE.PlaneGeometry(height * aspect, height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  const prefix = definition.officialMarksIncluded ? 'club-mark' : 'skin-mark';
  const right = new THREE.Mesh(geometry, material);
  right.name = `${prefix}-${skinId}-right`;
  right.position.set(layout.x, layout.y, layout.z);
  right.rotation.y = Math.PI / 2;
  right.renderOrder = 4;
  right.userData.officialMark = !!definition.officialMarksIncluded;
  right.userData.rightsStatus = definition.rightsStatus || 'original-safe';
  const left = new THREE.Mesh(geometry, material);
  left.name = `${prefix}-${skinId}-left`;
  left.position.set(-layout.x, layout.y, layout.z);
  left.rotation.y = -Math.PI / 2;
  left.renderOrder = 4;
  left.userData.officialMark = !!definition.officialMarksIncluded;
  left.userData.rightsStatus = definition.rightsStatus || 'original-safe';
  model.add(right, left);
}

function cloneMaterial(material, skinId) {
  const copy = material.clone();
  copy.name = `${material.name || 'weapon'}__skin_${skinId}`;
  const definition = WEAPON_SKINS[skinId];
  const profile = MATERIAL_PROFILE[definition?.metalFinish] || MATERIAL_PROFILE.default;
  copy.map = null;
  copy.color.set(0xffffff);
  copy.roughness = profile.roughness;
  copy.metalness = profile.metalness;
  copy.envMapIntensity = profile.envMapIntensity;
  copy.userData = { ...copy.userData, weaponSkin: skinId };
  copy.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vWeaponSkinLocal;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvWeaponSkinLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'varying vec3 vWeaponSkinLocal;\nvoid main() {')
      .replace('#include <map_fragment>', patternFragment(skinId));
  };
  copy.customProgramCacheKey = () => `weapon-skin:${skinId}:object-space-v2`;
  copy.needsUpdate = true;
  return copy;
}

export function reviewWeaponSkinId() {
  if (typeof location === 'undefined') return null;
  const query = new URLSearchParams(location.search);
  return query.get('debug') === '1' ? query.get('weaponskin') : null;
}

export function applyWeaponSkinCandidate(model, weaponId, skinId) {
  if (!skinId) return false;
  const definition = WEAPON_SKINS[skinId];
  if (!definition || !definition.targetWeapons.includes(weaponId)) return false;
  if (!patternFragment(skinId)) return false;
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => cloneMaterial(material, skinId))
      : cloneMaterial(object.material, skinId);
  });
  attachSkinMark(model, weaponId, skinId);
  model.userData.weaponSkin = skinId;
  return true;
}
