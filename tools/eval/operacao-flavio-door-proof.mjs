import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./operacao-flavio-door-check.mjs', import.meta.url));
const geometry = process.argv.filter(arg => arg.startsWith('--geometry-helper='));
const run = args => spawnSync(process.execPath, [script, ...geometry, ...args], { encoding: 'utf8', timeout: 60000, maxBuffer: 2000000 });
const valid = (result, name, clause) => {
  const output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`) && output.includes(`✗ ${clause}: AssertionError:`)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const good = { status: 1, stdout: 'Mutação aplicada: controle\n✗ contrato: AssertionError:', stderr: '' };
  assert(valid(good, 'controle', 'contrato'));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: '✗ contrato: AssertionError:' },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: 'Mutação aplicada: controle\n✗ outra: AssertionError:' }]) assert(!valid(bad, 'controle', 'contrato'));
  for (const kind of ['TypeError', 'AssertionError']) assert.equal(valid(run([`--prova-reporter=${kind}`]), 'controle-reporter', 'reporter'), kind === 'AssertionError');
  console.log('door-proof: sete falsos positivos rejeitados e reporter real distingue crash');
} else {
  const baseline = run([]); assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'controles físicos válidos antes dos mutantes');
  console.log('door-proof: quatorze controles válidos');
  for (const [name, args, clause] of [
    ['sem-portas', ['--mutante=sem-portas'], 'porta 0: grafo'],
    ['sem-relay', ['--mutante=sem-relay'], 'porta 0: grafo'],
    ['meia-porta', ['--mutante=meia-porta'], 'porta 0: grafo'],
    ['no-penetrado', ['--mutante=no-penetrado'], 'grafo: nós não começam penetrados'],
    ['atalho-parede', ['--mutante=atalho-parede'], 'fachada: arestas respeitam paredes'],
    ['passo-duplo', ['--prova-salto'], 'porta 0: física'],
  ]) {
    const result = run(args);
    if (!valid(result, name, clause)) console.error(`${result.stdout}${result.stderr}`.split('\n').filter(line => /✓|✗|Error|Mutação/.test(line)).slice(0, 16).join('\n'));
    assert(valid(result, name, clause), `mutante sem prova semântica: ${name}`);
    console.log(`door-proof: ${name} aplicado e detectado`);
  }
}
