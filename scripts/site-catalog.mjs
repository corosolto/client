import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const sourcePath = resolve(root, 'public/js/characters.js');
const outputPath = resolve(root, 'src/data/catalog.generated.ts');

const unescapeString = (value) => value.replace(/\\([\\'])/g, '$1');

export function parseCharacters(source) {
  const block = source.match(/export const CHARACTERS = \[([\s\S]*?)\n\];/);
  if (!block) throw new Error('Elenco CHARACTERS indisponível');
  const entryPattern = /\{\s*id:\s*'((?:\\.|[^'])+)',\s*team:\s*'((?:\\.|[^'])+)'(?:,\s*tribe:\s*'((?:\\.|[^'])+)')?(?:,\s*lados:\s*\[[^\]]*\])?,\s*name:\s*'((?:\\.|[^'])+)',\s*(?:passe:\s*\{\s*season:\s*'((?:\\.|[^'])+)',\s*level:\s*(\d+)\s*\},\s*)?blurb:\s*'((?:\\.|[^'])+)'/g;
  const characters = [...block[1].matchAll(entryPattern)].map((match) => {
    const [, id, team, tribe, name, season, level, blurb] = match;
    const character = {
      id: unescapeString(id),
      grupoChave: unescapeString(tribe || team),
      nome: unescapeString(name),
      blurb: unescapeString(blurb),
    };
    if (season) character.passe = { season: unescapeString(season), level: Number(level) };
    return character;
  });
  if (!characters.length) throw new Error('Elenco CHARACTERS vazio');
  const literalCount = [...block[1].matchAll(/\{\s*id:\s*'/g)].length;
  if (literalCount !== characters.length) throw new Error(`Elenco CHARACTERS ilegível: ${literalCount} literais, ${characters.length} reconhecidos`);
  const ids = new Set(characters.map(({ id }) => id));
  if (ids.size !== characters.length) throw new Error('Elenco CHARACTERS duplicado');
  return characters;
}

const renderEntries = (characters) => characters.map((character) => `  ${JSON.stringify(character)},`).join('\n');

export function renderCatalog(characters) {
  return `// Gerado de public/js/characters.js por scripts/site-catalog.mjs.\n// Não edite: rode node scripts/site-catalog.mjs após alterar CHARACTERS.\nimport { FACTIONS } from '../../public/js/factions.js';\n\nexport interface Personagem {\n  id: string;\n  grupo: string;\n  nome: string;\n  blurb: string;\n  passe?: { season: string; level: number };\n}\n\nexport interface Grupo {\n  id: string;\n  nome: string;\n  lema: string;\n  cor: string;\n  nota: string;\n  art: string | null;\n}\n\nconst CATALOG_CHARACTERS = [\n${renderEntries(characters)}\n] as const;\n\nconst grupoId = (key: string) =>\n  FACTIONS.find((f) => f.catalogId === key || f.id === key || f.slug === key)?.catalogId || key;\n\nexport const PERSONAGENS: Personagem[] = Object.freeze(CATALOG_CHARACTERS.map((character) => ({\n  id: character.id,\n  grupo: grupoId(character.grupoChave),\n  nome: character.nome,\n  blurb: character.blurb,\n  ...(character.passe ? { passe: character.passe } : {}),\n})));\n\nconst POLITICAL_GROUP: Grupo = {\n  id: 'P',\n  nome: 'Políticos',\n  lema: 'A treta atravessa os dois lados!',\n  cor: '#d6b55a',\n  nota: 'Caricaturas satíricas de figuras públicas. Na escalação do menu, é o primeiro grupo.',\n  art: null,\n};\n\nconst factionGroups = FACTIONS\n  .filter((f) => f.ready && PERSONAGENS.some((character) => character.grupo === f.catalogId))\n  .map((f): Grupo => ({\n    id: f.catalogId,\n    nome: f.catalogName,\n    lema: f.slogan,\n    cor: f.color,\n    nota: f.description,\n    art: f.art || null,\n  }));\n\nconst politicalPosition = factionGroups.findIndex((group) => group.id === 'B');\nif (politicalPosition < 0) factionGroups.unshift(POLITICAL_GROUP);\nelse factionGroups.splice(politicalPosition + 1, 0, POLITICAL_GROUP);\n\nexport const GRUPOS: Grupo[] = Object.freeze(factionGroups);\nexport const capaDoGrupo = (id: string) => {\n  const art = GRUPOS.find((group) => group.id === id)?.art;\n  return art ? \`/img/faccoes/\${art}.webp\` : null;\n};\n`;
}

const characters = parseCharacters(readFileSync(sourcePath, 'utf8'));
const output = renderCatalog(characters);
if (process.argv.includes('--check')) {
  let current;
  try { current = readFileSync(outputPath, 'utf8'); } catch { current = null; }
  if (current !== output) throw new Error('Catálogo do site desatualizado: rode node scripts/site-catalog.mjs');
} else {
  writeFileSync(outputPath, output);
}
console.log(`Catálogo do site: ${characters.length} personagens · ${outputPath}`);
