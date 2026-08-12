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
 *
 * Mutações: --mutante=nome-antigo | semcreditos | semdco | semdocs | semrollback | deploy-duplo | deploy-yaml.
 */
import { readFileSync, readdirSync } from 'node:fs';

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

if (mutante) {
  const antes = JSON.stringify([comandos, commitsRelease, docsRelease, rollbackRelease, caminhoProdUnico]);
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
  else throw new Error(`mutante desconhecido: ${mutante}`);
  if (JSON.stringify([comandos, commitsRelease, docsRelease, rollbackRelease, caminhoProdUnico]) === antes) throw new Error(`MUTANTE NAO APLICOU: ${mutante}`);
}

const nomes = comandos.filter(({ linha }) => /--title "CSBR \$/.test(linha)).length;
const creditos = comandos.filter(({ linha }) => linha.includes('--generate-notes')).length;
const total = comandos.length;
const dco = commitsRelease.filter(temDco).length;
const totalCommits = commitsRelease.length;
const docsOk = docsRelease.filter(Boolean).length;
const ok = total > 0 && nomes === total && creditos === total && totalCommits > 0 && dco === totalCommits && docsOk === docsRelease.length && rollbackRelease && caminhoProdUnico;

console.log(`${nomes === total && total ? '✓' : '✗'} RLS1 título CSBR: ${nomes}/${total} caminhos`);
console.log(`${creditos === total && total ? '✓' : '✗'} RLS2 notas com contribuidores: ${creditos}/${total} caminhos`);
console.log(`${dco === totalCommits && totalCommits ? '✓' : '✗'} RLS3 commits automáticos com DCO: ${dco}/${totalCommits} caminhos`);
console.log(`${docsOk === docsRelease.length ? '✓' : '✗'} RLS4 site de docs reconstruído e versionado: ${docsOk}/${docsRelease.length} caminhos`);
console.log(`${rollbackRelease ? '✓' : '✗'} RLS5 falha local restaura a árvore de trabalho`);
console.log(`${caminhoProdUnico ? '✓' : '✗'} RLS6 produção tem um caminho automático e fallback manual`);
if (!ok) {
  console.error('Release inválido: preserve créditos, DCO, docs e um único caminho automático de produção.');
  process.exit(1);
}
