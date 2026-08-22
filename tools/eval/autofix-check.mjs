#!/usr/bin/env node
/* ============================================================================
   autofix-check.mjs — O BOT CONSERTA, MAS SÓ O QUE É DERIVADO
   ----------------------------------------------------------------------------
   O autofix é a primeira máquina deste repositório com permissão de ESCREVER num
   PR. Isso só é aceitável enquanto três coisas valerem, e esta régua é quem as
   segura:

   AF1 · toda escrita passa pela lista de permissão. Um `git commit`/`git push` no
         autofix.yml que não seja precedido pela trava é a régua inteira contornada.
   AF2 · a lista nunca cobre caminho de código. `public/`, `src/`, `scripts/`,
         `.github/` e os manifestos ficam de fora — inclusive `.github/`, porque um
         bot que edita o workflow que o governa amplia a própria permissão.
   AF3 · o bot não mergeia. Deixar o PR pronto e fechá-lo são coisas diferentes, e
         a segunda é humana (decisão do dono, 21/08).
   AF4 · e isso vale para o repositório INTEIRO, não só para o autofix: nenhum
         workflow pode chamar `gh pr merge`. O `csbrasil-bot-automerge` chamava, e
         era a única coisa que um bot daqui fazia sozinho — justamente a que não
         devia. Ele agora aplica `pronto-pra-merge` e o botão continua humano.
   AF7 · todo commit que o bot faz - `git commit` E `git merge` - carrega os trailers que
         o CI cobra de gente: `Agent:` (agente_check) e `Signed-off-by:` (dco_check). Sem
         `-m`, o `git merge` escreve a mensagem automática, que não leva trailer nenhum -
         e aí o bot conserta o PR e o dco reprova o commit que ele mesmo fez. Medido no
         #406, onde o merge limpo do autofix travou o PR inteiro.
   AF6 · o autofix acorda quando a MAIN anda, não só quando o PR se mexe. Foram 9
         releases em 20 horas e cada um reabre conflito em todo PR aberto; sem o
         gatilho de push o bot só conserta quem empurra commit — ou seja, nunca
         quem está parado esperando revisão, que é justamente quem precisa.
   AF5 · o resolvedor de conflito passa pela MESMA trava e ABORTA quando sobra
         conflito fora dela. Resolver conflito de arquivo gerado é mecânico (todo
         `chore(release)` reabre um em cada PR aberto); resolver conflito de código
         é julgamento. Sem o `git merge --abort` no caminho de exceção, o bot
         resolveria código escolhendo um lado no escuro.

   Uso: node tools/eval/autofix-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  'autofix-sem-trava': 'AF1',
  'lista-abre-codigo': 'AF2',
  'lista-abre-workflow': 'AF2',
  'autofix-mergeia': 'AF3',
  'automerge-volta': 'AF4',
  'resolve-conflito-de-codigo': 'AF5',
  'sem-varredura-pos-release': 'AF6',
  'commit-sem-trailer': 'AF7',
  'merge-sem-trailer': 'AF7',
  'trava-do-pr': 'AF5',
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const falhas = [];

let wf = ler('.github/workflows/autofix.yml');
let lista = ler('scripts/ci/autofix_allowlist.py');

if (MUT === 'autofix-sem-trava') wf = wf.replace(/autofix_allowlist\.py/g, 'cat');
if (MUT === 'autofix-mergeia') wf = wf.replace('git push origin "HEAD:$HEAD_REF"', 'git push origin "HEAD:$HEAD_REF"\n          gh pr merge "$PR_NUMBER" --squash --auto');
if (MUT === 'lista-abre-codigo') lista = lista.replace('    "docs/",', '    "docs/",\n    "public/",');
if (MUT === 'lista-abre-workflow') lista = lista.replace(/^\s*"\.github\/",$/m, '');

if (!wf) { console.log('  \x1b[31m✗\x1b[0m AF0 .github/workflows/autofix.yml não existe'); process.exit(1); }

/* ---- AF1: escrita só depois da trava ---- */
const usaTrava = /autofix_allowlist\.py/.test(wf);
const escreve = /git (commit|push)/.test(wf);
const posTrava = wf.indexOf('autofix_allowlist.py');
const posCommit = wf.search(/git commit/);
if (escreve && (!usaTrava || posCommit < posTrava)) {
  falhas.push('AF1 autofix.yml escreve no PR sem passar pela lista de permissão antes');
}
/* O commit tem de usar SÓ o que a trava liberou, não um `git add -A`. */
if (/git add\s+(-A|--all|\.)(\s|$)/.test(wf)) {
  falhas.push('AF1 autofix.yml usa `git add` abrangente — o commit deve sair da saída da trava');
}

/* ---- AF2: a lista não cobre código ---- */
if (!lista) falhas.push('AF2 scripts/ci/autofix_allowlist.py não existe');
else {
  const bloco = (lista.match(/PERMITIDOS = \(([\s\S]*?)\)/) || [])[1] || '';
  const proibidos = (lista.match(/PROIBIDOS = \(([\s\S]*?)\)/) || [])[1] || '';
  for (const perigoso of ['public/', 'src/', 'supabase/', 'scripts/', '.github/']) {
    if (new RegExp(`"${perigoso.replace('.', '\\.')}`).test(bloco)) {
      falhas.push(`AF2 a lista de permissão cobre \`${perigoso}\` — o bot passa a poder reescrever código`);
    }
  }
  for (const obrigatorio of ['.github/', 'scripts/', 'package.json']) {
    if (!new RegExp(`"${obrigatorio.replace('.', '\\.')}`).test(proibidos)) {
      falhas.push(`AF2 \`${obrigatorio}\` não está na lista de proibidos`);
    }
  }
}

/* ---- AF3: o bot não mergeia ---- */
if (/gh pr merge/.test(wf)) {
  falhas.push('AF3 autofix.yml mergeia PR — o autofix deixa pronto, quem fecha é gente');
}

/* ---- AF5: o resolvedor de conflito aborta quando o conflito é de gente ---- */
if (MUT === 'resolve-conflito-de-codigo') {
  wf = wf.replace(/\s*git merge --abort\n/, '\n');
}
const resolveConflito = /--caminhos/.test(wf) && /git checkout --theirs/.test(wf);
if (MUT === 'trava-do-pr') wf = wf.replace(/git show "base\/\$BASE:scripts\/ci\/autofix_allowlist\.py"[\s\S]*?allowlist-base\.py\n/, '');
if (resolveConflito && !/git show ["']?base\/\$BASE:scripts\/ci\/autofix_allowlist\.py/.test(wf)) {
  falhas.push('AF5 a trava consultada no merge não vem da BASE — um PR que reescrevesse o allowlist liberaria a si mesmo');
}
if (resolveConflito) {
  const trecho = wf.slice(wf.indexOf('diff-filter=U'), wf.indexOf('git checkout --theirs'));
  /* Vale tanto o script do repositório quanto a cópia da BASE extraída para /tmp — a
     segunda é MAIS segura, porque um PR que reescrevesse o allowlist liberaria a si
     mesmo. O que a régua recusa é escolher lado sem consultar trava nenhuma. */
  if (!/(?:autofix_allowlist|allowlist-base)\.py --caminhos/.test(trecho)) {
    falhas.push('AF5 o resolvedor escolhe lado do conflito sem consultar a lista de permissão');
  }
  if (!/git merge --abort/.test(trecho)) {
    falhas.push('AF5 o resolvedor não aborta o merge quando sobra conflito fora da lista — passaria a decidir código no escuro');
  }
  if (!/--caminhos/.test(ler('scripts/ci/autofix_allowlist.py'))) {
    falhas.push('AF5 autofix_allowlist.py não entende `--caminhos`, que é como o resolvedor o consulta');
  }
}

/* ---- AF7: os commits do bot levam os trailers que o CI cobra ---- */
if (MUT === 'commit-sem-trailer') wf = wf.replace(/\n\s*-m "Agent: csbrasil-bot \(autofix\)" \\/g, '');
if (MUT === 'merge-sem-trailer') wf = wf.replace(/git merge --no-edit -m[\s\S]*?FETCH_HEAD; then/, 'git merge --no-edit FETCH_HEAD; then');
/* Só a CHAMADA conta. `git merge` citado dentro de `--body` é instrução que o bot manda
   para o humano ler, não comando que ele roda — contá-la acusaria quem documentou. */
for (const trecho of [...wf.matchAll(/^\s*(?:if )?git (?:commit|merge)[\s\S]{0,600}?(?=\n\s{0,10}[a-z-]+:|\n\s*$)/gm)].map((m) => m[0])) {
  if (/--abort/.test(trecho)) continue;                   // abortar não cria commit
  if (!/Agent:/.test(trecho)) falhas.push('AF7 um `git commit`/`git merge` do bot não leva `Agent:` — o agente_check reprova o PR que ele acabou de consertar');
  if (!/Signed-off-by:/.test(trecho)) falhas.push('AF7 um `git commit`/`git merge` do bot não leva `Signed-off-by:` — o dco reprova o PR que ele acabou de consertar');
}

/* ---- AF6: a varredura pós-release existe e enxerga quem ficou para trás ---- */
if (MUT === 'sem-varredura-pos-release') wf = wf.replace(/\n  push:\n    branches: \[main\]/, '');
const temPush = /^\s{2}push:\n\s{4}branches: \[main\]/m.test(wf);
const temVarredura = /varredura:\n\s+if: github\.event_name == 'push'/.test(wf);
const filtraAtrasado = /mergeable != "MERGEABLE"/.test(wf) && /gh workflow run autofix\.yml/.test(wf);
if (!temPush) falhas.push('AF6 autofix.yml não acorda quando a main anda — PR parado esperando revisão nunca é consertado');
else if (!temVarredura) falhas.push('AF6 o gatilho de push existe mas não há job de varredura');
else if (!filtraAtrasado) falhas.push('AF6 a varredura não seleciona os PRs desatualizados nem dispara o autofix de cada um');

/* ---- AF4: e nenhum outro workflow mergeia tampouco ---- */
const WORKFLOWS = readdirSync('.github/workflows').filter((f) => /\.ya?ml$/.test(f));
for (const nome of WORKFLOWS) {
  let texto = ler(`.github/workflows/${nome}`);
  if (MUT === 'automerge-volta' && nome === 'csbrasil-bot-automerge.yml') {
    texto += "\n          subprocess.run(['gh', 'pr', 'merge', pr, '--squash', '--auto'])\n";
  }
  /* Só a CHAMADA conta: o comentário que explica por que ela saiu tem de poder citá-la. */
  const linhas = texto.split('\n').filter((l) => !/^\s*#/.test(l));
  if (linhas.some((l) => /gh['"]?,\s*['"]pr['"],\s*['"]merge['"]|gh pr merge/.test(l))) {
    falhas.push(`AF4 ${nome} mergeia PR sozinho — deixar pronto e fechar são coisas diferentes`);
  }
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m AF autofix escreve só o que a trava libera, a lista não cobre código e o bot não mergeia');
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
