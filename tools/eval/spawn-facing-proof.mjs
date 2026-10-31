import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./spawn-facing-check.mjs', import.meta.url));
const run = args => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', timeout: 180000, maxBuffer: 2000000,
});
const reportOf = result => {
  try { return JSON.parse(result.stdout.split('\n').findLast(line => line.startsWith('{'))); }
  catch { return null; }
};
const proof = (result, name, clause) => {
  const report = reportOf(result), output = result.stdout + result.stderr;
  return result.status === 1 && !result.signal && !result.error
    && output.includes('Mutação aplicada: ' + name) && report?.mutant === name
    && report.scope === 'escadao' && report.total > 0 && report.failed.length > 0
    && report.failed.every(row => row.type === 'AssertionError')
    && report.failed.some(row => row.clause === clause)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const name = 'ignora-autoria', clause = 'SPAWNFACE consumidor respeita orientação autorada';
  const report = { mutant: name, scope: 'escadao', total: 8, failed: [{ type: 'AssertionError', clause }] };
  const good = { status: 1, stdout: 'Mutação aplicada: ' + name + '\n' + JSON.stringify(report), stderr: '' };
  assert(proof(good, name, clause));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: JSON.stringify(report) },
    { ...good, stdout: good.stdout.replace('AssertionError', 'TypeError') },
    { ...good, stdout: good.stdout.replace(clause, 'outra cláusula') }]) assert(!proof(bad, name, clause));
  console.log('spawn-facing-proof: sete falsos positivos rejeitados'); process.exit(0);
}
const baseline = run([]), report = reportOf(baseline);
assert(baseline.status === 0 && !baseline.error && !baseline.signal
  && report?.scope === 'all' && report.total > 0 && report.mapCount > 0
  && report.failed.length === 0, 'baseline de todos os mapas válido');
console.log(`spawn-facing-proof: ${report.total} slots em ${report.mapCount} mapas verdes`);
for (const [name, clause] of [
  ['ignora-autoria', 'SPAWNFACE consumidor respeita orientação autorada'],
  ['bot-sem-conversao', 'SPAWNFACE bot preserva conversão de meia volta'],
  ['camera-forca-zero', 'SPAWNFACE rota visível'],
]) {
  const result = run(['--map=escadao', '--mutante=' + name]);
  if (!proof(result, name, clause)) {
    console.error((result.stdout + result.stderr).slice(-1600));
    assert.fail('mutante sem prova semântica: ' + name);
  }
  console.log('spawn-facing-proof: aplicado e detectado ' + name);
}
