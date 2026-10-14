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
 *       docs:check e arch:check continuam valendo sempre, e o release regenera os dois.
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
 * Mutações: --mutante=nome-antigo | semcreditos | semdco | semdocs | semrollback | deploy-duplo | deploy-yaml | sem-anims-deploy | cancelar-bot | ignora-sem-filtro | gerado-trava-trem | gerado-fora-do-pr | autoria-trava-trem | autoria-desligada | release-sem-arch | cron-de-volta | sem-dispatch | lote-ignorado | sem-rotulo | sem-filtro-lote | qualquer-merge | pr-aberto | concurrency-no-topo | sem-concurrency | grupo-sem-portao | bump-cancelavel | bump-mesmo-grupo | sem-aviso | loop | injecao.
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

/* RLS10 — o passo de gerado roda no PR sempre e, no push, só no commit do release. */
let workflowCi = readFileSync('.github/workflows/ci.yml', 'utf8');
const SO_PR_OU_RELEASE = "if: github.event_name == 'pull_request' || startsWith(github.event.head_commit.message, 'chore(release):')";
/* Igualdade EXATA, não "contém": `if: false && startsWith(...)` contém o startsWith e
   desliga a conferência de vez; sem o `event_name == 'push'` o job roda onde não deve. */
const AUTORIA_SO_RELEASE = "if: github.event_name == 'push' && startsWith(github.event.head_commit.message, 'chore(release):')";
const validaGerados = () => {
  const passo = (script) => new RegExp(`- name: [^\\n]+\\n\\s+(if: [^\\n]+)\\n\\s+run: npm run ${script}\\n`).exec(workflowCi)?.[1];
  const autoria = /^  autoria-na-main:\n    (if: [^\n]+)$/m.exec(workflowCi)?.[1] || '';
  return passo('docs:check') === SO_PR_OU_RELEASE
    && passo('arch:check') === SO_PR_OU_RELEASE
    && autoria === AUTORIA_SO_RELEASE
    && /node tools\/gen-docs\.mjs/.test(workflowRelease)
    && /node tools\/gen-arch\.mjs/.test(workflowRelease);
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

if (mutante) {
  const antes = JSON.stringify([comandos, commitsRelease, docsRelease, rollbackRelease, caminhoProdUnico, animacoesNoDeploy, concorrenciaRelease, tremRelease, geradosNoTrem, lote]);
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
    workflowCi = workflowCi.replace(`${SO_PR_OU_RELEASE}\n        run: npm run docs:check`, 'run: npm run docs:check');
    geradosNoTrem = validaGerados();
  }
  else if (mutante === 'gerado-fora-do-pr') {
    workflowCi = workflowCi.replace(`${SO_PR_OU_RELEASE}\n        run: npm run arch:check`, "if: startsWith(github.event.head_commit.message, 'chore(release):')\n        run: npm run arch:check");
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
  else if (mutante === 'release-sem-arch') {
    workflowRelease = workflowRelease.replace(/node tools\/gen-arch\.mjs/g, 'true');
    geradosNoTrem = validaGerados();
  }
  else throw new Error(`mutante desconhecido: ${mutante}`);
  if (JSON.stringify([comandos, commitsRelease, docsRelease, rollbackRelease, caminhoProdUnico, animacoesNoDeploy, concorrenciaRelease, tremRelease, geradosNoTrem, lote]) === antes) throw new Error(`MUTANTE NAO APLICOU: ${mutante}`);
}

const nomes = comandos.filter(({ linha }) => /--title "CSBR \$/.test(linha)).length;
const creditos = comandos.filter(({ linha }) => linha.includes('--generate-notes')).length;
const total = comandos.length;
const dco = commitsRelease.filter(temDco).length;
const totalCommits = commitsRelease.length;
const docsOk = docsRelease.filter(Boolean).length;
const ok = total > 0 && nomes === total && creditos === total && totalCommits > 0 && dco === totalCommits && docsOk === docsRelease.length && rollbackRelease && caminhoProdUnico && animacoesNoDeploy && concorrenciaRelease && tremRelease && geradosNoTrem
  && lote.semCron && lote.dispatch && lote.disparaLote && lote.naoDisparaComum && lote.antiLoop && lote.seguro;

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
if (!ok) {
  console.error('Release inválido: preserve créditos, DCO, docs, concorrência segura e um único caminho automático de produção.');
  process.exit(1);
}
