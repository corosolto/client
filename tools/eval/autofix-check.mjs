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
   AF7 · todo commit que o bot faz - `git commit` E `git merge`, inclusive a chamada
         GUARDADA (`… || git commit`) - carrega os trailers que o CI cobra de gente:
         `Agent:` (agente_check) e `Signed-off-by:` (dco_check). Sem `-m`, o `git merge`
         escreve a mensagem automática, que não leva trailer nenhum - e aí o bot conserta
         o PR e o dco reprova o commit que ele mesmo fez. Medido no #406 (merge limpo) e
         de novo no #450, onde o commit "regenera bloco derivado" saiu sem `Agent:` e
         reprovou a PR #448. E — como a AF4 — vale para TODOS os workflows, não só o
         autofix: a terceira ocorrência da classe veio de OUTRO arquivo (#451, o
         bootstrap do issues-bot saía sem `Agent:` e toda draft PR do bot nascia
         reprovada no dco), e a varredura promovida pegou no mesmo dia o release.yml
         comitando sem o trailer. Régua que ENUMERA onde devia VARRER envelhece no
         primeiro arquivo novo.
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
  'commit-guardado-sem-trailer': 'AF7',
  'bootstrap-sem-trailer': 'AF7',
  'release-sem-trailer': 'AF7',
  'release-sem-signoff': 'AF7',
  'workflow-fora-do-registro': 'AF7',
  'registro-orfao': 'AF7',
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

/* ---- AF7: os commits que os workflows fazem levam os trailers que o CI cobra ---- */
if (MUT === 'commit-sem-trailer') wf = wf.replace(/\n\s*-m "Agent: csbrasil-bot \(autofix\)" \\/g, '');
if (MUT === 'merge-sem-trailer') wf = wf.replace(/git merge --no-edit -m[\s\S]*?FETCH_HEAD; then/, 'git merge --no-edit FETCH_HEAD; then');
if (MUT === 'commit-guardado-sem-trailer') wf = wf.replace(/(\|\| git commit[\s\S]*?)\n\s*-m "Agent: csbrasil-bot \(autofix\)" \\/, '$1');
/* Só a CHAMADA conta. `git merge` citado dentro de `--body` é instrução que o bot manda
   para o humano ler, não comando que ele roda — contá-la acusaria quem documentou. O
   recorte é a chamada INTEIRA: a linha do `git commit`/`git merge` — inclusive guardada
   por `… ||` — mais as continuações de `\`, que é onde os trailers moram. O recorte
   antigo ("600 chars até a próxima chave YAML") não alcançava parada nenhuma dentro dos
   blocos `run:`: as chamadas reais ficavam FORA do recorte, a régua media só o `--abort`
   e os dois mutantes de trailer estavam cegos — foi assim que o commit "regenera bloco
   derivado" saiu sem `Agent:` e o dco reprovou a PR #448 (issue #450). */
const recortarChamadas = (texto) =>
  [...texto.matchAll(/^[^\S\n]*(?:if !? ?)?(?:[^\n#]*?(?:\|\||&&|;)[^\S\n]*)?git (?:commit|merge)(?:[^\n]*\\\n)*[^\n]*/gm)]
    .map((m) => m[0])
    .filter((t) => !/--abort/.test(t))                      // abortar não cria commit
    .filter((t) => !/^[^\S\n]*["']/.test(t));               // linha de string de `--body`: citação, não chamada
/* Não saber medir é o mesmo vermelho de medir errado: foi um recorte que não achava
   chamada NENHUMA que cegou os dois mutantes de trailer (#450). Achar menos que o
   registrado é recorte quebrado, não workflow limpo — e workflow com chamada que não
   está no registro é a mesma cegueira pela outra porta: um recorte que emudecesse
   nele viraria verde silencioso. */
const CHAMADAS_ESPERADAS = { 'autofix.yml': 3, 'issues-bot.yml': 1, 'release.yml': 1 };
if (MUT === 'workflow-fora-do-registro') delete CHAMADAS_ESPERADAS['issues-bot.yml'];
if (MUT === 'registro-orfao') CHAMADAS_ESPERADAS['fantasma.yml'] = 1;
const WORKFLOWS = readdirSync('.github/workflows').filter((f) => /\.ya?ml$/.test(f));
/* Registro órfão é a régua jurando medir arquivo que não existe: se o workflow for
   renomeado ou removido, a entrada velha ficaria verde calada para sempre. */
for (const nome of Object.keys(CHAMADAS_ESPERADAS)) {
  if (!WORKFLOWS.includes(nome)) falhas.push(`AF7 CHAMADAS_ESPERADAS registra ${nome}, que não está em .github/workflows/ — renomeie ou remova o registro, senão a régua jura medir arquivo que não existe`);
}
for (const nome of WORKFLOWS) {
  let texto = nome === 'autofix.yml' ? wf : ler(`.github/workflows/${nome}`);
  if (MUT === 'bootstrap-sem-trailer' && nome === 'issues-bot.yml') texto = texto.replace(/\n\s*-m "Agent: csbrasil-bot \(issues-bot\)" \\/, '');
  if (MUT === 'release-sem-trailer' && nome === 'release.yml') texto = texto.replace(/ \\\n\s*-m "Agent: csbrasil-deploy-bot \(release\)"/, '');
  if (MUT === 'release-sem-signoff' && nome === 'release.yml') texto = texto.replace('git commit -s -m "chore(release)', 'git commit -m "chore(release)');
  const chamadas = recortarChamadas(texto);
  const esperado = CHAMADAS_ESPERADAS[nome] ?? 0;
  if (chamadas.length < esperado) {
    falhas.push(`AF7 o recorte achou ${chamadas.length} chamada(s) de \`git commit\`/\`git merge\` no ${nome}, e CHAMADAS_ESPERADAS registra ${esperado} — o recorte está cego: conserte a regex da AF7 (ou atualize o registro se uma chamada saiu de propósito) antes de confiar no verde`);
  }
  if (!esperado && chamadas.length) {
    falhas.push(`AF7 ${nome} faz \`git commit\`/\`git merge\` e não está em CHAMADAS_ESPERADAS — registre a contagem, senão um recorte que ficar cego neste arquivo vira verde silencioso`);
  }
  for (const trecho of chamadas) {
    if (!/Agent:/.test(trecho)) falhas.push(`AF7 um \`git commit\`/\`git merge\` do ${nome} não leva \`Agent:\` — o agente_check reprova a PR que a própria máquina tocou (#406, #450, #451)`);
    /* `-s` vale como Signed-off-by SÓ depois de `git commit`: o git grava o trailer com
       a identidade configurada no passo. É o que o release.yml usa, porque o e-mail
       daquela identidade vem de secret/var (BOT_GIT_EMAIL) — grafá-lo na mensagem
       congelaria o valor no YAML. A âncora em `git commit` é de propósito: em
       `git merge`, `-s` é ESTRATÉGIA (`-s ours`), e `[ -s arquivo ]` é o operador de
       teste do shell — os dois passariam por signoff num recorte que só visse ` -s `. */
    if (!/Signed-off-by:/.test(trecho) && !/git commit[^\n]*\s-s\s/.test(trecho)) falhas.push(`AF7 um \`git commit\`/\`git merge\` do ${nome} não leva \`Signed-off-by:\` nem \`git commit … -s\` — o dco reprova o commit que a máquina fez`);
  }
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
