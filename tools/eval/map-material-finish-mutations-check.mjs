// Cada mutante precisa do JSON RED da régua e da cláusula física correspondente.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const gate = fileURLToPath(new URL('./map-material-finish-check.mjs', import.meta.url));
const casos = [
  ['tijolo-8m', /tileU do tijolo/],
  ['reboco-3x', /reboco.*período|reboco.*tile|período.*reboco/],
  ['solo-losango', /solo.*(família|densidade)|textura do solo/],
  ['reboco-sem-detalhe', /reboco.*detalhe/],
  ['ao-branco', /AO/],
  ['solo-sem-tint', /tint/],
  ['capim-no-balcao', /capim.*balcão/],
  ['capim-mesh-no-balcao', /capim.*balcão/],
  ['tijolo-face-colapsada', /span.*colapsado/],
  ['reboco-face-nan', /UV não finito|span.*não finito/],
  ['tijolo-sem-grupos', /parede sem grupos/],
  ['reboco-grupo-truncado', /grupos sem partição exata/],
  ['tijolo-repeat', /textura map altera UV métrico/],
  ['tijolo-offset-nan', /textura normalMap altera UV métrico/],
  ['tijolo-matriz', /textura normalMap altera UV métrico/],
  ['tijolo-canal', /textura normalMap altera UV métrico/],
  ['reboco-mesclado-periodo', /reboco.*período|período.*reboco/],
  ['reboco-mesclado-nan', /UV desenhado não finito/],
  ['reboco-mesclado-cisalha', /cisalhamento UV/],
  ['reboco-mesclado-indice', /índice desenhado inválido/],
  ['reboco-mesclado-drawrange', /drawRange não fecha triângulos completos/],
  ['reboco-mesclado-posicao', /posição desenhada não finita/],
];
function rodar(mutante) {
  const r = spawnSync(process.execPath, [gate, ...(mutante ? ['--mutante=' + mutante] : [])],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!r.error && r.signal === null, `filho inválido: ${r.error?.message || r.signal}`);
  const start = r.stdout.search(/^\{/m);
  assert.ok(start >= 0, `filho sem JSON: ${r.stderr.slice(-1200)}`);
  let json;
  try { json = JSON.parse(r.stdout.slice(start)); }
  catch { throw Error('filho devolveu JSON inválido: ' + r.stdout.slice(-800)); }
  assert.equal(r.status, mutante ? 1 : 0, `exit inesperado ${mutante || 'baseline'}: ${r.stderr.slice(-1200)}`);
  assert.equal(json.veredito, mutante ? 'RED' : 'GREEN');
  assert.ok(Array.isArray(json.falhas));
  return json;
}
const base = rodar(null);
assert.deepEqual(base.falhas, []);
console.log('finish baseline GREEN');
for (const [nome, alvo] of casos) {
  const json = rodar(nome);
  assert.ok(json.falhas.some(f => alvo.test(f)), `${nome}: cláusula alvo ausente: ${JSON.stringify(json.falhas)}`);
  console.log(`finish ${nome} DETECTADO: ${json.falhas.filter(f => alvo.test(f))[0]}`);
}
console.log(`PASS acabamento: baseline + ${casos.length} mutantes causais`);
