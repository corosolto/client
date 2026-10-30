export const JAVAPORCOS_WALLS = Object.freeze([
  '/img/loading-javaporcos.webp',
  '/img/map-previews/ref-javaporcos-parede-mata.webp',
  '/img/map-previews/ref-javaporcos-cidade-cercada.webp',
]);
export function nomeTimeJavaporcos(modo, side) {
  if (modo !== 'horde') return null;
  return side === 'B' ? 'Javaporcos' : side === 'E' ? 'Defensores' : null;
}
export function wallpaperJavaporcos(i) {
  return JAVAPORCOS_WALLS[i % JAVAPORCOS_WALLS.length];
}
