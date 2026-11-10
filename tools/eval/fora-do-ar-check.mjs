#!/usr/bin/env node
/* Contrato do pedido Fora do Ar: catálogo extensível, pacote verificado e arte real.
   Mutantes causais em memória; ausência de insumo é vermelha, nunca aprovação. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const arg = (key) => process.argv.find((v) => v.startsWith(`--${key}=`))?.split('=')[1];
const slice = arg('slice');
const mutant = arg('mutante');
const targets = { 'remove-faccao': 'FA1', 'lista-fixa': 'FA2', 'sem-avatar': 'FA4', 'perde-selecao': 'FA5' };
assert(!mutant || targets[mutant], 'mutante desconhecido');
const data = (src) => `data:text/javascript,${encodeURIComponent(src)}`;
let source = read('public/js/factions.js');
if (mutant === 'remove-faccao') {
  const changed = source.replace(/\{ id:'fora-do-ar',[\s\S]*?ready:true \},?/, '');
  assert.notEqual(changed, source, 'MUTAÇÃO NÃO APLICOU: remove-faccao');
  source = changed;
}
const registry = await import(data(source));
const failures = [];
const check = (id, condition, detail) => { if (!condition) failures.push(`${id} ${detail}`); };
const faction = registry.faction('fora-do-ar');
check('FA1', faction?.name === 'Fora do Ar' && faction.ready && faction.crest && faction.art,
  'Fora do Ar não está publicada no registro único com brasão/capa');
const original = [...registry.FACTIONS];
const probe = { id: 'probe-faction', slug: 'probe-faction', color: '#123456', dark: '#102030', ink: '#eeeeee', crest: 'probe', name: 'Probe' };
const injected = data(`export const FACTIONS = ${JSON.stringify([...original, probe])};`);
let paletteSource = read('public/js/paleta.js');
if (mutant === 'lista-fixa') {
  const changed = paletteSource.replace(/FACTIONS\.map\(\(f\) => f\.id\)/, JSON.stringify(original.map((f) => f.id)));
  assert.notEqual(changed, paletteSource, 'MUTAÇÃO NÃO APLICOU: lista-fixa');
  paletteSource = changed;
}
try {
  const palette = await import(data(paletteSource.replace(/(['"])\.\/factions\.js\1/g, JSON.stringify(injected))));
  check('FA2', palette.FACCOES.includes(probe.id) && palette.PALETA[probe.id]?.base === probe.color
    && palette.BASE_POR_FACCAO[probe.id] === probe.color,
  'paleta/lista fixa ignora facção acrescentada ao registro — derive todas de FACTIONS');
} catch (e) { check('FA2', false, `paleta não executável: ${e.message}`); }
try {
  const main = read('public/js/main.js');
  const declaration = main.match(/const FACTION_NAME = [\s\S]*?;\n/)?.[0];
  assert(declaration, 'mapa de nomes não encontrado');
  const names = vm.runInNewContext(`${declaration}\nFACTION_NAME`, { FACTIONS: [...original, probe], Object });
  check('FA2', names[probe.id] === probe.name, 'seletor mantém nomes hardcoded fora do registro');
} catch (e) { check('FA2', false, `nomes do seletor não executáveis: ${e.message}`); }
const charsSource = read('public/js/characters.js');
const block = charsSource.match(/export const CHARACTERS = (\[[\s\S]*?\n\]);/)?.[1];
assert(block, 'array real CHARACTERS não encontrado');
const chars = vm.runInNewContext(block);
const roster = chars.filter((c) => c.team === 'fora-do-ar');
check('FA3', slice ? roster.some((c) => c.id === slice) : roster.length === 30,
  `elenco Fora do Ar tem ${roster.length}; esperado ${slice ? `piloto ${slice}` : '30 personagens'}`);
const releases = await import(new URL('../../public/js/data/content-releases.js', import.meta.url));
const selected = slice ? roster.filter((c) => c.id === slice) : roster;
try {
  let main = read('public/js/main.js');
  if (mutant === 'perde-selecao') {
    const changed = main.replace(/const rememberedDef = [^\n]+;/,
      'const rememberedDef = CHARACTERS.find((c) => c.id === rememberedChar && !personagemTravado(c));');
    assert.notEqual(changed, main, 'MUTAÇÃO NÃO APLICOU: perde-selecao');
    main = changed;
  }
  const start = main.indexOf('const routeChar =');
  const end = main.indexOf('function returnPreviewToSelection');
  /* Ouvinte do passe (#1294): `document.addEventListener(PASSE_EVENTO, <função>)`. A função só
     redesenha; trocar currentChar ali apagaria a escolha antes do inventário responder. */
  const handlerName = main.match(/document\.addEventListener\(PASSE_EVENTO,\s*([A-Za-z_$][\w$]*)\)/)?.[1];
  const handlerAt = handlerName ? main.search(new RegExp(`function ${handlerName}\\s*\\(`)) : -1;
  assert(start >= 0 && end > start && handlerAt >= 0, 'ciclo de preferência não encontrado');
  let depth = 0, handlerEnd = main.indexOf('{', handlerAt);
  for (let i = handlerEnd; i < main.length; i++) {
    if (main[i] === '{') depth++;
    else if (main[i] === '}' && --depth === 0) { handlerEnd = i + 1; break; }
  }
  const handler = main.slice(handlerAt, handlerEnd);
  const candidate = roster.find((c) => c.passe);
  if (candidate) for (const origin of ['storage', 'url']) {
    const writes = [];
    const context = vm.createContext({
      CHARACTERS: chars, HUB_ENABLED: true, URLSearchParams,
      location: { search: origin === 'url' ? `?personagem=${candidate.id}` : '' },
      localStorage: {
        getItem: (key) => key === 'csbr-home-character' && origin === 'storage' ? candidate.id : null,
        setItem: (key, value) => writes.push([key, value]),
      },
      personagemTravado: (def) => Boolean(def?.passe),
      podeNoLado: () => true, ladosDe: () => ['E', 'B'],
      crypto: { getRandomValues: (array) => array.fill(0) },
    });
    vm.runInContext(main.slice(start, end), context);
    check('FA5', vm.runInContext('currentChar', context) === candidate.id && writes.length === 0,
      `${origin}: preferência de passe foi descartada antes do inventário responder`);
  }
  check('FA5', !/\bcurrentChar\s*=(?!=)/.test(handler),
    `ouvinte do passe (${handlerName}) troca currentChar: inventário pendente apagaria o personagem lembrado`);
} catch (e) { check('FA5', false, `preferência não executável: ${e.message}`); }
let missingApplied = false;
for (const character of selected) {
  const pin = releases.characterRelease(character.id);
  check('FA3', character.passe?.season === 'sessao-da-treta-s1' && Number.isInteger(character.passe.level)
    && character.passe.level >= 1 && character.passe.level <= 15,
  `${character.id}: passe sem temporada/nível contratados`);
  check('FA3', pin?.id === character.id && /^[a-f0-9]{64}$/.test(pin.manifestSha256)
    && pin.manifestUrl === `/packs/character/${character.id}/${pin.version}/manifest.json`,
  `${character.id}: release não fixada ao próprio pack por versão e SHA`);
  for (const relative of [`img/chars/avatars/${character.id}.webp`, `img/chars/${character.id}.webp`,
    `img/chars-hero/${character.id}.webp`, `img/resultado/${character.id}-vitoria.webp`,
    `img/resultado/${character.id}-derrota.webp`, `video/chars/${character.id}.webm`]) {
    const removed = mutant === 'sem-avatar' && relative === `img/chars/avatars/${character.id}.webp`;
    missingApplied ||= removed;
    check('FA4', !removed && existsSync(resolve(root, 'public', relative)), `${character.id}: falta public/${relative}`);
  }
}
if (mutant === 'sem-avatar') assert(missingApplied, 'MUTAÇÃO NÃO APLICOU: sem-avatar');
if (faction) for (const path of [`img/brasoes/${faction.crest}.png`, `img/faccoes/${faction.art}.webp`]) {
  check('FA4', existsSync(resolve(root, 'public', path)), `falta public/${path}`);
}
if (mutant) {
  const found = failures.find((f) => f.startsWith(targets[mutant]));
  assert(found, `MUTAÇÃO PASSOU: ${mutant}`);
  console.log(`${mutant} REPROVADO: ${found}`);
} else {
  failures.forEach((f) => console.error(f));
  console.log(`Fora do Ar: ${roster.length} personagens, ${selected.length} pacotes/arte verificados; ${failures.length} vermelhas`);
  if (failures.length) process.exitCode = 1;
}
