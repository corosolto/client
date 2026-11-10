/* Origem dos pacotes do Studio: produção e previews no R2, host de desenvolvimento em /packs/ local.
   ?packorigin=cdn|local força um dos dois. Contrato: docs/studio-character-release.md. */
export const STUDIO_PACK_CDN_ORIGIN = 'https://assets.corosolto.com.br';
export const STUDIO_PACK_PREFIX = '/packs/';

// localhost, loopback, 0.0.0.0, rede privada (celular na LAN) e *.local: o dev server serve /packs/.
const HOST_LOCAL = /^(?:localhost|\[::1\]|::1|0\.0\.0\.0|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[a-z0-9-]+\.local)$/i;

export function studioPackOrigin(loc = globalThis.location) {
  let forcado = null;
  try { forcado = new URLSearchParams(loc?.search || '').get('packorigin'); } catch { /* sem location */ }
  if (forcado === 'cdn') return STUDIO_PACK_CDN_ORIGIN;
  if (forcado === 'local') return '';
  const host = typeof loc?.hostname === 'string' ? loc.hostname : '';
  return !host || HOST_LOCAL.test(host) ? '' : STUDIO_PACK_CDN_ORIGIN;
}

// Só caminho /packs/... ganha a origem; URL absoluta (régua, sonda) passa intacta.
export function studioPackUrl(path, loc = globalThis.location) {
  if (typeof path !== 'string' || !path.startsWith(STUDIO_PACK_PREFIX)) return path;
  return `${studioPackOrigin(loc)}${path}`;
}
