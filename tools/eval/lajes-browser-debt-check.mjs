import { classifyLajesBrowserDebt } from './lajes-browser-debt.mjs';

const base = 'http://127.0.0.1:8184';
const known = classifyLajesBrowserDebt(
  ['SUPPORT_URL_BR is not defined'],
  [[404, `${base}/api/geo-lang`], [404, `${base}/audio/manifest.json?v=alpha.255`]],
);
const unknown = classifyLajesBrowserDebt(
  ['TypeError: defeito novo'],
  [[500, `${base}/js/game.js`], [404, `${base}/audio/defeito-novo.mp3`]],
);

const ok = known.known.length === 3 && known.unexpected.length === 0
  && unknown.known.length === 0 && unknown.unexpected.length === 3;
console.log(JSON.stringify({ known, unknown, ok }, null, 2));
if (!ok) process.exitCode = 1;
