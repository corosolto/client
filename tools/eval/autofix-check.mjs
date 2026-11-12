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
   AF4 · merge automático só existe no job `automerge`, depois de
         `check_automerge.py` no MESMO job, por merge commit, `--match-head-commit` e sem apagar `staging` (decisão do dono,
         09/11/2026, substituindo a espera humana de 21/08). Qualquer outro workflow,
         squash ou chamada fora da guarda continua proibido.
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
   AF8 · a base só sobe para o PR quando faz falta. Medido em 13/10: o bot trazia a
         main para todo PR atrasado, mesmo sem conflito (58 merges num dia, 18% dos
         minutos de CI), e cada merge reinicia o CI inteiro do PR. A varredura dispara
         só para `CONFLICTING`, depois de esperar o GitHub calcular o `mergeable`. No
         job, merge limpo fica SÓ LOCAL (não acende `mesclou`): os geradores rodam na
         árvore mesclada e ele só sobe se a regeneração mudar algo. É o cenário A/B:
         dois PRs somam 1 à mesma contagem, A entra, o merge de B junta limpo com o
         número errado, e B fica vermelho MERGEABLE, fora do alcance da varredura.
   AF5 · o resolvedor de conflito passa pela MESMA trava e ABORTA quando sobra
         conflito fora dela. Resolver conflito de arquivo gerado é mecânico (todo
         `chore(release)` reabre um em cada PR aberto); resolver conflito de código
         é julgamento. Sem o `git merge --abort` no caminho de exceção, o bot
         resolveria código escolhendo um lado no escuro.

   Uso: node tools/eval/autofix-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { gatilhoDe, gatilhosDe, ifDe, jobsDe, parseWorkflow, passosDe, runDe } from './workflow-yaml.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  'autofix-sem-trava': 'AF1',
  'lista-abre-codigo': 'AF2',
  'lista-abre-workflow': 'AF2',
  'autofix-mergeia': 'AF3',
  'automerge-volta': 'AF4',
  'automerge-fora-ordem': 'AF4',
  'automerge-cheque-outro-job': 'AF4',
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
  'varredura-dispara-atrasado': 'AF8',
  'varredura-sem-espera': 'AF8',
  'merge-limpo-commita': 'AF8',
  'merge-limpo-descartado': 'AF8',
  'push-sem-trava': 'AF8',
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const falhas = [];
const estrutura = (nome, texto, clausula) => {
  try {
    return parseWorkflow(texto, nome);
  } catch (error) {
    falhas.push(`${clausula} ${error.message}`);
    return null;
  }
};

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
const workflowAf6 = estrutura('autofix.yml', wf, 'AF6');
const push = gatilhoDe(workflowAf6, 'push');
const temPush = gatilhosDe(workflowAf6).includes('push')
  && Array.isArray(push?.branches) && push.branches.includes('main');
const temVarredura = /github\.event_name == 'push'/.test(ifDe(jobsDe(workflowAf6).varredura));
const filtraAtrasado = /"CONFLICTING"/.test(wf) && /gh workflow run autofix\.yml/.test(wf);
if (!temPush) falhas.push('AF6 autofix.yml não acorda quando a main anda — PR parado esperando revisão nunca é consertado');
else if (!temVarredura) falhas.push('AF6 o gatilho de push existe mas não há job de varredura');
else if (!filtraAtrasado) falhas.push('AF6 a varredura não seleciona os PRs em conflito nem dispara o autofix de cada um');

/* ---- AF8: a base só entra quando há conflito ---- */
if (MUT === 'varredura-dispara-atrasado') wf = wf.replace(`awk '$2 == "CONFLICTING"`, `awk '$2 != "MERGEABLE"`);
if (MUT === 'varredura-sem-espera') wf = wf.replace(/\n\s*\[ "\$tentativa" = 4 \] \|\| sleep 30/, '');
/* merge-limpo-commita: o merge limpo volta a subir sempre (os 58 merges de 13/10).
   merge-limpo-descartado: o merge limpo é desfeito antes de regenerar (o cenário A/B).
   push-sem-trava: o push deixa de depender da trava ter achado regeneração. */
const AVISO_LIMPO = 'echo "Sem conflito com a base: merge só local; sobe apenas se a regeneração mudar algo."';
if (MUT === 'merge-limpo-commita') wf = wf.replace(AVISO_LIMPO, `${AVISO_LIMPO}\n            echo "mesclou=1" >> "$GITHUB_OUTPUT"`);
if (MUT === 'merge-limpo-descartado') wf = wf.replace(AVISO_LIMPO, `git reset -q --hard 'HEAD@{1}'\n            ${AVISO_LIMPO}`);
if (MUT === 'push-sem-trava') wf = wf.replace("(steps.trava.outputs.commitar == '1' || steps.merge.outputs.mesclou == '1') && env.PODE_EDITAR == 'true'", "env.PODE_EDITAR == 'true'");
{
  const workflowAf8 = estrutura('autofix.yml', wf, 'AF8');
  const jobs = jobsDe(workflowAf8);
  const varredura = passosDe(jobs.varredura).map(runDe).join('\n');
  /* Quem dispara é a linha ANTES do `gh workflow run`; o que vale é o filtro final,
     não a listagem (a listagem tem de enxergar UNKNOWN para saber se espera). */
  const filtro = varredura.slice(0, varredura.indexOf('gh workflow run'));
  if (!/\$2 == "CONFLICTING"|\.mergeable == "CONFLICTING"/.test(filtro)) {
    falhas.push('AF8 a varredura não filtra só `CONFLICTING` — PR só atrasado ganha merge da base e CI inteiro à toa');
  }
  if (/!= "MERGEABLE"|\$2 != /.test(filtro)) {
    falhas.push('AF8 a varredura dispara para quem não está MERGEABLE (inclui UNKNOWN e atraso sem conflito)');
  }
  if (!/UNKNOWN/.test(filtro) || !/sleep \d+/.test(filtro)) {
    falhas.push('AF8 a varredura não espera o GitHub calcular o `mergeable` antes de escolher quem dispara');
  }
  const merge = runDe(passosDe(jobs.autofix).find((passo) => passo.id === 'merge'));
  const tentativa = /if git merge[^\n]*(?:\\\n[^\n]*)*FETCH_HEAD; then\n([\s\S]*?)\n\s*fi\n/.exec(merge);
  if (!tentativa) {
    falhas.push('AF8 não achei o caminho do merge limpo no passo `id: merge` — a régua ficou cega');
  } else {
    if (/mesclou=1/.test(tentativa[1])) {
      falhas.push('AF8 merge limpo acende `mesclou` — a base sobe para todo PR atrasado, mesmo sem nada a regenerar');
    }
    if (/--abort|reset[^\n]*--hard|--no-commit/.test(tentativa[0])) {
      falhas.push('AF8 merge limpo é desfeito antes dos geradores — no cenário A/B a árvore mesclada fica com a contagem errada e o PR vermelho');
    }
  }
  const push = ifDe(passosDe(jobs.autofix).find((passo) => passo.name === 'Empurra o conserto'));
  if (!push.includes("steps.trava.outputs.commitar == '1'")) {
    falhas.push('AF8 o push do autofix não depende da trava ter achado regeneração — merge limpo local subiria sem motivo');
  }
}

/* ---- AF4: merge só no automerge, depois da guarda e por merge commit ---- */
const MERGE = /\bgh\s+pr\s+merge\b|['"]gh['"]\s*,\s*['"]pr['"]\s*,\s*['"]merge['"]|\bgh\s+api\b(?=[\s\S]*(?:\/pulls\/[\s\S]*\/merge\b|\bmergePullRequest\b))|['"]gh['"]\s*,\s*['"]api['"](?=[\s\S]*(?:\/pulls\/[\s\S]*\/merge\b|\bmergePullRequest\b))|\bautomerge_merge\.py(?!\s+--selftest)\b|\bscripts\.ci\.automerge_merge\b/gi;
const chamadasMerge = (texto) => {
  /* Comentários não executam; todo o resto continua suspeito até ser classificado.
     Em particular, não descartamos `gh pr merge` direto no shell: o YAML estrutura
     ONDE ele roda, mas só o recorte conservador do comando prova seus argumentos. */
  const executavel = texto.split('\n').filter((linha) => !/^\s*#/.test(linha)).join('\n').replace(/\\\n\s*/g, ' ');
  let resolvido = executavel;
  for (const assignment of executavel.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:\:\s*[^=\r\n]+)?\s*=\s*[A-Za-z]*(?:'([^'\r\n]*(?:\/pulls\/[^'\r\n]*\/merge|\bmergePullRequest\b)[^'\r\n]*)'|"([^"\r\n]*(?:\/pulls\/[^"\r\n]*\/merge|\bmergePullRequest\b)[^"\r\n]*)")/gm)) {
    const nome = assignment[1];
    const endpoint = assignment[2] ?? assignment[3];
    resolvido = resolvido.replace(new RegExp(`\\$\\{${nome}\\}|\\$${nome}\\b|\\b${nome}\\b`, 'g'), endpoint);
  }
  return [...resolvido.matchAll(MERGE)].map((match) => {
    const restante = resolvido.slice(match.index, resolvido.indexOf('\n', match.index) < 0 ? undefined : resolvido.indexOf('\n', match.index));
    const separador = restante.search(/;|&&|\|\|/);
    const comando = restante.slice(0, separador < 0 ? undefined : separador);
    return { pos: match.index, comando, executavel: resolvido };
  });
};
for (const nome of WORKFLOWS) {
  let texto = ler(`.github/workflows/${nome}`);
  if (MUT === 'automerge-volta' && nome === 'csbrasil-bot-automerge.yml') {
    texto += "\n          subprocess.run(['gh', 'pr', 'merge', pr, '--squash', '--auto'])\n";
  }
  const decisao = 'python3 scripts/ci/check_automerge.py < /tmp/automerge.json > /tmp/automerge-result.json';
  if (MUT === 'automerge-fora-ordem' && nome === 'csbrasil-bot-automerge.yml') {
    texto = texto.replace(decisao, '').replace('          python3 scripts/ci/automerge_merge.py\n', `          python3 scripts/ci/automerge_merge.py\n          ${decisao}\n`);
  }
  if (MUT === 'automerge-cheque-outro-job' && nome === 'csbrasil-bot-automerge.yml') {
    texto = texto.replace(decisao, '');
    texto += `\n  unrelated:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps:\n      - run: ${decisao}\n`;
  }
  const todas = chamadasMerge(texto);
  if (!todas.length) continue;
  const workflow = estrutura(nome, texto, 'AF4');
  if (!workflow) continue;
  let estruturadas = 0;
  for (const [jobId, job] of Object.entries(jobsDe(workflow))) {
    const passos = passosDe(job);
    for (const [indice, passo] of passos.entries()) {
      const run = runDe(passo);
      for (const chamada of chamadasMerge(run)) {
        estruturadas += 1;
        const decisaoAntes = passos.slice(0, indice).some((anterior) => {
          const condicao = ifDe(anterior);
          const condicaoMerge = ifDe(passo);
          const pulada = anterior.if === false || /^(?:\$\{\{\s*)?false(?:\s*\}\})?$/.test(condicao)
            || anterior['continue-on-error'] === true || /\bif\s+false\b/.test(runDe(anterior));
          const executavel = anterior.name === 'Check eligibility'
            && runDe(anterior).trim() === `python3 scripts/ci/check_automerge.py --selftest\n${decisao}`;
          return !pulada && executavel && (!condicao || condicao === condicaoMerge);
        });
        const mergeCanonico = passo.name === 'Merge when eligible'
          && run.trim() === 'python3 scripts/ci/automerge_merge.py --selftest\npython3 scripts/ci/automerge_merge.py'
          && chamadasMerge(run).length === 1;
        if (nome !== 'csbrasil-bot-automerge.yml' || jobId !== 'automerge'
            || !decisaoAntes || !mergeCanonico) {
          falhas.push(`AF4 ${nome} · job ${jobId}: merge fora do job automerge, antes de check_automerge.py no MESMO job, sem --merge ou sem --match-head-commit head_oid`);
        }
      }
    }
  }
  /* Um merge fora de um passo `run` sob `jobs` não pode ser classificado como seguro.
     A comparação também impede que uma forma YAML nova desapareça da régua silenciosamente. */
  if (estruturadas !== todas.length) {
    falhas.push(`AF4 ${nome}: ${todas.length - estruturadas} chamada(s) de merge fora de um passo run estruturado — comando não comprovadamente seguro`);
  }
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m AF escrita limitada e merge somente no automerge guardado');
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
