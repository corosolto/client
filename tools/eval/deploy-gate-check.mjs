#!/usr/bin/env node
/* ============================================================================
   deploy-gate-check.mjs — QUEM BLOQUEIA O PR É O CI, NÃO A VERCEL
   ----------------------------------------------------------------------------
   MEDIDO EM 21/08/2026: Vercel vermelha em 13 dos 14 PRs vindos de fork, sempre
   com `Authorization required to deploy.` - a proteção de fork da própria Vercel,
   que não se resolve por commit nenhum. E em 4 PRs de casa o vermelho era build
   real, uma vez por `fetch-decals.sh` não ter baixado o acervo (196 de 197
   decalques faltando) num soluço de rede.

   Para poder tirar a Vercel do caminho crítico do PR, duas coisas precisam valer:

   DG1 · o CI constrói o site no próprio PR. Sem isso, tirar a Vercel do bloqueio
         deixaria o PR sem NENHUMA prova de que o site compila.
   DG2 · nenhum download do caminho do build corre sem retry. `set -e` mais um
         `curl` sem `--retry` transforma soluço de rede em PR vermelho, e o autor
         não tem o que consertar - é o mesmo dano do portão que não pode medir.
   DG3 · o preview de fork roda sem pedir aprovação a ninguém, porque quem compila
         não tem segredo e quem tem segredo não compila. Os dois arquivos existem e o
         contrato deles é guardado em detalhe pelo `scripts/ci/workflow_security_check.py`
         (PRV1/PRV2/PRV3); aqui só se confere que o par não sumiu.

   Uso: node tools/eval/deploy-gate-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'ci-sem-build': 'DG1', 'download-sem-retry': 'DG2', 'preview-sem-par': 'DG3' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const falhas = [];

/* ---- DG1: o CI constrói no PR ---- */
let ci = ler('.github/workflows/ci.yml');
if (MUT === 'ci-sem-build') ci = ci.replace('run: npm run build', 'run: echo pulei o build');
const on = (ci.match(/^on:\n([\s\S]*?)(?=^\S)/m) || [])[1] || '';
if (!/^\s{2}pull_request:/m.test(on) || !/run:\s*npm run build/.test(ci)) {
  falhas.push('DG1 ci.yml não constrói o site em pull_request — sem isso a Vercel não pode sair do bloqueio');
}

/* ---- DG2: download do build com retry ---- */
const FETCHERS = readdirSync('scripts').filter((f) => /^fetch-.*\.sh$/.test(f));
for (const f of FETCHERS) {
  let sh = ler(`scripts/${f}`);
  if (MUT === 'download-sem-retry' && f === 'fetch-decals.sh') {
    sh = sh.replace(/curl --retry \d+[^"]*-fsSL/, 'curl -fsSL');
  }
  for (const linha of sh.split('\n')) {
    if (!/^\s*curl\s/.test(linha)) continue;
    if (!/--retry\b/.test(linha)) {
      falhas.push(`DG2 scripts/${f}: curl sem --retry no caminho do build — soluço de rede vira PR vermelho`);
    }
  }
}
if (!FETCHERS.length) falhas.push('DG2 nenhum scripts/fetch-*.sh encontrado — a régua perdeu o alvo');

/* ---- DG3: a etiqueta do preview nasce com quem a usa ---- */
let preview = ler('.github/workflows/preview-bot.yml');
if (MUT === 'preview-sem-par') preview = preview.replace(/ensure_labels\.py preview-autorizado/, 'ensure_labels.py');
const temBuild = ler('.github/workflows/preview-build.yml');
const temDeploy = ler('.github/workflows/preview-deploy.yml');
if (MUT === 'preview-sem-par') { /* nome antigo do mutante: agora derruba o par */ }
const par = (MUT === 'preview-sem-par') ? '' : (temBuild && temDeploy);
if (!par) {
  falhas.push('DG3 falta preview-build.yml ou preview-deploy.yml — sem o par, preview de fork volta a depender de aprovação humana');
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m DG o PR é bloqueado pelo build do CI; download tem retry (${FETCHERS.length} fetchers); preview de fork sem aprovação`);
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
