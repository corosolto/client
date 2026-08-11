const EXTENSION_RE = /(?:chrome|moz|safari-web|safari)-extension:\/\//i;
const CACHE_SPLIT_RE = /does not provide an export|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|prod-coherence/i;
const HTTP_URL_RE = /https?:\/\/[^\s)'"<>]+/gi;

const normalizedOrigin = (value, base) => {
  if (!value) return null;
  try { return new URL(value, base).origin; } catch { return null; }
};

export function isExternalCrash({ message = '', source = '', stack = '' } = {}, own = '') {
  const ownOrigin = normalizedOrigin(own, own);
  const evidence = [message, source, stack].filter(Boolean).join("\n");
  const sourceText = String(source || '');
  if (EXTENSION_RE.test(sourceText)) return true;

  const sourceOrigin = /^https?:\/\//i.test(sourceText)
    ? normalizedOrigin(sourceText, ownOrigin)
    : null;
  if (sourceOrigin && sourceOrigin !== ownOrigin) return true;
  if (sourceOrigin === ownOrigin) return false;

  // HTTP URLs in a message are often payload text from the game (for example a
  // failed API URL), not a script provenance signal. Only source/stack URLs
  // establish cross-origin ownership; extension schemes remain useful in any
  // field because browsers report them as injected frames/messages.
  const provenance = [source, stack].filter(Boolean).join("\n");
  const origins = [...provenance.matchAll(HTTP_URL_RE)]
    .map((match) => normalizedOrigin(match[0], ownOrigin))
    .filter(Boolean);
  if (origins.includes(ownOrigin)) return false;
  if (EXTENSION_RE.test(evidence)) return true;
  return origins.some((origin) => origin !== ownOrigin);
}

export function classifyCrash(payload = {}, ownOrigin = '') {
  const evidence = [payload.message, payload.source, payload.stack].filter(Boolean).join(' ');
  if (isExternalCrash(payload, ownOrigin)) return 'externo';
  if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';
  return 'codigo';
}

export const shouldDispatchCrash = (classification) => classification !== 'externo';
