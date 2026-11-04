import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./operacao-flavio-moving-defense-check.mjs', import.meta.url));
const extras = process.argv.filter(arg => arg.startsWith('--geometry-helper='));
const run = args => spawnSync(process.execPath, [script, ...extras, ...args], { encoding: 'utf8', timeout: 60000, maxBuffer: 2000000 });
const proof = (r, name, clause) => {
  const out = r.stdout + r.stderr;
  return r.status === 1 && !r.error && !r.signal && out.includes('Mutação aplicada: ' + name)
    && out.includes(`✗ controlada/1: AssertionError: ${clause}`) && !/TypeError:|ReferenceError:|SyntaxError:/.test(out);
};
if (process.argv.includes('--autoteste')) {
  const good = { status: 1, stdout: 'Mutação aplicada: controle\n✗ controlada/1: AssertionError: cláusula', stderr: '' };
  assert(proof(good, 'controle', 'cláusula'));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: '✗ controlada/1: AssertionError: cláusula' },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: 'Mutação aplicada: controle\n✗ controlada/1: AssertionError: outra' }]) assert(!proof(bad, 'controle', 'cláusula'));
  console.log('moving-defense-proof: sete falsos positivos rejeitados');
} else {
  const baseline = run([]); assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'seis controles válidos: ' + baseline.stdout + baseline.stderr);
  console.log('moving-defense-proof: seis controles válidos');
  for (const [name, clause] of [
    ['apagar-alvo', 'guarda continua disparando durante acompanhamento do VIP'],
    ['sem-acompanhar', 'guarda acompanha o slot sem perseguir o inimigo'],
    ['nav-sobrescreve-mira', 'guarda continua disparando durante acompanhamento do VIP'],
    ['teleporte', 'movimento respeita passo físico sem teleporte'],
  ]) {
    const result = run(['--mutante=' + name]);
    assert(proof(result, name, clause), 'mutante sem prova semântica: ' + name + '\n' + result.stdout + result.stderr);
    console.log(`moving-defense-proof: ${name} aplicado e detectado`);
  }
}
