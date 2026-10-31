import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./operacao-flavio-defense-check.mjs', import.meta.url));
const run = (args, legacy = false) => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', timeout: 60000, maxBuffer: 2000000,
  env: { ...process.env, SIM_QS: legacy ? '?botmove=0' : '' },
});
const proof = (result, name, clauses) => {
  const output = `${result.stdout}${result.stderr}`;
  return result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`)
    && clauses.some((clause) => output.includes(`✗ ${clause}`))
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
};
if (process.argv.includes('--autoteste')) {
  const name = 'controle', clause = 'falha semântica esperada';
  const good = { status: 1, stdout: `Mutação aplicada: ${name}\n✗ ${clause}`, stderr: '' };
  assert(proof(good, name, [clause]));
  for (const bad of [{ ...good, status: 0 }, { ...good, status: 2 }, { ...good, signal: 'SIGTERM' },
    { ...good, error: new Error('setup') }, { ...good, stdout: `✗ ${clause}` },
    { ...good, stderr: 'TypeError: setup' }, { ...good, stdout: `Mutação aplicada: ${name}\n✗ outra falha` }]) {
    assert(!proof(bad, name, [clause]));
  }
  console.log('defense-proof: sete falsos positivos rejeitados');
  process.exit(0);
}
for (const legacy of [false, true]) {
  const result = run([], legacy);
  assert(result.status === 0 && !result.error && !result.signal, `baseline inválido, legado=${legacy}`);
  console.log(`defense-proof: frente/lateral/retaguarda e controles normais, legado=${legacy}`);
}
const fire = 'frente: guarda no slot adquire e dispara contra ameaça visível distante';
const formation = (name) => `${name}: disparar não persegue alvo nem abandona formação`;
for (const [name, legacy, clauses] of [
  ['retencao', false, [fire]],
  ['hold', false, [fire, formation('frente')]],
  ['giro', false, [formation('lateral'), formation('retaguarda')]],
  ['legado', true, [fire, formation('frente')]],
  ['reagrupar', false, ['frente: VIP deslocado exige reagrupar mesmo com ameaça imediata']],
  ['los', false, ['frente: perder LOS bloqueia novos tiros']],
]) {
  assert(proof(run([`--mutante=${name}`], legacy), name, clauses), `mutante sem prova semântica: ${name}`);
  console.log(`defense-proof: aplicado e detectado ${name}`);
}
