const paginaConhecida = new Set(['SUPPORT_URL_BR is not defined']);

function httpConhecido([status, url]) {
  if (status !== 404) return false;
  return url.includes('/%7B%60/map-preview.css') || url.includes('/%7B%60/js/ops.js')
    || url.endsWith('/api/geo-lang')
    || /\/audio\/(manifest(?:\.default)?\.json|menu-music\/m\d+\.mp3|ambiente\/(?:funk-bar|cidade|passaros|latido-[12]|galo|panela|passaro-[12])\.mp3)(?:\?|$)/.test(url);
}

export function classifyLajesBrowserDebt(errors, failed) {
  const known = [], unexpected = [];
  for (const message of errors) (paginaConhecida.has(message) ? known : unexpected).push(['pageerror', message]);
  for (const response of failed) (httpConhecido(response) ? known : unexpected).push(['http', ...response]);
  return { known, unexpected };
}
