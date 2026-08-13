// Tag, main e versão têm de contar a MESMA história.
//
// POR QUE ESTA RÉGUA EXISTE
//   Push de dois refspecs sem `--atomic` sobe cada ref por conta própria: a tag entra e o
//   `main` pode ser rejeitado, deixando tag que aponta para commit fora da main. O
//   `versao-bumpada` compara package.json com version.js e o eval:release valida gatilhos
//   de workflow — nenhum dos dois olha o grafo do git, que é onde isso aparece.
//
// O QUE ELA AFIRMA
//   TM1  nenhuma tag de release aponta para commit fora da main (tag órfã)
//   TM2  a tag mais nova é a versão do package.json da main
//   TM3  toda tag tem Release publicado no GitHub  (só com --rede; exige `gh`)
//   TM4  tag de release escrita no padrão canônico `v<semver>`
//   TM5  este clone tem todas as tags do remoto  (só com --rede)
import { execFileSync } from 'node:child_process';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
const comRede = process.argv.includes('--rede');
const MUTANTES = ['tag-orfa', 'versao-atrasada', 'release-faltando', 'tag-fora-do-padrao', 'tag-so-no-remoto'];
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

/* Case-insensitive de propósito: tag como `V2.0.0-alpha.36` some de qualquer filtro `v*`
   — inclusive desta régua e do parâmetro do deploy-prod.yml. Tag que ninguém enxerga é
   pior que tag errada, então ela ENTRA nas checagens e o TM4 cobra o nome. */
const EH_RELEASE = /^v\d+\.\d+\.\d+/i;
/* Ancorada no fim: sem o `$`, `v2.0.0oops` casa pelo prefixo e escapa do TM4. */
const CANONICA = /^v\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?$/;

/* Clone raso ou com tags parciais responde `git tag` com uma lista incompleta, e uma
   lista incompleta faz TM1/TM2 passarem sem terem olhado a órfã que mora só no remoto.
   Verde por falta de dado é pior que vermelho: recusa em vez de opinar. */
if (git('rev-parse', '--is-shallow-repository') === 'true') {
  throw new Error('clone raso: `git tag` não vê o histórico todo. Rode com fetch-depth: 0');
}
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

/* ── TM3 e TM5 ── exigem rede.
   Quem passou --rede PEDIU estas checagens. Engolir a falha da consulta e sair 0 pelas
   outras devolve verde por uma coisa que não foi olhada — é o mesmo defeito do CHROME_BIN
   vazio: degradação silenciosa. Aqui morre alto. */
let semRelease = null;
let soNoRemoto = null;
if (comRede) {
  let publicados;
  try {
    publicados = new Set(
      execFileSync('gh', ['release', 'list', '--limit', '400', '--json', 'tagName', '--jq', '.[].tagName'],
        { encoding: 'utf8' }).trim().split('\n').filter(Boolean),
    );
  } catch (erro) {
    throw new Error('TM3 foi pedido mas a consulta de Releases falhou (gh ausente, sem auth ou sem rede)', { cause: erro });
  }
  semRelease = tags.filter((t) => !publicados.has(t));
  if (mutante === 'release-faltando') semRelease = [...semRelease, 'v9.9.9-mutante'];

  /* Clone com tags parciais: a lista local fica incompleta e TM1/TM2 opinam sobre um
     estado que não é o do repositório. O remoto é a fonte de verdade do conjunto. */
  let remotas;
  try {
    remotas = git('ls-remote', '--tags', 'origin')
      .split('\n').filter(Boolean)
      .map((l) => l.split('\t')[1]?.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, ''))
      .filter((t) => t && EH_RELEASE.test(t));
  } catch (erro) {
    throw new Error('TM5 foi pedido mas `git ls-remote` falhou', { cause: erro });
  }
  const locais = new Set(tags);
  soNoRemoto = [...new Set(remotas.filter((t) => !locais.has(t)))];
  if (mutante === 'tag-so-no-remoto') soNoRemoto = [...soNoRemoto, 'v9.9.9-mutante'];
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
  checagens.push(['TM5', soNoRemoto.length === 0,
    'este clone tem todas as tags do remoto',
    `${soNoRemoto.length} tag(s) só no remoto: ${soNoRemoto.join(', ')} — as outras checagens olharam um conjunto incompleto`]);
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
console.log(`\n${tags.length} tag(s) conferida(s) contra ${MAIN}.${comRede ? '' : '  (TM3/TM5 exigem --rede)'}`);
process.exit(falhou ? 1 : 0);
