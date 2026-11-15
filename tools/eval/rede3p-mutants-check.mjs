/* Cada mutante deve morrer pela cláusula causal, não por import/infra quebrados. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const targets = {
  'sem-crouch': ['R3P1', 'R3P9', 'R3P15'],
  'reload-reinicia': ['R3P2', 'R3P17', 'R3P18'],
  'reload-nao-cancela': ['R3P3', 'R3P14'],
  'reload-perde-ciclo': ['R3P17'],
  'fase-zero': ['R3P4', 'R3P8', 'R3P9'],
  'rampa-reinicia': ['R3P5'],
  'stop-ignorado': ['R3P7', 'R3P12', 'R3P14'],
  'import-ressuscita': ['R3P4race'],
  'troca-sem-estado': ['R3P9', 'R3P11'],
  'intencao-ausente': ['R3P13'],
  'estado-antigo': ['R3P14'],
  'pausa-para-emote': ['R3P16'],
};
const script = fileURLToPath(new URL('./rede3p-check.mjs', import.meta.url));
function run(mutant = '') {
  const args = mutant ? [script, `--mutante=${mutant}`] : [script];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const lines = result.stdout?.split('\n').filter(row => row.startsWith('REDE3P_RESULT ')) || [];
  assert.equal(lines.length, 1, `INFRA ${mutant || 'nominal'}: sem veredito único\n${result.stderr}`);
  return { result, observed: JSON.parse(lines[0].slice('REDE3P_RESULT '.length)) };
}
const nominal = run();
assert.equal(nominal.result.status, 0, `base nominal deve passar\n${nominal.result.stdout}\n${nominal.result.stderr}`);
assert.equal(nominal.observed.mutant, '');
assert.equal(nominal.observed.clauses, 22);
assert.deepEqual(nominal.observed.failed, []);
console.log(nominal.result.stdout.trimEnd());
for (const [mutant, clauses] of Object.entries(targets)) {
  const { result, observed } = run(mutant);
  assert.equal(result.status, 1, `${mutant} deveria falhar por contrato`);
  assert.equal(observed.mutant, mutant);
  assert.equal(observed.clauses, nominal.observed.clauses);
  assert.deepEqual([...observed.failed].sort(), [...clauses].sort(), `${mutant}: falhas fora do conjunto causal`);
  console.log(`MORTO ${mutant}: ${observed.failed.join(', ')}`);
}
console.log(`VERDE rede3p-mutantes: ${Object.keys(targets).length} falhas causais detectadas`);
