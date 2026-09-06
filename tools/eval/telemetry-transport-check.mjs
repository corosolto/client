/* TT1–TT5 — telemetria cross-origin precisa sobreviver ao unload sem credenciais.
 * Mutantes provam que a régua detecta a regressão que deixou 02–06/09 invisível. */
import { readFileSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let source = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
if (mut === 'sem-keepalive') source = source.replace("keepalive: true,\n      credentials: 'omit'", "keepalive: false,\n      credentials: 'omit'");
if (mut === 'com-cookie') source = source.replace("credentials: 'omit'", "credentials: 'include'");
if (mut === 'beacon-json') source += "\nnavigator.sendBeacon(apiUrl('/api/telemetry'), new Blob([], { type: 'application/json' }));\n";

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const helper = source.slice(source.indexOf('function sendJsonKeepalive'), source.indexOf('let telemetrySent'));
cobra(helper.includes('fetch(apiUrl(path)'), 'TT1 helper não envia ao backend migrado');
cobra(helper.includes('keepalive: true'), 'TT2 transporte não sobrevive ao unload');
cobra(helper.includes("credentials: 'omit'"), 'TT3 transporte cross-origin envia cookies');
cobra(!/sendBeacon\([^\n]*apiUrl|sendBeacon\(apiUrl/.test(source), 'TT4 JSON voltou a usar sendBeacon cross-origin');
for (const rota of ['telemetry', 'pick', 'presence', 'funnel', 'perf', 'match', 'submit-match']) {
  cobra(source.includes(`sendJsonKeepalive('/api/${rota}'`), `TT5 /api/${rota} não usa o transporte confiável`);
}
const pick = source.slice(source.indexOf('function _pick('), source.indexOf('function _picks('));
cobra(pick.includes('try {') && pick.includes('getAnonId()'), 'TT6 pick de boot perdeu isolamento fail-silent');

if (falhas.length) {
  console.error(`telemetry transport: ${falhas.length} FALHA(S)`);
  for (const falha of falhas) console.error(`  ✗ ${falha}`);
  process.exit(1);
}
console.log('telemetry transport: TT1–TT6 verde');
