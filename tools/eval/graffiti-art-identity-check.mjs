// Alias editorial atravessa as quatro vias de chaveArte, mantendo canvas/posters.
// Contrato: docs/visual-consistency/GRAFITE-IDENTIDADE.md
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const failures = [];
const check = (ok, label) => { if (!ok) failures.push(label); };

const helperURL = pathToFileURL(fileURLToPath(new URL('../../public/js/graffiti_art_id.js', import.meta.url)));
const { identidadeArteGrafite } = await import(helperURL.href);
const passSrc = readFileSync(fileURLToPath(new URL('../../public/js/graffiti_pass.js', import.meta.url)), 'utf8');

const fnMatch = passSrc.match(/function chaveArte\(texture, fallback\) \{[\s\S]*?\n\}/);
check(!!fnMatch, 'chaveArte ausente em graffiti_pass.js');

// chaveArte real, extraída do fonte, com o helper real injetado.
const makeChaveArte = (helper, body = fnMatch[0]) => new Function('identidadeArteGrafite',
  'const imagensGrafite = new WeakMap(); let imagemGrafiteId = 0;\n' + body + '\nreturn chaveArte;')(helper);
const chaveArte = makeChaveArte(identidadeArteGrafite);

const FINA = '/img/decals/tag-fina.png';
const tex = src => ({ source: { data: { src } } });

// Alias conservado em todas as vias de caminho: src absoluto, relativo, com query,
// URL-encoded, userData.decalArquivo e fallback decal:.
check(chaveArte(tex('http://grafite.local/img/decals/tag-larga.png'), '') === FINA, 'alias:src-absoluto');
check(chaveArte(tex('/img/decals/tag-larga.png'), '') === FINA, 'alias:src-relativo');
check(chaveArte(tex('/img/decals/tag-larga.png?v=42'), '') === FINA, 'alias:src-query');
check(chaveArte(tex('/img/decals/%74ag-larga.png'), '') === FINA, 'alias:src-encoded');
check(chaveArte(tex('img/decals/tag-larga.png'), '') === FINA, 'alias:src-sem-barra');
check(chaveArte({ userData: { decalArquivo: 'tag-larga.png' } }, '') === FINA, 'alias:userData');
check(chaveArte({}, 'decal:tag-larga.png') === FINA, 'alias:fallback-decal');
// A contraparte fina também normaliza para si mesma: contagem é por identidade.
check(chaveArte(tex('/img/decals/tag-fina.png'), '') === FINA, 'alias:fina-estavel');

// Recusa: nomes fora do alias não colapsam; posters e canvas intocados.
check(chaveArte(tex('/img/decals/tag-xl.png'), '') === '/img/decals/tag-xl.png', 'recusa:outro-decal');
check(chaveArte(tex('/img/decals/tag-flop.png?v=1'), '') === '/img/decals/tag-flop.png', 'recusa:outro-decal-query');
check(chaveArte({}, 'poster:mural-eternamente.jpg') === '/posters/mural-eternamente.jpg', 'recusa:poster');
check(identidadeArteGrafite('canvas:1') === 'canvas:1', 'recusa:canvas-key');
const canvasTex = { image: {} };
check(chaveArte(canvasTex, '') === 'canvas:1' && chaveArte(canvasTex, '') === 'canvas:1', 'recusa:canvas-weakmap');
check(chaveArte({}, 'decal:sem-extensao') === 'decal:sem-extensao', 'recusa:fallback-crú');
check(identidadeArteGrafite('__proto__') === '__proto__', 'recusa:prototype');
check(identidadeArteGrafite('/img/decals/constructor.png') === '/img/decals/constructor.png', 'recusa:constructor');
check(identidadeArteGrafite('/img/decals/tag-larga.png?x=/img/decals/tag-fina.png') === FINA, 'alias:query-nao-trapaceia');

// Contraprova 1 — sem a entrada de alias, a identidade racha (o gate ficaria RED).
const helperSrc = readFileSync(fileURLToPath(helperURL), 'utf8');
const semAlias = 'const ALIASES = {};\n' + helperSrc.split('\n').filter(l => !l.startsWith('const ALIASES')).join('\n')
  .replaceAll('export function', 'function');
const helperMutante = new Function(semAlias + '\nreturn identidadeArteGrafite;')();
check(helperMutante('/img/decals/tag-larga.png') === '/img/decals/tag-larga.png', 'contraprova:alias-removido-racha');

// Contraprova 2 — cada uso do helper dentro de chaveArte muda o resultado da via
// correspondente; remover um só derruba a asserção (prova que ela não é vazia).
const usos = (fnMatch[0].match(/identidadeArteGrafite\(/g) || []).length;
check(usos === 4, `contraprova:esperava 4 usos do helper, achei ${usos}`);
const vias = [
  [tex('/img/decals/tag-larga.png'), ''],
  [{ userData: { decalArquivo: 'tag-larga.png' } }, ''],
  [{}, 'poster:a%20b.jpg'],
  [{}, 'decal:tag-larga.png'],
];
check(chaveArte(vias[2][0], vias[2][1]) === '/posters/a b.jpg', 'poster:decode-conservado');
for (let i = 0; i < usos; i++) {
  let visto = 0;
  const mutada = fnMatch[0].replace(/identidadeArteGrafite\(/g, () => (visto++ === i ? '(' : 'identidadeArteGrafite('));
  const chaveMutada = makeChaveArte(identidadeArteGrafite, mutada);
  const [via, fallback] = vias[i];
  check(chaveMutada(via, fallback) !== chaveArte(via, fallback), `contraprova:mutacao-uso-${i + 1}-nao-mordeu`);
}

if (failures.length) {
  console.error('FAIL graffiti-art-identity-check: ' + failures.join(' | '));
  process.exit(1);
}
console.log('OK graffiti-art-identity-check: alias curado nas 4 vias de chaveArte, canvas/posters intactos, contraprovas vermelhas');
