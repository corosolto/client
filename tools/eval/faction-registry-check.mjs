/* faction-registry-check.mjs - UMA fonte cobre as dez faccoes numa unica rota/DOM.
   -----------------------------------------------------------------------------
   CASO QUE COMPROU A REGUA (09/08): a setima faccao exigiria editar seis botoes HTML,
   paletas, nomes e handlers separados. Em 09/08 o dono corrigiu o contrato: os dez
   times precisam aparecer juntos, sem paginacao. Em 11/08 o novo contrato cinematografico
   baseado na referencia 02 trocou a grade 5x2 por rail: scroll contínuo é permitido, mas
   cortar o registro em páginas continua proibido. Indicador `1 / 2` precisa reprovar.

   MUTACOES PROVADAS:
     --mutar=sem-tv      remove T do registro em memoria -> F1 vermelho
     --mutar=hardcode    simula um botao manual no Astro -> F2 vermelho
     --mutar=paginar     restaura pageSize=5 -> F3 vermelho
*/
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MUTAR = (process.argv.find((x) => x.startsWith('--mutar=')) || '').split('=')[1] || '';
const EXPECTED = new Map([
  ['E', 'TIME E'], ['B', 'TIME B'], ['U', 'TRIBOS URBANAS'], ['C', 'PALHACOS'],
  ['F', 'FUNKEIROS'], ['M', 'MITICOS'], ['N', 'NERDOLAS'],
  ['R', 'PROFISSIONAIS DO CORRE'], ['O', 'NOIAS'], ['T', 'TV'],
]);

const astroPath = 'src/pages/index.astro';
const mainPath = 'public/js/main.js';
const registryPath = 'public/js/factions.js';
const astro = fs.readFileSync(astroPath, 'utf8');
const main = fs.readFileSync(mainPath, 'utf8');

let registry = null;
let loadError = '';
try {
  const mod = await import(`${pathToFileURL(registryPath)}?audit=${Date.now()}`);
  registry = { factions: [...mod.FACTIONS], pageSize: mod.FACTION_PAGE_SIZE };
} catch (err) {
  loadError = err && err.message || String(err);
}
if (MUTAR === 'sem-tv' && registry) registry.factions = registry.factions.filter((f) => f.id !== 'T');

console.log(`REGUA DO REGISTRO DE FACCOES${MUTAR ? ` [MUTACAO: ${MUTAR}]` : ''}`);
let f1 = !!registry;
console.log('F1 - registro exporta os dez IDs e nomes publicos contratados');
if (!registry) {
  console.log(`   NAO MEDIU: ${registryPath} ausente ou invalido (${loadError})`);
} else {
  const got = new Map(registry.factions.map((f) => [f.id, f.name]));
  for (const [id, name] of EXPECTED) {
    const ok = got.get(id) === name;
    if (!ok) f1 = false;
    console.log(`   ${id}  ${ok ? 'ok' : `esperava "${name}", recebeu "${got.get(id) || '-'}"`}`);
  }
  const extras = [...got.keys()].filter((id) => !EXPECTED.has(id));
  if (extras.length || got.size !== EXPECTED.size) f1 = false;
  if (extras.length) console.log(`   IDs extras: ${extras.join(', ')}`);
}
console.log(`   ${f1 ? 'PASSA' : 'FALHA'}\n`);

console.log('F2 - Astro e main.js consomem o registro; nenhum botao de faccao fica manual');
const astroImports = /import\s*\{[^}]*FACTIONS[^}]*\}\s*from\s*['"][^'"]*public\/js\/factions\.js['"]/.test(astro);
const astroMaps = /FACTIONS\.map\s*\(/.test(astro);
const manualButtons = (MUTAR === 'hardcode' ? `${astro}\n<button id="btn-team-x">` : astro)
  .match(/id=["']btn-team-/g) || [];
const mainImports = /from\s*['"]\.\/factions\.js['"]/.test(main);
const mainUsesData = /data-faction/.test(main);
const f2 = astroImports && astroMaps && manualButtons.length === 0 && mainImports && mainUsesData;
console.log(`   Astro importa/mapeia: ${astroImports && astroMaps ? 'ok' : 'FALTA'}`);
console.log(`   botoes manuais: ${manualButtons.length}${manualButtons.length ? ' (FALHA)' : ' (ok)'}`);
console.log(`   main importa/data-faction: ${mainImports && mainUsesData ? 'ok' : 'FALTA'}`);
console.log(`   ${f2 ? 'PASSA' : 'FALHA'}\n`);

console.log('F3 - os dez cards ficam na mesma rota/DOM, sem cortar o registro em paginas');
const pageSize = MUTAR === 'paginar' ? 5 : registry?.pageSize;
const pageIndicators = (astro.match(/id=["']team-pages["']/g) || []).length;
const rail = /class=["'][^"']*team-rail\b/.test(astro)
  && /id=["']team-prev["']/.test(astro) && /id=["']team-next["']/.test(astro)
  && /\.team-row[\s\S]{0,120}scrollBy/.test(main);
const slicesRegistry = /FACTIONS\s*\.\s*slice\s*\(/.test(astro) || /factionCards\s*\.\s*slice\s*\(/.test(main);
const f3 = !!registry && pageSize === 10 && registry.factions.length === 10
  && pageIndicators === 0 && !slicesRegistry;
console.log(`   pageSize=${pageSize ?? '-'} faccoes=${registry?.factions.length ?? '-'} rail=${rail ? 'sim' : 'nao'} paginas=${pageIndicators} slice=${slicesRegistry}`);
console.log(`   ${f3 ? 'PASSA' : 'FALHA'}\n`);

const pass = f1 && f2 && f3;
console.log(pass ? 'OK FACREG1 registro unico suporta dez faccoes na mesma tela' : 'X FACREG1 o catalogo nao cumpre dez faccoes simultaneas');
process.exit(pass ? 0 : 1);
