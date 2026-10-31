import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./operacao-flavio-clock-check.mjs', import.meta.url));
const run = args => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', timeout: 30000, maxBuffer: 1000000,
});
const reportOf = result => {
  try { return JSON.parse(result.stdout.split('\n').findLast(line => line.startsWith('{'))); }
  catch { return null; }
};
const proof = (result, name, clause) => {
  const report = reportOf(result), output = result.stdout + result.stderr;
  return result.status === 1 && !result.signal && !result.error
    && result.stdout.split(/\r?\n/).includes('Mutação aplicada: ' + name)
    && report?.mutant === name && report.cases === 12 && report.failed.length > 0
    && report.failed.every(row => row.type === 'AssertionError')
    && report.failed.some(row => row.clause === clause)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const name = 'relogio-simulado', clause = 'pulo após dois segundos reais, online=false';
  const report = { mutant: name, cases: 12, failed: [{ type: 'AssertionError', clause }] };
  const good = { status: 1, stdout: 'Mutação aplicada: ' + name + '\n' + JSON.stringify(report), stderr: '' };
  assert(proof(good, name, clause));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: JSON.stringify(report) },
    { ...good, stdout: good.stdout.replace('AssertionError', 'TypeError') },
    { ...good, stdout: good.stdout.replace(clause, 'outra cláusula') }]) assert(!proof(bad, name, clause));
  console.log('clock-proof: sete falsos positivos rejeitados');
  process.exit(0);
}
const baseline = run([]), report = reportOf(baseline);
assert(baseline.status === 0 && !baseline.error && !baseline.signal && report?.mutant === null
  && report.cases === 12 && report.failed.length === 0, 'baseline de relógio válido');
console.log('clock-proof: doze cenários com relógios independentes verdes');
for (const [name, clause] of [
  ['relogio-simulado', 'pulo após dois segundos reais, online=false'],
  ['sem-limite', 'fim aos nove segundos reais, online=false'],
  ['prazo-online', 'fim aos nove segundos reais, online=true'],
  ['fontes-vazam', 'fim aos nove segundos reais, online=false'],
  ['sem-interrupcao', 'interrupção matchEnd, online=false'],
  ['prazo-outro-estado', 'interrupção matchEnd, online=false'],
]) {
  const result = run(['--mutante=' + name]);
  if (!proof(result, name, clause)) {
    console.error((result.stdout + result.stderr).slice(-1600));
    assert.fail('mutante sem prova semântica: ' + name);
  }
  console.log('clock-proof: aplicado e detectado ' + name);
}
