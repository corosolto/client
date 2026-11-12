#!/usr/bin/env node
/* O catálogo público precisa acompanhar o registro executado, não só mencionar seu nome. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { FACTIONS } from '../../public/js/factions.js';

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
assert(!mutant || ['lista-fixa', 'sem-registro'].includes(mutant), 'mutante desconhecido');
let registry = [...FACTIONS];
let source = stripTypeScriptTypes(readFileSync(new URL('../../src/data/catalog.generated.ts', import.meta.url), 'utf8'));
if (mutant === 'sem-registro') {
  registry = registry.filter((f) => f.id !== 'fora-do-ar');
  assert.equal(registry.length, FACTIONS.length - 1, 'MUTAÇÃO NÃO APLICOU: sem-registro');
}
if (mutant === 'lista-fixa') {
  const changed = source.replace(/FACTIONS\s*\.filter\([\s\S]*?\n\s*\.map/, "FACTIONS.filter((f) => ['E', 'B'].includes(f.id)).map");
  assert.notEqual(changed, source, 'MUTAÇÃO NÃO APLICOU: lista-fixa');
  source = changed;
}
const data = (text) => `data:text/javascript,${encodeURIComponent(text)}`;
const registryUrl = data(`export const FACTIONS = ${JSON.stringify(registry)};`);
source = source.replace("'../../public/js/factions.js'", JSON.stringify(registryUrl));
const catalog = await import(data(source));
const group = catalog.GRUPOS.find((g) => g.id === 'fora-do-ar');
const original = FACTIONS.find((f) => f.id === 'fora-do-ar');
const failures = [];
if (!group || group.nome !== original?.name || group.lema !== original?.slogan || group.cor !== original?.color) {
  failures.push('CAT1 catálogo público perdeu o nome, lema ou cor da facção do registro');
}
if (group && catalog.capaDoGrupo(group.id) !== `/img/faccoes/${original.art}.webp`) failures.push('CAT2 capa aponta para a facção errada');
for (const id of ['E', 'B', 'urbanas', 'palhacos', 'funkeiros', 'mitico']) {
  if (!catalog.GRUPOS.some((g) => g.id === id)) failures.push(`CAT3 rota pública legada /grupos/${id} desapareceu`);
}
if (catalog.capaDoGrupo('P') !== null || catalog.capaDoGrupo('desconhecida') !== null) failures.push('CAT4 grupo sem capa usa arte de outra facção');
if (mutant) {
  assert(failures.some((f) => f.startsWith('CAT1')), `MUTAÇÃO PASSOU: ${mutant}`);
  console.log(`${mutant} REPROVADO: ${failures[0]}`);
} else {
  failures.forEach((f) => console.error(f));
  console.log(`Catálogo executado: ${catalog.GRUPOS.length} grupos, ${catalog.PERSONAGENS.length} personagens; ${failures.length} vermelhas`);
  if (failures.length) process.exitCode = 1;
}
