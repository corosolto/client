/* ============================================================================
   workflow-timeout-check.mjs — JOB SEM TETO DE TEMPO PRENDE RUNNER POR 6 HORAS
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O default do GitHub Actions é `timeout-minutes: 360`. Medido em 12/08/2026:
   dos 14 workflows do repositório, **12 não declaravam timeout em job nenhum**.
   Um `astro dev` que não sobe, um `gh` que espera prompt ou uma rede que trava
   seguram um runner por SEIS HORAS - e o repositório roda bot de issue, bot de
   PR, prod-watch a cada 15 min e preview de fork no mesmo pool.

   Não é hipótese: nesta mesma data um `actions/checkout` falhou por certificado
   e o job só terminou porque o checkout tem retry próprio. Sem teto, o passo
   seguinte teria ficado pendurado.

   O QUE ELA MEDE: todo job de todo workflow declara `timeout-minutes`, e o valor
   fica dentro de um teto sensato (nenhum job deste repositório precisa de mais
   de 30 min; o mais lento, o smoke, roda em ~6).

   Mutantes: sem-timeout (apaga um), timeout-absurdo (põe 300) e isencao-estourada
   (passa um job isento do teto medido dele).

   Uso: node tools/eval/workflow-timeout-check.mjs
        [--mutante=sem-timeout|timeout-absurdo|isencao-estourada]
   ============================================================================ */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['sem-timeout', 'timeout-absurdo', 'isencao-estourada'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, '.github/workflows');
const TETO_MAX = 30;
/* Isenção NOMINAL, com o pior caso medido (gh api .../actions/runs/<id>/jobs, 15 runs de 09/10/2026):
   portao 16-34 min (2 de 15 acima de 30), classify 3-28 min. Medir de novo antes de mexer (#497). */
const TETO_ISENTO = { 'portao-browser.yml:portao': 45, 'ui-regression.yml:classify': 35 };

/* Parser de indentação, não de YAML: a régua roda no `check:deploy`, que é node
   puro e sem dependência. `jobs:` na coluna 0, nome do job com 2 espaços, chaves
   do job com 4 - que é o formato de todos os workflows daqui. */
function jobs(fonte) {
  const linhas = fonte.split('\n');
  const achados = [];
  let dentro = false;
  let atual = null;
  for (const linha of linhas) {
    if (/^jobs:\s*$/.test(linha)) { dentro = true; continue; }
    if (!dentro) continue;
    if (/^\S/.test(linha)) { dentro = false; continue; }
    const nome = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(linha);
    if (nome) { atual = { nome: nome[1], timeout: null }; achados.push(atual); continue; }
    const teto = /^ {4}timeout-minutes:\s*(\d+)/.exec(linha);
    if (teto && atual) atual.timeout = Number(teto[1]);
  }
  return achados;
}

const falhas = [];
for (const arquivo of readdirSync(DIR).filter((f) => f.endsWith('.yml')).sort()) {
  let fonte = readFileSync(path.join(DIR, arquivo), 'utf8');
  if (mutante === 'sem-timeout' && arquivo === 'ci.yml') fonte = fonte.replace(/^ {4}timeout-minutes:.*$/m, '');
  if (mutante === 'timeout-absurdo' && arquivo === 'ci.yml') fonte = fonte.replace(/^ {4}timeout-minutes:.*$/m, '    timeout-minutes: 300');
  if (mutante === 'isencao-estourada' && arquivo === 'portao-browser.yml') fonte = fonte.replace(/^ {4}timeout-minutes:.*$/m, '    timeout-minutes: 60');
  const lista = jobs(fonte);
  if (!lista.length) falhas.push(`WT0 ${arquivo}: nenhum job encontrado — o parser não entendeu o arquivo`);
  for (const job of lista) {
    if (job.timeout === null) falhas.push(`WT1 ${arquivo} · job \`${job.nome}\` sem timeout-minutes (default do GitHub: 360)`);
    else if (job.timeout > (TETO_ISENTO[`${arquivo}:${job.nome}`] ?? TETO_MAX)) falhas.push(`WT2 ${arquivo} · job \`${job.nome}\` com timeout de ${job.timeout} min (teto ${TETO_ISENTO[`${arquivo}:${job.nome}`] ?? TETO_MAX})`);
  }
}

for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mWORKFLOW-TIMEOUT ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mWORKFLOW-TIMEOUT verde: todo job tem teto de tempo\x1b[0m');
}
