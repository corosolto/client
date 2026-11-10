#!/usr/bin/env node
/*
 * Catálogo do site: a facção nova entra pela registry + CHARACTERS, sem lista
 * paralela em src/. A mutação lista-fixa prova que a derivação continua dinâmica.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
assert(!mutant || mutant === 'lista-fixa' || mutant === 'sem-registro', `mutante desconhecido: ${mutant}`);

let registry = read('public/js/factions.js');
const roster = read('public/js/characters.js');
const catalog = read('src/data/catalog.generated.ts');
const jogo = read('src/data/jogo.ts');
const pages = ['src/pages/personagens.astro', 'src/pages/characters.astro', 'src/pages/grupos/[id].astro'].map(read);

if (mutant === 'sem-registro') {
  const changed = registry.replace(/, catalogId:'fora-do-ar', catalogName:'Fora do Ar'/, '');
  assert.notEqual(changed, registry, 'MUTAÇÃO NÃO APLICOU: sem-registro');
  registry = changed;
}

const failures = [];
const check = (id, condition, detail) => { if (!condition) failures.push(`${id} ${detail}`); };
check('CAT1', /catalogId:'fora-do-ar', catalogName:'Fora do Ar'/.test(registry), 'registry não publica a identidade editorial Fora do Ar');
check('CAT2', /team: 'fora-do-ar', tribe: 'fora-do-ar'/.test(roster), 'roster não liga o piloto à facção Fora do Ar');
check('CAT3', /"grupoChave":"fora-do-ar"/.test(catalog), 'catálogo gerado não contém o roster do piloto');
check('CAT4', /export \{ GRUPOS, PERSONAGENS, capaDoGrupo \} from '\.\/catalog\.generated';/.test(jogo), 'jogo.ts ainda não usa o módulo gerado');
check('CAT5', /FACTIONS\s*\n\s*\.filter\(\(f\) => f\.ready && PERSONAGENS\.some/.test(catalog), 'GRUPOS não é derivado de FACTIONS + PERSONAGENS');
const ssrSource = `${catalog}\n${jogo}\n${pages.join('\n')}`;
check('CAT8', !/readFileSync|node:fs/.test(ssrSource) && !ssrSource.includes('fs/promises'), 'SSR do catálogo acessa o filesystem em vez de importar dados gerados');
check('CAT7', !/fora-do-ar/.test(jogo) && !/fora-do-ar/.test(pages.join('\n')), 'site adicionou Fora do Ar por hardcode fora do catálogo gerado');

if (mutant === 'lista-fixa') {
  const changed = catalog.replace(
    /FACTIONS\s*\n\s*\.filter\(\(f\) => f\.ready && PERSONAGENS\.some\(\(character\) => character\.grupo === f\.catalogId\)\)/,
    "FACTIONS.filter((f) => ['E', 'B'].includes(f.catalogId))",
  );
  assert.notEqual(changed, catalog, 'MUTAÇÃO NÃO APLICOU: lista-fixa');
  check('CAT5', /FACTIONS\s*\n\s*\.filter\(\(f\) => f\.ready && PERSONAGENS\.some/.test(changed), 'mutação de lista fixa não foi detectada');
}

if (mutant) {
  const found = failures.find((failure) => failure.startsWith(mutant === 'lista-fixa' ? 'CAT5' : 'CAT1'));
  assert(found, `MUTAÇÃO PASSOU: ${mutant}`);
  console.log(`${mutant} REPROVADO: ${found}`);
} else {
  failures.forEach((failure) => console.error(failure));
  console.log(`Catálogo do site: ${failures.length ? 'VERMELHO' : 'VERDE'} · piloto Fora do Ar presente sem lista paralela`);
  if (failures.length) process.exitCode = 1;
}
