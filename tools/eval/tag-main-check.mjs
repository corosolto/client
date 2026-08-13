// Tag, main e versão têm de contar a MESMA história.
//
// POR QUE ESTA RÉGUA EXISTE
//   O release.yml empurrava `git push origin main refs/tags/$NEW` — dois refspecs, push
//   NÃO atômico. O git sobe cada ref por conta própria: em 12/08 a tag v2.0.0-alpha.93
//   subiu e o `main` foi REJEITADO porque outro merge entrou no intervalo. Sobrou uma tag
//   apontando para um commit que nunca chegou à main, e a sequência da main pulou de .92
//   para .94. A causa foi corrigida (`--atomic`), mas o artefato ficou um dia inteiro sem
//   ninguém ver, porque NADA afirmava esse invariante: o `versao-bumpada` compara
//   package.json com version.js (arquivo x arquivo) e o eval:release valida gatilhos de
//   workflow. Nenhum dos dois olha o grafo do git.
//
// O QUE ELA AFIRMA
//   TM1  nenhuma tag de release aponta para commit fora da main (tag órfã)
//   TM2  a tag mais nova é a versão do package.json da main
//   TM3  toda tag tem Release publicado no GitHub  (só com --rede; exige `gh`)
//   TM4  tag de release escrita no padrão canônico `v<semver>`
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
const comRede = process.argv.includes('--rede');
const MUTANTES = ['tag-orfa', 'versao-atrasada', 'release-faltando', 'tag-fora-do-padrao'];
if (mutante && !MUTANTES.includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/* `origin/main` quando existe: a régua roda em branch de PR, e ali o HEAD local não é a
   referência de verdade. Sem o remoto (clone raso, worktree solto) cai no main local. */
const MAIN = (() => {
  for (const ref of ['origin/main', 'main']) {
    try { git('rev-parse', '--verify', `${ref}^{commit}`); return ref; } catch { /* segue */ }
  }
  throw new Error('nem origin/main nem main existem neste clone');
})();

const ordemVersao = (t) => t.replace(/^v/i, '').split(/[.-]/).map((p) => (/^\d+$/.test(p) ? +p : p));
const maior = (a, b) => {
  const x = ordemVersao(a), y = ordemVersao(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (typeof x[i] === 'number' && typeof y[i] === 'number') return x[i] > y[i] ? a : b;
    return String(x[i] ?? '') > String(y[i] ?? '') ? a : b;
  }
  return a;
};

/* Case-insensitive de propósito: uma tag `V2.0.0-alpha.36` existe e some de qualquer
   filtro `v*` — inclusive desta régua e do parâmetro do deploy-prod.yml. Tag que ninguém
   enxerga é pior que tag errada, então ela ENTRA nas checagens e o TM4 cobra o nome. */
const EH_RELEASE = /^v\d+\.\d+\.\d+/i;
const CANONICA = /^v\d+\.\d+\.\d+/;
const tags = git('tag').split('\n').filter((t) => EH_RELEASE.test(t));
if (!tags.length) throw new Error('nenhuma tag de release — clone sem tags não prova nada; rode `git fetch --tags`');

const naMain = (tag) => {
  const c = git('rev-list', '-n1', tag);
  try { execFileSync('git', ['merge-base', '--is-ancestor', c, MAIN], { stdio: 'ignore' }); return true; }
  catch { return false; }
};

/* ── TM1 ── tag órfã */
let orfas = tags.filter((t) => !naMain(t));
if (mutante === 'tag-orfa') orfas = [...orfas, 'v9.9.9-mutante'];

/* ── TM2 ── tag mais nova x package.json da main */
const maisNova = tags.reduce(maior);
let versaoMain = JSON.parse(git('show', `${MAIN}:package.json`)).version;
if (mutante === 'versao-atrasada') versaoMain = '0.0.0-atrasada';
const casaVersao = `v${versaoMain}` === maisNova;

/* ── TM3 ── tag sem Release (só com --rede) */
let semRelease = null;
if (comRede) {
  try {
    const publicados = new Set(
      execFileSync('gh', ['release', 'list', '--limit', '400', '--json', 'tagName', '--jq', '.[].tagName'],
        { encoding: 'utf8' }).trim().split('\n').filter(Boolean),
    );
    semRelease = tags.filter((t) => !publicados.has(t));
    if (mutante === 'release-faltando') semRelease = [...semRelease, 'v9.9.9-mutante'];
  } catch {
    semRelease = null;   // sem `gh` ou sem rede: não inventa veredito
  }
}

const checagens = [
  ['TM1', orfas.length === 0,
    `nenhuma tag aponta para commit fora da ${MAIN}`,
    `${orfas.length} tag(s) órfã(s): ${orfas.join(', ')} — o push que as criou não levou a main junto`],
  ['TM2', casaVersao,
    `a tag mais nova (${maisNova}) é a versão da main`,
    `tag mais nova ${maisNova} != v${versaoMain} do package.json da ${MAIN}`],
];
if (semRelease !== null) {
  checagens.push(['TM3', semRelease.length === 0,
    'toda tag tem Release publicado',
    `${semRelease.length} tag(s) sem Release: ${semRelease.join(', ')}`]);
}

/* Dívida declarada: tagueada à mão no merge do PR #89, e tem Release preso nela —
   renomear exige apagar e recriar. Fica registrada para travar tag NOVA fora do padrão
   sem exigir cirurgia no passado. Lista que só encolhe. */
const FORA_DO_PADRAO_CONHECIDAS = ['V2.0.0-alpha.36'];
let foraDoPadrao = tags.filter((t) => !CANONICA.test(t) && !FORA_DO_PADRAO_CONHECIDAS.includes(t));
if (mutante === 'tag-fora-do-padrao') foraDoPadrao = [...foraDoPadrao, 'V9.9.9-mutante'];
checagens.push(['TM4', foraDoPadrao.length === 0,
  'toda tag de release está no padrão `v<semver>`',
  `${foraDoPadrao.length} tag(s) fora do padrão: ${foraDoPadrao.join(', ')} — somem de qualquer filtro \`v*\``]);

let falhou = false;
for (const [codigo, ok, aoPassar, aoFalhar] of checagens) {
  console.log(`${ok ? '\x1b[32m✓' : '\x1b[31m✗'} ${codigo} ${ok ? aoPassar : aoFalhar}\x1b[0m`);
  if (!ok) falhou = true;
}
if (semRelease === null && comRede) console.log('· TM3 pulada: `gh` indisponível');
console.log(`\n${tags.length} tag(s) conferida(s) contra ${MAIN}.`);
process.exit(falhou ? 1 : 0);
