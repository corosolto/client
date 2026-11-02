import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./net-rate-frozen-check.mjs', import.meta.url));
const valid = (result, name, clause) => {
  const output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.error && !result.signal
    && output.includes(`Mutação aplicada: ${name}`) && output.includes(`✗ ${clause}: AssertionError:`)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const good = { status: 1, stdout: 'Mutação aplicada: controle\n✗ esperada: AssertionError:', stderr: '' };
  assert(valid(good, 'controle', 'esperada'));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: '✗ esperada:' },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: 'Mutação aplicada: controle\n✗ outra:' }]) {
    assert(!valid(bad, 'controle', 'esperada'));
  }
  console.log('net-rate-proof: sete falsos positivos rejeitados');
  const clause = 'clock: congelamento explícito não publica taxa inventada';
  for (const kind of ['TypeError', 'AssertionError']) {
    const result = spawnSync(process.execPath, [script, `--prova-reporter=${kind}`], { encoding: 'utf8', timeout: 30000 });
    assert.equal(valid(result, 'controle-reporter', clause), kind === 'AssertionError');
    assert(`${result.stdout}${result.stderr}`.includes(`${kind}: controle executável do reporter`));
  }
  console.log('net-rate-proof: reporter real distingue crash de asserção');
} else {
  for (const [name, clause] of [
    ['sem-congelamento', 'clock: congelamento explícito não publica taxa inventada'],
    ['sem-reset-partida', 'clock: partida reinicia medidor e preserva null na telemetria'],
  ]) {
    const result = spawnSync(process.execPath, [script, `--mutante=${name}`], { encoding: 'utf8', timeout: 30000, maxBuffer: 1000000 });
    assert(valid(result, name, clause), `mutante sem prova semântica: ${name}`);
    console.log(`net-rate-proof: ${name} aplicado e detectado`);
  }
}
