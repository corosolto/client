/* Confere o artefato final contra o SHA registrado no pipeline Mint/Tripo/Meshy.

   A primeira entrada de `files` é o artefato final nos assets que declaram
   `processing.finalSha256`. Sem a comparação, refazer um GLB em Blender deixa o
   manifesto com proveniência antiga sem nenhum gate perceber.
   `--mutante=sha-trocado` corrompe o primeiro hash em memória e deve reprovar.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { finalArtifacts } from './final-asset-registry.mjs';

const registry = JSON.parse(readFileSync('mint-assets.json', 'utf8'));
const entries = finalArtifacts(registry);
const MUT = process.argv.includes('--mutante=sha-trocado');
const failures = [];
for (const [index, { id, asset, file }] of entries.entries()) {
  if (!file || !existsSync(file)) {
    failures.push(`${id}: artefato final ausente (${file || 'files[0]'})`); continue;
  }
  const expected = MUT && index === 0 ? '0'.repeat(64) : asset.processing.finalSha256;
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (expected !== actual) failures.push(`${id}: SHA ${actual} != registro ${expected}`);
}
if (failures.length) {
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`MINT-ASSET-INTEGRITY ✓ ${entries.length} artefatos finais conferem com finalSha256`);
