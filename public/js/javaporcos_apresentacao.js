export const JAVAPORCO_RETRATO = '/img/javaporco-card.webp';
export const JAVAPORCOS_WALLS = Object.freeze([
  '/img/javaporcos-cidade-gpt-20261031.webp',
  '/img/javaporcos-ataque-cidade.webp',
  '/img/loading-javaporcos.webp',
  '/img/map-previews/ref-javaporcos-parede-mata.webp',
  '/img/map-previews/ref-javaporcos-cidade-cercada.webp',
]);
export function nomeTimeJavaporcos(modo, side, times = 2) {
  if (modo !== 'horde') return null;
  if (side === 'J') return 'Javaporcos';
  if (times === 3) return side === 'E' ? 'Time E' : side === 'B' ? 'Time B' : null;
  return side === 'B' ? 'Javaporcos' : side === 'E' ? 'Defensores' : null;
}
export function wallpaperJavaporcos(i) {
  return JAVAPORCOS_WALLS[i % JAVAPORCOS_WALLS.length];
}
