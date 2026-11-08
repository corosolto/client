import assert from 'node:assert/strict';

/**
 * Substitui exatamente um alvo de uma régua mutante.
 * Mutante sem alteração é inválido: um teste que não muta a fonte pode dar falso verde.
 */
export function replaceOnce(source, before, after, label = 'mutação') {
  const ocorrencias = source.split(before).length - 1;
  assert.equal(
    ocorrencias,
    1,
    `${label}: alvo deve existir exatamente uma vez (encontrado ${ocorrencias})`,
  );
  const mutado = source.replace(before, after);
  assert.notEqual(mutado, source, `${label}: mutação não alterou a fonte`);
  return mutado;
}
