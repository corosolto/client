import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./operacao-flavio-duration-check.mjs', import.meta.url));
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
  const name = 'final-cortado', clause = 'flavio final E';
  const report = { mutant: name, cases: 12, failed: [{ type: 'AssertionError', clause }] };
  const good = { status: 1, stdout: 'Mutação aplicada: ' + name + '\n' + JSON.stringify(report), stderr: '' };
  assert(proof(good, name, clause));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: JSON.stringify(report) },
    { ...good, stdout: good.stdout.replace('AssertionError', 'TypeError') },
    { ...good, stdout: good.stdout.replace(clause, 'outra cláusula') }]) assert(!proof(bad, name, clause));
  console.log('duration-proof: sete falsos positivos rejeitados');
  process.exit(0);
}
const baseline = run([]), report = reportOf(baseline);
assert(baseline.status === 0 && !baseline.error && !baseline.signal && report?.mutant === null
  && report.cases === 12 && report.failed.length === 0, 'baseline de duração válido');
console.log('duration-proof: 12 cenários no Game._endRound real verdes');
for (const [name, clause] of [
  ['final-cortado', 'flavio final E'],
  ['final-fixo', 'legacy final E'],
  ['normal-cortado', 'flavio intermediária E'],
]) {
  const result = run(['--mutante=' + name]);
  if (!proof(result, name, clause)) {
    console.error((result.stdout + result.stderr).slice(-1600));
    assert.fail('mutante sem prova semântica: ' + name);
  }
  console.log('duration-proof: aplicado e detectado ' + name);
}
const online = fileURLToPath(new URL('./operacao-flavio-online-check.mjs', import.meta.url));
const onlineResult = spawnSync(process.execPath, [online, '--mutante=prazo-reescrito'], {
  encoding: 'utf8', timeout: 30000, maxBuffer: 1000000,
});
const onlineReport = reportOf(onlineResult);
assert(onlineResult.status === 1 && !onlineResult.error && !onlineResult.signal
  && onlineResult.stdout.split(/\r?\n/).includes('Mutação aplicada: prazo-reescrito')
  && onlineReport?.mutant === 'prazo-reescrito' && onlineReport.failed.length > 0
  && onlineReport.failed.every(row => row.type === 'AssertionError')
  && onlineReport.failed.some(row => row.clause === 'vitória online dispara cinemática e título do objetivo'
    && row.message.includes('transição preserva prazo autoritativo de nove segundos'))
  && !/TypeError:|ReferenceError:|SyntaxError:/.test(onlineResult.stdout + onlineResult.stderr),
  'cliente que reescreve prazo do servidor reprova por asserção de autoridade');
console.log('duration-proof: detectada reescrita do prazo autoritativo online');
