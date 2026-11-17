import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const prova = fileURLToPath(new URL('./remotos3p-check.mjs', import.meta.url));
const casos = [
  ['lateral-mudo', 'inclinação remota perdeu velocidade lateral'],
  ['flinch-remoto-mudo', 'headshot remoto não animou'],
  ['flinch-remoto-sem-cabeca', 'headshot remoto não animou'],
  ['morte-sem-direcao', 'kill remoto perdeu direção'],
  ['saque-mudo', 'troca de arma remota não iniciou saque'],
  ['cerimonia-online-muda', 'fim autoritativo online não iniciou cerimônia'],
  ['cerimonia-reset-mudo', 'rodada online nova não encerrou a cerimônia'],
];
for (const [mutante, mensagem] of casos) {
  const r = spawnSync(process.execPath, [prova], { env: { ...process.env, REMOTOS_MUTANTE: mutante }, encoding: 'utf8' });
  assert.notEqual(r.status, 0, `${mutante}: não foi detectado`);
  assert((r.stderr || '').includes(mensagem), `${mutante}: erro inesperado\n${r.stderr}`);
  console.log(`VERDE mutante ${mutante}: ${mensagem}`);
}
console.log(`VERDE remotos3p: ${casos.length}/${casos.length} mutantes detectados`);
