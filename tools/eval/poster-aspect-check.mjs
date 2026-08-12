/* ============================================================================
   poster-aspect-check.mjs — O ASPECTO DECLARADO DE CADA CARTAZ BATE COM O ARQUIVO?
   ----------------------------------------------------------------------------
   POR QUE EXISTE (defeito relatado pelo dono, issue #79)
     "O aspecto declarado de 6 cartazes está errado (arte esticada na parede)."

   CAUSA RAIZ
   `public/js/textures.js`, lista `POSTER_FILES`, declara a proporção largura/altura
   de cada cartaz À MÃO — `['arquivo.jpg', 0.72]`. Esse número decide o tamanho do
   quad na parede. Se não bate com o arquivo, a arte sai ESTICADA ou ACHATADA, e
   ninguém percebe lendo o código: `0.72` parece tão plausível quanto `1.02`. Cinco
   dos seis errados eram exatamente `0.72` — o valor que alguém repetiu ao colar a
   linha.

   COMO ELE MEDE (e por que não é olho)
   Lê a proporção REAL de cada arquivo em `public/posters/` (dimensões do próprio
   pixel, via sharp), lê a DECLARADA recortando o `POSTER_FILES` de textures.js, e
   reprova quando divergem além do teto.

   O TETO É 6% — e o porquê está medido, não é número mágico:
   o maior desvio LEGÍTIMO da tela hoje é 4,0% (`ashtar-meme.jpg`, JPEG de acervo com
   borda irregular). 2% reprovaria essa borda honesta; 6% dá folga para o recorte de
   acervo sem deixar passar os esticados de 17% a 86% que a issue #79 pegou.

   MUTAÇÃO (regra da casa: régua que não morde não existe)
     node tools/eval/poster-aspect-check.mjs --mutate
   estraga a SEGUNDA ocorrência de um cartaz repetido e exige vermelho. Também remove
   o marcador do bloco para provar que parser vazio é erro, não um verde por vacuidade.

   Uso: node tools/eval/poster-aspect-check.mjs [--mutate] [--json]
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const POSTERS = path.join(ROOT, 'public', 'posters');
const MUTATE = process.argv.includes('--mutate');
const JSON_OUT = process.argv.includes('--json');

const TOL = 0.06; // ver cabeçalho: 6% cobre a borda de acervo (máx. legítimo 4,0%)

/** Recorta TODAS as entradas, inclusive repetidas: repetição pesa a rotação no jogo. */
function lerDeclarados(fonte) {
  const src = fonte ?? readFileSync(path.join(ROOT, 'public', 'js', 'textures.js'), 'utf8');
  const bloco = src.match(/const\s+POSTER_FILES\s*=\s*\[([\s\S]*?)\];/)?.[1];
  if (bloco == null) throw new Error('bloco POSTER_FILES não encontrado em textures.js');

  const limpo = bloco.replace(/\/\/.*$/gm, '');
  const numero = '(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  const entrada = new RegExp(`\\[\\s*(['"])([^'"]+)\\1\\s*,\\s*(${numero})(?:\\s*,\\s*${numero})?\\s*\\]`, 'g');
  const declarados = [...limpo.matchAll(entrada)].map((m) => ({ arquivo: m[2], decl: Number(m[3]) }));
  const sobra = limpo.replace(entrada, '').replace(/[\s,]/g, '');
  if (sobra || !declarados.length) {
    throw new Error(`POSTER_FILES não foi lido por inteiro${sobra ? ` (trecho: ${sobra.slice(0, 40)})` : ''}`);
  }
  return declarados;
}

async function medir(declarados) {
  const linhas = [];
  for (const { arquivo, decl } of declarados) {
    const fp = path.join(POSTERS, arquivo);
    if (!existsSync(fp)) { linhas.push({ arquivo, decl, erro: 'arquivo ausente' }); continue; }
    const { width, height } = await sharp(fp).metadata();
    if (!width || !height) { linhas.push({ arquivo, decl, erro: 'dimensões ilegíveis' }); continue; }
    const real = width / height;
    const desvio = Math.abs(real - decl) / decl;
    linhas.push({ arquivo, decl, real, width, height, desvio, fora: desvio > TOL });
  }
  return linhas;
}

let declarados;
try {
  declarados = lerDeclarados();
} catch (e) {
  console.error(`✗ régua não soube medir: ${e.message}`);
  process.exit(1);
}

if (MUTATE) {
  // O bug real deduplicava por nome. Muta justamente a SEGUNDA ocorrência repetida.
  const alvo = declarados.findIndex((e, i) => declarados.findIndex((x) => x.arquivo === e.arquivo) < i);
  if (alvo < 0) { console.error('✗ mutação NÃO APLICOU: nenhuma entrada repetida.'); process.exit(1); }
  declarados[alvo] = { ...declarados[alvo], decl: declarados[alvo].decl * 1.5 };
  const linhas = await medir(declarados);
  const aspectoPego = linhas[alvo]?.fora === true;

  const src = readFileSync(path.join(ROOT, 'public', 'js', 'textures.js'), 'utf8');
  let vazioPego = false;
  try { lerDeclarados(src.replace('const POSTER_FILES', 'const POSTER_FILES_REMOVIDO')); }
  catch { vazioPego = true; }
  if (aspectoPego && vazioPego) {
    console.log(`✓ mutações PEGAS: duplicata '${declarados[alvo].arquivo}' deformada e parser sem bloco reprovado.`);
    process.exit(0);
  }
  console.error(`✗ mutação PASSOU: duplicata=${aspectoPego ? 'pega' : 'cega'}, parser-vazio=${vazioPego ? 'pego' : 'aceito'}.`);
  process.exit(1);
}

const linhas = await medir(declarados);
const fora = linhas.filter((l) => l.fora || l.erro);

if (JSON_OUT) {
  console.log(JSON.stringify({ tol: TOL, total: linhas.length, fora: fora.length, linhas }, null, 2));
  process.exit(fora.length ? 1 : 0);
}

for (const l of fora) {
  if (l.erro) { console.error(`✗ ${l.arquivo}: ${l.erro}`); continue; }
  console.error(
    `✗ ${l.arquivo}: declarado ${l.decl.toFixed(3)}, real ${l.real.toFixed(3)} ` +
    `(${l.width}×${l.height}, desvio ${(l.desvio * 100).toFixed(0)}%)`,
  );
}

if (fora.length) {
  console.error(`\n${fora.length}/${linhas.length} cartazes com aspecto errado (teto ${TOL * 100}%).`);
  process.exit(1);
}
console.log(`✓ ${linhas.length} cartazes com aspecto declarado dentro de ${TOL * 100}% do arquivo.`);
