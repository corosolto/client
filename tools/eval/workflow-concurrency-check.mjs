/* ============================================================================
   workflow-concurrency-check.mjs — RUN VELHO DE PR NÃO SEGURA RUNNER
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O plano Free dá 20 jobs simultâneos para o repositório inteiro. Medido em
   13/10/2026: fila de até 293 jobs, e smoke-web, pr-gates, csbrasil-bot-automerge
   e preview-deploy sem `cancel-in-progress`. Cada push num PR deixava o run do
   commit anterior rodando até o fim, testando uma cabeça que já não existia.

   O QUE ELA MEDE
   WC1 · todo workflow de PR registrado em POR_PR declara `concurrency` no topo,
         com grupo que identifica o PR e `cancel-in-progress` que não é `false`.
   WC2 · os workflows registrados em NUNCA_CANCELA continuam com `concurrency` e
         `cancel-in-progress: false`: deploy de produção, diagnóstico e conserto de
         crash não podem morrer no meio porque chegou outro disparo, e também não
         podem rodar dois ao mesmo tempo. Tirar o bloco inteiro é tão vermelho
         quanto ligar o cancelamento.
   WC0 · registro órfão (arquivo que não existe mais) é vermelho: régua que jura
         medir arquivo ausente vira verde calada.

   Mutantes: sem-concurrency, sem-cancel, grupo-global, deploy-cancela,
   deploy-sem-concurrency.

   Uso: node tools/eval/workflow-concurrency-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MUTANTES = ['sem-concurrency', 'sem-cancel', 'grupo-global', 'classificador-autocancela', 'deploy-cancela', 'deploy-sem-concurrency'];
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && !MUTANTES.includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, '.github/workflows');

/* O grupo tem de citar o que identifica o PR. Em `workflow_run` de fork a lista
   `pull_requests` chega vazia, então lá vale a branch de origem. */
const IDENTIFICA_PR = /pull_request\.number|inputs\.pr_number|workflow_run\.pull_requests\[0\]\.number|workflow_run\.head_branch/;

const POR_PR = [
  'ci.yml', 'portao-browser.yml', 'preview-build.yml', 'ui-regression.yml',
  'autofix.yml', 'csbrasil-bot-pr-classify.yml',
  'smoke-web.yml', 'pr-gates.yml', 'csbrasil-bot-automerge.yml', 'preview-deploy.yml',
];
const NUNCA_CANCELA = ['deploy-prod.yml', 'ops-diag.yml', 'crash-fix.yml'];

/* Bloco `concurrency:` na coluna 0 (nível do workflow), lido por indentação: a
   régua roda no check:deploy, que é node puro e sem dependência de YAML. */
function concorrencia(fonte) {
  const m = /^concurrency:\s*\n((?: {2}\S[^\n]*\n?)+)/m.exec(fonte);
  if (!m) return null;
  const grupo = /^ {2}group:\s*(.+)$/m.exec(m[1])?.[1].trim() ?? '';
  const cancela = /^ {2}cancel-in-progress:\s*(.+)$/m.exec(m[1])?.[1].trim() ?? '';
  return { grupo, cancela };
}

function ler(arquivo) {
  let fonte = readFileSync(path.join(DIR, arquivo), 'utf8');
  if (mutante === 'sem-concurrency' && arquivo === 'smoke-web.yml') fonte = fonte.replace(/^concurrency:\s*\n(?: {2}\S[^\n]*\n?)+/m, '');
  if (mutante === 'sem-cancel' && arquivo === 'pr-gates.yml') fonte = fonte.replace(/^( {2}cancel-in-progress:).*$/m, '$1 false');
  if (mutante === 'grupo-global' && arquivo === 'preview-deploy.yml') fonte = fonte.replace(/^( {2}group:).*$/m, '$1 preview-deploy');
  if (mutante === 'classificador-autocancela' && arquivo === 'csbrasil-bot-pr-classify.yml') {
    fonte = fonte.replace(/^( {2}cancel-in-progress:).*$/m, '$1 true');
  }
  if (mutante === 'deploy-cancela' && arquivo === 'deploy-prod.yml') fonte = fonte.replace(/^( {2}cancel-in-progress:).*$/m, '$1 true');
  if (mutante === 'deploy-sem-concurrency' && arquivo === 'deploy-prod.yml') fonte = fonte.replace(/^concurrency:\s*\n(?: {2}\S[^\n]*\n?)+/m, '');
  return fonte;
}

const falhas = [];
for (const arquivo of [...POR_PR, ...NUNCA_CANCELA]) {
  if (!existsSync(path.join(DIR, arquivo))) falhas.push(`WC0 ${arquivo} está no registro e não existe em .github/workflows/`);
}
for (const arquivo of POR_PR.filter((a) => existsSync(path.join(DIR, a)))) {
  const c = concorrencia(ler(arquivo));
  if (!c) { falhas.push(`WC1 ${arquivo} sem \`concurrency\` no topo: push novo no PR deixa o run velho rodando`); continue; }
  if (!IDENTIFICA_PR.test(c.grupo)) falhas.push(`WC1 ${arquivo} agrupa por \`${c.grupo}\`, que não identifica o PR`);
  if (!c.cancela || c.cancela === 'false') falhas.push(`WC1 ${arquivo} não cancela o run velho do mesmo PR (cancel-in-progress: ${c.cancela || 'ausente'})`);
}
const classifier = concorrencia(ler('csbrasil-bot-pr-classify.yml'));
if (!/github\.actor/.test(classifier?.cancela || '') || !/csbrasil-BOT/.test(classifier?.cancela || '')) {
  falhas.push('WC3 csbrasil-bot-pr-classify.yml deixa evento de label do próprio bot cancelar o run que publicou a label');
}
for (const arquivo of NUNCA_CANCELA.filter((a) => existsSync(path.join(DIR, a)))) {
  const c = concorrencia(ler(arquivo));
  if (!c) falhas.push(`WC2 ${arquivo} sem \`concurrency\`: dois disparos rodam ao mesmo tempo, e este workflow precisa de fila com \`cancel-in-progress: false\``);
  else if (c.cancela !== 'false') falhas.push(`WC2 ${arquivo} cancela run em andamento (cancel-in-progress: ${c.cancela || 'ausente'}): este workflow não pode morrer no meio`);
}

if (mutante && !falhas.length) {
  console.error(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${mutante}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');
}
for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mWORKFLOW-CONCURRENCY ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
  process.exitCode = 1;
} else {
  console.log(`\x1b[32mWORKFLOW-CONCURRENCY verde: ${POR_PR.length} workflows de PR cancelam runs velhos sem autocancelar o classifier; ${NUNCA_CANCELA.length} nunca cancelam\x1b[0m`);
}
