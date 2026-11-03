import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = 'tools/eval/construtor-preview-race-check.mjs';
const run = mutant => spawnSync(process.execPath, [script, ...(mutant ? ['--mutante=' + mutant] : [])], { encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
function report(result) {
  try { return JSON.parse(result.stdout.split('\n').filter(line => line.startsWith('{')).at(-1)); }
  catch { return null; }
}
function killed(result, mutant, clause, message) {
  const data = report(result), output = result.stdout + result.stderr;
  return result.status === 1 && !result.signal && !result.error
    && output.split('Mutação aplicada: ' + mutant + '\n').length === 2
    && !/preload entrou na promessa adiada|mutação deve atingir alvo real único|import real único|preview real encontrado/.test(output)
    && data?.mutant === mutant && data.applied === 1 && data.cases === 6 && data.failed.length > 0
    && data.failed.every(item => item.type === 'AssertionError')
    && data.failed.some(item => item.clause === clause && item.message.includes(message));
}
const baseline = run(null), base = report(baseline);
assert.ok(baseline.status === 0 && !baseline.signal && !baseline.error && base?.mutant === null
  && base.applied === 0 && base.cases === 6 && base.failed.length === 0, 'seis controles devem passar: ' + baseline.stdout + baseline.stderr);
const specs = [
  ['revisao-viva', 'mutação no inspetor durante preload invalida preview', 'edição durante espera não constrói revisão sem preload'],
  ['sem-cancelamento', 'fechar preview cancela construção pendente', 'fechamento não publica mundo tardio'],
  ['erro-antigo', 'erro de import antigo não alerta nem fecha abertura nova', 'erro de carga antiga não perturba revisão nova'],
];
for (const args of specs) {
  const result = run(args[0]);
  assert.ok(killed(result, ...args), 'mutante deve reprovar semanticamente: ' + args[0] + '\n' + result.stdout + result.stderr);
  console.log('✓ ' + args[0] + ': aplicado e reprovado na cláusula esperada');
}
const [mutant, clause, message] = specs[0];
const sample = { status: 1, signal: null, stdout: 'Mutação aplicada: ' + mutant + '\n'
  + JSON.stringify({ mutant, applied: 1, cases: 6, failed: [{ clause, type: 'AssertionError', message }] }) + '\n', stderr: '' };
assert.ok(killed(sample, ...specs[0]), 'controle do decisor aceita falha contratual');
const negatives = [
  { ...sample, status: 0 }, { ...sample, status: 2 }, { ...sample, signal: 'SIGTERM' },
  { ...sample, error: { code: 'ETIMEDOUT' } }, { ...sample, stdout: sample.stdout.replace('Mutação aplicada:', 'não aplicado:') },
  { ...sample, stdout: sample.stdout.replace('"applied":1', '"applied":0') },
  { ...sample, stdout: sample.stdout.replace('"cases":6', '"cases":0') },
  { ...sample, stdout: sample.stdout.replace('AssertionError', 'TypeError') },
  { ...sample, stdout: sample.stdout.replace(clause, 'outra cláusula') },
  { ...sample, stdout: sample.stdout.replace(message, 'outra mensagem') },
  { ...sample, stdout: 'MUTANTE NÃO APLICOU\n' },
];
negatives.forEach((result, i) => assert.equal(killed(result, ...specs[0]), false, 'decisor recusa falso verde ' + i));
assert.equal(killed(run('sem-preload'), ...specs[0]), false, 'erro real de preparação não conta como contrato detectado');
console.log('PREVIEW RACE VERDE: seis cenários, três mutantes semânticos e doze falsos positivos recusados');
