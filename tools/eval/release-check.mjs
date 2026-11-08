#!/usr/bin/env node
/*
 * BUG-40 (09/08): o Release alpha.47 saiu como "CORO SOLTO" e as notas feitas
 * de `git log --oneline` não ligaram o PR #119 a @EmersonGarrido. O GitHub
 * documenta que `--generate-notes` inclui PRs e contribuidores; esta régua cobra
 * isso em todo caminho que chama `gh release create`.
 *
 * RLS3: o alpha.56 entrou sem trailer; cobra DCO em todo commit automático de release.
 *
 * RLS4: o bump reconstrói e versiona o site estático de documentação.
 *
 * RLS5: uma falha do release local restaura os arquivos antes de sair.
 *
 * RLS6: release não dispara um segundo deploy; o fallback fica manual.
 * RLS8: o push do bot não cancela o run que ainda publica o Release e avisa o backend.
 * RLS9: TREM DE RELEASE (13/10/2026). Produção só builda em commit `chore(release):`
 *       (vercel.json → ignoreCommand → scripts/ci/vercel-ignore.sh, executado aqui de
 *       verdade com as três mensagens que importam). 126 releases em 130 merges era o motor
 *       do churn de bot; desde 14/10 o push na main só vira release se for de lote (RLS13/14).
 *
 * RLS10: GERADO VELHO NÃO TRAVA O TREM (13/10/2026, c2ca685). Dois PRs testados sobre bases
 *       diferentes mesclam limpo e deixam contagem velha na main; com o DOCS1 reprovando o push,
 *       o embarque (que exige pr-fast verde) nunca saía, e o trem é quem regenera. No push da
 *       main, docs:check, arch:check e a autoria só rodam no commit `chore(release):`; no PR
 *       docs:check e arch:check continuam valendo sempre (desde 14/10 só a estrutura; o commit
 *       do release confere tudo com docs:check:release e arch:check:release).
 *
 * RLS11-RLS16: RELEASE EM LOTE (14/10/2026, decisão do dono). Horário fixo travava o
 *       desenvolvimento; o trem sai quando entra na main um PR de LOTE (label `release`, ou
 *       branch `lote-*`, `claude/lote-*` ou `<qualquer>/lote-*`) ou por workflow_dispatch. O passo que
 *       decide roda DE VERDADE aqui, com um `gh` falso que devolve PRs de mentira pelo jq.
 *       RLS11 sem cron · RLS12 workflow_dispatch · RLS13 dispara no merge de lote ·
 *       RLS14 não dispara em PR comum (nem PR aberto, nem label parecida; push sem PR avisa) · RLS8 concurrency
 *       nos jobs que embarcam, com grupo que só é `release-main` quando o lote sai, nunca no
 *       topo; o bump em grupo próprio (`release-bump`) e nunca cancelável · RLS15 anti-loop do commit do bot ·
 *       RLS16 head.ref do PR é dado, não código (sem `${{ }}` no shell, permissão de leitura).
 *
 * RLS17: PUSH DO TREM COM RETRY LIMITADO, SÓ SOBRE SHA VERDE (14/10/2026). Às 21:46 de 13/10
 *       o run morreu em `! [rejected] main -> main (fetch first)`: o #857 entrou entre o rebase
 *       e o push. O push agora fica num laço de N tentativas (2 <= N <= 10, sem `while true`),
 *       cada uma refaz o bump (fetch + reset + regeneração: conflito de gerado não existe), com
 *       backoff, `--atomic`, nunca `--force`, e a última falha sai com erro. E o bump publica
 *       só o SHA que o embarque viu verde (`needs.embarque.outputs.sha`): se a main andou, a
 *       cabeça nova só serve depois de o pr-fast DELA terminar verde, dentro de um prazo; senão
 *       sai com ::error:: e nada é publicado.
 *       A função `pr_fast_verde` roda DE VERDADE aqui, com `gh`, `date` e `sleep` falsos: verde
 *       só com `"completed success"` do run de push DAQUELE commit (`--commit "$1" --event
 *       push`), qualquer outro `completed*` é vermelho, e sem resposta ela desiste no prazo.
 *       O prazo cabe no `timeout-minutes` do job, e cabeça que já é `chore(release):` aborta.
 *
 * RLS18: LOTE JÁ TESTADO EMBARCA NA HORA (07/11/2026, pedido do dono). O embarque esperava até
 *       25 min o pr-fast do push do merge do lote, que repete os checks que o PR de lote acabou
 *       de passar; se ele passasse de 25 min o trem nem saía. Agora `verde_por_lote` aceita a head
 *       sem esperar quando ela é merge de 2 pais, com a MESMA árvore do pai 2, e há run do ci.yml
 *       `completed success` com head_sha = pai 2. Qualquer condição falha = espera o push como
 *       antes. O passo `verde` do embarque roda DE VERDADE aqui (`gh` falso que responde commits e
 *       runs de uma fixture via jq, `sleep` que só conta): lote testado sai com 0 sonecas e o SHA
 *       do merge; árvore diferente, ci do pai 2 vermelho/ausente/no ar, head de 1 ou 3 pais caem
 *       na espera; sem push verde não sai; head `chore(release):` não sai. O bump usa CÓPIA
 *       IDÊNTICA da função antes do `pr_fast_verde` quando a main anda (RLS17 continua: só SHA verde).
 *
 * Mutações: --mutante=nome-antigo | semcreditos | semdco | semdocs | semrollback | deploy-duplo | deploy-yaml | sem-anims-deploy | cancelar-bot | ignora-sem-filtro | gerado-trava-trem | gerado-fora-do-pr | release-confere-so-estrutura | release-sem-modo | autoria-trava-trem | autoria-desligada | release-sem-arch | cron-de-volta | sem-dispatch | lote-ignorado | sem-rotulo | sem-filtro-lote | qualquer-merge | pr-aberto | concurrency-no-topo | sem-concurrency | grupo-sem-portao | bump-cancelavel | bump-mesmo-grupo | sem-aviso | loop | injecao | sem-retry | retry-infinito | push-forcado | publica-sem-conferir | sha-solto | falha-vira-verde | funcao-curta | sem-commit | cabeca-release-segue | prazo-longo | lote-sem-arvore | lote-sem-ci | lote-desligado.
 */
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1];
const arquivos = ['.github/workflows/release.yml', '.github/workflows/ci.yml'];
let workflowRelease = readFileSync('.github/workflows/release.yml', 'utf8');
let workflowDeploy = readFileSync('.github/workflows/deploy-prod.yml', 'utf8');
let workflowSources = readdirSync('.github/workflows')
  .filter((arquivo) => /\.ya?ml$/.test(arquivo))
  .map((arquivo) => [arquivo, readFileSync(`.github/workflows/${arquivo}`, 'utf8')]);
const workflowsProd = () => workflowSources
  .filter(([, source]) => /vercel\s+deploy[\s\S]{0,240}?--prod/.test(source))
  .map(([arquivo]) => arquivo);
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
let scriptRelease = readFileSync('scripts/release.mjs', 'utf8');
let comandos = arquivos.flatMap((arquivo) => readFileSync(arquivo, 'utf8')
  .split('\n')
  .filter((linha) => /(?:^\s*|run:\s*)gh release create/.test(linha))
  .map((linha) => ({ arquivo, linha })));
let commitsRelease = workflowRelease
  .split('\n')
  .filter((linha) => /^\s*git commit(?:\s|$)/.test(linha));
commitsRelease.push(...scriptRelease
  .split('\n')
  .filter((linha) => /(?:spawnSync|roda)\(['"]git['"],\s*\[['"]commit['"]/.test(linha)));

const temDco = (linha) =>
  /(?:^|\s)(?:-s|--signoff)(?=\s|$)/.test(linha)
  || /['"](?:-s|--signoff)['"]/.test(linha);
let docsRelease = [
  workflowRelease.includes('npm run build:site') && /git add[^\n]*public\/docs/.test(workflowRelease),
  scriptRelease.includes("'build:site'")
    && /ARQUIVOS_RELEASE\s*=\s*\[[\s\S]*?'public\/docs'/.test(scriptRelease)
    && /roda\('git', \['add', \.\.\.ARQUIVOS_RELEASE\]\)/.test(scriptRelease),
];
let rollbackRelease = /const desfazRelease\s*=/.test(scriptRelease)
  && /update-ref', 'HEAD'/.test(scriptRelease)
  && /git', \['restore'/.test(scriptRelease)
  && /git', \['clean'/.test(scriptRelease)
  && /catch \(erro\)[\s\S]*desfazRelease\(/.test(scriptRelease);
const gatilhos = (workflow) => {
  const linhas = workflow.split('\n');
  const inicio = linhas.findIndex((linha) => linha.trim() === 'on:');
  if (inicio < 0) return [];
  const bloco = [];
  for (let i = inicio + 1; i < linhas.length && (linhas[i] === '' || /^\s/.test(linhas[i])); i++) bloco.push(linhas[i]);
  return bloco.flatMap((linha) => linha.match(/^  ([\w-]+):/)?.slice(1) || []);
};
const validaCaminhoProd = () => {
  const eventos = gatilhos(workflowDeploy);
  return vercel.git?.deploymentEnabled?.main === true
    && eventos.length === 1
    && eventos[0] === 'workflow_dispatch'
    && workflowsProd().length === 1
    && workflowsProd()[0] === 'deploy-prod.yml'
    && /^permissions:\n  contents: read\s*$/m.test(workflowDeploy)
    && /^concurrency:\n  group: deploy-prod\n  cancel-in-progress: false\s*$/m.test(workflowDeploy)
    && /^\s+ref:\s*refs\/tags\/\$\{\{\s*github\.event\.inputs\.tag\s*\}\}\s*$/m.test(workflowDeploy);
};
let caminhoProdUnico = validaCaminhoProd();
let animacoesNoDeploy = /(?:^|\s)anims:check(?:\s|$)/.test(packageJson.scripts['check:deploy'] || '')
  && /(?:^|\s)anims:merge:check(?:\s|$)/.test(packageJson.scripts['check:deploy'] || '');
/* RLS8 — com o gatilho em todo push da main, concurrency no TOPO deixaria o merge de um PR
   comum cancelar o lote que espera o pr-fast. O grupo vive nos dois jobs que embarcam. */
const CONCORRENCIA_JOB = (porta) => `    concurrency:\n      group: \${{ needs.${porta}.outputs.sai == 'true' && 'release-main' || format('release-fora-{0}', github.run_id) }}\n      cancel-in-progress: \${{ !startsWith(github.event.head_commit.message, 'chore(release):') }}\n`;
/* O bump NÃO divide grupo com o embarque e NUNCA é cancelado: embarque novo cancelando bump
   velho no meio do push/tag/Release deixava tag sem Release e backend sem aviso. */
const CONCORRENCIA_BUMP = "    concurrency:\n      group: ${{ needs.embarque.outputs.sai == 'true' && 'release-bump' || format('release-fora-{0}', github.run_id) }}\n      cancel-in-progress: false\n";
const blocoJob = (nome) => new RegExp(`^  ${nome}:\\n((?:(?: {4}[^\\n]*)?\\n)*)`, 'm').exec(workflowRelease)?.[1] || '';
const validaConcorrenciaRelease = () => !/^concurrency:/m.test(workflowRelease)
  && blocoJob('embarque').includes(CONCORRENCIA_JOB('lote'))
  && blocoJob('bump-tag-release').includes(CONCORRENCIA_BUMP);
let concorrenciaRelease = validaConcorrenciaRelease();

/* RLS9 — o filtro roda de verdade: o que importa é o código de saída que a Vercel vê. */
let scriptIgnora = (() => { try { return readFileSync('scripts/ci/vercel-ignore.sh', 'utf8'); } catch { return ''; } })();
const saidaIgnora = (env, msg) => spawnSync('bash', ['-c', scriptIgnora], {
  env: { PATH: process.env.PATH, VERCEL_ENV: env, VERCEL_GIT_COMMIT_MESSAGE: msg }, encoding: 'utf8',
}).status;
const validaTrem = () => {
  const comandoOk = vercel.ignoreCommand === 'bash scripts/ci/vercel-ignore.sh';
  const filtroOk = scriptIgnora !== ''
    && saidaIgnora('production', 'chore(release): v9.9.9-alpha.1') === 1   // release builda
    && saidaIgnora('production', 'feat: qualquer merge') === 0             // merge espera o trem
    && saidaIgnora('preview', 'feat: qualquer PR') === 1;                  // preview não muda
  const esperaVerde = /gh run list[^\n]*--workflow ci\.yml/.test(workflowRelease) && /needs: embarque/.test(workflowRelease);
  return comandoOk && filtroOk && esperaVerde;
};
let tremRelease = validaTrem();

/* RLS10 — gerado confere no PR sempre (só estrutura) e, no push, só no commit do release (inteiro). */
let workflowCi = readFileSync('.github/workflows/ci.yml', 'utf8');
const SO_PR = "if: github.event_name != 'push'";
/* Igualdade EXATA, não "contém": `if: false && startsWith(...)` contém o startsWith e
   desliga a conferência de vez; sem o `event_name == 'push'` o job roda onde não deve. */
const AUTORIA_SO_RELEASE = "if: github.event_name == 'push' && startsWith(github.event.head_commit.message, 'chore(release):')";
const validaGerados = () => {
  const passo = (script) => new RegExp(`- name: [^\\n]+\\n\\s+(if: [^\\n]+)\\n\\s+run: npm run ${script}\\n`).exec(workflowCi)?.[1];
  const autoria = /^  autoria-na-main:\n    (if: [^\n]+)$/m.exec(workflowCi)?.[1] || '';
  return passo('docs:check') === SO_PR
    && passo('arch:check') === SO_PR
    && passo('docs:check:release') === AUTORIA_SO_RELEASE
    && passo('arch:check:release') === AUTORIA_SO_RELEASE
    && autoria === AUTORIA_SO_RELEASE
    && /node tools\/gen-docs\.mjs --release\b/.test(workflowRelease)
    && /node tools\/gen-arch\.mjs --release\b/.test(workflowRelease);
};
let geradosNoTrem = validaGerados();

/* RLS11-RLS16 — release em lote. O script do job `lote` é extraído do YAML e executado com
   um `gh` falso (aplica o --jq do workflow num JSON de PRs) e um `sleep` mudo. */
const ANTI_LOOP = "if: github.event_name == 'workflow_dispatch' || !startsWith(github.event.head_commit.message, 'chore(release):')";
const scriptLote = () => {
  const job = blocoJob('lote');
  const m = /\n      - name: [^\n]*\n        id: lote\n[\s\S]*?\n        run: \|\n((?:          [^\n]*\n|\n)+)/.exec(job);
  return m ? m[1].split('\n').map((l) => l.slice(10)).join('\n') : '';
};
const pr = (head, { rotulos = [], merged = true, base = 'main', numero = 900 } = {}) => [{
  number: numero, merged_at: merged ? '2026-10-14T12:00:00Z' : null, base: { ref: base },
  head: { ref: head }, labels: rotulos.map((name) => ({ name })),
}];
const temJq = spawnSync('jq', ['--version']).status === 0;
const simulaLote = (evento, prs) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rls-lote-'));
  try {
    writeFileSync(path.join(dir, 'prs.json'), JSON.stringify(prs));
    writeFileSync(path.join(dir, 'gh'), '#!/bin/sh\n# gh api <url> --jq <filtro>\n[ "$3" = --jq ] || exit 9\nexec jq -r "$4" "$FIXTURE"\n', { mode: 0o755 });
    writeFileSync(path.join(dir, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    const saida = path.join(dir, 'out');
    writeFileSync(saida, '');
    const r = spawnSync('bash', ['-e', '-c', scriptLote()], {
      cwd: dir, encoding: 'utf8',
      env: { PATH: `${dir}:${process.env.PATH}`, FIXTURE: path.join(dir, 'prs.json'), GITHUB_OUTPUT: saida,
        GH_TOKEN: 'x', REPO: 'corosolto/client', EVENTO: evento, SHA: 'f'.repeat(40) },
    });
    const sai = /^sai=(\w+)$/m.exec(readFileSync(saida, 'utf8'))?.[1];
    return { sai, executou: existsSync(path.join(dir, 'PWNED')), status: r.status, stdout: r.stdout };
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
const LOTES = [
  ['label release', pr('feat/qualquer', { rotulos: ['release'] })],
  ['lote-*', pr('lote-20261014')],
  ['claude/lote-*', pr('claude/lote-final-20261013')],
  ['*/lote-*', pr('ruben/lote-tarde')],
];
const COMUNS = [
  ['branch comum', pr('feat/account-provider-icons')],
  ['label parecida', pr('fix/x', { rotulos: ['target:release'] })],
  ['lote no meio do nome', pr('claude/fix-lote-x')],
  ['lotes-*', pr('lotes-antigos')],
  ['PR de lote ainda aberto', pr('lote-20261014', { merged: false })],
  ['PR de lote para outra base', pr('lote-20261014', { base: 'staging' })],
];
const validaLote = () => {
  const eventos = gatilhos(workflowRelease);
  const push = /^  push:\n    branches: \[main\]\n/m.test(workflowRelease);
  const embarqueEspera = /^  embarque:\n    needs: lote\n    if: needs\.lote\.outputs\.sai == 'true'\n/m.test(workflowRelease);
  const roda = temJq && scriptLote() !== '';
  const motivo = [temJq ? '' : 'jq ausente no PATH', scriptLote() ? '' : 'passo `lote` não achado no release.yml'].filter(Boolean);
  const falhasLote = roda ? LOTES.filter(([, prs]) => simulaLote('push', prs).sai !== 'true').map(([n]) => n) : motivo;
  const falhasComum = roda ? COMUNS.filter(([, prs]) => simulaLote('push', prs).sai !== 'false').map(([n]) => n) : motivo;
  const dispatchSai = roda && simulaLote('workflow_dispatch', []).sai === 'true';
  const injecao = roda ? simulaLote('push', pr('lote-$(touch PWNED)')) : { executou: true };
  const semPr = roda ? simulaLote('push', []) : {};
  const avisaSemPr = semPr.sai === 'false' && /^::warning::push \S+ na main sem PR/m.test(semPr.stdout || '');
  const job = blocoJob('lote');
  return {
    semCron: !eventos.includes('schedule') && !/^\s*-\s*cron:/m.test(workflowRelease),
    dispatch: eventos.includes('workflow_dispatch') && dispatchSai,
    disparaLote: push && embarqueEspera && falhasLote.length === 0,
    naoDisparaComum: push && embarqueEspera && falhasComum.length === 0 && avisaSemPr
      && eventos.every((e) => ['push', 'workflow_dispatch'].includes(e)),
    antiLoop: job.split('\n')[0].trim() === ANTI_LOOP
      && /git log -1 --format=%s \| grep -q '\^chore\(release\):'/.test(workflowRelease),
    seguro: roda && !injecao.executou && injecao.sai === 'true'
      && !/\$\{\{/.test(scriptLote())
      && /\n    permissions:\n      contents: read\n      pull-requests: read\n    outputs:/.test(job),
    falhasLote, falhasComum: avisaSemPr || !roda ? falhasComum : [...falhasComum, 'push sem PR não avisou'],
  };
};
let lote = validaLote();

/* RLS17 — o push do trem tenta de novo, com teto, sem force, e só sobre SHA com pr-fast verde. */
const validaRetry = () => {
  const linhas = workflowRelease.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const max = Number(/^\s*MAX_TENTATIVAS=(\d+)\s*$/m.exec(linhas)?.[1] || 0);
  const ini = linhas.search(/for tentativa in \$\(seq 1 "\$MAX_TENTATIVAS"\); do/);
  const laco = ini < 0 ? '' : linhas.slice(ini, linhas.indexOf('\n          done', ini));
  const embarque = blocoJob('embarque');
  const bump = blocoJob('bump-tag-release');
  const teto = Number(/^ {4}timeout-minutes:\s*(\d+)/m.exec(bump)?.[1] || 0);
  return max >= 2 && max <= 10
    && laco !== ''
    && !/while true|until /.test(linhas)
    && /git fetch origin main/.test(laco)
    && /node tools\/gen-docs\.mjs|refaz_bump/.test(laco)
    && /if git push --atomic origin main "refs\/tags\/\$NEW"; then/.test(laco)
    && /"\$tentativa" = "\$MAX_TENTATIVAS"[^\n]*\n[^\n]*::error::[^\n]*\n[^\n]*exit 1/.test(laco)
    && /sleep \$\(\(/.test(laco)
    && !/git push[^\n]*(--force|\s-f\s|\s\+refs|\s\+main)/.test(linhas)
    /* só SHA aprovado: o embarque exporta o SHA, o bump o recebe, reseta NELE e, se a main
       andou, reconfere o pr-fast da cabeça nova antes de adotá-la */
    && /^ {6}sha: \$\{\{ steps\.verde\.outputs\.sha \}\}/m.test(embarque)
    && /"completed success"\)[^\n]*sha=\$SHA/.test(embarque)
    && /APROVADO: \$\{\{ needs\.embarque\.outputs\.sha \}\}/.test(bump)
    && /^ {6}actions: read/m.test(bump)
    && /git reset --hard "\$APROVADO"/.test(laco) && !/git reset --hard origin\/main/.test(laco)
    && /if \[ "\$CABECA" != "\$APROVADO" \]; then[\s\S]*?if ! (?:verde_por_lote "\$CABECA" && ! )?pr_fast_verde "\$CABECA"; then\n[^\n]*::error::[^\n]*\n[^\n]*exit 1[\s\S]*?APROVADO=\$CABECA/.test(laco)
    && /PRAZO=/.test(bump) && teto > 0 && teto <= 30;
};
/* RLS17 (a conferência) — o corpo de `pr_fast_verde` é executado, não lido. O `gh` falso só
   responde o estado pedido quando a chamada traz `--commit <sha> --event push`; sem esse filtro
   devolve um run verde de OUTRO commit, que é exatamente o erro que a função não pode cometer. */
const SHA_TESTE = 'a'.repeat(40);
const trechoConferencia = () => {
  const linhas = workflowRelease.split('\n');
  const ini = linhas.findIndex((l) => /^\s*PRAZO=/.test(l));
  const def = linhas.findIndex((l, i) => i > ini && /^\s*pr_fast_verde\(\) \{\s*$/.test(l));
  if (ini < 0 || def < 0) return '';
  const recuo = linhas[def].match(/^\s*/)[0];
  const fim = linhas.findIndex((l, i) => i > def && l === `${recuo}}`);
  return fim < 0 ? '' : linhas.slice(ini, fim + 1).map((l) => l.replace(/^ {10}/, '')).join('\n');
};
const simulaConferencia = (estado) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rls-verde-'));
  try {
    writeFileSync(path.join(dir, 'gh'), `#!/bin/bash
c=""; e=""; p=""
for a in "$@"; do [ "$p" = --commit ] && c=$a; [ "$p" = --event ] && e=$a; p=$a; done
if [ "$c" = "${SHA_TESTE}" ] && [ "$e" = push ]; then echo "$ESTADO"; else echo "completed success"; fi
`, { mode: 0o755 });
    writeFileSync(path.join(dir, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    writeFileSync(path.join(dir, 'date'), '#!/bin/sh\nn=$(cat "$RELOGIO" 2>/dev/null || echo 1000000); n=$((n+60)); echo $n > "$RELOGIO"; echo $n\n', { mode: 0o755 });
    const r = spawnSync('bash', ['-c', `${trechoConferencia()}\npr_fast_verde ${SHA_TESTE}`], {
      cwd: dir, encoding: 'utf8', timeout: 20000,
      env: { PATH: `${dir}:${process.env.PATH}`, ESTADO: estado, RELOGIO: path.join(dir, 'relogio'), REPO: 'corosolto/client' },
    });
    return r.status;
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
const validaConferencia = () => {
  const bump = blocoJob('bump-tag-release');
  const teto = Number(/^ {4}timeout-minutes:\s*(\d+)/m.exec(bump)?.[1] || 0);
  const prazo = Number(/PRAZO=\$\(\( \$\(date \+%s\) \+ (\d+) \* 60 \)\)/.exec(bump)?.[1] || 0);
  const linhas = workflowRelease.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const ini = linhas.search(/for tentativa in \$\(seq 1 "\$MAX_TENTATIVAS"\); do/);
  const laco = ini < 0 ? '' : linhas.slice(ini, linhas.indexOf('\n          done', ini));
  const roda = trechoConferencia() !== '';
  const motivos = [];
  if (!roda) motivos.push('função pr_fast_verde não achada');
  else {
    if (simulaConferencia('completed success') !== 0) motivos.push('pr-fast verde do commit não conta como verde (ou o filtro --commit "$1" --event push sumiu)');
    for (const ruim of ['completed failure', 'completed cancelled', 'completed null']) {
      if (simulaConferencia(ruim) === 0) motivos.push(`\`${ruim}\` conta como verde`);
    }
    if (simulaConferencia('in_progress null') === 0) motivos.push('run que não termina conta como verde');
  }
  if (!(prazo > 0 && teto > 0 && prazo < teto)) motivos.push(`prazo de ${prazo} min não cabe no timeout de ${teto} min do job`);
  if (!/if \[ "\$CABECA" != "\$APROVADO" \]; then\n\s*case "\$\(git log -1 --format=%s "\$CABECA"\)" in\n\s*"chore\(release\):"\*\) echo "::error::[^\n]*exit 1 ;;/.test(laco)) {
    motivos.push('cabeça nova que já é `chore(release):` não aborta');
  }
  return motivos;
};
let conferencia = validaConferencia();
let retryRelease = validaRetry() && !conferencia.length;

/* RLS18 — o passo `verde` do embarque roda com um `gh` falso (commits e runs de uma fixture,
   filtros --commit/--event/--branch e --json/--jq aplicados como o gh) e um `sleep` que conta. */
const scriptEmbarque = () => {
  const m = /\n      - name: [^\n]*\n        id: verde\n[\s\S]*?\n        run: \|\n((?:          [^\n]*\n|\n)+)/.exec(blocoJob('embarque'));
  return m ? m[1].split('\n').map((l) => l.slice(10)).join('\n') : '';
};
const funcaoLote = (job) => {
  const linhas = blocoJob(job).split('\n');
  const def = linhas.findIndex((l) => /^\s*verde_por_lote\(\) \{\s*$/.test(l));
  if (def < 0) return '';
  const recuo = linhas[def].match(/^\s*/)[0];
  const fim = linhas.findIndex((l, i) => i > def && l === `${recuo}}`);
  return fim < 0 ? '' : linhas.slice(def, fim + 1).map((l) => l.slice(recuo.length)).join('\n');
};
const GH_FALSO = `#!/bin/bash
set -o pipefail
JQ=""; C=""; E=""; B=""; J=""; W=""; p=""
for a in "$@"; do
  case "$p" in --jq) JQ=$a ;; --commit) C=$a ;; --event) E=$a ;; --branch) B=$a ;; --json) J=$a ;; --workflow) W=$a ;; esac
  p=$a
done
sai() { if [ -n "$JQ" ]; then jq -r "$JQ"; else cat; fi; }
if [ "$1" = api ]; then
  case "$2" in repos/*/git/commits/*) G=1 ;; repos/*/commits/*) G=0 ;; *) exit 9 ;; esac
  jq -ec --arg s "$(basename "$2")" --argjson g "$G" '(if $s == "main" then .main else $s end) as $sha | .commits[$sha] as $c
    | if $c == null then error("gh: Not Found (HTTP 404)") else ([$c.parents[] | {sha: .}]) as $p
    | if $g == 1 then {sha: $sha, tree: {sha: $c.tree}, parents: $p, message: $c.message}
      else {sha: $sha, commit: {message: $c.message, tree: {sha: $c.tree}}, parents: $p} end end' "$FIXTURE" | sai
elif [ "$1 $2" = "run list" ] && [ "$W" = ci.yml ]; then
  V="$FIXTURE.vistas"; [ -f "$V" ] || echo '{}' > "$V"
  jq -c --slurpfile v "$V" --arg c "$C" --arg e "$E" --arg b "$B" --arg j "$J" '$v[0] as $vistas
    | [.runs | to_entries[] | select(($c == "" or .value.headSha == $c) and ($e == "" or .value.event == $e) and ($b == "" or .value.headBranch == $b))
       | (.key | tostring) as $k | (($vistas[$k] // 0) + 1) as $n
       | {k: $k, n: $n, r: (.value + (if $n <= (.value.pendentePor // 0) then {status: "in_progress", conclusion: null} else {} end))}]
    | (reduce .[] as $x ($vistas; .[$x.k] = $x.n)), [.[] | .r as $r | reduce ($j | split(",") | .[]) as $f ({}; .[$f] = $r[$f])]' "$FIXTURE" > "$V.novo" || exit 1
  sed -n 1p "$V.novo" > "$V"; sed -n 2p "$V.novo" | sai
else exit 9; fi
`;
const LOTE_M = 'e'.repeat(40), LOTE_P1 = '1'.repeat(40), LOTE_P2 = '2'.repeat(40);
const cenarioLote = ({ pais = [LOTE_P1, LOTE_P2], arvore = 'arv-lote', msg = 'Merge pull request #900 from corosolto/lote-x',
  ciLote = [['completed', 'success']], pushPendente = 2, semPush = false } = {}) => ({
  main: LOTE_M,
  commits: {
    [LOTE_M]: { message: msg, tree: arvore, parents: pais },
    [LOTE_P1]: { message: 'chore(release): v2.0.0-alpha.1', tree: 'arv-main', parents: ['0'.repeat(40)] },
    [LOTE_P2]: { message: 'lote', tree: 'arv-lote', parents: [LOTE_P1] },
  },
  runs: [
    ...ciLote.map(([status, conclusion]) => ({ headSha: LOTE_P2, event: 'pull_request', headBranch: 'lote-x', status, conclusion })),
    { headSha: LOTE_P1, event: 'push', headBranch: 'main', status: 'completed', conclusion: 'success' },
    ...(semPush ? [] : [{ headSha: LOTE_M, event: 'push', headBranch: 'main', status: 'completed', conclusion: 'success', pendentePor: pushPendente }]),
  ],
});
/* Um diretório para todos os cenários: executável novo por cenário custa caro no macOS. */
const simulaEmbarque = (fixture, dir) => {
  const f = path.join(dir, 'f.json'), saida = path.join(dir, 'out'), sonecas = path.join(dir, 'sonecas');
  writeFileSync(f, JSON.stringify(fixture));
  rmSync(`${f}.vistas`, { force: true });
  writeFileSync(saida, '');
  writeFileSync(sonecas, '');
  /* o shell padrão do Actions é `bash -eo pipefail` */
  const r = spawnSync('bash', ['-eo', 'pipefail', '-c', scriptEmbarque()], {
    cwd: dir, encoding: 'utf8', timeout: 60000,
    env: { PATH: `${dir}:${process.env.PATH}`, FIXTURE: f, SONECAS: sonecas, GITHUB_OUTPUT: saida, GH_TOKEN: 'x', REPO: 'corosolto/client' },
  });
  const out = readFileSync(saida, 'utf8');
  return {
    status: r.status, sai: /^sai=(\w+)$/m.exec(out)?.[1], sha: /^sha=(\S+)$/m.exec(out)?.[1],
    sonecas: readFileSync(sonecas, 'utf8').split('\n').filter(Boolean).length,
  };
};
const NA_HORA = (r) => r.status === 0 && r.sai === 'true' && r.sha === LOTE_M && r.sonecas === 0;
const ESPEROU = (r) => r.status === 0 && r.sai === 'true' && r.sha === LOTE_M && r.sonecas >= 1;
const NAO_SAI = (r) => r.status === 0 && r.sai === 'false' && !r.sha;
const CENARIOS_LOTE = [
  ['(a) lote testado embarca sem esperar', cenarioLote({ pushPendente: 99 }), NA_HORA],
  ['(a) run cancelado antes do verde no pai 2 não atrapalha', cenarioLote({ pushPendente: 99, ciLote: [['completed', 'cancelled'], ['completed', 'success']] }), NA_HORA],
  ['(b) árvore diferente do pai 2 espera o push', cenarioLote({ arvore: 'arv-misturada' }), ESPEROU],
  ['(b) árvore diferente sem push verde não sai', cenarioLote({ arvore: 'arv-misturada', semPush: true }), NAO_SAI],
  ['(c) ci vermelho no pai 2 espera o push', cenarioLote({ ciLote: [['completed', 'failure']] }), ESPEROU],
  ['(c) ci ausente no pai 2 espera o push', cenarioLote({ ciLote: [] }), ESPEROU],
  ['(c) ci no ar no pai 2 espera o push', cenarioLote({ ciLote: [['in_progress', null]] }), ESPEROU],
  ['(c) ci vermelho no pai 2 sem push verde não sai', cenarioLote({ ciLote: [['completed', 'failure']], semPush: true }), NAO_SAI],
  ['(d) head de 1 pai espera o push', cenarioLote({ pais: [LOTE_P1], arvore: 'arv-main' }), ESPEROU],
  ['(d) head de 3 pais espera o push', cenarioLote({ pais: [LOTE_P1, LOTE_P2, '3'.repeat(40)] }), ESPEROU],
  ['head chore(release) não sai', cenarioLote({ msg: 'chore(release): v2.0.0-alpha.2', pushPendente: 0 }), NAO_SAI],
];
const validaLoteVerde = () => {
  const motivos = [];
  const fn = funcaoLote('embarque');
  if (!temJq) return ['jq ausente no PATH'];
  if (!scriptEmbarque() || !fn) return ['passo `verde` ou função `verde_por_lote` do embarque não achados'];
  const dir = mkdtempSync(path.join(tmpdir(), 'rls-lote-verde-'));
  try {
    writeFileSync(path.join(dir, 'gh'), GH_FALSO, { mode: 0o755 });
    writeFileSync(path.join(dir, 'sleep'), '#!/bin/sh\necho z >> "$SONECAS"\n', { mode: 0o755 });
    for (const [nome, fixture, esperado] of CENARIOS_LOTE) {
      const r = simulaEmbarque(fixture, dir);
      if (!esperado(r)) motivos.push(`${nome} falhou (status ${r.status}, sai=${r.sai}, sha=${r.sha === LOTE_M ? 'merge' : r.sha}, ${r.sonecas} sonecas)`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  if (funcaoLote('bump-tag-release') !== fn) motivos.push('`verde_por_lote` do bump não é cópia idêntica da do embarque');
  const bump = blocoJob('bump-tag-release').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  if (!/if \[ "\$CABECA" != "\$APROVADO" \]; then[\s\S]*?if ! verde_por_lote "\$CABECA" && ! pr_fast_verde "\$CABECA"; then\n/.test(bump)) {
    motivos.push('o bump não confere `verde_por_lote` (com `pr_fast_verde` de reserva) quando a main anda');
  }
  return motivos;
};
let loteVerde = validaLoteVerde();

if (mutante) {
  const antes = JSON.stringify([comandos, commitsRelease, docsRelease, rollbackRelease, caminhoProdUnico, animacoesNoDeploy, concorrenciaRelease, tremRelease, geradosNoTrem, lote, retryRelease, conferencia, loteVerde]);
  const mutaRelease = (de, para) => {
    workflowRelease = workflowRelease.replace(de, para);
    concorrenciaRelease = validaConcorrenciaRelease();
    tremRelease = validaTrem();
    lote = validaLote();
  };
  if (mutante === 'nome-antigo') comandos[0].linha = comandos[0].linha.replace('"CSBR ', '"CORO SOLTO ');
  else if (mutante === 'semcreditos') comandos[0].linha = comandos[0].linha.replace(' --generate-notes', '');
  else if (mutante === 'semdco') {
    const i = commitsRelease.findIndex(temDco);
    if (i >= 0) commitsRelease[i] = commitsRelease[i]
      .replace(/\s(?:-s|--signoff)(?=\s|$)/, '')
      .replace(/['"](?:-s|--signoff)['"]\s*,?\s*/, '');
  }
  else if (mutante === 'semdocs') docsRelease[0] = false;
  else if (mutante === 'semrollback') rollbackRelease = false;
  else if (mutante === 'deploy-duplo') {
    workflowDeploy = workflowDeploy.replace('on:\n', 'on:\n  release:\n    types: [published]\n');
    caminhoProdUnico = validaCaminhoProd();
  }
  else if (mutante === 'deploy-yaml') {
    workflowSources.push(['segundo-deploy.yaml', 'steps:\n  - run: vercel deploy --prebuilt --prod']);
    caminhoProdUnico = validaCaminhoProd();
  }
  else if (mutante === 'sem-anims-deploy') animacoesNoDeploy = false;
  else if (mutante === 'cancelar-bot') mutaRelease(/^      cancel-in-progress: .*$/m, '      cancel-in-progress: true');
  else if (mutante === 'cron-de-volta') mutaRelease('on:\n', "on:\n  schedule:\n    - cron: '41 11 * * *'\n");
  else if (mutante === 'sem-dispatch') mutaRelease(/^  workflow_dispatch:\n/m, '');
  else if (mutante === 'lote-ignorado') mutaRelease(/e_lote\(\) \{.*\}$/m, 'e_lote() { return 1; }');
  else if (mutante === 'sem-rotulo') mutaRelease('.name == "release"', '.name == "lote"');
  else if (mutante === 'sem-filtro-lote') mutaRelease(/e_lote\(\) \{.*\}$/m, 'e_lote() { return 0; }');
  else if (mutante === 'qualquer-merge') mutaRelease("    needs: lote\n    if: needs.lote.outputs.sai == 'true'\n", '    needs: lote\n');
  else if (mutante === 'pr-aberto') mutaRelease('select(.merged_at != null and .base.ref == "main")', 'select(.base.ref == "main")');
  else if (mutante === 'concurrency-no-topo') mutaRelease('\npermissions:\n  contents: write\n', '\nconcurrency:\n  group: release-main\n  cancel-in-progress: true\n\npermissions:\n  contents: write\n');
  else if (mutante === 'sem-concurrency') mutaRelease(CONCORRENCIA_JOB('lote'), '');
  else if (mutante === 'bump-cancelavel') mutaRelease(/(group: \$\{\{ needs\.embarque[^\n]*\n      cancel-in-progress:) false/, '$1 true');
  else if (mutante === 'bump-mesmo-grupo') mutaRelease("'release-bump'", "'release-main'");
  else if (mutante === 'grupo-sem-portao') mutaRelease(/group: \$\{\{ needs\.lote\.outputs[^\n]*/, 'group: release-main');
  else if (mutante === 'sem-aviso') mutaRelease(/echo "::warning::push \$SHA na main sem PR[^\n]*/, ':');
  else if (mutante === 'loop') mutaRelease(ANTI_LOOP, 'if: always()');
  else if (mutante === 'injecao') mutaRelease('case "$2" in', 'eval "X=$2"; case "$2" in');
  else if (mutante === 'ignora-sem-filtro') {
    scriptIgnora = scriptIgnora.replace(/^exit 0$/m, 'exit 1');
    tremRelease = validaTrem();
  }
  else if (mutante === 'gerado-trava-trem') {
    workflowCi = workflowCi.replace(`${SO_PR}\n        run: npm run docs:check\n`, 'run: npm run docs:check\n');
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'gerado-fora-do-pr') {
    workflowCi = workflowCi.replace(`${SO_PR}\n        run: npm run arch:check\n`, "if: startsWith(github.event.head_commit.message, 'chore(release):')\n        run: npm run arch:check\n");
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'autoria-trava-trem') {
    workflowCi = workflowCi.replace(/^(  autoria-na-main:\n    if: github\.event_name == 'push').*$/m, '$1');
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'autoria-desligada') {
    workflowCi = workflowCi.replace(AUTORIA_SO_RELEASE, "if: false && startsWith(github.event.head_commit.message, 'chore(release):')");
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'release-confere-so-estrutura') {
    workflowCi = workflowCi.replace('run: npm run docs:check:release\n', 'run: npm run docs:check\n');
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'release-sem-modo') {
    workflowRelease = workflowRelease.replace(/node tools\/gen-docs\.mjs --release/g, 'node tools/gen-docs.mjs');
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'release-sem-arch') {
    workflowRelease = workflowRelease.replace(/node tools\/gen-arch\.mjs/g, 'true');
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'sem-retry') {
    workflowRelease = workflowRelease.replace(/^(\s*MAX_TENTATIVAS=)\d+/m, '$11');
    conferencia = validaConferencia(); retryRelease = validaRetry() && !conferencia.length;
  }
  else if (mutante === 'retry-infinito') {
    workflowRelease = workflowRelease.replace('for tentativa in $(seq 1 "$MAX_TENTATIVAS"); do', 'tentativa=0; while true; do tentativa=$((tentativa + 1))');
    conferencia = validaConferencia(); retryRelease = validaRetry() && !conferencia.length;
  }
  else if (mutante === 'push-forcado') {
    workflowRelease = workflowRelease.replace('git push --atomic origin main', 'git push --atomic --force origin main');
    conferencia = validaConferencia(); retryRelease = validaRetry() && !conferencia.length;
  }
  else if (mutante === 'publica-sem-conferir') {
    /* o defeito da primeira versão do retry: publica sobre a main que estiver lá */
    workflowRelease = workflowRelease.replace('git reset --hard "$APROVADO"', 'git reset --hard origin/main');
    conferencia = validaConferencia(); retryRelease = validaRetry() && !conferencia.length;
  }
  else if (mutante === 'sha-solto') {
    workflowRelease = workflowRelease.replace(/^ {10}APROVADO: \$\{\{ needs\.embarque\.outputs\.sha \}\}\n/m, '');
    conferencia = validaConferencia(); retryRelease = validaRetry() && !conferencia.length;
  }
  else if (['falha-vira-verde', 'funcao-curta', 'sem-commit', 'cabeca-release-segue', 'prazo-longo'].includes(mutante)) {
    const TROCAS = {
      'falha-vira-verde': [/(completed\*\)[^\n]*)return 1 ;;/, '$1return 0 ;;'],
      'funcao-curta': [/(pr_fast_verde\(\) \{\n)/, '$1            return 0\n'],
      'sem-commit': [/ --commit "\$1"/, ''],
      'cabeca-release-segue': [/\n\s*case "\$\(git log -1 --format=%s "\$CABECA"\)" in\n[^\n]*\n\s*esac/, ''],
      'prazo-longo': [/(PRAZO=\$\(\( \$\(date \+%s\) \+ )\d+/, '$1220'],
    };
    workflowRelease = workflowRelease.replace(...TROCAS[mutante]);
    conferencia = validaConferencia(); retryRelease = validaRetry() && !conferencia.length;
  }
  else if (['lote-sem-arvore', 'lote-sem-ci', 'lote-desligado'].includes(mutante)) {
    /* `g`: muta as DUAS cópias, para quem morder ser o cenário e não a comparação das cópias */
    const TROCAS = {
      'lote-sem-arvore': [/\n\s*\[ "\$ARV2" = "\$ARV" \] \|\| return 1/g, ''],
      'lote-sem-ci': [/\n\s*\[ "\$\{VERDES:-0\}" -gt 0 \] 2>\/dev\/null \|\| return 1/g, ''],
      'lote-desligado': [/(verde_por_lote\(\) \{\n)(\s*)/g, '$1$2return 1\n$2'],
    };
    workflowRelease = workflowRelease.replace(...TROCAS[mutante]);
    loteVerde = validaLoteVerde();
  }
  else throw new Error(`mutante desconhecido: ${mutante}`);
  if (JSON.stringify([comandos, commitsRelease, docsRelease, rollbackRelease, caminhoProdUnico, animacoesNoDeploy, concorrenciaRelease, tremRelease, geradosNoTrem, lote, retryRelease, conferencia, loteVerde]) === antes) throw new Error(`MUTANTE NAO APLICOU: ${mutante}`);
}

const nomes = comandos.filter(({ linha }) => /--title "CSBR \$/.test(linha)).length;
const creditos = comandos.filter(({ linha }) => linha.includes('--generate-notes')).length;
const total = comandos.length;
const dco = commitsRelease.filter(temDco).length;
const totalCommits = commitsRelease.length;
const docsOk = docsRelease.filter(Boolean).length;
const ok = total > 0 && nomes === total && creditos === total && totalCommits > 0 && dco === totalCommits && docsOk === docsRelease.length && rollbackRelease && caminhoProdUnico && animacoesNoDeploy && concorrenciaRelease && tremRelease && geradosNoTrem
  && lote.semCron && lote.dispatch && lote.disparaLote && lote.naoDisparaComum && lote.antiLoop && lote.seguro && retryRelease && !loteVerde.length;

console.log(`${nomes === total && total ? '✓' : '✗'} RLS1 título CSBR: ${nomes}/${total} caminhos`);
console.log(`${creditos === total && total ? '✓' : '✗'} RLS2 notas com contribuidores: ${creditos}/${total} caminhos`);
console.log(`${dco === totalCommits && totalCommits ? '✓' : '✗'} RLS3 commits automáticos com DCO: ${dco}/${totalCommits} caminhos`);
console.log(`${docsOk === docsRelease.length ? '✓' : '✗'} RLS4 site de docs reconstruído e versionado: ${docsOk}/${docsRelease.length} caminhos`);
console.log(`${rollbackRelease ? '✓' : '✗'} RLS5 falha local restaura a árvore de trabalho`);
console.log(`${caminhoProdUnico ? '✓' : '✗'} RLS6 produção tem um caminho automático e fallback manual`);
console.log(`${animacoesNoDeploy ? '✓' : '✗'} RLS7 deploy valida manifesto e GLBs mesclados de animação`);
console.log(`${concorrenciaRelease ? '✓' : '✗'} RLS8 embarque cancelável (lote novo cancela o velho), bump em grupo próprio e nunca cancelado, nada no topo`);
console.log(`${tremRelease ? '✓' : '✗'} RLS9 produção só sai no commit de release, e o release só sai com a main verde`);
console.log(`${geradosNoTrem ? '✓' : '✗'} RLS10 bloco gerado velho na main não trava o trem; o PR e o commit do release conferem`);
console.log(`${lote.semCron ? '✓' : '✗'} RLS11 sem cron: release não sai por horário`);
console.log(`${lote.dispatch ? '✓' : '✗'} RLS12 workflow_dispatch continua disparando o release`);
console.log(`${lote.disparaLote ? '✓' : '✗'} RLS13 merge de PR de lote dispara${lote.falhasLote.length ? ` (não disparou: ${lote.falhasLote.join(', ')})` : ''}`);
console.log(`${lote.naoDisparaComum ? '✓' : '✗'} RLS14 merge de PR comum não dispara${lote.falhasComum.length ? ` (disparou: ${lote.falhasComum.join(', ')})` : ''}`);
console.log(`${lote.antiLoop ? '✓' : '✗'} RLS15 commit chore(release) do bot não dispara outro release`);
console.log(`${lote.seguro ? '✓' : '✗'} RLS16 head.ref do PR é dado, não código; job lote só lê`);
console.log(`${retryRelease ? '✓' : '✗'} RLS17 push do trem com retry limitado, sem force, e só sobre SHA com pr-fast verde${conferencia.length ? ` (${conferencia.join('; ')})` : ''}`);
console.log(`${loteVerde.length ? '✗' : '✓'} RLS18 merge de lote com a árvore do pai 2 já verde no ci.yml embarca sem esperar; senão espera o push${loteVerde.length ? ` (${loteVerde.join('; ')})` : ''}`);
if (!ok) {
  console.error('Release inválido: preserve créditos, DCO, docs, concorrência segura e um único caminho automático de produção.');
  process.exit(1);
}
