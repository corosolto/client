import * as THREE from 'three';
import { ownVmResource } from './vmownership.js';
import { WEAPON_SKINS, PATTERN_TEXTURE_BUDGET } from './data/weapon-skin-definitions.js';
import { footprintFullyCovered, FOOTPRINT_TOLERANCE } from './knife-mark-support.js';
export { WEAPON_SKINS };
const TAMO_JUNTO_FRAGMENT = Object.freeze({
  ak: `
    vec2 tamoAkPanel = vec2(vWeaponSkinLocal.z + 0.34, vWeaponSkinLocal.y + 0.16);
    float tamoAkFlow = 0.5 + 0.5 * sin(tamoAkPanel.x * 18.0 + tamoAkPanel.y * 8.0);
    float tamoAkRibbon = fract(tamoAkPanel.x * 4.8 - tamoAkPanel.y * 2.2);
    float tamoAkWhite = 1.0 - smoothstep(0.16, 0.23, abs(tamoAkRibbon - 0.5));
    vec3 tamoAkGreen = mix(vec3(0.012, 0.18, 0.085), vec3(0.025, 0.48, 0.19), smoothstep(0.28, 0.72, tamoAkFlow));
    diffuseColor.rgb = mix(tamoAkGreen, vec3(0.88, 0.91, 0.82), tamoAkWhite);
  `,
  pistol: `
    vec2 tamoPistolPanel = vec2(vWeaponSkinLocal.z + 0.16, vWeaponSkinLocal.y + 0.15);
    float tamoPistolChevron = abs(fract(
      tamoPistolPanel.x * 8.0 + abs(tamoPistolPanel.y - 0.15) * 5.0
    ) * 2.0 - 1.0);
    float tamoPistolWhite = 1.0 - smoothstep(0.30, 0.43, tamoPistolChevron);
    float tamoPistolShade = smoothstep(0.36, 0.64, 0.5 + 0.5 * sin(tamoPistolPanel.y * 19.0));
    vec3 tamoPistolGreen = mix(vec3(0.010, 0.16, 0.075), vec3(0.030, 0.50, 0.20), tamoPistolShade);
    diffuseColor.rgb = mix(tamoPistolGreen, vec3(0.90, 0.92, 0.84), tamoPistolWhite);
  `,
});
const E_NOIS_FRAGMENT = Object.freeze({
  ak: `
    vec2 noisAkPanel = vec2(vWeaponSkinLocal.z + 0.34, vWeaponSkinLocal.y + 0.16);
    float noisAkWave = 0.5 + 0.5 * sin(
      noisAkPanel.x * 17.0 + 0.85 * sin(noisAkPanel.y * 15.0)
    );
    float noisAkCyan = smoothstep(0.45, 0.61, noisAkWave);
    float noisAkCut = 1.0 - smoothstep(0.055, 0.095, abs(fract(
      noisAkPanel.x * 3.9 - noisAkPanel.y * 1.7
    ) - 0.5));
    vec3 noisAkBlue = mix(vec3(0.018, 0.10, 0.30), vec3(0.025, 0.27, 0.68), noisAkCyan);
    diffuseColor.rgb = mix(noisAkBlue, vec3(0.05, 0.74, 0.88), noisAkCut * 0.78);
  `,
  pistol: `
    vec2 noisPistolPanel = vec2(vWeaponSkinLocal.z + 0.16, vWeaponSkinLocal.y + 0.15);
    vec2 noisPistolCell = floor(noisPistolPanel / vec2(0.040, 0.052));
    float noisPistolStep = mod(noisPistolCell.x + 2.0 * noisPistolCell.y, 4.0);
    vec3 noisPistolColor = noisPistolStep < 1.0
      ? vec3(0.018, 0.095, 0.29)
      : (noisPistolStep < 2.0
        ? vec3(0.020, 0.25, 0.66)
        : (noisPistolStep < 3.0 ? vec3(0.04, 0.70, 0.86) : vec3(0.015, 0.16, 0.46)));
    diffuseColor.rgb = noisPistolColor;
  `,
});
const CAMO_SELVA_FRAGMENT = Object.freeze({
  ak: `
    vec3 camoSelvaAk = vec3(
      vWeaponSkinLocal.x / 0.045,
      (vWeaponSkinLocal.y + 0.16) / 0.095,
      (vWeaponSkinLocal.z + 0.34) / 0.130
    );
    float camoSelvaAkField = sin(camoSelvaAk.z * 2.4 + sin(camoSelvaAk.y * 2.1 + camoSelvaAk.x * 0.7) * 1.3)
      + 0.65 * sin(camoSelvaAk.y * 3.2 - camoSelvaAk.z * 1.35 + cos(camoSelvaAk.x * 1.9))
      + 0.32 * sin((camoSelvaAk.z + camoSelvaAk.y - camoSelvaAk.x * 0.4) * 5.1);
    vec3 camoSelvaAkColor = camoSelvaAkField < -0.55
      ? vec3(0.055, 0.075, 0.045)
      : (camoSelvaAkField < 0.45 ? vec3(0.22, 0.31, 0.15) : vec3(0.53, 0.46, 0.27));
    diffuseColor.rgb = camoSelvaAkColor;
  `,
  pistol: `
    vec3 camoSelvaPistol = vec3(
      vWeaponSkinLocal.x / 0.032,
      (vWeaponSkinLocal.y + 0.15) / 0.070,
      (vWeaponSkinLocal.z + 0.16) / 0.055
    );
    float camoSelvaPistolField = sin(camoSelvaPistol.z * 2.4 + sin(camoSelvaPistol.y * 2.1 + camoSelvaPistol.x * 0.7) * 1.3)
      + 0.65 * sin(camoSelvaPistol.y * 3.2 - camoSelvaPistol.z * 1.35 + cos(camoSelvaPistol.x * 1.9))
      + 0.32 * sin((camoSelvaPistol.z + camoSelvaPistol.y - camoSelvaPistol.x * 0.4) * 5.1);
    vec3 camoSelvaPistolColor = camoSelvaPistolField < -0.55
      ? vec3(0.055, 0.075, 0.045)
      : (camoSelvaPistolField < 0.45 ? vec3(0.22, 0.31, 0.15) : vec3(0.53, 0.46, 0.27));
    diffuseColor.rgb = camoSelvaPistolColor;
  `,
});
const EMO_XADREZ_FRAGMENT = Object.freeze({
  ak: `
    vec2 emoAkCell = floor(vec2(
      (vWeaponSkinLocal.z + 0.31) / 0.062,
      (vWeaponSkinLocal.y + 0.16) / 0.052
    ));
    float emoAkCheck = mod(emoAkCell.x + emoAkCell.y, 2.0);
    float emoAkMagenta = emoAkCheck * step(0.5, mod(emoAkCell.x, 4.0));
    float emoAkDark = 1.0 - emoAkCheck;
    vec3 emoAkColor = vec3(0.13, 0.075, 0.14);
    emoAkColor = mix(emoAkColor, vec3(0.012, 0.014, 0.022), emoAkDark);
    emoAkColor = mix(emoAkColor, vec3(0.52, 0.018, 0.40), emoAkMagenta);
    diffuseColor.rgb = emoAkColor;
  `,
  pistol: `
    vec2 emoPistolCell = floor(vec2(
      (vWeaponSkinLocal.z + 0.13) / 0.026,
      (vWeaponSkinLocal.y + 0.15) / 0.032
    ));
    float emoPistolCheck = mod(emoPistolCell.x + emoPistolCell.y, 2.0);
    float emoPistolMagenta = emoPistolCheck * step(0.5, mod(emoPistolCell.x, 4.0));
    float emoPistolDark = 1.0 - emoPistolCheck;
    vec3 emoPistolColor = vec3(0.13, 0.075, 0.14);
    emoPistolColor = mix(emoPistolColor, vec3(0.012, 0.014, 0.022), emoPistolDark);
    emoPistolColor = mix(emoPistolColor, vec3(0.52, 0.018, 0.40), emoPistolMagenta);
    diffuseColor.rgb = emoPistolColor;
  `,
});
// Cada expressão desenha um padrão de transmissão distinto em coordenadas locais.
const SESSAO_DA_TRETA_PATTERNS = Object.freeze([
  `vec3 c = mod(floor((p.x + 1.0) * 10.0), 6.0) < 1.0 ? vec3(0.92, 0.85, 0.65) : (mod(floor((p.x + 1.0) * 10.0), 6.0) < 3.0 ? vec3(0.08, 0.65, 0.68) : vec3(0.70, 0.10, 0.20));`,
  `vec3 c = mix(vec3(0.05), vec3(0.76, 0.81, 0.82), noise * (0.65 + 0.35 * step(0.5, fract(p.y * 95.0))));`,
  `float dropout = step(0.78, fract(p.y * 17.0 + noise * 0.12));
   vec3 c = mix(vec3(0.025, 0.008, 0.012), vec3(0.68, 0.025, 0.045), 0.25 + noise * 0.48);
   c = mix(c, vec3(0.92, 0.43, 0.38), dropout * 0.75);`,
  `vec3 c = mix(vec3(0.02, 0.11, 0.15), vec3(0.04, 0.82, 0.78), step(0.42, fract(p.x * 9.0 + floor(p.y * 20.0) * 0.23)));`,
  `vec3 c = mix(vec3(0.06, 0.025, 0.10), vec3(0.68, 0.32, 0.86), max(step(0.84, fract(p.x * 9.0)), step(0.84, fract(p.x * 9.0 + 0.23))));`,
  `vec3 c = mix(vec3(0.04), vec3(0.92, 0.75, 0.16), max(step(0.86, fract(p.x * 8.0)), step(0.86, fract(p.y * 8.0))));`,
  `vec3 c = mix(vec3(0.015, 0.08, 0.035), vec3(0.15, 0.82, 0.32), step(0.5, mod(floor(p.x * 18.0) + floor(p.y * 13.0) * 3.0, 5.0)));`,
  `vec2 q = (p - vec2(-0.08, 0.01)) * vec2(1.0, 2.4);
   float rings = step(0.78, fract(length(q) * 13.0));
   float ghost = step(0.88, fract(length(q - vec2(0.025, 0.0)) * 13.0));
   vec3 c = mix(vec3(0.055, 0.025, 0.008), vec3(0.88, 0.38, 0.07), rings * 0.8 + ghost * 0.2);`,
  `vec3 c = mix(vec3(0.025, 0.12, 0.42), vec3(0.80, 0.91, 0.94), step(0.91, fract(p.y * 35.0 + noise * 0.15)));`,
  `vec3 c = mix(vec3(0.08, 0.015, 0.06), vec3(0.82, 0.16, 0.51), step(0.5, fract(p.x * 14.0)) * (0.75 + noise * 0.25));`,
  `float grid = max(step(0.94, fract(p.x * 5.0)), step(0.92, fract(p.y * 8.0)));
   float cross = max(1.0 - smoothstep(0.003, 0.009, abs(p.x)), 1.0 - smoothstep(0.003, 0.009, abs(p.y)));
   vec3 c = mix(vec3(0.10), vec3(0.76), max(grid * 0.55, cross));`,
  `vec3 c = mix(vec3(0.10, 0.055, 0.01), vec3(0.95, 0.66, 0.10), smoothstep(0.70, 0.82, sin(p.y * 45.0 + sin(p.x * 12.0))));`,
  `float wave = 1.0 - smoothstep(0.004, 0.012, abs(p.y - 0.035 * sin(p.x * 30.0)));
   float echo = 1.0 - smoothstep(0.003, 0.009, abs(p.y + 0.034 - 0.035 * sin(p.x * 30.0 + 0.7)));
   vec3 c = mix(vec3(0.012, 0.07, 0.075), vec3(0.20, 0.88, 0.78), max(wave, echo * 0.55));`,
  `vec3 c = mix(vec3(0.16, 0.025, 0.035), vec3(0.82, 0.25, 0.29), step(0.5, fract(p.x * 5.0 + floor(p.y * 10.0) * 0.35)) * (0.8 + noise * 0.2));`,
  `vec3 c = mix(vec3(0.13, 0.06, 0.19), vec3(0.87, 0.77, 0.90), step(0.5, fract(length(p * vec2(1.0, 1.6)) * 12.0)));`,
].map((design) => `
  vec2 p = vec2(mix(vWeaponSkinLocal.x, vWeaponSkinLocal.z, weaponSkinFrame.x) - weaponSkinFrame.y,
                vWeaponSkinLocal.y - weaponSkinFrame.z) * weaponSkinFrame.w;
  // Deslocamento horizontal irregular por linha: tracking de fita, não camuflagem.
  float row = floor(p.y * 42.0);
  float rowNoise = fract(sin(row * 91.73) * 43758.5453);
  float tear = step(0.78, rowNoise);
  p.x += tear * (rowNoise - 0.78) * 0.19;
  float noise = fract(sin(dot(floor(p * vec2(190.0, 150.0)), vec2(12.9898, 78.233))) * 43758.5453);
  ${design}
  float scanWave = fract(p.y * 85.0);
  float scanAA = min(fwidth(scanWave), 0.25);
  float scan = mix(0.54, 1.0, smoothstep(0.25 - scanAA, 0.25 + scanAA, scanWave));
  float tracking = tear * step(0.78, fract(p.y * 42.0));
  c = mix(c, vec3(0.75, 0.83, 0.79), tracking * (0.25 + noise * 0.35));
  diffuseColor.rgb = c * scan * (0.24 + noise * 0.12);
`));
const SESSAO_DA_TRETA_FRAGMENT = Object.freeze(Object.fromEntries(
  SESSAO_DA_TRETA_PATTERNS.map((fragment, index) => [`arma-${String(index + 1).padStart(2, '0')}`, fragment]),
));
// `patternAsset`: textura tileável de lado no corpo; `patternStyle` = repetições no comprimento,
// contraste em torno do cinza e paleta de 3 cores sobre a luminância (sem paleta vale o RGB).
const PATTERN_ASSET_FRAGMENT = `
  vec2 p = vec2(mix(vWeaponSkinLocal.x, vWeaponSkinLocal.z, weaponSkinFrame.x) - weaponSkinFrame.y,
                vWeaponSkinLocal.y - weaponSkinFrame.z) * weaponSkinFrame.w;
  vec3 patternTexel = texture2D(weaponSkinPattern, p * weaponSkinPatternStyle.x + vec2(0.5)).rgb;
  vec3 c;
  if (weaponSkinPatternStyle.z > 0.5) {
    float l = clamp((dot(patternTexel, vec3(0.299, 0.587, 0.114)) - 0.5) * weaponSkinPatternStyle.y + 0.5, 0.0, 1.0);
    c = l < 0.5 ? mix(weaponSkinPalette[0], weaponSkinPalette[1], l * 2.0) : mix(weaponSkinPalette[1], weaponSkinPalette[2], l * 2.0 - 1.0);
  } else {
    c = pow(clamp((patternTexel - 0.5) * weaponSkinPatternStyle.y + 0.5, 0.0, 1.0), vec3(2.2));
  }
  diffuseColor.rgb = c;
`;
// Fora do orçamento (PATTERN_TEXTURE_BUDGET) ou com falha de carga, a skin cai no padrão
// procedural dela; nunca fica sem pintura.
const patternTextures = new Map();
const patternLoads = new Map();
const powerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;
function preloadPatternTexture(src) {
  if (patternLoads.has(src)) return patternLoads.get(src);
  if (patternLoads.size >= PATTERN_TEXTURE_BUDGET.maxTextures) {
    console.warn(`weapon-skins: ${src} fora do orçamento de ${PATTERN_TEXTURE_BUDGET.maxTextures} texturas de corpo`);
    return Promise.resolve(null);
  }
  const load = new THREE.TextureLoader().loadAsync(src).then((texture) => {
    const { width = 0, height = 0 } = texture.image || {};
    if (!powerOfTwo(width) || !powerOfTwo(height) || Math.max(width, height) > PATTERN_TEXTURE_BUDGET.maxSize) {
      console.warn(`weapon-skins: ${src} ${width}x${height} fora do orçamento de textura de corpo`);
      texture.dispose();
      return null;
    }
    texture.name = `weapon_skin_pattern:${src}`;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    patternTextures.set(src, texture);
    return texture;
  }, () => null);
  patternLoads.set(src, load);
  return load;
}
const patternAssetTexture = (skinId) => patternTextures.get(WEAPON_SKINS[skinId]?.patternAsset) || null;

const PATTERN_FRAGMENT = Object.freeze({
  'tamo-junto-ak': TAMO_JUNTO_FRAGMENT.ak,
  'tamo-junto-pistola': TAMO_JUNTO_FRAGMENT.pistol,
  'e-nois-ak': E_NOIS_FRAGMENT.ak,
  'e-nois-pistola': E_NOIS_FRAGMENT.pistol,
  'camo-selva-ak': CAMO_SELVA_FRAGMENT.ak,
  'camo-selva-pistola': CAMO_SELVA_FRAGMENT.pistol,
  'pack-selva-camo-ak': CAMO_SELVA_FRAGMENT.ak,
  'pack-selva-camo-pistol': CAMO_SELVA_FRAGMENT.pistol,
  'pack-emo-xadrez-ak': EMO_XADREZ_FRAGMENT.ak,
  'pack-emo-xadrez-pistol': EMO_XADREZ_FRAGMENT.pistol,
  'pack-lula-13-knife': `
    float lulaKnifeBand = 1.0 - smoothstep(
      0.18, 0.42, abs(sin(vWeaponSkinLocal.z * 18.0 + vWeaponSkinLocal.y * 9.0))
    );
    vec3 lulaKnifeRed = vec3(0.62, 0.008, 0.020);
    vec3 lulaKnifeGold = vec3(0.95, 0.62, 0.055);
    diffuseColor.rgb = mix(lulaKnifeRed, lulaKnifeGold, lulaKnifeBand);
  `,
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
    float trabalhoGold = 1.0 - smoothstep(
      0.018, 0.036, abs(vWeaponSkinLocal.y + 0.13)
    );
    diffuseColor.rgb *= mix(vec3(0.52, 0.008, 0.020), vec3(0.94, 0.60, 0.055), trabalhoGold);
  `,
  'estrela-vermelha': `
    float estrelaVermelhaBand = 0.5 + 0.5 * sin(
      (vWeaponSkinLocal.y + vWeaponSkinLocal.z + 0.47265625) * 34.0
    );
    float estrelaVermelhaInk = smoothstep(0.58, 0.72, estrelaVermelhaBand);
    vec3 estrelaVermelhaColor = mix(vec3(0.93, 0.91, 0.84), vec3(0.70, 0.008, 0.028), estrelaVermelhaInk);
    float estrelaVermelhaSlide = smoothstep(0.075, 0.11, vWeaponSkinLocal.y);
    diffuseColor.rgb *= mix(estrelaVermelhaColor, vec3(0.96, 0.95, 0.90), estrelaVermelhaSlide);
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
      ? vec3(0.00, 0.68, 0.22)
      : (brasilBand < 0.76 ? vec3(1.00, 0.86, 0.00) : vec3(0.00, 0.24, 0.78));
    float brasilSlide = smoothstep(0.075, 0.11, vWeaponSkinLocal.y);
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(brasilColor, vec3(0.00, 0.20, 0.72), brasilSlide), 0.94);
  `,
  'brasil-cotidiano': `
    float cotidianoGreen = 1.0 - smoothstep(0.014, 0.030, abs(vWeaponSkinLocal.y + 0.145));
    float cotidianoWhite = 1.0 - smoothstep(0.014, 0.030, abs(vWeaponSkinLocal.y + 0.095));
    float cotidianoBlue = 1.0 - smoothstep(0.014, 0.030, abs(vWeaponSkinLocal.y + 0.045));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.015, 0.42, 0.18), cotidianoGreen * 0.92);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.93, 0.90), cotidianoWhite * 0.90);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.17, 0.57), cotidianoBlue * 0.92);
  `,
  'camo-selva': `
    float camoSelvaNoise = sin(vWeaponSkinLocal.x * 31.0 + sin(vWeaponSkinLocal.z * 19.0))
      + sin(vWeaponSkinLocal.y * 47.0 - vWeaponSkinLocal.z * 13.0);
    vec3 camoSelvaColor = camoSelvaNoise < -0.35
      ? vec3(0.08, 0.10, 0.07)
      : (camoSelvaNoise < 0.55 ? vec3(0.25, 0.32, 0.18) : vec3(0.56, 0.49, 0.31));
    diffuseColor.rgb *= camoSelvaColor;
  `,
  tropicalente: `
    float tropicalTeal = 1.0 - smoothstep(0.016, 0.034, abs(vWeaponSkinLocal.y + 0.145));
    float tropicalYellow = 1.0 - smoothstep(0.016, 0.034, abs(vWeaponSkinLocal.y + 0.085));
    float tropicalCoral = 1.0 - smoothstep(0.020, 0.044, abs(vWeaponSkinLocal.z + 0.31));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.00, 0.79, 0.65), tropicalTeal * 0.98);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.00, 0.86, 0.00), tropicalYellow * 0.98);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.16, 0.22), tropicalCoral * 0.90);
  `,
  'pack-caveira': `
    float caveiraA = step(0.5, fract((vWeaponSkinLocal.y + vWeaponSkinLocal.z) * 18.0));
    float caveiraB = step(0.5, fract((vWeaponSkinLocal.y - vWeaponSkinLocal.z) * 18.0));
    float caveiraCarbon = abs(caveiraA - caveiraB);
    float caveiraBone = 1.0 - smoothstep(0.020, 0.038, abs(sin(vWeaponSkinLocal.z * 17.0) * 0.04 + vWeaponSkinLocal.y));
    vec3 caveiraBase = mix(vec3(0.018, 0.022, 0.028), vec3(0.075, 0.082, 0.095), caveiraCarbon);
    diffuseColor.rgb = mix(caveiraBase, vec3(0.78, 0.75, 0.66), caveiraBone * 0.72);
  `,
  'pack-brasil-neon': `
    float brasilNeonBand = fract((vWeaponSkinLocal.y + 0.45) * 4.4 + vWeaponSkinLocal.z * 1.8);
    vec3 brasilNeonColor = brasilNeonBand < 0.45
      ? vec3(0.00, 0.84, 0.30)
      : (brasilNeonBand < 0.74 ? vec3(1.00, 0.88, 0.00) : vec3(0.00, 0.30, 0.96));
    diffuseColor.rgb = brasilNeonColor;
  `,
  'pack-liberdade': `
    float liberdadeStripe = step(0.50, fract((vWeaponSkinLocal.y + 0.48) * 7.0));
    vec3 liberdadeFlag = mix(vec3(0.70, 0.018, 0.10), vec3(0.96, 0.95, 0.91), liberdadeStripe);
    float liberdadeCanton = step(0.015, vWeaponSkinLocal.y) * step(vWeaponSkinLocal.z, 0.08);
    vec2 liberdadeStarCell = fract(vec2(vWeaponSkinLocal.z * 22.0, vWeaponSkinLocal.y * 24.0)) - 0.5;
    float liberdadeStar = 1.0 - smoothstep(0.08, 0.16, length(liberdadeStarCell));
    vec3 liberdadeBlue = mix(vec3(0.02, 0.08, 0.27), vec3(0.98), liberdadeStar);
    diffuseColor.rgb = mix(liberdadeFlag, liberdadeBlue, liberdadeCanton);
  `,
  'pack-maga': `
    float magaGrain = 0.5 + 0.5 * sin(vWeaponSkinLocal.z * 47.0 + vWeaponSkinLocal.y * 19.0);
    float magaPanel = smoothstep(0.34, 0.82, magaGrain);
    vec3 magaRed = mix(vec3(0.34, 0.004, 0.012), vec3(0.82, 0.012, 0.028), magaPanel);
    float magaEdge = smoothstep(0.10, 0.34, abs(vWeaponSkinLocal.y + 0.02));
    diffuseColor.rgb = mix(magaRed, vec3(0.58, 0.006, 0.018), magaEdge * 0.28);
  `,
  'pack-emo': `
    vec2 emoCell = floor(vec2(vWeaponSkinLocal.z, vWeaponSkinLocal.y) * vec2(15.0, 15.0));
    float emoCheck = mod(emoCell.x + emoCell.y, 2.0);
    vec3 emoBase = mix(vec3(0.010, 0.012, 0.018), vec3(0.38, 0.015, 0.32), emoCheck);
    vec2 emoFace = vec2(vWeaponSkinLocal.z + 0.02, vWeaponSkinLocal.y - 0.015);
    float emoHead = 1.0 - smoothstep(0.115, 0.135, length(emoFace * vec2(0.82, 1.0)));
    float emoEyes = 1.0 - smoothstep(0.018, 0.031, min(length(emoFace - vec2(-0.052, 0.025)), length(emoFace - vec2(0.052, 0.025))));
    float emoMouth = (1.0 - smoothstep(0.010, 0.019, abs(emoFace.y + 0.063))) * step(abs(emoFace.x), 0.080);
    diffuseColor.rgb = mix(emoBase, vec3(0.92, 0.89, 0.84), emoHead * 0.84);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.015, 0.004, 0.018), max(emoEyes, emoMouth));
  `,
  'pack-acido': `
    float acidoGrain = 0.5 + 0.5 * sin(
      vWeaponSkinLocal.z * 173.0 + sin(vWeaponSkinLocal.y * 211.0)
    );
    float acidoBand = 0.5 + 0.5 * sin((vWeaponSkinLocal.y + vWeaponSkinLocal.z) * 27.0);
    float acidoMatte = acidoGrain * 0.42 + smoothstep(0.34, 0.86, acidoBand) * 0.58;
    diffuseColor.rgb = mix(vec3(0.043, 0.043, 0.043), vec3(0.078, 0.078, 0.078), acidoMatte);
  `,
  ouro: `
    float ouroSweep = 0.5 + 0.5 * sin(
      vWeaponSkinLocal.z * 24.0 + vWeaponSkinLocal.y * 3.6
    );
    float ouroBrush = mix(0.72, 1.0, smoothstep(0.18, 0.82, ouroSweep));
    diffuseColor.rgb = vec3(0.67, 0.40, 0.065) * ouroBrush;
  `,
  prata: `
    float prataSweep = 0.5 + 0.5 * sin(
      vWeaponSkinLocal.z * 22.0 - vWeaponSkinLocal.y * 3.2
    );
    float prataBrush = mix(0.70, 0.98, smoothstep(0.18, 0.82, prataSweep));
    diffuseColor.rgb = vec3(0.48, 0.54, 0.58) * prataBrush;
  `,
});
const patternFragment = (skinId) => SESSAO_DA_TRETA_FRAGMENT[skinId] || PATTERN_FRAGMENT[skinId] || THEME_FRAGMENT[WEAPON_SKINS[skinId]?.theme];
const skinFragment = (skinId) => (patternAssetTexture(skinId) ? PATTERN_ASSET_FRAGMENT : patternFragment(skinId));
const MATERIAL_PROFILE = Object.freeze({
  gold: Object.freeze({ roughness: 0.48, metalness: 0.91, envMapIntensity: 0.72 }),
  silver: Object.freeze({ roughness: 0.52, metalness: 0.93, envMapIntensity: 0.68 }),
  // Preto fosco de verdade: sem este perfil o reflexo do ambiente devolve ~95 de luma e a
  // arma lê como grafite claro, não como a pintura preta que a loja promete.
  matte: Object.freeze({ roughness: 0.96, metalness: 0.02, envMapIntensity: 0.30 }),
  default: Object.freeze({ roughness: 0.72, metalness: 0.16, envMapIntensity: 0.78 }),
});
const CLUB_MARK_LAYOUT = Object.freeze({
  ak: Object.freeze({ x: 0.041, y: 0.052, z: -0.08, height: 0.050 }),
  pistol: Object.freeze({ x: 0.096, y: 0.085, z: 0.05, height: 0.16 }),
});
const POLITICAL_LAYOUT = Object.freeze({
  ak: Object.freeze({
    symbol: Object.freeze({ y: 0.047, z: -0.075, height: 0.085 }),
    slogan: Object.freeze({ y: 0.120, z: 0.170, height: 0.035 }),
  }),
  m4: Object.freeze({ symbol: Object.freeze({ y: 0.085, z: -0.050, height: 0.060, lift: 0.004 }) }),
  scar: Object.freeze({ symbol: Object.freeze({ y: 0.085, z: -0.050, height: 0.060, lift: 0.004 }) }),
  pistol: Object.freeze({
    symbol: Object.freeze({ y: -0.020, z: -0.015, height: 0.082 }),
    slogan: Object.freeze({ y: 0.240, z: 0.035, height: 0.030 }),
    // 1P no X18 da fábrica: a mão cobre a lateral de trás; só a frente do ferrolho fica livre no
    // idle e na inspeção (busca de layout, docs/viewmodels/pistola-pintada-fabrica.md).
    fp: Object.freeze({
      gap: 0.01,
      symbol: Object.freeze({ y: 0.300, front: 0.690, height: 0.100, maxWidth: 0.160, fitWidth: 0.100 }),
      slogan: Object.freeze({ y: 0.290, height: 0.050, maxWidth: 0.400, fitWidth: 0.600 }),
    }),
  }),
});
const SLOGAN_STYLE = Object.freeze({
  'trabalho-13': Object.freeze({ fill: '#ffd23f', stroke: '#69030d' }),
  'estrela-vermelha': Object.freeze({ fill: '#bd102b', stroke: '#fff8e8' }),
  'estrela-verde': Object.freeze({ fill: '#fff1bd', stroke: '#075c32' }),
  'brasil-22': Object.freeze({ fill: '#ffe13b', stroke: '#082c70' }),
  'brasil-cotidiano': Object.freeze({ fill: '#f5f6ec', stroke: '#0b4f92' }),
  tropicalente: Object.freeze({ fill: '#ffd94a', stroke: '#006f66' }),
  'pack-maga': Object.freeze({ fill: '#fff4e8', stroke: '#4d000b' }),
});

const markTextures = new Map();
const markLoads = new Map();
const sloganTextures = new Map();
const fittedSurfaceCache = new Map();
const HAND_MATERIAL = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)|(?:Glove|Hand|Sleeve|Cloth)/i;
const handMesh = (object) => {
  const materials = Array.isArray(object?.material) ? object.material : [object?.material];
  return materials.some((material) => HAND_MATERIAL.test(material?.name || ''));
};

export function preloadWeaponSkinCandidate(skinId) {
  const definition = WEAPON_SKINS[skinId];
  const pattern = definition?.patternAsset ? preloadPatternTexture(definition.patternAsset) : null;
  const asset = definition?.markAsset;
  if (!asset) return pattern ? pattern.then(() => null) : Promise.resolve(null);
  if (!markLoads.has(skinId)) {
    markLoads.set(skinId, new THREE.TextureLoader().loadAsync(asset).then((texture) => {
      texture.name = `${skinId}__${definition.officialMarksIncluded ? 'official_mark_permission_needed' : 'project_symbol_inlay'}`;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      markTextures.set(skinId, texture);
      return texture;
    }));
  }
  return pattern ? Promise.all([markLoads.get(skinId), pattern]).then(([mark]) => mark) : markLoads.get(skinId);
}

function sloganTexture(skinId) {
  const definition = WEAPON_SKINS[skinId];
  if (!definition?.slogan || typeof document === 'undefined') return null;
  const aspect = definition.sloganAspect || 8;
  const canvasWidth = 256 * aspect;
  const cacheKey = `${definition.theme}:${definition.slogan}:${aspect}`;
  if (sloganTextures.has(cacheKey)) return sloganTextures.get(cacheKey);
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const style = definition.passe ? { fill: '#ffffff', stroke: '#080808' } : (SLOGAN_STYLE[definition.theme] || SLOGAN_STYLE['trabalho-13']);
  let fontSize = 148;
  const maxTextWidth = canvasWidth - 96;
  context.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  while (context.measureText(definition.slogan).width > maxTextWidth && fontSize > 92) {
    fontSize -= 4;
    context.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  // Passe: contorno escuro mais grosso — o letreiro branco some sobre estampa de alto contraste.
  context.lineWidth = definition.passe ? 24 : 14;
  context.strokeStyle = style.stroke;
  context.fillStyle = style.fill;
  context.strokeText(definition.slogan, canvasWidth / 2, 128, maxTextWidth);
  context.fillText(definition.slogan, canvasWidth / 2, 128, maxTextWidth);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `${definition.theme}__barrel_slogan`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  sloganTextures.set(cacheKey, texture);
  return texture;
}

// `source` (opcional): { points, scale } — vértices já no espaço de `model` e escala do wrap TP;
// no 1P vêm do frame TP do osso (goldenMarkFrame no corpo golden, referenceFrame no X18).
function fittedSideSurfaces(model, weaponId, placements, source = null) {
  const cacheKey = `${model.uuid}:${weaponId}:${placements.map(({ y, z, width, height, lift }) => `${y},${z},${width},${height},${lift || 0}`).join('|')}`;
  if (fittedSurfaceCache.has(cacheKey)) return fittedSurfaceCache.get(cacheKey);
  const probes = placements.map(({ y, z, width, height, lift }) => ({
    y, z, halfW: width * 0.56, halfH: height * 0.72, lift: Math.max(0, lift || 0), min: Infinity, max: -Infinity,
  }));
  let overallMin = Infinity;
  let overallMax = -Infinity;
  const visit = (point) => {
    overallMin = Math.min(overallMin, point.x);
    overallMax = Math.max(overallMax, point.x);
    for (const probe of probes) {
      if (Math.abs(point.y - probe.y) > probe.halfH || Math.abs(point.z - probe.z) > probe.halfW) continue;
      probe.min = Math.min(probe.min, point.x);
      probe.max = Math.max(probe.max, point.x);
    }
  };
  if (source) {
    for (const point of source.points) visit(point);
  } else {
    model.updateMatrixWorld(true);
    const inverseRoot = new THREE.Matrix4().copy(model.matrixWorld).invert();
    const point = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    model.traverse((object) => {
      const positions = object.isMesh && !handMesh(object) && object.geometry?.attributes?.position;
      if (!positions || object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
      matrix.multiplyMatrices(inverseRoot, object.matrixWorld);
      const step = Math.max(1, Math.ceil(positions.count / 24000));
      for (let index = 0; index < positions.count; index += step) visit(point.fromBufferAttribute(positions, index).applyMatrix4(matrix));
    });
  }
  const lift = 0.0015 / Math.max(0.001, source?.scale || model.scale.x || 1);
  const surfaces = probes.map((probe) => Object.freeze({
    right: (Number.isFinite(probe.max) ? probe.max : overallMax) + lift + probe.lift,
    left: (Number.isFinite(probe.min) ? probe.min : overallMin) - lift - probe.lift,
  }));
  fittedSurfaceCache.set(cacheKey, surfaces);
  return surfaces;
}
// `etched`: gravação ácida no aço — figura em cinza-escuro fosco, nunca placa branca na lâmina.
function paintedMaterial(texture, skinId, role, etched = false) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: etched ? 0x3a3a3a : 0xffffff,
    transparent: true,
    opacity: etched ? 0.9 : 1,
    alphaTest: 0.12,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    roughness: etched ? 0.86 : role === 'symbol' ? 0.70 : 0.76,
    metalness: etched ? 0.35 : role === 'symbol' ? 0.12 : 0.08,
    envMapIntensity: 0.74,
    side: THREE.FrontSide,
  });
  ownVmResource(material);
  material.name = `${skinId}__${etched ? 'etched' : role}_paint`;
  return material;
}

function addFittedPair(model, skinId, role, texture, placement, surfaces, aspect) {
  const width = placement.height * aspect;
  const geometry = ownVmResource(new THREE.PlaneGeometry(width, placement.height));
  const material = paintedMaterial(texture, skinId, role);
  for (const [side, x, rotation] of [
    ['right', surfaces.right, Math.PI / 2],
    ['left', surfaces.left, -Math.PI / 2],
  ]) {
    const marking = new THREE.Mesh(geometry, material);
    marking.name = `skin-${role}-${skinId}-${side}`;
    marking.position.set(x, placement.y, placement.z);
    marking.rotation.y = rotation;
    marking.renderOrder = 3;
    marking.userData.weaponSkin = skinId;
    marking.userData.markingRole = role;
    marking.userData.fittedToMesh = true;
    model.add(marking);
  }
}
// F2: marcas de faca por perfil explícito de representação. O fingerprint FNV liga o
// perfil ao asset/versão conhecido do caller — representação trocada não recebe marca.
function knifeGeometryFingerprint(model) {
  const meshes = [];
  model.traverse((object) => {
    const positions = object.isMesh && !handMesh(object) && object.geometry?.attributes?.position;
    if (!positions || object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
    meshes.push(object);
  });
  meshes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  let h = 0x811c9dc5;
  const mix = (text) => {
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  };
  for (const mesh of meshes) {
    mix(mesh.name || '');
    mix('#');
    const positions = mesh.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) mix(positions[i].toFixed(6));
    const index = mesh.geometry.index;
    if (index) for (let i = 0; i < index.array.length; i++) mix(String(index.array[i]));
    mix('|');
  }
  return h.toString(16).padStart(8, '0');
}

// `steelRoles` (skin steelBlade): símbolo vira gravação escura pequena na lâmina, letreiro no cabo.
const KNIFE_STEEL_ROLES = Object.freeze({
  symbol: Object.freeze({ along: 0.30, sizeFrac: 0.70, longitudinal: true, region: 'blade', etched: true }),
  slogan: Object.freeze({ along: 0.62, sizeFrac: 0.40, longitudinal: true, region: 'handle' }),
});
// `longitudinal`: a horizontal da imagem corre ao longo da lâmina e o topo vai ao dorso (+Y do
// modelo). Vale para letreiro e símbolo; o símbolo transversal deitava a caveira para a ponta.
const KNIFE_MARK_PROFILES = Object.freeze({
  'knife-fp': Object.freeze({
    id: 'coro-knife-fp-v2',
    representation: 'skinned-bone',
    fingerprint: '2b9905bf',
    blade: Object.freeze({ fromGrip: 0.50, toTip: 0.96, minSlenderness: 2.2 }),
    handle: Object.freeze({ fromGrip: 0.05, toTip: 0.42 }),
    roles: Object.freeze({
      symbol: Object.freeze({ along: 0.40, sizeFrac: 0.62, longitudinal: true }),
      slogan: Object.freeze({ along: 0.76, sizeFrac: 0.62, longitudinal: true }),
    }),
    steelRoles: KNIFE_STEEL_ROLES,
    liftFrac: 0.05,
    coverage: FOOTPRINT_TOLERANCE,
  }),
  'knife-tp': Object.freeze({
    id: 'coro-knife-tp-v2',
    representation: 'rigid-wrap',
    fingerprint: 'eede1583',
    blade: Object.freeze({ fromGrip: 0.50, toTip: 0.96, minSlenderness: 2.2 }),
    handle: Object.freeze({ fromGrip: 0.05, toTip: 0.42 }),
    roles: Object.freeze({
      symbol: Object.freeze({ along: 0.40, sizeFrac: 0.62, longitudinal: true }),
      slogan: Object.freeze({ along: 0.76, sizeFrac: 0.62, longitudinal: true }),
    }),
    steelRoles: KNIFE_STEEL_ROLES,
    liftFrac: 0.05,
    coverage: FOOTPRINT_TOLERANCE,
  }),
});
const KNIFE_CONTEXTS = Object.freeze(Object.keys(KNIFE_MARK_PROFILES));

function knifeProfileValid(profile) {
  const { blade, handle, roles, steelRoles } = profile;
  if (!(blade.fromGrip > 0 && blade.toTip > blade.fromGrip && blade.toTip <= 1 && blade.minSlenderness > 0)) return false;
  if (!(handle.fromGrip >= 0 && handle.toTip > handle.fromGrip && handle.toTip <= blade.fromGrip)) return false;
  for (const role of [...Object.values(roles), ...Object.values(steelRoles)]) {
    if (!(role.along >= 0 && role.along <= 1 && role.sizeFrac > 0 && role.sizeFrac < 1)) return false;
  }
  return true;
}

// Osso único que carrega todos os vértices (faca e corpo golden das armas). getX..getW
// desnormalizam (os GLBs golden quantizam WEIGHTS_0) e valem para atributo intercalado.
const ATTRIBUTE_COMPONENT = Object.freeze(['getX', 'getY', 'getZ', 'getW']);
function knifeRigidBone(meshes) {
  let bone = null;
  for (const mesh of meshes) {
    const { skinIndex, skinWeight, position } = mesh.geometry.attributes;
    if (!mesh.isSkinnedMesh || !skinIndex || !skinWeight) continue;
    for (let i = 0; i < position.count; i++) {
      let sum = 0, dominant = -1, dominantWeight = 0;
      for (let k = 0; k < skinIndex.itemSize; k++) {
        const weight = skinWeight[ATTRIBUTE_COMPONENT[k]](i);
        if (!Number.isFinite(weight) || weight < 0) return null;
        sum += weight;
        if (weight > 1e-6) {
          if (dominant >= 0) return null;
          dominant = skinIndex[ATTRIBUTE_COMPONENT[k]](i);
          dominantWeight = weight;
        }
      }
      if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-3 || dominant < 0 || dominantWeight < 0.999) return null;
      const vertexBone = mesh.skeleton.bones[dominant];
      if (!vertexBone) return null;
      if (bone === null) bone = vertexBone;
      else if (vertexBone !== bone) return null;
    }
  }
  return bone;
}

function principalAxis(centered, exclude = []) {
  // Eixo principal da covariância por potenciação, ortonormalizado contra `exclude`.
  const axis = new THREE.Vector3(Math.SQRT1_2, Math.sqrt(1 / 3), Math.sqrt(1 - 0.5 - 1 / 3));
  for (const fixed of exclude) axis.addScaledVector(fixed, -fixed.dot(axis)).normalize();
  const covariance = [0, 0, 0, 0, 0, 0];
  for (const p of centered) {
    covariance[0] += p.x * p.x; covariance[1] += p.x * p.y; covariance[2] += p.x * p.z;
    covariance[3] += p.y * p.y; covariance[4] += p.y * p.z; covariance[5] += p.z * p.z;
  }
  const apply = (v) => new THREE.Vector3(
    covariance[0] * v.x + covariance[1] * v.y + covariance[2] * v.z,
    covariance[1] * v.x + covariance[3] * v.y + covariance[4] * v.z,
    covariance[2] * v.x + covariance[4] * v.y + covariance[5] * v.z,
  );
  for (let i = 0; i < 32; i++) {
    const next = apply(axis);
    for (const fixed of exclude) next.addScaledVector(fixed, -fixed.dot(next));
    if (next.lengthSq() < 1e-18) break;
    axis.copy(next.normalize());
  }
  return axis.normalize();
}

// Faca steelBlade: cabo/guarda = parte grossa da malha. Fronteira = vértice grosso mais perto da
// ponta no eixo longo (PCA) da geometria crua; vale no 1P skinned e no 3P. Sem lâmina fina: null.
const knifeMaskCache = new WeakMap();
function knifeHandleMask(geometry) {
  if (knifeMaskCache.has(geometry)) return knifeMaskCache.get(geometry);
  const positions = geometry.attributes.position;
  const points = [];
  for (let i = 0; i < positions.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(positions, i));
  let mask = null;
  if (points.length) {
    const centroid = points.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(points.length);
    const centered = points.map((p) => p.sub(centroid));
    const long = principalAxis(centered);
    const normal = new THREE.Vector3().crossVectors(long, principalAxis(centered, [long])).normalize();
    const along = centered.map((p) => p.dot(long));
    const across = centered.map((p) => p.dot(normal));
    const [nMin, nMax] = across.reduce(([lo, hi], n) => [Math.min(lo, n), Math.max(hi, n)], [Infinity, -Infinity]);
    const [uMin, uMax] = along.reduce(([lo, hi], u) => [Math.min(lo, u), Math.max(hi, u)], [Infinity, -Infinity]);
    const thick = along.filter((_, i) => Math.abs(across[i] - (nMin + nMax) / 2) > (nMax - nMin) * 0.35);
    const sign = thick.reduce((sum, u) => sum + u, 0) <= 0 ? 1 : -1;
    const boundary = Math.max(...thick.map((u) => sign * u)) + (uMax - uMin) * 0.01;
    const blade = along.filter((u) => sign * u > boundary).length;
    if (thick.length && blade >= points.length * 0.01) {
      const axis = long.clone().multiplyScalar(sign);
      mask = new THREE.Vector4(axis.x, axis.y, axis.z, -(axis.dot(centroid) + boundary));
    }
  }
  knifeMaskCache.set(geometry, mask);
  return mask;
}

function knifeBladeFrame(model, profile, region = profile.blade) {
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((object) => {
    const positions = object.isMesh && !handMesh(object) && object.geometry?.attributes?.position;
    if (!positions || object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
    meshes.push(object);
  });
  if (!meshes.length) return { error: 'no-knife-geometry' };
  const bone = knifeRigidBone(meshes);
  if (meshes.some((mesh) => mesh.isSkinnedMesh) && !bone) return { error: 'mixed-rig' };
  // Frame no espaço do osso rígido (1P): a inversa da câmera diagonaliza os eixos da cena.
  const frameMatrix = (bone || model).matrixWorld.clone().invert();
  const point = new THREE.Vector3();
  const points = [];
  const triangles = [];
  for (const mesh of meshes) {
    const positions = mesh.geometry.attributes.position;
    const matrix = new THREE.Matrix4().multiplyMatrices(frameMatrix, mesh.matrixWorld);
    for (let i = 0; i < positions.count; i++) points.push(point.fromBufferAttribute(positions, i).applyMatrix4(matrix).clone());
    const index = mesh.geometry.index;
    const total = index ? index.count : positions.count;
    for (let i = 0; i < total; i += 3) {
      const corners = [];
      for (let j = 0; j < 3; j++) {
        const v = index ? index.getX(i + j) : i + j;
        corners.push(point.fromBufferAttribute(positions, v).applyMatrix4(matrix).clone());
      }
      triangles.push(corners);
    }
  }
  if (!points.length || !triangles.length) return { error: 'no-knife-geometry' };
  const centroid = points.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(points.length);
  const centered = points.map((p) => p.clone().sub(centroid));
  // A faca vive diagonal em qualquer espaço de exportação: eixos por PCA, não por eixo nominal.
  const long = principalAxis(centered);
  const trans = principalAxis(centered, [long]);
  const normal = new THREE.Vector3().crossVectors(long, trans).normalize();
  const projected = (p) => [p.dot(long), p.dot(trans), p.dot(normal)];
  const coordinates = points.map(projected);
  const longRange = coordinates.reduce(([lo, hi], c) => [Math.min(lo, c[0]), Math.max(hi, c[0])], [Infinity, -Infinity]);
  const normalRange = coordinates.reduce(([lo, hi], c) => [Math.min(lo, c[2]), Math.max(hi, c[2])], [Infinity, -Infinity]);
  const len = longRange[1] - longRange[0];
  if (!(len >= profile.blade.minSlenderness * Math.max(normalRange[1] - normalRange[0], 1e-9))) {
    return { error: 'unexpected-geometry' };
  }
  const slice = (from, to) => coordinates
    .filter((c) => c[0] >= from && c[0] <= to)
    .reduce((acc, c) => {
      acc[0] = Math.min(acc[0], c[1]); acc[1] = Math.max(acc[1], c[1]);
      acc[2] = Math.min(acc[2], c[2]); acc[3] = Math.max(acc[3], c[2]);
      return acc;
    }, [Infinity, -Infinity, Infinity, -Infinity]);
  const head = slice(longRange[0] + len * 0.88, longRange[1]);
  const tail = slice(longRange[0], longRange[0] + len * 0.12);
  const tipAtMax = (head[1] - head[0]) + (head[3] - head[2]) <= (tail[1] - tail[0]) + (tail[3] - tail[2]);
  const longSign = tipAtMax ? 1 : -1;
  const gripEnd = tipAtMax ? longRange[0] : longRange[1];
  const { fromGrip, toTip } = region;
  const regionUMin = Math.min(gripEnd + longSign * fromGrip * len, gripEnd + longSign * toTip * len);
  const regionUMax = Math.max(gripEnd + longSign * fromGrip * len, gripEnd + longSign * toTip * len);
  const regionTriangles = triangles
    .map((corners) => corners.map(projected))
    .filter((corners) => corners.some(([u]) => u >= regionUMin && u <= regionUMax));
  if (!regionTriangles.length) return { error: 'unexpected-geometry' };
  const flat = regionTriangles.flat();
  return {
    bone, long, trans, normal, longSign, regionUMin, regionUMax,
    triangles: regionTriangles,
    transLow: flat.reduce((lo, c) => Math.min(lo, c[1]), Infinity),
    transHigh: flat.reduce((hi, c) => Math.max(hi, c[1]), -Infinity),
  };
}

function knifeSupportedPlacement(frame, profile, height, width, centerU, priors) {
  const halfH = height / 2;
  const halfW = width / 2;
  if (centerU - halfH < frame.regionUMin || centerU + halfH > frame.regionUMax) return null;
  const overlapping = frame.triangles.filter((tri) => {
    const us = tri.map((c) => c[0]);
    return Math.min(...us) <= centerU + halfH && Math.max(...us) >= centerU - halfH;
  });
  if (!overlapping.length) return null;
  const flat = overlapping.flat();
  const tMin = flat.reduce((lo, c) => Math.min(lo, c[1]), Infinity);
  const tMax = flat.reduce((hi, c) => Math.max(hi, c[1]), -Infinity);
  const centerT = (tMin + tMax) / 2;
  // Footprint integral: retângulo menos a união dos triângulos reais (knife-mark-support).
  if (!footprintFullyCovered(centerU, centerT, halfH, halfW, overlapping, profile.coverage)) return null;
  if (priors.some((p) => Math.abs(p.centerU - centerU) < p.height / 2 + halfH
    && Math.abs(p.centerT - centerT) < p.width / 2 + halfW)) return null;
  const nMax = flat.reduce((hi, c) => Math.max(hi, c[2]), -Infinity);
  const nMin = flat.reduce((lo, c) => Math.min(lo, c[2]), Infinity);
  const lift = profile.liftFrac * Math.max(nMax - nMin, 1e-9);
  return { width, height, centerU, centerT, rightN: nMax + lift, leftN: nMin - lift };
}

function knifePlacement(frame, profile, aspect, role, priors) {
  const tExtent = frame.transHigh - frame.transLow;
  const uExtent = frame.regionUMax - frame.regionUMin;
  let baseHeight = role.sizeFrac * tExtent * (role.longitudinal ? aspect : 1);
  let baseWidth = role.sizeFrac * tExtent * (role.longitudinal ? 1 : aspect);
  const fit = Math.min(1, (tExtent * 0.9) / baseWidth, (uExtent * 0.8) / baseHeight);
  baseHeight *= fit;
  baseWidth *= fit;
  if (!(baseHeight > 0) || !Number.isFinite(baseHeight) || !Number.isFinite(baseWidth)) return null;
  // `along` é preferência: a lâmina real tem vazios — procura centro e escala suportados.
  for (const scale of [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]) {
    const height = baseHeight * scale;
    const width = baseWidth * scale;
    for (let delta = 0; delta <= 50; delta++) {
      for (const sign of delta === 0 ? [1] : [1, -1]) {
        const centerU = frame.regionUMin + (role.along + sign * delta * 0.02) * uExtent;
        const placement = knifeSupportedPlacement(frame, profile, height, width, centerU, priors);
        if (placement) return placement;
      }
    }
  }
  return null;
}

function addKnifePair(model, skinId, role, texture, frame, placement, context, spec) {
  const geometry = ownVmResource(new THREE.PlaneGeometry(placement.width, placement.height));
  if (spec.longitudinal) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setXY(i, 1 - uv.getY(i), u); }
  }
  const material = paintedMaterial(texture, skinId, role, spec.etched === true);
  const longVector = frame.long.clone().multiplyScalar(frame.longSign);
  const longitudinal = spec.longitudinal;
  // Cada lado gira 180° no próprio plano (nunca espelha) para o topo das letras apontar ao +Y
  // do modelo; sem isso o lado de fora da faca 3P lia de ponta-cabeça.
  const space = (frame.bone || model).matrixWorld.clone().invert();
  const modelUp = new THREE.Vector3(0, 1, 0).transformDirection(model.matrixWorld).transformDirection(space);
  for (const [side, n, flip] of [['right', placement.rightN, false], ['left', placement.leftN, true]]) {
    const planeZ = flip ? frame.normal.clone().negate() : frame.normal.clone();
    const planeY = longVector.clone();
    const planeX = new THREE.Vector3().crossVectors(planeY, planeZ);
    if (longitudinal && planeX.dot(modelUp) < 0) { planeX.negate(); planeY.negate(); }
    const position = new THREE.Vector3()
      .addScaledVector(frame.long, placement.centerU)
      .addScaledVector(frame.trans, placement.centerT)
      .addScaledVector(frame.normal, n);
    const planeFrame = new THREE.Matrix4().makeBasis(planeX, planeY, planeZ).setPosition(position);
    const marking = new THREE.Mesh(geometry, material);
    marking.name = `skin-${role}-${skinId}-${side}`;
    if (frame.bone) {
      // Frame já está no espaço do osso: attach direto, conversão única na bind.
      marking.matrixAutoUpdate = false;
      marking.matrix.copy(planeFrame);
    } else {
      marking.applyMatrix4(planeFrame);
    }
    marking.renderOrder = 3;
    marking.userData.weaponSkin = skinId;
    marking.userData.markingRole = role;
    marking.userData.fittedToMesh = true;
    marking.userData.knifeMarkContext = context;
    (frame.bone || model).add(marking);
  }
}

function attachKnifeMarkings(model, skinId, context) {
  const profile = KNIFE_MARK_PROFILES[context] || null;
  const report = { context: context || null, profile: profile?.id || null, status: '', roles: [] };
  const finish = (status) => { report.status = status; model.userData.knifeMarkings = report; };
  if (!profile) return finish('missing-context');
  const definition = WEAPON_SKINS[skinId];
  if (!definition) return finish('unknown-skin');
  if (definition.officialMarksIncluded) return finish('official-mark-unsupported');
  if (!knifeProfileValid(profile)) return finish('profile-invalid');
  const items = [];
  if (definition.markAsset) {
    const symbol = markTextures.get(skinId);
    if (!symbol) return finish('mark-texture-not-ready');
    items.push({ role: 'symbol', texture: symbol, aspect: (symbol.image?.width || 1) / (symbol.image?.height || 1) });
  }
  if (definition.slogan) {
    const slogan = sloganTexture(skinId);
    if (!slogan) return finish('slogan-texture-unavailable');
    items.push({ role: 'slogan', texture: slogan, aspect: definition.sloganAspect || 8 });
  }
  if (!items.length) return finish('no-mark-asset');
  // Representação/asset exigidos pelo perfil: fingerprint FNV antes de qualquer fit.
  if (knifeGeometryFingerprint(model) !== profile.fingerprint) return finish('representation-mismatch');
  const skinned = [];
  model.traverse((object) => {
    const positions = object.isMesh && !handMesh(object) && object.geometry?.attributes?.position;
    if (positions && !object.name.startsWith('skin-') && !object.name.startsWith('club-mark-') && object.isSkinnedMesh) skinned.push(object);
  });
  if (profile.representation === 'skinned-bone' && skinned.length !== 1) return finish('representation-mismatch');
  if (profile.representation === 'rigid-wrap' && skinned.length !== 0) return finish('representation-mismatch');
  // steelBlade: cada papel mede a própria região (gravação na lâmina, letreiro no cabo).
  const roles = definition.steelBlade ? profile.steelRoles : profile.roles;
  const frames = new Map();
  const placements = [];
  for (const item of items) {
    const spec = roles[item.role];
    const region = spec.region || 'blade';
    if (!frames.has(region)) frames.set(region, knifeBladeFrame(model, profile, profile[region]));
    const frame = frames.get(region);
    if (frame.error) return finish(frame.error);
    const priors = placements.filter((entry) => entry.frame === frame).map((entry) => entry.placement);
    const placement = knifePlacement(frame, profile, item.aspect, spec, priors);
    if (!placement) return finish('footprint-unsupported');
    placements.push({ item, spec, frame, placement });
  }
  placements.forEach(({ item, spec, frame, placement }) => addKnifePair(model, skinId, item.role, item.texture, frame, placement, context, spec));
  report.roles = items.map(({ role }) => role);
  report.regions = placements.map(({ item, spec }) => `${item.role}:${spec.region || 'blade'}${spec.etched ? ':etched' : ''}`);
  return finish('attached');
}

// Espaço do weaponModel 3P (cartaz/prévia da loja): caixa do wrap ÷ norm (cano +Z, cima +Y), e
// malha = Ry(-rotY)·(wrap − shiftZ·Z), o inverso de CFG.rot e do recuo do grip (weapons.js).
const TP_REFERENCE = Object.freeze({
  pistol: Object.freeze({ back: -0.2994, front: 0.6986, top: 0.3799, rotY: 90, shiftZ: 0.1996, scale: 0.2605 }),
});

// Corpo golden do 1P: SkinnedMesh num osso, em outro espaço que o wrap TP onde os layouts são
// autorados. Referência = weaponModel(id).userData.metrics.box ÷ metrics.norm (10/11/2026).
const TP_MARK_REFERENCE = Object.freeze({
  ak: Object.freeze({ back: -0.3793, front: 0.6188, top: 0.1514, scale: 0.8817 }),
  m4: Object.freeze({ back: -0.3793, front: 0.6188, top: 0.1729, scale: 0.8416 }),
  scar: Object.freeze({ back: -0.3793, front: 0.6188, top: 0.1525, scale: 0.9018 }),
  pistol: TP_REFERENCE.pistol,
});

function goldenMarkFrame(mesh, weaponId) {
  const reference = TP_MARK_REFERENCE[weaponId];
  if (!reference || !mesh?.isSkinnedMesh || handMesh(mesh)) return null;
  const bone = knifeRigidBone([mesh]);
  const boneIndex = bone ? mesh.skeleton.bones.indexOf(bone) : -1;
  if (boneIndex < 0 || !mesh.skeleton.boneInverses[boneIndex]) return null;
  // Espaço do osso independente da pose: boneInverse · bindMatrix · posição de bind.
  const toBone = new THREE.Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[boneIndex], mesh.bindMatrix);
  const positions = mesh.geometry.attributes.position;
  const step = Math.max(1, Math.ceil(positions.count / 24000));
  const points = [];
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (let index = 0; index < positions.count; index += step) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(toBone);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return null;
    points.push(point);
    min.min(point);
    max.max(point);
  }
  const extent = new THREE.Vector3().subVectors(max, min);
  const axes = [0, 1, 2].sort((a, b) => extent.getComponent(b) - extent.getComponent(a));
  const [barrelAxis, upAxis, sideAxis] = axes;
  const length = extent.getComponent(barrelAxis);
  if (!(length > 0) || !(extent.getComponent(sideAxis) > 0)) return null;
  // Fatia de 12% em cada ponta do cano: a boca é a de menor seção (cima + lado).
  const slice = (fromStart) => {
    const lo = fromStart ? min.getComponent(barrelAxis) : max.getComponent(barrelAxis) - length * 0.12;
    const hi = lo + length * 0.12;
    const range = [Infinity, -Infinity, Infinity, -Infinity];
    for (const p of points) {
      const b = p.getComponent(barrelAxis);
      if (b < lo || b > hi) continue;
      range[0] = Math.min(range[0], p.getComponent(upAxis)); range[1] = Math.max(range[1], p.getComponent(upAxis));
      range[2] = Math.min(range[2], p.getComponent(sideAxis)); range[3] = Math.max(range[3], p.getComponent(sideAxis));
    }
    return range;
  };
  const startSlice = slice(true);
  const endSlice = slice(false);
  const section = (r) => (r[1] - r[0]) + (r[3] - r[2]);
  const muzzleAtMax = section(endSlice) <= section(startSlice);
  const muzzleSlice = muzzleAtMax ? endSlice : startSlice;
  const upAtMax = (muzzleSlice[0] + muzzleSlice[1]) / 2 >= (min.getComponent(upAxis) + max.getComponent(upAxis)) / 2;
  const unit = (axis, positive) => new THREE.Vector3().setComponent(axis, positive ? 1 : -1);
  const barrel = unit(barrelAxis, muzzleAtMax);
  const up = unit(upAxis, upAtMax);
  const side = new THREE.Vector3().crossVectors(up, barrel);   // imagem do +X do TP (Y × Z = X)
  const k = length / (reference.front - reference.back);
  const stock = muzzleAtMax ? min.getComponent(barrelAxis) : max.getComponent(barrelAxis);
  const top = upAtMax ? max.getComponent(upAxis) : min.getComponent(upAxis);
  const sideMid = (min.getComponent(sideAxis) + max.getComponent(sideAxis)) / 2;
  const origin = new THREE.Vector3()
    .setComponent(barrelAxis, stock - (muzzleAtMax ? 1 : -1) * reference.back * k)
    .setComponent(upAxis, top - (upAtMax ? 1 : -1) * reference.top * k)
    .setComponent(sideAxis, sideMid);
  const matrix = new THREE.Matrix4().makeBasis(
    side.clone().multiplyScalar(k), up.clone().multiplyScalar(k), barrel.clone().multiplyScalar(k),
  ).setPosition(origin);
  const inverse = matrix.clone().invert();
  return { bone, matrix, points: points.map((p) => p.applyMatrix4(inverse)), scale: reference.scale };
}

// Grupo no osso do corpo golden com o espaço TP: as marcas seguem a animação (filhas do
// osso, como a faca 1P) e reaproveitam o layout de 3ª pessoa sem tabela própria.
function goldenMarkHost(mesh, weaponId, skinId) {
  const frame = goldenMarkFrame(mesh, weaponId);
  if (!frame) return null;
  const host = new THREE.Group();
  host.name = `skin-frame-${skinId}`;
  host.matrixAutoUpdate = false;
  host.matrix.copy(frame.matrix);
  host.userData.weaponSkin = skinId;
  host.userData.goldenMarkFrame = true;
  frame.bone.add(host);
  host.updateMatrixWorld(true);
  return { target: host, source: { points: frame.points, scale: frame.scale } };
}

// Layout 1P (`layout.fp`): a marca termina em `front` (cano +Z) e cabe em `maxWidth`; a lateral é
// medida numa janela de pelo menos `fitWidth`: a face do ferrolho só tem vértice nas pontas.
function fpPlacement(spec, aspect, front) {
  const height = Math.min(spec.height, spec.maxWidth / aspect);
  const width = height * aspect;
  const fitWidth = Math.max(width, spec.fitWidth);
  return { y: spec.y, z: front - width / 2, height, fit: { z: front - fitWidth / 2, width: fitWidth } };
}

// `source` (1P): fpMarkLayout/fpSloganLayout da skin ganham do `layout.fp` e do layout de 3ª
// pessoa, porque mão e emendas do receptor em 1ª pessoa não são as do boneco de 3ª pessoa.
function attachPoliticalMarkings(model, weaponId, skinId, source = null) {
  const symbol = markTextures.get(skinId);
  const definition = WEAPON_SKINS[skinId];
  const layout = POLITICAL_LAYOUT[weaponId];
  if (!definition || !layout) return;
  const slogan = sloganTexture(skinId);
  const fp = source ? layout.fp : null;
  const items = [];
  let front = fp?.symbol.front;
  if (symbol) {
    const aspect = (symbol.image?.width || 1) / (symbol.image?.height || 1);
    const placement = (source && definition.fpMarkLayout) || (fp ? fpPlacement(fp.symbol, aspect, front) : definition.markLayout || layout.symbol);
    if (fp) front = placement.z - placement.height * aspect / 2 - fp.gap;
    items.push({ role: 'symbol', texture: symbol, placement, aspect });
  }
  if (slogan) {
    const aspect = definition.sloganAspect || 8;
    items.push({
      role: 'slogan',
      texture: slogan,
      placement: (source && definition.fpSloganLayout) || (fp ? fpPlacement(fp.slogan, aspect, front) : definition.sloganLayout || layout.slogan),
      aspect,
    });
  }
  if (!items.length) return;
  const surfaces = fittedSideSurfaces(model, weaponId, items.map(({ placement, aspect }) => ({
    ...placement,
    width: placement.height * aspect,
    ...placement.fit,
  })), source);
  items.forEach((item, index) => addFittedPair(model, skinId, item.role, item.texture, item.placement, surfaces[index], item.aspect));
}

function attachOfficialMark(model, weaponId, skinId) {
  const texture = markTextures.get(skinId);
  const definition = WEAPON_SKINS[skinId];
  const layout = CLUB_MARK_LAYOUT[weaponId];
  if (!texture || !definition || !layout) return;
  const aspect = (texture.image?.width || 1) / (texture.image?.height || 1);
  const geometry = ownVmResource(new THREE.PlaneGeometry(layout.height * aspect, layout.height));
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
  ownVmResource(material);
  for (const [side, x, rotation] of [
    ['right', layout.x, Math.PI / 2],
    ['left', -layout.x, -Math.PI / 2],
  ]) {
    const marking = new THREE.Mesh(geometry, material);
    marking.name = `club-mark-${skinId}-${side}`;
    marking.position.set(x, layout.y, layout.z);
    marking.rotation.y = rotation;
    marking.renderOrder = 4;
    marking.userData.officialMark = true;
    marking.userData.rightsStatus = definition.rightsStatus || 'permission-needed';
    model.add(marking);
  }
}

// Corpo skinned em vários ossos (X18 da fábrica). `referencia` = { bone, barrel, up } no espaço
// do osso; o corpo é ajustado à caixa TP pela coronha, pelo topo e pelo meio lateral.
function referenceFrame(model, weaponId, { bone, barrel, up } = {}) {
  const reference = TP_REFERENCE[weaponId];
  if (!reference || !bone?.isObject3D || !(barrel?.lengthSq() > 0) || !(up?.lengthSq() > 0)) return null;
  const z = barrel.clone().normalize();
  const y = up.clone().addScaledVector(z, -up.dot(z));
  if (!(y.lengthSq() > 0)) return null;
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);   // Y × Z = X, como no wrap TP: sem espelho
  model.updateMatrixWorld(true);
  bone.updateWorldMatrix(true, false);
  const boneInverseWorld = bone.matrixWorld.clone().invert();
  const meshes = [];
  model.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position || handMesh(object)) return;
    if (object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
    const index = object.isSkinnedMesh ? object.skeleton.bones.indexOf(bone) : -1;
    // Skinned: boneInverse · bindMatrix leva a pose de bind ao osso, independente da animação.
    const toBone = index >= 0
      ? new THREE.Matrix4().multiplyMatrices(object.skeleton.boneInverses[index], object.bindMatrix)
      : new THREE.Matrix4().multiplyMatrices(boneInverseWorld, object.matrixWorld);
    meshes.push({ object, toBone });
  });
  if (!meshes.length) return null;
  const points = [];
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
  const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const axes = new THREE.Vector3();
  for (const { object, toBone } of meshes) {
    const positions = object.geometry.attributes.position;
    const step = Math.max(1, Math.ceil(positions.count / 24000));
    for (let index = 0; index < positions.count; index += step) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(toBone);
      axes.set(point.dot(x), point.dot(y), point.dot(z));
      if (!Number.isFinite(axes.x + axes.y + axes.z)) return null;
      points.push(point);
      lo.min(axes);
      hi.max(axes);
    }
  }
  const k = (hi.z - lo.z) / (reference.front - reference.back);
  if (!(k > 0)) return null;
  const origin = new THREE.Vector3()
    .addScaledVector(x, (lo.x + hi.x) / 2)
    .addScaledVector(y, hi.y - reference.top * k)
    .addScaledVector(z, lo.z - reference.back * k);
  const matrix = new THREE.Matrix4().makeBasis(
    x.clone().multiplyScalar(k), y.clone().multiplyScalar(k), z.clone().multiplyScalar(k),
  ).setPosition(origin);
  const inverse = matrix.clone().invert();
  const meshFromWrap = new THREE.Matrix4().makeRotationY(-reference.rotY * Math.PI / 180)
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -reference.shiftZ));
  const spaces = new Map(meshes.map(({ object, toBone }) => [object, meshFromWrap.clone().multiply(inverse).multiply(toBone)]));
  const wrapPoints = points.map((point) => point.applyMatrix4(inverse));
  // Caixa da arma inteira no espaço da malha TP: o padrão de textura (patternAsset) a usa como a 3P.
  const box = new THREE.Box3();
  for (const point of wrapPoints) box.expandByPoint(point.clone().applyMatrix4(meshFromWrap));
  return { bone, matrix, points: wrapPoints, scale: reference.scale, spaces, box };
}

// Grupo filho do osso com o espaço do wrap TP: as marcas seguem a animação e usam POLITICAL_LAYOUT /
// CLUB_MARK_LAYOUT sem tabela própria. Troca de pintura tira o grupo da anterior.
function referenceMarkHost(frame, skinId) {
  for (const old of frame.bone.children.filter((child) => child.userData.referenceMarkFrame)) frame.bone.remove(old);
  const host = new THREE.Group();
  host.name = `skin-frame-${skinId}`;
  host.matrixAutoUpdate = false;
  host.matrix.copy(frame.matrix);
  host.userData.weaponSkin = skinId;
  host.userData.referenceMarkFrame = true;
  frame.bone.add(host);
  host.updateMatrixWorld(true);
  return host;
}

// `frame` (X18 da fábrica, referenceFrame) ou corpo golden (goldenMarkFrame): marcas no osso.
function attachSkinMark(model, weaponId, skinId, knifeContext, frame = null) {
  if (weaponId === 'knife') return attachKnifeMarkings(model, skinId, knifeContext);
  const golden = frame ? null : goldenMarkHost(model, weaponId, skinId);
  const target = frame ? referenceMarkHost(frame, skinId) : golden?.target || model;
  const source = frame ? { points: frame.points, scale: frame.scale } : golden?.source || null;
  if (WEAPON_SKINS[skinId]?.officialMarksIncluded) attachOfficialMark(target, weaponId, skinId);
  else attachPoliticalMarkings(target, weaponId, skinId, source);
}

// `knifeMask` (faca steelBlade): mapa, aço e acabamento originais ficam; a pintura e o perfil de
// material valem só onde dot(posição, xyz) + w ≤ 0 — o cabo/guarda de knifeHandleMask.
// `reference` (X18): { space: geometria → malha TP, box: caixa da arma nesse espaço }.
function cloneMaterial(material, skinId, geometry, unit = null, knifeMask = null, reference = null) {
  const copy = ownVmResource(material.clone());
  copy.name = `${material.name || 'weapon'}__skin_${skinId}`;
  const definition = WEAPON_SKINS[skinId];
  const profile = MATERIAL_PROFILE[definition?.metalFinish] || MATERIAL_PROFILE.default;
  if (!definition?.preserveBase && !knifeMask) {
    copy.map = null;
    copy.color.set(0xffffff);
  }
  if (!knifeMask) {
    copy.roughness = profile.roughness;
    copy.metalness = profile.metalness;
    copy.envMapIntensity = profile.envMapIntensity;
  }
  const space = reference?.space || null;
  copy.userData = {
    ...copy.userData,
    weaponSkin: skinId,
    ...(knifeMask ? { steelBladeMask: knifeMask.toArray() } : {}),
    ...(space ? { weaponSkinSpace: space.toArray() } : {}),
  };
  let frame = null;
  const patternTexture = patternAssetTexture(skinId);
  if (SESSAO_DA_TRETA_FRAGMENT[skinId] || patternTexture) {
    if (!reference?.box && !geometry.boundingBox) geometry.computeBoundingBox();
    const { min, max } = reference?.box || geometry.boundingBox;
    const useZ = max.z - min.z > max.x - min.x;
    const length = useZ ? max.z - min.z : max.x - min.x;
    frame = new THREE.Vector4(
      useZ ? 1 : 0,
      useZ ? (min.z + max.z) / 2 : (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      unit || 1 / Math.max(length, 0.0001),
    );
  }
  const style = definition?.patternStyle || {};
  const palette = style.palette?.length === 3 ? style.palette.map((hex) => new THREE.Color(hex)) : null;
  const patternUniforms = patternTexture ? {
    weaponSkinPattern: { value: patternTexture },
    weaponSkinPatternStyle: { value: new THREE.Vector3(style.scale || 1, style.contrast || 1, palette ? 1 : 0) },
    weaponSkinPalette: { value: palette || [new THREE.Color(0), new THREE.Color(0.5, 0.5, 0.5), new THREE.Color(1, 1, 1)] },
  } : null;
  const fragment = patternTexture ? PATTERN_ASSET_FRAGMENT : patternFragment(skinId);
  copy.onBeforeCompile = (shader) => {
    if (space) shader.uniforms.weaponSkinSpace = { value: space };
    if (frame) shader.uniforms.weaponSkinFrame = { value: frame };
    if (patternUniforms) Object.assign(shader.uniforms, patternUniforms);
    if (knifeMask) {
      shader.uniforms.weaponSkinKnife = { value: knifeMask };
      shader.uniforms.weaponSkinHandleFinish = { value: new THREE.Vector2(profile.roughness, profile.metalness) };
    }
    const declarations = `${frame ? 'uniform vec4 weaponSkinFrame;\n' : ''}${patternUniforms
      ? 'uniform sampler2D weaponSkinPattern;\nuniform vec3 weaponSkinPatternStyle;\nuniform vec3 weaponSkinPalette[3];\n'
      : ''}${knifeMask ? 'uniform vec4 weaponSkinKnife;\nuniform vec2 weaponSkinHandleFinish;\n' : ''}`;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${space ? 'uniform mat4 weaponSkinSpace;\n' : ''}varying vec3 vWeaponSkinLocal;\nvoid main() {`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n\tvWeaponSkinLocal = ${space ? '(weaponSkinSpace * vec4(position, 1.0)).xyz' : 'position'};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${declarations}varying vec3 vWeaponSkinLocal;\nvoid main() {`);
    shader.fragmentShader = knifeMask
      ? shader.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 weaponSkinSteel = diffuseColor.rgb;
  ${fragment}
  float weaponSkinHandle = step(dot(vWeaponSkinLocal, weaponSkinKnife.xyz) + weaponSkinKnife.w, 0.0);
  diffuseColor.rgb = mix(weaponSkinSteel, diffuseColor.rgb, weaponSkinHandle);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, weaponSkinHandleFinish.x, weaponSkinHandle);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, weaponSkinHandleFinish.y, weaponSkinHandle);')
      : shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n${fragment}`);
  };
  copy.customProgramCacheKey = () => `weapon-skin:${skinId}:${patternTexture ? 'pattern-asset' : 'procedural'}:${knifeMask ? 'aco' : 'corpo'}:object-space-v3${space ? ':referencia' : ''}`;
  copy.needsUpdate = true;
  return copy;
}

export function reviewWeaponSkinId() {
  if (typeof location === 'undefined') return null;
  const query = new URLSearchParams(location.search);
  return query.get('debug') === '1' ? query.get('weaponskin') : null;
}

// Escala comum do padrão entre as malhas da arma: o pente herda a do corpo (`referenceRoot`).
// Peça golden do 1P é skinned quantizada: a escala real está em bindMatrix · boneInverse · osso.
const effectiveMatrix = new THREE.Matrix4();
function effectiveScale(object) {
  const skinIndex = object.isSkinnedMesh && object.geometry.attributes.skinIndex;
  const bone = skinIndex && object.skeleton?.bones[skinIndex.getX(0)];
  const inverse = skinIndex && object.skeleton?.boneInverses[skinIndex.getX(0)];
  if (!bone || !inverse) return object.matrixWorld.getMaxScaleOnAxis();
  return effectiveMatrix.copy(object.matrixWorld).multiply(object.bindMatrixInverse)
    .multiply(bone.matrixWorld).multiply(inverse).multiply(object.bindMatrix).getMaxScaleOnAxis();
}
function patternUnits(model, referenceRoot = model) {
  const meshes = (root) => {
    const list = [];
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      if (!object.isMesh || !object.geometry?.attributes?.position || handMesh(object)) return;
      if (object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      list.push(object);
    });
    return list;
  };
  let reference = 0;
  for (const object of meshes(referenceRoot)) {
    const { min, max } = object.geometry.boundingBox;
    reference = Math.max(reference, Math.max(max.z - min.z, max.x - min.x) * effectiveScale(object));
  }
  const units = new Map();
  if (reference > 0) for (const object of meshes(model)) units.set(object, effectiveScale(object) / reference);
  return units;
}

// `marcas:false` pinta a peça sem repetir decalque/selo — usado nas peças IRMÃS da arma
// (pente, ferrolho), que precisam do material da pintura mas não de um segundo adesivo.
// `patternReference`: corpo da arma, para a peça irmã herdar a escala do padrão dele.
// `referencia` (corpo da fábrica): ver referenceFrame; inválida = não pinta, nunca cor chapada.
export function applyWeaponSkinCandidate(model, weaponId, skinId, { marcas = true, knifeContext = null, patternReference = null, referencia = null } = {}) {
  if (!skinId) return false;
  const definition = WEAPON_SKINS[skinId];
  if (!definition || !definition.targetWeapons.includes(weaponId)) return false;
  if (!skinFragment(skinId)) return false;
  const frame = referencia ? referenceFrame(model, weaponId, referencia) : null;
  if (referencia && !frame) return false;
  const units = !frame && (SESSAO_DA_TRETA_FRAGMENT[skinId] || patternAssetTexture(skinId))
    ? patternUnits(model, patternReference || model)
    : new Map();
  const steelBlade = weaponId === 'knife' && definition.steelBlade === true;
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const space = frame?.spaces.get(object) || null;
    const skinMaterial = (material) => HAND_MATERIAL.test(material?.name || '')
      ? material
      : cloneMaterial(material, skinId, object.geometry, units.get(object) || null, steelBlade ? knifeHandleMask(object.geometry) : null,
        space ? { space, box: frame.box } : null);
    object.material = Array.isArray(object.material)
      ? object.material.map(skinMaterial)
      : skinMaterial(object.material);
  });
  if (marcas) attachSkinMark(model, weaponId, skinId, knifeContext, frame);
  model.userData.weaponSkin = skinId;
  return true;
}
