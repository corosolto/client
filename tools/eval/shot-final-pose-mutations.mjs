// As mutações têm de falhar por geometria/FX, nunca por setup ou erro do instrumento.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const cases = {
  imediato: /(?:clarão|origem) deslocad/,
  'sem-follow': /clarão deslocado/,
  alvo: /alvo balístico mudou/,
  'sem-flush': /FX reais ausentes/,
  'bind-antigo': /(?:clarão|origem) deslocad/,
  'sem-cancelar': /cancelamento .* deixou FX pendente/,
};
for (const [mutant, expected] of Object.entries(cases)) {
  const r = spawnSync(process.execPath, [new URL('./shot-final-pose-check.mjs', import.meta.url).pathname, `--mutante=${mutant}`], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(r.error);
  const text = r.stdout + r.stderr;
  assert.equal(r.status, 1, `${mutant}: exit=${r.status}`);
  assert(expected.test(text), `${mutant}: falhou fora da cláusula causal`);
  assert(!/TypeError|ReferenceError|SyntaxError|mutação não aplicada|mutação bind não aplicada/.test(text), `${mutant}: erro do instrumento`);
  console.log(`DETECTADO ${mutant}`);
}
