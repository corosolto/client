/* Cada mutante deve morrer pela cláusula causal, não por import/infra quebrados. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const targets = {
  'sem-crouch': 'R3P1',
  'reload-reinicia': 'R3P2',
  'reload-nao-cancela': 'R3P3',
  'fase-zero': 'R3P4',
  'rampa-reinicia': 'R3P5',
  'stop-ignorado': 'R3P7',
  'import-ressuscita': 'R3P4race',
  'troca-sem-estado': 'R3P9',
  'intencao-ausente': 'R3P13',
};
const script = fileURLToPath(new URL('./rede3p-check.mjs', import.meta.url));
for (const [mutant, clause] of Object.entries(targets)) {
  const result = spawnSync(process.execPath, [script, `--mutante=${mutant}`], { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const line = result.stdout?.split('\n').find(row => row.startsWith('REDE3P_RESULT '));
  assert(line, `INFRA ${mutant}: sem veredito de comportamento\n${result.stderr}`);
  const observed = JSON.parse(line.slice('REDE3P_RESULT '.length));
  assert.equal(result.status, 1, `${mutant} deveria falhar por contrato`);
  assert(observed.failed.includes(clause), `${mutant} não atingiu ${clause}: ${JSON.stringify(observed)}`);
  console.log(`MORTO ${mutant}: ${observed.failed.join(', ')}`);
}
console.log('VERDE rede3p-mutantes: nove falhas causais detectadas');
