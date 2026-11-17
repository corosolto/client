#!/usr/bin/env node
/* ============================================================================
   workflow-checkout-check.mjs — JOB QUE SÓ LÊ HISTÓRICO NÃO BAIXA O REPOSITÓRIO
   ----------------------------------------------------------------------------
   MEDIDO EM 14/10/2026: o repositório tem 1,8 GiB de pack e 536 MB só em
   public/models na cabeça. O `dco` (fetch-depth: 0) e o `ratchet` baixavam a
   história inteira COM os blobs para ler mensagem de commit e um JSON; o
   `versao-bumpada` baixava a árvore inteira para ler package.json e version.js; o
   automerge e o classify, para rodar três scripts de scripts/ci/. E isso roda em
   todo PR, e o automerge também a cada pr-fast que termina.

   CL1 · os jobs do REGISTRO fazem checkout leve: `filter: blob:none` (história sem
         blob; o git busca sob demanda o blob que um `git show` pedir) ou
         `sparse-checkout` (só os caminhos que o job lê). Job novo que só lê histórico
         entra no registro.
   CL0 · registro órfão (arquivo ou job que não existe mais) é vermelho: régua que
         jura medir job ausente vira verde calada.
   CL2 · job que mescla a main num PR baixa os blobs: com `blob:none` o merge busca
         blob sob demanda e o servidor recusa ("not our ref"); medido no autofix, 14/10.
   CL3 · o prepare do Steam usa exatamente o commit cuja run de build foi validada;
         checkout no default branch mistura artefato e ferramenta de revisões diferentes.

   Mutantes: checkout-pesado, registro-orfao, merge-sem-blob, steam-source-default.
   Uso: node tools/eval/workflow-checkout-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'checkout-pesado': 'CL1', 'registro-orfao': 'CL0', 'merge-sem-blob': 'CL2', 'steam-source-default': 'CL3' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const REGISTRO = {
  'ci.yml': ['dco'],
  'pr-gates.yml': ['versao-bumpada', 'ratchet'],
  'csbrasil-bot-automerge.yml': ['automerge'],
  'csbrasil-bot-pr-classify.yml': ['classify'],
  'autofix.yml': ['varredura'],
  'ui-regression.yml': ['classify'],
};
if (MUT === 'registro-orfao') REGISTRO['ci.yml'] = [...REGISTRO['ci.yml'], 'job-que-sumiu'];
const MESCLAM = { 'autofix.yml': ['autofix'] };

/* Corpo de cada job por indentação: id com 2 espaços dentro de `jobs:`. */
function corpos(fonte) {
  const out = {};
  let dentro = false;
  let atual = null;
  for (const linha of fonte.split('\n')) {
    if (/^jobs:\s*$/.test(linha)) { dentro = true; continue; }
    if (!dentro) continue;
    if (/^\S/.test(linha)) { dentro = false; continue; }
    const id = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(linha);
    if (id) { atual = id[1]; out[atual] = []; continue; }
    if (atual) out[atual].push(linha);
  }
  return out;
}

/* Cada `uses: actions/checkout@` com as linhas mais indentadas que o seu `- `. */
function checkouts(linhas) {
  const achados = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = /^(\s*)(- )?uses: actions\/checkout@/.exec(linhas[i]);
    if (!m) continue;
    /* O passo começa no `- `: na mesma linha do `uses:` ou dois espaços antes (`- name:`). */
    const passo = m[2] ? m[1].length : m[1].length - 2;
    const bloco = [];
    for (let j = i + 1; j < linhas.length; j++) {
      const l = linhas[j];
      if (l.trim() === '') continue;
      const ind = l.length - l.trimStart().length;
      if (ind <= passo) break;
      bloco.push(l.trim());
    }
    achados.push(bloco);
  }
  return achados;
}

const falhas = [];
let medidos = 0;
for (const [arquivo, jobs] of Object.entries(REGISTRO)) {
  const caminho = `.github/workflows/${arquivo}`;
  if (!existsSync(caminho)) { falhas.push(`CL0 ${arquivo} está no registro e não existe`); continue; }
  let fonte = readFileSync(caminho, 'utf8');
  if (MUT === 'checkout-pesado' && arquivo === 'ci.yml') {
    const i = fonte.indexOf('\n  dco:');
    fonte = fonte.slice(0, i) + fonte.slice(i).replace(/\n\s+filter: blob:none/, '');
  }
  const porJob = corpos(fonte);
  for (const job of jobs) {
    if (!porJob[job]) { falhas.push(`CL0 ${arquivo}: o job \`${job}\` está no registro e não existe`); continue; }
    const cos = checkouts(porJob[job]);
    if (!cos.length) { falhas.push(`CL0 ${arquivo}: o job \`${job}\` não faz checkout — tire-o do registro`); continue; }
    for (const bloco of cos) {
      medidos++;
      const leve = bloco.some((l) => /^filter:\s*blob:none\s*$/.test(l)) || bloco.some((l) => /^sparse-checkout:/.test(l));
      if (!leve) falhas.push(`CL1 ${arquivo}: o checkout do job \`${job}\` baixa o repositório inteiro — use \`filter: blob:none\` ou \`sparse-checkout\``);
    }
  }
}

for (const [arquivo, jobs] of Object.entries(MESCLAM)) {
  let fonte = readFileSync(`.github/workflows/${arquivo}`, 'utf8');
  if (MUT === 'merge-sem-blob') fonte = fonte.replace(/(\n {10}fetch-depth: 0)/, '$1\n          filter: blob:none');
  const porJob = corpos(fonte);
  for (const job of jobs) {
    if (!porJob[job]) { falhas.push(`CL0 ${arquivo}: o job \`${job}\` está em MESCLAM e não existe`); continue; }
    for (const bloco of checkouts(porJob[job])) {
      medidos++;
      if (bloco.some((l) => /^filter:\s*blob:none\s*$/.test(l))) falhas.push(`CL2 ${arquivo}: o job \`${job}\` mescla a main com checkout \`blob:none\` — o merge falha com "not our ref"`);
    }
  }
}
{
  let fonte = readFileSync('.github/workflows/steam-preflight.yml', 'utf8');
  if (MUT === 'steam-source-default') fonte = fonte.replace(/\n\s+ref: \$\{\{ inputs\.source_commit \}\}/, '');
  const prepare = corpos(fonte).prepare;
  if (!prepare) falhas.push('CL0 steam-preflight.yml: o job `prepare` não existe');
  else {
    const cos = checkouts(prepare);
    medidos += cos.length;
    if (cos.length !== 1 || !cos[0].some((l) => /^ref:\s*\$\{\{\s*inputs\.source_commit\s*\}\}\s*$/.test(l))) {
      falhas.push('CL3 steam-preflight.yml: o checkout de `prepare` não usa `inputs.source_commit`');
    }
  }
}


for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m CL os ${medidos} checkouts medidos preservam custo, merge e identidade da fonte`);
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
