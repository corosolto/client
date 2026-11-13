import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const path = new URL('../../public/js/passe-debug.js', import.meta.url);
let source;
try { source = readFileSync(path, 'utf8'); }
catch { console.error('PD1 política de bypass debug ausente'); process.exit(1); }
const mutant = process.argv.includes('--mutante=sem-debug');
if (mutant) {
  const changed = source.replace("params.get('debug') === '1'", 'true');
  assert.notEqual(changed, source, 'MUTAÇÃO NÃO APLICOU'); source = changed;
}
const { passeDebugAtivo } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const cases = [
  ['localhost', '?debug=1&passeDev=1', true],
  ['127.0.0.1', '?debug=1&passeDev=1', true],
  ['localhost', '?passeDev=1', false],
  ['localhost', '?debug=1', false],
  ['localhost', '?debug=0&passeDev=1', false],
  ['corosolto.com.br', '?debug=1&passeDev=1', false],
  ['staging.corosolto.com.br', '?debug=1&passeDev=1', false],
  ['127.0.0.1.example.org', '?debug=1&passeDev=1', false],
];
const failed = cases.filter(([hostname, search, expected]) => passeDebugAtivo({hostname,search}) !== expected);
if (mutant) { assert(failed.some(([host, search]) => host === 'localhost' && search === '?passeDev=1'), 'MUTAÇÃO PASSOU'); console.log('PD1 mutante sem-debug reprovado: flag sozinha nunca destrava'); }
else { assert.equal(failed.length, 0, JSON.stringify(failed)); console.log(`PD1 ${cases.length} origens/flags: bypass só localhost + debug=1 + passeDev=1`); }
