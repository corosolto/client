import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./operacao-flavio-formation-check.mjs', import.meta.url));
const valid = (result, name, clause) => {
  const output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`) && output.includes(`✗ AssertionError: ${clause}`)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const good = { status: 1, stdout: 'Mutação aplicada: controle\n✗ AssertionError: cláusula esperada', stderr: '' };
  assert(valid(good, 'controle', 'cláusula esperada'));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: '✗ cláusula esperada' },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: 'Mutação aplicada: controle\n✗ outra cláusula' }]) {
    assert(!valid(bad, 'controle', 'cláusula esperada'));
  }
  console.log('formation-proof: sete falsos positivos rejeitados');
  for (const kind of ['TypeError', 'AssertionError']) {
    const result = spawnSync(process.execPath, [script, `--prova-reporter=${kind}`], { encoding: 'utf8', timeout: 30000 });
    assert.equal(valid(result, 'controle-reporter', 'controle executável do reporter'), kind === 'AssertionError');
    assert(`${result.stdout}${result.stderr}`.includes(`${kind}: controle executável do reporter`));
  }
  console.log('formation-proof: reporter real distingue crash de asserção');
} else {
  const run = args => spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', timeout: 60000, maxBuffer: 2000000,
  });
  const baseline = run([]);
  assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'seis controles válidos');
  console.log('formation-proof: seis controles locais válidos');
  for (const [name, clause] of [
    ['sem-hold', 'escape: slot prevalece sobre caminhada de escape anterior'],
    ['hold-fora-slot', 'aproximação: chega ao slot físico e permanece nele'],
    ['sem-alcance-final', 'bloqueado: slot inacessível não substitui nem bane nó válido'],
    ['sem-ultimo-trecho', 'intermediário: preserva percurso antes do último nó'],
    ['teleporte-slot', 'aproximação: deslocamento respeita BOT_SPEED por passo físico'],
  ]) {
    assert(valid(run([`--mutante=${name}`]), name, clause), `mutante sem prova semântica: ${name}`);
    console.log(`formation-proof: ${name} aplicado e detectado`);
  }
}
