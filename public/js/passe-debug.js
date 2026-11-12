// QA não altera inventário nem existe fora de loopback + debug explícito.
export function passeDebugAtivo(location = globalThis.location) {
  if (!location || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return false;
  const params = new URLSearchParams(location.search);
  return params.get('debug') === '1' && params.get('passeDev') === '1';
}
