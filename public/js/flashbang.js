// Cegueira da flash por observador (CS: ângulo até o centro da visão, distância, oclusão).
// Conta pura para rodar em Node; a oclusão vem do game.js (`_losClear`). Régua: eval:flashbang.

export const FLASH_MAX_S = 4.8;
export const FLASH_RAIO = 30;
export const FLASH_PERTO = 1.5;
export const FLASH_FRENTE_DEG = 53;
export const FLASH_LADO = 0.35;
export const FLASH_COSTAS = 0.06;
export const FLASH_MIN_S = 0.15;
export const FLASH_FADE_S = 2.4;
export const FLASH_ERRO_MIRA = 0.6;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Fator pelo ângulo (graus) entre a direção do olhar e a direção do estouro.
export function fatorAngulo(graus) {
  const a = Math.abs(graus);
  if (a <= FLASH_FRENTE_DEG) return 1;
  if (a <= 90) return 1 + (FLASH_LADO - 1) * (a - FLASH_FRENTE_DEG) / (90 - FLASH_FRENTE_DEG);
  if (a <= 140) return FLASH_LADO + (FLASH_COSTAS - FLASH_LADO) * (a - 90) / 50;
  return FLASH_COSTAS;
}

// Fator pela distância (m). Expoente 1,5: cai rápido no meio, como a luz que se espalha.
export function fatorDistancia(d) {
  if (d <= FLASH_PERTO) return 1;
  if (d >= FLASH_RAIO) return 0;
  return Math.pow(1 - (d - FLASH_PERTO) / (FLASH_RAIO - FLASH_PERTO), 1.5);
}

/* olho/frente/estouro: {x,y,z}. `frente` não precisa estar normalizado.
   Devolve { dur (s), forca (0..1), pico (alfa do branco), angulo (graus), dist (m) }. */
export function cegueiraFlash({ olho, frente, estouro, ocluido = false }) {
  const dx = estouro.x - olho.x, dy = estouro.y - olho.y, dz = estouro.z - olho.z;
  const dist = Math.hypot(dx, dy, dz);
  const fl = Math.hypot(frente.x, frente.y, frente.z) || 1;
  const cos = dist < 1e-4 ? 1 : (dx * frente.x + dy * frente.y + dz * frente.z) / (dist * fl);
  const angulo = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
  const zero = { dur: 0, forca: 0, pico: 0, angulo, dist };
  if (ocluido) return zero;
  const forca = fatorAngulo(angulo) * fatorDistancia(dist);
  const dur = FLASH_MAX_S * forca;
  if (dur < FLASH_MIN_S) return zero;
  // Mesmo de costas o clarão pisca a tela; de frente e perto o branco é total.
  const pico = clamp01(0.3 + forca * 1.4);
  return { dur, forca, pico, angulo, dist };
}

/* Curva do branco no tempo t (s desde o estouro): branco cheio até faltar
   FLASH_FADE_S, depois desbota. É o desenho do CS: a primeira metade de um flash
   cheio não deixa ver nada, a segunda devolve a imagem aos poucos. */
export function brancoEm(t, dur, pico) {
  if (!(dur > 0) || t >= dur || t < 0) return 0;
  const hold = Math.max(0, dur - FLASH_FADE_S);
  if (t <= hold) return pico;
  const k = (t - hold) / (dur - hold);
  return pico * (1 - k) * (1 - k * 0.35);
}

/* Imagem retida: o último quadro antes do estouro fica "queimado" na retina e some
   DEPOIS do branco (dura 0,6 s a mais). Só aparece quando a cegueira foi forte. */
export function retidaEm(t, dur, forca) {
  if (!(dur > 0) || forca < 0.25 || t < 0) return 0;
  const fim = dur + 0.6;
  if (t >= fim) return 0;
  return Math.min(0.8, forca) * (1 - t / fim);
}
