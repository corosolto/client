/* ============================================================================
   jsonld-validate.mjs — O JSON-LD PUBLICADO EXISTE NO VOCABULÁRIO SCHEMA.ORG?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   "Passa no validador" é a afirmação mais fácil de fazer e a mais fácil de não
   conferir. Esta régua confere: baixa o vocabulário OFICIAL do schema.org e
   verifica, nó a nó, contra ele — sem heurística e sem lista escrita à mão.

   O QUE ELE CHECA, em cada `<script type="application/ld+json">` de dist/client/
     1. o bloco parseia como JSON;
     2. todo `@type` é uma `rdfs:Class` que existe no vocabulário;
     3. toda propriedade é uma `rdf:Property` que existe no vocabulário;
     4. o `schema:domainIncludes` de cada propriedade contém o tipo do nó — ou
        um ancestral dele (`rdfs:subClassOf` percorrido até a raiz). É o que pega
        `gameLocation` posto num `WebPage`, por exemplo.

   O QUE ELE **NÃO** CHECA, e é honesto dizer
     · não é o Rich Results Test do Google: os REQUISITOS de rich result (quais
       campos são obrigatórios pra um FAQ virar card, por exemplo) são política
       do Google, não do schema.org, e não estão neste vocabulário;
     · não valida os valores (não sabe se `price: "0"` é plausível);
   · não vê as páginas SSR (`/`, `/ranking`, `/mapa`, `/u/*`), que não têm HTML
     em `dist/`. O jogo na raiz é SSR porque escolhe o idioma por cabeçalho;
     valide-o num smoke HTTP separado. As páginas estáticas abaixo exercitam o
     mesmo Layout e o grafo base que ele usa.

   FONTE
     https://schema.org/version/latest/schemaorg-current-https.jsonld
   Baixado sob demanda e guardado em tools/eval/.cache/ (git-ignorado). Precisa
   de rede na primeira execução; depois roda offline.

   Uso: node tools/eval/jsonld-validate.mjs [--vocab <arquivo>] [--refresh]
   ============================================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist', 'client');
const CACHE = path.join(HERE, '.cache');
const VOCAB_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';

const argv = process.argv.slice(2);
const vocabArg = argv.includes('--vocab') ? argv[argv.indexOf('--vocab') + 1] : null;
const refresh = argv.includes('--refresh');

async function vocabulario() {
  if (vocabArg) return JSON.parse(readFileSync(vocabArg, 'utf-8'));
  const f = path.join(CACHE, 'schemaorg-current-https.jsonld');
  if (!refresh && existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8'));
  const r = await fetch(VOCAB_URL);
  if (!r.ok) throw new Error(`${VOCAB_URL} respondeu ${r.status}`);
  const txt = await r.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(f, txt);
  return JSON.parse(txt);
}

const curto = (x) => String(x?.['@id'] ?? x).replace(/^schema:/, '');

const V = await vocabulario();
const classes = new Set();
const props = new Map();     // nome -> domainIncludes[]
const superOf = new Map();   // classe -> supertipos diretos
for (const n of V['@graph']) {
  const tipos = [].concat(n['@type'] ?? []);
  const id = curto(n);
  if (tipos.includes('rdfs:Class')) {
    classes.add(id);
    superOf.set(id, [].concat(n['rdfs:subClassOf'] ?? []).map(curto));
  }
  if (tipos.includes('rdf:Property')) {
    props.set(id, [].concat(n['schema:domainIncludes'] ?? []).map(curto));
  }
}
const ancestrais = (t, vistos = new Set()) => {
  for (const s of superOf.get(t) ?? []) if (!vistos.has(s)) { vistos.add(s); ancestrais(s, vistos); }
  return vistos;
};

const paginas = ['armas/index.html', 'mapas/index.html', 'personagens/index.html',
                 'como-jogar/index.html', 'sobre/index.html', 'changelog/index.html'];

const problemas = [];
let nos = 0, pares = 0, blocos = 0;

function anda(o, onde) {
  if (Array.isArray(o)) return o.forEach((x) => anda(x, onde));
  if (!o || typeof o !== 'object') return;
  const t = o['@type'];
  if (t) {
    nos++;
    const tipos = [].concat(t);
    for (const tt of tipos)
      if (!classes.has(tt)) problemas.push(`${onde}: @type "${tt}" não existe no schema.org`);
    const familia = new Set(tipos.flatMap((tt) => [tt, ...ancestrais(tt)]));
    for (const k of Object.keys(o)) {
      if (k.startsWith('@')) continue;
      if (!props.has(k)) { problemas.push(`${onde}: propriedade "${k}" não existe no schema.org (nó ${tipos})`); continue; }
      pares++;
      const dom = props.get(k);
      if (dom.length && !dom.some((d) => familia.has(d)))
        problemas.push(`${onde}: "${k}" não é declarada para ${tipos} (domainIncludes: ${dom.join(', ')})`);
    }
  }
  for (const v of Object.values(o)) anda(v, onde);
}

if (!existsSync(DIST)) {
  console.error('✗ dist/client/ não existe. Rode `npm run build` antes.');
  process.exit(1);
}
for (const f of paginas) {
  const alvo = path.join(DIST, f);
  if (!existsSync(alvo)) { problemas.push(`${f}: não existe no build`); continue; }
  const html = readFileSync(alvo, 'utf-8');
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    blocos++;
    let d;
    try { d = JSON.parse(m[1]); } catch (e) { problemas.push(`${f}: bloco ld+json não parseia (${e.message})`); continue; }
    anda(d['@graph'] ?? d, f);
  }
}

console.log(`JSON-LD × schema.org (${VOCAB_URL.split('/').pop()})\n`);
console.log(` blocos ld+json .......... ${blocos}`);
console.log(` nós com @type ........... ${nos}`);
console.log(` pares propriedade×tipo .. ${pares}`);
for (const p of problemas) console.log(`  ✗ ${p}`);
console.log(`\n${problemas.length ? '✗' : '✓'} ${problemas.length} problema(s)`);
process.exit(problemas.length ? 1 : 0);
