// RECUO — fonte ÚNICA de verdade, compartilhada pelo jogo (game.js) e pelo editor (dev.html).
// Extraído do game.js pra o editor não reinventar (e divergir). Mesmos números = mesmo recuo.
//
// Modelo (CS2-like): cada arma tem um KICK vertical em graus (REC_DEG) e um PADRÃO de spray
// por CLASSE (RECOIL_PATTERN): [dx,dy] normalizados por tiro — sobe quase reto no começo,
// puxa pra ESQUERDA no miolo, DIREITA depois e serpenteia no fim, com ±30% de aleatoriedade.
// O timing global do view-punch (segurar/recuperar/permanente) fica em REC.

// [dx, dy] por tiro (30). dy = vertical (1 = kick cheio do 1º tiro), dx = lateral.
export function buildRecoilPattern({ mid = 0.42, tail = 0.2, left = 0.56, right = 0.68, wig = 0.3 } = {}) {
  const a = [];
  for (let i = 0; i < 30; i++) {
    let dy, dx;
    if (i < 8) { dy = 1 - 0.31 * (i / 7); dx = (i % 2 ? 0.06 : -0.05); }        // subida quase reta
    else if (i < 16) { dy = mid; dx = -left; }                                   // esquerda
    else if (i < 25) { dy = mid * 0.72; dx = right; }                            // direita
    else { dy = tail; dx = (i % 2 ? 1 : -1) * wig; }                             // serpenteia
    a.push([dx, dy]);
  }
  return a;
}

// parâmetros do padrão por CLASSE (editáveis ao vivo; RECOIL_PATTERN é regenerado deles).
export const RECOIL_PARAMS = {
  ak:   { mid: 0.44, tail: 0.22, left: 0.56, right: 0.69, wig: 0.3 },   // 7.62: braço largo
  ar:   { mid: 0.40, tail: 0.19, left: 0.40, right: 0.48, wig: 0.3 },   // 5.56: mais controlável
  smg:  { mid: 0.46, tail: 0.26, left: 0.30, right: 0.36, wig: 0.36 },
  lmg:  { mid: 0.52, tail: 0.30, left: 0.60, right: 0.72, wig: 0.3 },
  semi: { mid: 0.55, tail: 0.40, left: 0.16, right: 0.20, wig: 0.2 },   // 1 tiro por clique: quase só vertical
};
export const RECOIL_PATTERN = {};
for (const c in RECOIL_PARAMS) RECOIL_PATTERN[c] = buildRecoilPattern(RECOIL_PARAMS[c]);
export function rebuildPattern(cls) { RECOIL_PATTERN[cls] = buildRecoilPattern(RECOIL_PARAMS[cls]); }

export const RECOIL_CLASS = {};
for (const w of ['ak', 'm92', 'md97']) RECOIL_CLASS[w] = 'ak';
for (const w of ['m4', 'scar', 'famas', 'carbine']) RECOIL_CLASS[w] = 'ar';
for (const w of ['mp5', 'uzi', 'p90']) RECOIL_CLASS[w] = 'smg';
RECOIL_CLASS.lmg = 'lmg';

// Kick VERTICAL do 1º tiro em GRAUS por arma (o resto do padrão escala disso).
export const REC_DEG = {
  awp: 4.9, mosin: 4.7, shotgun: 3.4, md97: 1.65,
  svd: 1.9, sks: 1.5, carbine: 1.9,
  ak: 1.6, m92: 1.5, scar: 1.45, m4: 1.35, famas: 1.25, lmg: 1.5,
  mp5: 0.95, uzi: 0.9, p90: 0.85,
  deagle: 2.3, revolver38: 2.0, pistol: 1.15, knife: 0.5,
};

// Timing GLOBAL do view-punch: NÃO recupera enquanto a rajada está viva (hold); depois volta
// com mola tau. perm = fração que vira deriva PERMANENTE na mira (o jogador corrige = spray control).
export const REC = { hold: 0.30, tau: 0.22, rise: 0.035, perm: 0.25 };

// amplitude do KICK do viewmodel por arma (mesma fórmula do game.js — sublinear, sem saturar).
export function vmKickAmp(wid, { scoped = false, crouchF = 0, pistol = false } = {}) {
  return (0.42 + Math.sqrt(REC_DEG[wid] ?? 1.4) * 0.28) * (scoped ? 0.7 : 1) * (1 - 0.25 * crouchF) * (pistol ? 0.5 : 1);
}
