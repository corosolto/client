import * as THREE from 'three';
import { WEAPON_SKINS } from './data/weapon-skin-definitions.js';
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
const patternFragment = (skinId) => PATTERN_FRAGMENT[skinId] || THEME_FRAGMENT[WEAPON_SKINS[skinId]?.theme];
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
  pistol: Object.freeze({
    symbol: Object.freeze({ y: -0.020, z: -0.015, height: 0.082 }),
    slogan: Object.freeze({ y: 0.240, z: 0.035, height: 0.030 }),
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
  const asset = WEAPON_SKINS[skinId]?.markAsset;
  if (!asset) return Promise.resolve(null);
  if (!markLoads.has(skinId)) {
    markLoads.set(skinId, new THREE.TextureLoader().loadAsync(asset).then((texture) => {
      texture.name = `${skinId}__${WEAPON_SKINS[skinId]?.officialMarksIncluded ? 'official_mark_permission_needed' : 'project_symbol_inlay'}`;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      markTextures.set(skinId, texture);
      return texture;
    }));
  }
  return markLoads.get(skinId);
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
  const style = SLOGAN_STYLE[definition.theme] || SLOGAN_STYLE['trabalho-13'];
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
  context.lineWidth = 14;
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

function fittedSideSurfaces(model, weaponId, placements) {
  const cacheKey = `${model.uuid}:${weaponId}:${placements.map(({ y, z, width, height, lift }) => `${y},${z},${width},${height},${lift || 0}`).join('|')}`;
  if (fittedSurfaceCache.has(cacheKey)) return fittedSurfaceCache.get(cacheKey);
  model.updateMatrixWorld(true);
  const inverseRoot = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const probes = placements.map(({ y, z, width, height, lift }) => ({
    y, z, halfW: width * 0.56, halfH: height * 0.72, lift: Math.max(0, lift || 0), min: Infinity, max: -Infinity,
  }));
  let overallMin = Infinity;
  let overallMax = -Infinity;
  const point = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  model.traverse((object) => {
    const positions = object.isMesh && !handMesh(object) && object.geometry?.attributes?.position;
    if (!positions || object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
    matrix.multiplyMatrices(inverseRoot, object.matrixWorld);
    const step = Math.max(1, Math.ceil(positions.count / 24000));
    for (let index = 0; index < positions.count; index += step) {
      point.fromBufferAttribute(positions, index).applyMatrix4(matrix);
      overallMin = Math.min(overallMin, point.x);
      overallMax = Math.max(overallMax, point.x);
      for (const probe of probes) {
        if (Math.abs(point.y - probe.y) > probe.halfH || Math.abs(point.z - probe.z) > probe.halfW) continue;
        probe.min = Math.min(probe.min, point.x);
        probe.max = Math.max(probe.max, point.x);
      }
    }
  });
  const lift = 0.0015 / Math.max(0.001, model.scale.x || 1);
  const surfaces = probes.map((probe) => Object.freeze({
    right: (Number.isFinite(probe.max) ? probe.max : overallMax) + lift + probe.lift,
    left: (Number.isFinite(probe.min) ? probe.min : overallMin) - lift - probe.lift,
  }));
  fittedSurfaceCache.set(cacheKey, surfaces);
  return surfaces;
}
function paintedMaterial(texture, skinId, role) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    roughness: role === 'symbol' ? 0.70 : 0.76,
    metalness: role === 'symbol' ? 0.12 : 0.08,
    envMapIntensity: 0.74,
    side: THREE.FrontSide,
  });
  material.name = `${skinId}__${role}_paint`;
  return material;
}

function addFittedPair(model, skinId, role, texture, placement, surfaces, aspect) {
  const width = placement.height * aspect;
  const geometry = new THREE.PlaneGeometry(width, placement.height);
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

const KNIFE_MARK_PROFILES = Object.freeze({
  'knife-fp': Object.freeze({
    id: 'coro-knife-fp-v2',
    representation: 'skinned-bone',
    fingerprint: '2b9905bf',
    blade: Object.freeze({ fromGrip: 0.50, toTip: 0.96, minSlenderness: 2.2 }),
    roles: Object.freeze({
      symbol: Object.freeze({ along: 0.40, sizeFrac: 0.62 }),
      slogan: Object.freeze({ along: 0.76, sizeFrac: 0.62, longitudinal: true }),
    }),
    liftFrac: 0.05,
    coverage: FOOTPRINT_TOLERANCE,
  }),
  'knife-tp': Object.freeze({
    id: 'coro-knife-tp-v2',
    representation: 'rigid-wrap',
    fingerprint: 'eede1583',
    blade: Object.freeze({ fromGrip: 0.50, toTip: 0.96, minSlenderness: 2.2 }),
    roles: Object.freeze({
      symbol: Object.freeze({ along: 0.40, sizeFrac: 0.62 }),
      slogan: Object.freeze({ along: 0.76, sizeFrac: 0.62, longitudinal: true }),
    }),
    liftFrac: 0.05,
    coverage: FOOTPRINT_TOLERANCE,
  }),
});
const KNIFE_CONTEXTS = Object.freeze(Object.keys(KNIFE_MARK_PROFILES));

function knifeProfileValid(profile) {
  const { blade, roles } = profile;
  if (!(blade.fromGrip > 0 && blade.toTip > blade.fromGrip && blade.toTip <= 1 && blade.minSlenderness > 0)) return false;
  for (const role of Object.values(roles)) {
    if (!(role.along >= 0 && role.along <= 1 && role.sizeFrac > 0 && role.sizeFrac < 1)) return false;
  }
  return true;
}

function knifeRigidBone(meshes) {
  let bone = null;
  for (const mesh of meshes) {
    const { skinIndex, skinWeight, position } = mesh.geometry.attributes;
    if (!mesh.isSkinnedMesh || !skinIndex || !skinWeight) continue;
    for (let i = 0; i < position.count; i++) {
      let sum = 0, dominant = -1, dominantWeight = 0;
      for (let k = 0; k < skinIndex.itemSize; k++) {
        const weight = skinWeight.array[i * skinWeight.itemSize + k];
        if (!Number.isFinite(weight) || weight < 0) return null;
        sum += weight;
        if (weight > 1e-6) {
          if (dominant >= 0) return null;
          dominant = skinIndex.array[i * skinIndex.itemSize + k];
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

function knifeBladeFrame(model, profile) {
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
  const { fromGrip, toTip } = profile.blade;
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

function addKnifePair(model, skinId, role, texture, frame, placement, context) {
  const geometry = new THREE.PlaneGeometry(placement.width, placement.height);
  if (KNIFE_MARK_PROFILES[context].roles[role].longitudinal) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setXY(i, 1 - uv.getY(i), u); }
  }
  const material = paintedMaterial(texture, skinId, role);
  const longVector = frame.long.clone().multiplyScalar(frame.longSign);
  for (const [side, n, flip] of [['right', placement.rightN, false], ['left', placement.leftN, true]]) {
    const planeZ = flip ? frame.normal.clone().negate() : frame.normal.clone();
    const planeX = new THREE.Vector3().crossVectors(longVector, planeZ);
    const position = new THREE.Vector3()
      .addScaledVector(frame.long, placement.centerU)
      .addScaledVector(frame.trans, placement.centerT)
      .addScaledVector(frame.normal, n);
    const planeFrame = new THREE.Matrix4().makeBasis(planeX, longVector, planeZ).setPosition(position);
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
  const frame = knifeBladeFrame(model, profile);
  if (frame.error) return finish(frame.error);
  const placements = [];
  for (const item of items) {
    const placement = knifePlacement(frame, profile, item.aspect, profile.roles[item.role], placements.map(({ placement: p }) => p));
    if (!placement) return finish('footprint-unsupported');
    placements.push({ item, placement });
  }
  placements.forEach(({ item, placement }) => addKnifePair(model, skinId, item.role, item.texture, frame, placement, context));
  report.roles = items.map(({ role }) => role);
  return finish('attached');
}

function attachPoliticalMarkings(model, weaponId, skinId) {
  const symbol = markTextures.get(skinId);
  const definition = WEAPON_SKINS[skinId];
  const layout = POLITICAL_LAYOUT[weaponId];
  if (!definition || !layout) return;
  const slogan = sloganTexture(skinId);
  const items = [];
  if (symbol) {
    items.push({
      role: 'symbol',
      texture: symbol,
      placement: definition.markLayout || layout.symbol,
      aspect: (symbol.image?.width || 1) / (symbol.image?.height || 1),
    });
  }
  if (slogan) {
    items.push({
      role: 'slogan',
      texture: slogan,
      placement: definition.sloganLayout || layout.slogan,
      aspect: definition.sloganAspect || 8,
    });
  }
  if (!items.length) return;
  const surfaces = fittedSideSurfaces(model, weaponId, items.map(({ placement, aspect }) => ({
    ...placement,
    width: placement.height * aspect,
  })));
  items.forEach((item, index) => addFittedPair(model, skinId, item.role, item.texture, item.placement, surfaces[index], item.aspect));
}

function attachOfficialMark(model, weaponId, skinId) {
  const texture = markTextures.get(skinId);
  const definition = WEAPON_SKINS[skinId];
  const layout = CLUB_MARK_LAYOUT[weaponId];
  if (!texture || !definition || !layout) return;
  const aspect = (texture.image?.width || 1) / (texture.image?.height || 1);
  const geometry = new THREE.PlaneGeometry(layout.height * aspect, layout.height);
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

function attachSkinMark(model, weaponId, skinId, knifeContext) {
  if (weaponId === 'knife') return attachKnifeMarkings(model, skinId, knifeContext);
  if (WEAPON_SKINS[skinId]?.officialMarksIncluded) attachOfficialMark(model, weaponId, skinId);
  else attachPoliticalMarkings(model, weaponId, skinId);
}

function cloneMaterial(material, skinId) {
  const copy = material.clone();
  copy.name = `${material.name || 'weapon'}__skin_${skinId}`;
  const definition = WEAPON_SKINS[skinId];
  const profile = MATERIAL_PROFILE[definition?.metalFinish] || MATERIAL_PROFILE.default;
  if (!definition?.preserveBase) {
    copy.map = null;
    copy.color.set(0xffffff);
  }
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
      .replace('#include <map_fragment>', `#include <map_fragment>\n${patternFragment(skinId)}`);
  };
  copy.customProgramCacheKey = () => `weapon-skin:${skinId}:object-space-v3`;
  copy.needsUpdate = true;
  return copy;
}

export function reviewWeaponSkinId() {
  if (typeof location === 'undefined') return null;
  const query = new URLSearchParams(location.search);
  return query.get('debug') === '1' ? query.get('weaponskin') : null;
}

// `marcas:false` pinta a peça sem repetir decalque/selo — usado nas peças IRMÃS da arma
// (pente, ferrolho), que precisam do material da pintura mas não de um segundo adesivo.
export function applyWeaponSkinCandidate(model, weaponId, skinId, { marcas = true, knifeContext = null } = {}) {
  if (!skinId) return false;
  const definition = WEAPON_SKINS[skinId];
  if (!definition || !definition.targetWeapons.includes(weaponId)) return false;
  if (!patternFragment(skinId)) return false;
  const skinMaterial = (material) => HAND_MATERIAL.test(material?.name || '')
    ? material
    : cloneMaterial(material, skinId);
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(skinMaterial)
      : skinMaterial(object.material);
  });
  if (marcas) attachSkinMark(model, weaponId, skinId, knifeContext);
  model.userData.weaponSkin = skinId;
  return true;
}
