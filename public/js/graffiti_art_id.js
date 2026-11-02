// Alias editorial explícito; canvas mantém sua identidade.
// Procedência: docs/visual-consistency/GRAFITE-IDENTIDADE.md.
const ALIASES = { '/img/decals/tag-larga.png': '/img/decals/tag-fina.png' };

export function identidadeArteGrafite(path) {
  if (typeof path !== 'string' || !path) return path;
  if (!/img\/decals\/|\/posters\//.test(path)) return path;
  let normalizado;
  try {
    normalizado = decodeURIComponent(new URL(path, 'http://grafite.local').pathname);
  } catch {
    return path;
  }
  if (!/^\/(img\/decals|posters)\//.test(normalizado)) return path;
  return Object.prototype.hasOwnProperty.call(ALIASES, normalizado) ? ALIASES[normalizado] : normalizado;
}
