// Regras de negócio do editor: o que é editável, com quais limites e defaults.
// Fonte da verdade = libs do jogo (weaponCFG/CHARACTERS/preloadMapProps), nunca um
// espelho à mão — se o jogo muda o len de uma arma, o default de pose muda com ele.
import { weaponCFG } from '../weapons.js';

export const MODES = ['hip', 'ads'];
export const MODE_LABEL = { hip: 'Quadril', ads: 'Mirado' };

export const AK_LEN = 0.88;   // comprimento de referência do enquadramento padrão

// Campos de pose por arma (hip/ads). Escala 0.01 → metros; fov em graus.
export const POSE_FIELDS = {
  fov: { label: 'FOV', min: 30, max: 100 },
  sz: { label: 'Tamanho', min: 20, max: 100 },
  wx: { label: 'X', min: -40, max: 40 },
  wy: { label: 'Y', min: -40, max: 10 },
  wz: { label: 'Z', min: -70, max: -16 },
  rx: { label: 'pitch', min: -30, max: 30 },
  ry: { label: 'yaw', min: -30, max: 30 },
  wt: { label: 'inclinação', min: -30, max: 30 },
};

export const FXDEF = {
  flashSize: { label: 'flash tam.', min: 10, max: 140, val: 55 },    // ×0.01 m do sprite de boca
  flashLife: { label: 'flash dur.', min: 20, max: 220, val: 60 },    // ms
  sparks: { label: 'faíscas', min: 0, max: 20, val: 7 },             // qtd por tiro
  trThick: { label: 'tracer esp.', min: 1, max: 8, val: 3 },         // mult. da grossura
  trOpacity: { label: 'tracer opac.', min: 0, max: 100, val: 90 },   // %
  lightInt: { label: 'luz forte', min: 0, max: 24, val: 8 },         // intensidade
  warmth: { label: 'luz calor', min: 0, max: 100, val: 60 },         // 0=frio 100=quente
  lightLife: { label: 'luz dur.', min: 20, max: 220, val: 55 },      // ms
  kick: { label: 'kick', min: 0, max: 300, val: 100 },               // % recuo pra trás
  rise: { label: 'subida', min: 0, max: 300, val: 100 },             // % subida do cano
  side: { label: 'lateral', min: 0, max: 300, val: 100 },            // % jolt lateral
  recover: { label: 'recuperar', min: 20, max: 400, val: 100 },      // % vel. de volta
};

export const FXGROUPS = {
  'Efeito do tiro': ['flashSize', 'flashLife', 'sparks', 'trThick', 'trOpacity'],
  'Fogo / luz': ['lightInt', 'warmth', 'lightLife'],
  'Recuo': ['kick', 'rise', 'side', 'recover'],
};

// Pistola tem mira de ferro posicionada à mão (sem auto-alinhar no ADS).
export const NO_ALIGN = new Set(['pistol']);
// Scoped = a arma troca a mira por luneta/escopeta (mira some na tela).
export const SCOPED = new Set(['awp', 'svd', 'g3sg1', 'sks', 'mosin', 'rem700', 'm400']);

// Intervalo entre tiros em ms (aprox. do jogo — WEAPONS.rate). Dá fim à rajada:
// pente vazio → recarrega → o recuo volta.
export const RATE = { awp: 900, mosin: 1000, rem700: 900, deagle: 260, pistol: 200, knife: 400 };
export const MAG = {
  awp: 5, mosin: 5, rem700: 5, sks: 10, m400: 20, svd: 10, g3sg1: 20, deagle: 7,
  revolver38: 6, pistol: 12, shotgun: 7, carbine: 10, g3: 20, md97: 20, m92: 30,
  akm: 30, scar: 20, tavor: 30, famas: 25, uzi: 25, p90: 50, lmg: 100, knife: 0,
};
export const magOf = (id) => MAG[id] ?? 30;   // fallback fuzil

// Pose padrão por arma: deriva do COMPRIMENTO REAL (weaponCFG.len) — a mesma fórmula
// que o jogo usa pra manter a arma proporcional à lente fechada (V0=42). Arma curta
// fica um pouco maior na tela, arma comprida um pouco menor.
function defaultPose(id) {
  const len = (weaponCFG(id) && weaponCFG(id).len) || AK_LEN;
  const k = Math.max(0.45, Math.min(1, AK_LEN / len));
  const sc = (b) => Math.round(Math.max(20, Math.min(100, b * k)));
  const hip = { fov: 55, sz: sc(67), wx: 5, wy: -10, wz: -21, rx: 0, ry: 1, wt: 3 };
  const ads = { fov: 47, sz: sc(68), wx: 0, wy: 1, wz: -25, rx: 0, ry: 0, wt: 0 };
  return { hip, ads };
}
export function defaultPoseFor(id) {
  return defaultPose(id);
}

// Poses fixas gravadas no código (fonte da verdade do jogo). O editor não as esconde:
// continuam editáveis, mas o padrão delas NÃO sobe — o Jogo manda.
export const POSE_FIXED = {
  pistol: {
    hip: { fov: 50, sz: 43, wx: 5, wy: -10, wz: -22, rx: 0, ry: 1, wt: 3 },
    ads: { fov: 30, sz: 89, wx: 1, wy: -10, wz: -22, rx: 0, ry: 1, wt: 3 },
  },
};