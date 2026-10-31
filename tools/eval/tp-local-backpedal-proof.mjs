import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./tp-local-backpedal-check.mjs', import.meta.url));
const run = args => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', timeout: 60000, maxBuffer: 2000000,
});
const resultOf = result => {
  try { return JSON.parse(result.stdout.split('\n').findLast(line => line.startsWith('{'))); }
  catch { return null; }
};
const proof = (result, name, clauses) => {
  const report = resultOf(result), output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`) && report?.mutant === name
    && report.total > 0 && report.passed < report.total && report.failed.length > 0
    && report.failureTypes?.length > 0 && report.failureTypes.every(type => type === 'AssertionError')
    && report.failed.some(row => clauses.some(clause => row[2].includes(clause)))
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const name = 'no-back', clause = 'back incorreto';
  const report = { mutant: name, passed: 0, total: 1, failed: [['ator', 'caso', clause]], failureTypes: ['AssertionError'] };
  const good = { status: 1, stdout: `Mutação aplicada: ${name}\n${JSON.stringify(report)}`, stderr: '' };
  assert(proof(good, name, [clause]));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: JSON.stringify(report) },
    { ...good, stdout: good.stdout.replace('AssertionError', 'TypeError') },
    { ...good, stdout: good.stdout.replace(clause, 'outra falha') }]) assert(!proof(bad, name, [clause]));
  console.log('backpedal-proof: sete falsos positivos rejeitados'); process.exit(0);
}
const baseline = run([]), report = resultOf(baseline);
assert(baseline.status === 0 && !baseline.signal && !baseline.error
  && report?.total > 0 && report.passed === report.total && report.loadedFiles > 0, 'baseline real válido');
console.log(`backpedal-proof: ${report.passed}/${report.total} controles reais verdes`);
for (const [name, clauses] of [
  ['no-back', ['back incorreto', 'clip ativo incorreto', 'sentido real do mixer incorreto']],
  ['wrong-sign', ['back incorreto', 'ação/pose negativa alterada', 'clip ativo incorreto']],
  ['player', ['TP alterou player/physics', 'autoridade/câmera/aim/root divergiram']],
]) {
  const result = run([`--mutante=${name}`]);
  if (!proof(result, name, clauses)) {
    console.error(`${result.stdout}${result.stderr}`.slice(-1400));
    assert.fail(`mutante sem prova semântica: ${name}`);
  }
  console.log(`backpedal-proof: aplicado e detectado ${name}`);
}
