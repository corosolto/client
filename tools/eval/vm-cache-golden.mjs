/* A URL DO GLB MUDA QUANDO O ARQUIVO MUDA? — a armadilha mais cara desta frente.
 *
 * `urlForKey` montava `?v=golden-<arma>-1`, string congelada no código. Em
 * 13/09 republiquei m4, uzi e p90 com o pente consertado, na MESMA URL, e o
 * navegador do dono serviu o GLB de ontem: ele testou, viu os mesmos defeitos e
 * escreveu "todos os erros que eu te apontei antes ainda acontecem". Estava
 * certo. Nenhuma régua pegou porque todas leem o arquivo em DISCO, e em disco o
 * conserto estava lá.
 *
 * Esta régua cobre as duas metades:
 *   1. data/goldenver.js bate com o sha256 real de cada GLB publicado;
 *   2. authoredvm.js usa GOLDEN_VER e NÃO uma string literal de versão.
 *
 * Mutações:
 *   --mutante=congelada   volta a string à mão no authoredvm  → VERMELHO
 *   --mutante=desatual    finge um GLB alterado sem regerar   → VERMELHO
 *
 *   node tools/eval/vm-cache-golden.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const MUTANTE = arg('mutante', '');
const DIR = 'public/models/viewmodels/coro';
const VER = 'public/js/data/goldenver.js';
const FONTE = 'public/js/authoredvm.js';

let falhas = 0;
const fonte = fs.readFileSync(FONTE, 'utf8');
const trecho = fonte.slice(fonte.indexOf('const urlForKey'), fonte.indexOf('const clipKey'));
const usaGerado = /GOLDEN_VER\[/.test(trecho) && (MUTANTE !== 'congelada');
const literal = /`golden-\$\{weapon\}-\d`|'golden-[a-z0-9]+-\d'/.test(trecho) || MUTANTE === 'congelada';
console.log('\n  VC1 · a versão do GLB golden vem do conteúdo, não de string à mão');
if (usaGerado && !literal) {
  console.log('      ok — urlForKey lê GOLDEN_VER');
} else {
  falhas += 1;
  console.log(`      FALHA — ${literal ? 'ainda há versão literal no urlForKey' : 'urlForKey não usa GOLDEN_VER'}`);
}

console.log('\n  VC2 · goldenver.js bate com os bytes de cada GLB publicado');
const decl = fs.readFileSync(VER, 'utf8');
const registrado = Object.fromEntries([...decl.matchAll(/^\s{2}([a-z0-9_]+):\s*'([0-9a-f]+)',/gm)]
  .map((m) => [m[1], m[2]]));
const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith('-hires.glb')).sort();
const fora = [];
for (const f of arquivos) {
  const arma = f.replace('-hires.glb', '');
  let real = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f)))
    .digest('hex').slice(0, 10);
  if (MUTANTE === 'desatual' && arma === 'm4') real = 'deadbeef01';
  if (registrado[arma] !== real) fora.push(`${arma} (registrado ${registrado[arma] || '—'}, real ${real})`);
}
if (!fora.length) {
  console.log(`      ok — ${arquivos.length} GLB, todos com a revisão em dia`);
} else {
  falhas += 1;
  console.log(`      FALHA — ${fora.length} fora de sincronia:`);
  for (const l of fora) console.log(`        ${l}`);
  console.log('      conserto: npm run vm:goldenver');
}

console.log(falhas ? '\n  VERMELHO — o navegador pode servir GLB velho\n'
                   : '\n  VERDE — GLB novo muda de URL\n');
process.exit(falhas ? 1 : 0);
