import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./operacao-flavio-regroup-obstacle-check.mjs', import.meta.url));
const run = args => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', timeout: 60000, maxBuffer: 2000000,
});
const proof = (result, name, clauses) => {
  const output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`)
    && clauses.some(clause => output.includes(`✗ AssertionError: ${clause}`))
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const name = 'controle', clause = 'falha semântica esperada';
  const good = { status: 1, stdout: `Mutação aplicada: ${name}\n✗ AssertionError: ${clause}`, stderr: '' };
  assert(proof(good, name, [clause]));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: `✗ AssertionError: ${clause}` },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: `Mutação aplicada: ${name}\n✗ AssertionError: outra falha` }]) assert(!proof(bad, name, [clause]));
  assert(proof(run(['--prova-reporter=AssertionError']), 'controle-reporter', ['controle']));
  assert(!proof(run(['--prova-reporter=TypeError']), 'controle-reporter', ['controle']));
  console.log('regroup-proof: sete falsos positivos e reporter real verificados');
  process.exit(0);
}
const baseline = run(process.argv.slice(2));
assert(baseline.status === 0 && !baseline.signal && !baseline.error, 'baseline inválido');
console.log('regroup-proof: controle físico verde');
const geometryArgs = process.argv.slice(2).filter(arg => arg.startsWith('--geometry-helper='));
const progress = 'recuperação continua avançando nas janelas posteriores ou ocupa o slot';
for (const [name, clauses] of [
  ['hop-invalido', [progress, 'hop bloqueado deve ser descartado antes de navegar']],
  ['sem-rearme', [progress]],
  ['para-apos-dois-passos', [progress]], ['para-apos-lateral', [progress]], ['so-gira', [progress]],
  ['apaga-alvo', ['aquisição normal mantém inimigo visível', 'recuperação retém alvo enquanto realmente visível']],
  ['sem-colisao', ['recuperação preserva colisão com cenário real']],
]) {
  const contexts = [[]];
  if (geometryArgs.length && name !== 'sem-rearme') contexts.push(geometryArgs);
  for (const extra of contexts) {
    const result = run([...extra, `--mutante=${name}`]);
    if (!proof(result, name, clauses)) {
      console.error(`${name}: status=${result.status}, signal=${result.signal}, error=${result.error?.message || ''}`);
      console.error(`${result.stdout}${result.stderr}`.slice(-1800));
      assert.fail(`mutante sem prova semântica: ${name}`);
    }
    console.log(`regroup-proof: aplicado e detectado ${name}, ${extra.length ? '17 GLBs/175 props' : 'arnês padrão'}`);
  }
}
if (geometryArgs.length) console.log('regroup-proof: sem-rearme usa só o arnês padrão, que reproduz falta de waypoint; na geometria real105 já passava sem esse reparo');
